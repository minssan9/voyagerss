from __future__ import annotations

from .base import AnalysisResult, Analyzer, Detection
from .brightness import BrightnessAnalyzer
from .face import FaceAnalyzer
from .motion import MotionAnalyzer
from .object import ObjectAnalyzer

REGISTRY: dict[str, type[Analyzer]] = {
    MotionAnalyzer.name: MotionAnalyzer,
    FaceAnalyzer.name: FaceAnalyzer,
    BrightnessAnalyzer.name: BrightnessAnalyzer,
    ObjectAnalyzer.name: ObjectAnalyzer,
}


def build_analyzers(names: list[str], options: dict[str, dict] | None = None) -> list[Analyzer]:
    unknown = [n for n in names if n not in REGISTRY]
    if unknown:
        raise ValueError(f"알 수 없는 분석기: {unknown} (사용 가능: {sorted(REGISTRY)})")
    opts = options or {}
    return [REGISTRY[n](**opts.get(n, {})) for n in names]


__all__ = [
    "AnalysisResult",
    "Analyzer",
    "Detection",
    "MotionAnalyzer",
    "FaceAnalyzer",
    "BrightnessAnalyzer",
    "ObjectAnalyzer",
    "REGISTRY",
    "build_analyzers",
]
