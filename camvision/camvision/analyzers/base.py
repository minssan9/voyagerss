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
    # ROI 적용 후 이 검출이 속한 구역 이름들 (roi.apply_zones 가 채움)
    zones: list[str] = field(default_factory=list)


@dataclass
class AnalysisResult:
    analyzer: str
    detections: list[Detection] = field(default_factory=list)
    metrics: dict[str, Any] = field(default_factory=dict)
    # True 면 이벤트로 기록 (예: 움직임 감지, 얼굴 등장)
    triggered: bool = False

    def to_dict(self) -> dict[str, Any]:
        def _det(d: Detection) -> dict[str, Any]:
            out = {"label": d.label, "bbox": list(d.bbox), "score": round(d.score, 3)}
            if d.zones:
                out["zones"] = d.zones
            return out

        return {
            "analyzer": self.analyzer,
            "triggered": self.triggered,
            "metrics": self.metrics,
            "detections": [_det(d) for d in self.detections],
        }


class Analyzer:
    """모든 분석기의 베이스. BGR 프레임을 받아 AnalysisResult 를 돌려준다."""

    name = "base"
    # 검출 좌표가 실제 위치를 의미하는지 여부. True 인 분석기만 ROI 필터링 대상이 된다.
    # (brightness 처럼 프레임 전체를 보는 분석기는 False 로 둔다)
    spatial = True

    def analyze(self, frame: np.ndarray) -> AnalysisResult:  # pragma: no cover
        raise NotImplementedError
