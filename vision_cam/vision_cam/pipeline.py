from __future__ import annotations

import time
from collections import deque
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

import cv2
import numpy as np

from .analyzers import AnalysisResult, Analyzer
from .roi import apply_zones

if TYPE_CHECKING:
    from .decision import Decision, DrivingDecider
    from .kinematics import KinematicsEstimator
    from .roi import Zone

_COLORS = {"motion": (0, 200, 255), "face": (80, 220, 80), "object": (255, 140, 0),
           "yolo": (255, 80, 200)}
# 검출 결과에 kinematics(속도/가속도/모멘텀)를 붙일 분석기
_KINEMATIC_ANALYZERS = ("object", "yolo")
_ACTION_COLORS = {"STOP": (0, 0, 255), "SLOW": (0, 200, 255), "GO": (0, 200, 0)}


@dataclass
class FrameReport:
    timestamp: float
    fps: float
    results: list[AnalysisResult] = field(default_factory=list)
    frame_size: tuple[int, int] = (0, 0)  # (w, h), 원본 해상도
    zones: list["Zone"] = field(default_factory=list)
    zone_hits: dict[str, list[str]] = field(default_factory=dict)
    decision: "Decision | None" = None

    @property
    def triggered(self) -> list[AnalysisResult]:
        return [r for r in self.results if r.triggered]

    def to_dict(self) -> dict:
        d = {
            "ts": round(self.timestamp, 3),
            "fps": round(self.fps, 1),
            "results": [r.to_dict() for r in self.results],
        }
        if self.zone_hits:
            d["zone_hits"] = self.zone_hits
        if self.decision is not None:
            d["decision"] = self.decision.to_dict()
        return d


