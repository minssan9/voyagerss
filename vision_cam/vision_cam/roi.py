"""ROI(관심 영역) 구역 설정.

구역은 0~1 로 정규화된 좌표의 다각형으로 JSON 파일에 저장한다. 정규화 좌표를
쓰면 맥에서 640x480 으로 그린 구역을 파이의 다른 해상도에서도 그대로 쓸 수 있다.

검출(Detection)이 구역 "안"에 있는지는 박스의 바닥 중앙점(발이 닿는 지점,
자율주행 판단에 의미 있는 지점)을 기준으로 판단한다.

파일 형식 예시:
    {
      "zones": [
        {"name": "danger", "points": [[0.25,0.65],[0.75,0.65],[0.95,1.0],[0.05,1.0]], "filter": false},
        {"name": "door",   "points": [[0.1,0.1],[0.4,0.1],[0.4,0.5],[0.1,0.5]], "analyzers": ["motion"]}
      ]
    }

- analyzers: 이 구역을 적용할 분석기 이름 목록. 생략하면 spatial=True 인 모든
  분석기에 적용된다.
- filter: true(기본값) 면 이 구역(들) 밖의 검출은 제거된다. false 면 구역
  이름만 태그하고 제거하지 않는다 (자율주행 위험/주의 구역처럼 "위치만 알고
  싶을 때" 사용).
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

import cv2
import numpy as np

if TYPE_CHECKING:
    from .analyzers.base import AnalysisResult, Analyzer, Detection


def anchor(bbox: tuple[int, int, int, int]) -> tuple[float, float]:
    """검출 박스의 바닥 중앙점 (지면에 닿는 지점)."""
    x, y, w, h = bbox
    return (x + w / 2, y + h)


@dataclass
class Zone:
    name: str
    points: list[tuple[float, float]]  # 정규화 좌표 (0~1)
    analyzers: list[str] | None = None
    filter: bool = True
    _poly_cache: dict[tuple[int, int], np.ndarray] = field(default_factory=dict, repr=False)

    def applies_to(self, analyzer: "Analyzer") -> bool:
        if not getattr(analyzer, "spatial", True):
            return False
        return self.analyzers is None or analyzer.name in self.analyzers

    def to_pixels(self, w: int, h: int) -> np.ndarray:
        cached = self._poly_cache.get((w, h))
        if cached is not None:
            return cached
        poly = np.array([[int(round(px * w)), int(round(py * h))] for px, py in self.points],
                         dtype=np.int32).reshape((-1, 1, 2))
        self._poly_cache[(w, h)] = poly
        return poly

    def contains_point(self, px: float, py: float, w: int, h: int) -> bool:
        poly = self.to_pixels(w, h)
        return cv2.pointPolygonTest(poly, (float(px), float(py)), False) >= 0

    def contains_bbox(self, bbox: tuple[int, int, int, int], w: int, h: int) -> bool:
        ax, ay = anchor(bbox)
        return self.contains_point(ax, ay, w, h)

    def to_dict(self) -> dict:
        d = {"name": self.name, "points": [list(p) for p in self.points], "filter": self.filter}
        if self.analyzers is not None:
            d["analyzers"] = list(self.analyzers)
        return d


def normalize_points(pixel_points: list[tuple[float, float]], w: int, h: int) -> list[list[float]]:
    return [[round(px / w, 4), round(py / h, 4)] for px, py in pixel_points]


def load_zones(path: str) -> list[Zone]:
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    zones_raw = data.get("zones") if isinstance(data, dict) else None
    if not zones_raw:
        raise ValueError(f"ROI 파일에 zones 가 없습니다: {path}")

    names: set[str] = set()
    zones: list[Zone] = []
    for i, z in enumerate(zones_raw):
        name = z.get("name")
        if not name:
            raise ValueError(f"zones[{i}]: name 이 필요합니다")
        if name in names:
            raise ValueError(f"zones[{i}]: 이름이 중복됩니다: {name}")
        names.add(name)

        points = z.get("points") or []
        if len(points) < 3:
            raise ValueError(f"zones[{i}] ({name}): points 는 최소 3개 필요합니다")
        for p in points:
            if len(p) != 2 or not all(0.0 <= v <= 1.0 for v in p):
                raise ValueError(f"zones[{i}] ({name}): 좌표는 0~1 범위여야 합니다: {p}")

        analyzers = z.get("analyzers")
        if analyzers is not None and not (
            isinstance(analyzers, list) and all(isinstance(a, str) for a in analyzers)
        ):
            raise ValueError(f"zones[{i}] ({name}): analyzers 는 문자열 목록이어야 합니다")

        zones.append(Zone(
            name=name,
            points=[tuple(p) for p in points],
            analyzers=list(analyzers) if analyzers is not None else None,
            filter=bool(z.get("filter", True)),
        ))
    return zones


def save_zones(path: str, zones: list[Zone]) -> None:
    d = os.path.dirname(path)
    if d:
        os.makedirs(d, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"zones": [z.to_dict() for z in zones]}, f, indent=2, ensure_ascii=False)


def apply_zones(
    results: list["AnalysisResult"], analyzers: list["Analyzer"], zones: list[Zone], w: int, h: int,
) -> dict[str, list[str]]:
    """결과의 각 검출에 구역 이름을 태그하고, filter=true 구역 밖의 검출을 제거한다.

    반환값: {구역이름: [그 안에 있던 검출 라벨들]} (모든 구역 포함, 빈 리스트 가능)
    """
    zone_hits: dict[str, list[str]] = {z.name: [] for z in zones}

    for result, analyzer in zip(results, analyzers):
        tag_zones = [z for z in zones if z.applies_to(analyzer)]
        if not tag_zones:
            continue

        for d in result.detections:
            d.zones = [z.name for z in tag_zones if z.contains_bbox(d.bbox, w, h)]
            for name in d.zones:
                zone_hits[name].append(d.label)

        filter_zones = [z.name for z in tag_zones if z.filter]
        if filter_zones:
            had_detections = bool(result.detections)
            kept = [d for d in result.detections if any(z in d.zones for z in filter_zones)]
            dropped = len(result.detections) - len(kept)
            result.detections = kept
            result.metrics["roi_dropped"] = dropped
            if had_detections and not kept:
                result.triggered = False

    return zone_hits
