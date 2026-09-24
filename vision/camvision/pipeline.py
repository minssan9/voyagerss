from __future__ import annotations

import time
from collections import deque
from dataclasses import dataclass, field

import cv2
import numpy as np

from .analyzers import AnalysisResult, Analyzer

_COLORS = {"motion": (0, 200, 255), "face": (80, 220, 80)}


@dataclass
class FrameReport:
    timestamp: float
    fps: float
    results: list[AnalysisResult] = field(default_factory=list)

    @property
    def triggered(self) -> list[AnalysisResult]:
        return [r for r in self.results if r.triggered]

    def to_dict(self) -> dict:
        return {
            "ts": round(self.timestamp, 3),
            "fps": round(self.fps, 1),
            "results": [r.to_dict() for r in self.results],
        }


class Pipeline:
    """프레임 → (축소) → 분석기들 → 결과 + 오버레이 이미지.

    analysis_width: 분석 전에 이 폭으로 축소 (라즈베리파이 CPU 부하 절감).
    검출 좌표는 원본 해상도로 되돌려서 반환한다.
    """

    def __init__(self, analyzers: list[Analyzer], analysis_width: int = 320):
        self.analyzers = analyzers
        self.analysis_width = analysis_width
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
        return FrameReport(timestamp=now, fps=self._fps(), results=results)

    def _fps(self) -> float:
        if len(self._frame_times) < 2:
            return 0.0
        span = self._frame_times[-1] - self._frame_times[0]
        return (len(self._frame_times) - 1) / span if span > 0 else 0.0

    @staticmethod
    def draw(frame: np.ndarray, report: FrameReport) -> np.ndarray:
        out = frame.copy()
        for result in report.results:
            color = _COLORS.get(result.analyzer, (255, 255, 255))
            for d in result.detections:
                x, y, w, h = d.bbox
                cv2.rectangle(out, (x, y), (x + w, y + h), color, 2)
                cv2.putText(out, d.label, (x, max(12, y - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)

        lines = [f"FPS {report.fps:.1f}"]
        for r in report.results:
            summary = ", ".join(f"{k}={v}" for k, v in r.metrics.items() if not isinstance(v, bool))
            flag = " *" if r.triggered else ""
            lines.append(f"{r.analyzer}: {summary}{flag}")
        for i, text in enumerate(lines):
            y = 20 + i * 18
            cv2.putText(out, text, (8, y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 3)
            cv2.putText(out, text, (8, y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        return out
