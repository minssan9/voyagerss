from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import numpy as np


@dataclass
class Detection:
    """분석기가 찾아낸 영역 하나. bbox = (x, y, w, h) 픽셀 좌표."""

    label: str
    bbox: tuple[int, int, int, int]
    score: float = 1.0


@dataclass
class AnalysisResult:
    analyzer: str
    detections: list[Detection] = field(default_factory=list)
    metrics: dict[str, Any] = field(default_factory=dict)
    # True 면 이벤트로 기록 (예: 움직임 감지, 얼굴 등장)
    triggered: bool = False

    def to_dict(self) -> dict[str, Any]:
        return {
            "analyzer": self.analyzer,
            "triggered": self.triggered,
            "metrics": self.metrics,
            "detections": [
                {"label": d.label, "bbox": list(d.bbox), "score": round(d.score, 3)}
                for d in self.detections
            ],
        }


class Analyzer:
    """모든 분석기의 베이스. BGR 프레임을 받아 AnalysisResult 를 돌려준다."""

    name = "base"

    def analyze(self, frame: np.ndarray) -> AnalysisResult:  # pragma: no cover
        raise NotImplementedError
