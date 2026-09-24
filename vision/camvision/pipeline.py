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
    from .roi import Zone

_COLORS = {"motion": (0, 200, 255), "face": (80, 220, 80), "object": (255, 140, 0)}
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
    ):
        self.analyzers = analyzers
        self.analysis_width = analysis_width
        self.zones = zones or []
        self.decider = decider
        self._frame_times: deque[float] = deque(maxlen=30)

    def process(self, frame: np.ndarray) -> FrameReport:
        now = time.time()
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
                label = f"{d.label} {d.score:.2f}" if result.analyzer == "object" else d.label
                cv2.putText(out, label, (x, max(12, y - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)

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


def _draw_decision(out: np.ndarray, decision: "Decision") -> None:
    action = decision.action.value if hasattr(decision.action, "value") else str(decision.action)
    color = _ACTION_COLORS.get(action, (255, 255, 255))
    text = f"{action} ({decision.reason})"
    h, w = out.shape[:2]
    (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
    x0, y0 = w - tw - 20, 10
    cv2.rectangle(out, (x0, y0), (x0 + tw + 12, y0 + th + 16), color, -1)
    cv2.putText(out, text, (x0 + 6, y0 + th + 6), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)

    if decision.steer:
        cx, cy = w // 2, h - 20
        length = 60
        ex = int(cx + length * decision.steer)
        cv2.arrowedLine(out, (cx, cy), (ex, cy - 30), color, 3, tipLength=0.3)