class Pipeline:
    """프레임 → (축소) → 분석기들 → ROI 필터링 → (주행 판단) → 결과 + 오버레이 이미지.

    analysis_width: 분석 전에 이 폭으로 축소 (라즈베리파이 CPU 부하 절감).
    검출 좌표는 원본 해상도로 되돌려서 반환한다. ROI 구역 매칭은 이 원본
    좌표 기준으로 수행한다 (구역 좌표가 원본 프레임 비율로 정규화되어 있으므로).
    """

    def __init__(
        self,
        analyzers: list[Analyzer],
        analysis_width: int = 320,
        zones: list["Zone"] | None = None,
        decider: "DrivingDecider | None" = None,
        kinematics: "KinematicsEstimator | None" = None,
    ):
        self.analyzers = analyzers
        self.analysis_width = analysis_width
        self.zones = zones or []
        self.decider = decider
        # 분석기 이름별 estimator (object / yolo 의 track_id 공간이 섞이지 않도록 분리)
        self._kinematics_proto = kinematics
        self._kinematics: dict[str, "KinematicsEstimator"] = {}
        self._frame_times: deque[float] = deque(maxlen=30)

    def process(self, frame: np.ndarray, timestamp: float | None = None) -> FrameReport:
        """timestamp: 프레임 촬영 시각(초). 녹화 파일을 분석할 때는 영상 시간을 넘겨야
        속도/가속도가 실제 시간 기준으로 계산된다 (기본: 현재 시각)."""
        now = time.time() if timestamp is None else timestamp
        self._frame_times.append(now)
        h, w = frame.shape[:2]
        scale = min(1.0, self.analysis_width / w) if self.analysis_width else 1.0
        small = cv2.resize(frame, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA) \
            if scale < 1.0 else frame

        results = []
        for analyzer in self.analyzers:
            result = analyzer.analyze(small)
            if scale < 1.0:
                for d in result.detections:
                    d.bbox = tuple(int(round(v / scale)) for v in d.bbox)
            if self._kinematics_proto is not None and result.analyzer in _KINEMATIC_ANALYZERS:
                self._update_kinematics(result, now)
            results.append(result)

        zone_hits: dict[str, list[str]] = {}
        if self.zones:
            zone_hits = apply_zones(results, self.analyzers, self.zones, w, h)

        report = FrameReport(
            timestamp=now, fps=self._fps(), results=results,
            frame_size=(w, h), zones=self.zones, zone_hits=zone_hits,
        )
        if self.decider is not None:
            report.decision = self.decider.decide(report)
        return report

    def _update_kinematics(self, result: AnalysisResult, ts: float) -> None:
        from .kinematics import KinematicsEstimator

        est = self._kinematics.get(result.analyzer)
        if est is None:
            est = KinematicsEstimator(self._kinematics_proto.config) \
                if self._kinematics else self._kinematics_proto
            self._kinematics[result.analyzer] = est
        est.update(result.detections, ts, predict_only=bool(result.metrics.get("stale")))
        moving = [d.kinematics for d in result.detections if d.kinematics]
        if moving:
            fastest = max(moving, key=lambda k: k["speed"])
            result.metrics["max_speed"] = fastest["speed"]
            result.metrics["speed_unit"] = f"{fastest['unit']}/s"

    def _fps(self) -> float:
        if len(self._frame_times) < 2:
            return 0.0
        span = self._frame_times[-1] - self._frame_times[0]
        return (len(self._frame_times) - 1) / span if span > 0 else 0.0

    @staticmethod
    def draw(frame: np.ndarray, report: FrameReport) -> np.ndarray:
        out = frame.copy()

        for zone in report.zones:
            poly = zone.to_pixels(*report.frame_size)
            occupied = bool(report.zone_hits.get(zone.name))
            if occupied:
                overlay = out.copy()
                cv2.fillPoly(overlay, [poly], (0, 0, 255))
                cv2.addWeighted(overlay, 0.25, out, 0.75, 0, out)
                color = (0, 0, 255)
            else:
                color = (255, 0, 255)
            cv2.polylines(out, [poly], isClosed=True, color=color, thickness=2)
            x0, y0 = poly[0][0]
            cv2.putText(out, zone.name, (int(x0), max(12, int(y0) - 6)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)

        for result in report.results:
            color = _COLORS.get(result.analyzer, (255, 255, 255))
            for d in result.detections:
                x, y, w, h = d.bbox
                cv2.rectangle(out, (x, y), (x + w, y + h), color, 2)
                if result.analyzer in _KINEMATIC_ANALYZERS:
                    label = f"{d.label} {d.score:.2f}"
                    if d.track_id is not None and d.track_id < 1_000_000:
                        label = f"#{d.track_id} {label}"
                else:
                    label = d.label
                cv2.putText(out, label, (x, max(12, y - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)
                if d.kinematics:
                    _draw_kinematics(out, d, color, report.frame_size)

        lines = [f"FPS {report.fps:.1f}"]
        for r in report.results:
            parts = []
            for k, v in r.metrics.items():
                if isinstance(v, bool):
                    continue
                if isinstance(v, dict):
                    v = " ".join(f"{ck}:{cv}" for ck, cv in v.items()) or "-"
                parts.append(f"{k}={v}")
            flag = " *" if r.triggered else ""
            lines.append(f"{r.analyzer}: {', '.join(parts)}{flag}")
        for i, text in enumerate(lines):
            y = 20 + i * 18
            cv2.putText(out, text, (8, y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 3)
            cv2.putText(out, text, (8, y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

        if report.decision is not None:
            _draw_decision(out, report.decision)
        return out


def _draw_kinematics(out: np.ndarray, d, color, frame_size) -> None:
    """bbox 중심에서 속도 벡터 화살표 + 하단에 속도/가속도/모멘텀 텍스트."""
    k = d.kinematics
    x, y, w, h = d.bbox
    cx, cy = x + w // 2, y + h // 2
    vx, vy = k["velocity"]
    if k["unit"] == "px":
        # 0.5초 후 예상 위치까지 화살표
        ex, ey = int(cx + vx * 0.5), int(cy + vy * 0.5)
        if abs(ex - cx) + abs(ey - cy) > 2:
            cv2.arrowedLine(out, (cx, cy), (ex, ey), color, 2, tipLength=0.25)
    unit = k["unit"]
    text = f"v={k['speed']:.2f}{unit}/s a={k['accel']:.2f}"
    if k.get("momentum") is not None:
        text += f" p={k['momentum']:.1f}"
    ty = min(frame_size[1] - 4, y + h + 14)
    cv2.putText(out, text, (x, ty), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 0), 3)
    cv2.putText(out, text, (x, ty), cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)


def _draw_decision(out: np.ndarray, decision: "Decision") -> None:
    action = decision.action.value if hasattr(decision.action, "value") else str(decision.action)
    color = _ACTION_COLORS.get(action, (255, 255, 255))
    text = f"{action} ({decision.reason})"
    h, w = out.shape[:2]
    (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
    box_w = max(tw + 12, 120)
    x0, y0 = w - box_w - 20, 10
    cv2.rectangle(out, (x0, y0), (x0 + box_w, y0 + th + 16), color, -1)
    cv2.putText(out, text, (x0 + 6, y0 + th + 6), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)

    # 판단은 즉시 바뀔 수 있어도 실제로 내려보내는 speed 는 점진적으로만 변하므로
    # 게이지로 그 차이를 보여준다 (예: STOP 직후에도 SLOW 잔여 속도가 잠깐 남을 수 있음)
    bar_y = y0 + th + 24
    bar_w = box_w
    cv2.rectangle(out, (x0, bar_y), (x0 + bar_w, bar_y + 10), (60, 60, 60), -1)
    fill_w = int(bar_w * max(0.0, min(1.0, decision.speed)))
    cv2.rectangle(out, (x0, bar_y), (x0 + fill_w, bar_y + 10), color, -1)
    cv2.putText(out, f"speed {decision.speed:.2f}", (x0, bar_y + 26),
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)

    if decision.steer:
        cx, cy = w // 2, h - 20
        length = 60
        ex = int(cx + length * decision.steer)
        cv2.arrowedLine(out, (cx, cy), (ex, cy - 30), color, 3, tipLength=0.3)
