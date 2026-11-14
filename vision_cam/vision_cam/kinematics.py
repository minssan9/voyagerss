"""추적된 객체의 속도 / 가속도 / 모멘텀 추정.

입력: 매 프레임의 Detection 목록 (원본 해상도 픽셀 bbox) + 타임스탬프(초).
출력: 각 Detection 에 track_id 와 kinematics dict 를 채운다.

  kinematics = {
      "unit": "m" | "px",                 # 위치 단위 (보정 없으면 px)
      "position": [x, y],                 # 기준점 위치 (unit)
      "velocity": [vx, vy], "speed": |v|, # unit/s
      "acceleration": [ax, ay], "accel": |a|,  # unit/s^2
      "heading_deg": 진행 방향 (이미지 좌표: 0=오른쪽, 90=아래),
      "momentum": m*|v| | None,           # kg*unit/s, mass 를 알 때만
      "approach": 박스 면적 변화율(1/s) — 양수면 카메라로 다가오는 중,
      "age": 이 트랙이 관측된 업데이트 횟수,
  }

⚠️ 단안 카메라 한계: 픽셀 속도는 거리(깊이)에 따라 달라진다. 실제 단위(m/s)로
쓰려면 (1) 카메라가 고정되어 있고 (2) 객체가 같은 평면(지면/책상) 위를 움직일 때
meters_per_pixel(정면/탑뷰) 또는 homography(비스듬한 시점 → 지면 좌표)를 지정한다.
카메라 자체가 움직이면(차량 탑재) 결과는 "카메라 기준 상대 운동"이다.

측정 원리:
  v_raw = (p_t - p_{t-1}) / dt,  v = EMA(v_raw, alpha)
  a_raw = (v_t - v_{t-1}) / dt,  a = EMA(a_raw, alpha_acc)
  p(momentum) = m * |v|
가속도는 위치를 두 번 미분하므로 노이즈가 크다. alpha_acc 를 낮게(더 강한
평활화) 두고, warmup 이전(age < 3)의 가속도는 0 으로 보고한다.
"""
from __future__ import annotations

import json
import math
from dataclasses import dataclass, field
from typing import Any, Iterable

import numpy as np

from .analyzers.base import Detection


@dataclass
class KinematicsConfig:
    # 실제 단위 변환 (둘 중 하나). 둘 다 없으면 px 단위로 보고한다.
    meters_per_pixel: float | None = None
    # 이미지 픽셀 → 지면 평면(m) 3x3 호모그래피. bbox 하단 중심(지면 접점)을 변환한다.
    homography: list[list[float]] | None = None
    # 클래스별 질량(kg). 모멘텀 계산에 사용. 없으면 default_mass_kg, 그것도 없으면 None.
    mass_kg: dict[str, float] = field(default_factory=dict)
    default_mass_kg: float | None = None
    # EMA 평활 계수 (1=평활 없음, 작을수록 부드럽지만 반응이 느림)
    velocity_alpha: float = 0.5
    acceleration_alpha: float = 0.3
    # 이 시간(초) 동안 다시 보이지 않으면 트랙 삭제
    max_age_s: float = 1.0
    # track_id 가 없는 검출(MobileNet-SSD 등)을 기존 트랙에 붙일 최소 IoU
    iou_threshold: float = 0.3
    # dt 가 이보다 작으면(같은 타임스탬프 등) 업데이트를 건너뛴다
    min_dt_s: float = 1e-3

    @classmethod
    def from_file(cls, path: str) -> "KinematicsConfig":
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        valid = set(cls.__dataclass_fields__)
        unknown = [k for k in data if k not in valid]
        if unknown:
            raise ValueError(f"알 수 없는 설정 키: {unknown} (사용 가능: {sorted(valid)})")
        return cls(**data)


@dataclass
class _Track:
    track_id: int
    label: str
    bbox: tuple[int, int, int, int]
    pos: np.ndarray
    area: float
    ts: float
    vel: np.ndarray = field(default_factory=lambda: np.zeros(2))
    acc: np.ndarray = field(default_factory=lambda: np.zeros(2))
    approach: float = 0.0
    age: int = 1
    last: dict[str, Any] | None = None


def _iou(a: tuple[int, int, int, int], b: tuple[int, int, int, int]) -> float:
    ax, ay, aw, ah = a
    bx, by, bw, bh = b
    ix = max(0, min(ax + aw, bx + bw) - max(ax, bx))
    iy = max(0, min(ay + ah, by + bh) - max(ay, by))
    inter = ix * iy
    union = aw * ah + bw * bh - inter
    return inter / union if union > 0 else 0.0


class KinematicsEstimator:
    """track_id 별 상태를 유지하며 속도/가속도/모멘텀을 계산한다.

    사용 예)
        est = KinematicsEstimator(KinematicsConfig(meters_per_pixel=0.002,
                                                   mass_kg={"person": 70}))
        for frame, ts in frames:
            dets = analyzer.analyze(frame).detections
            est.update(dets, ts)
            for d in dets:
                print(d.track_id, d.kinematics["speed"], d.kinematics["momentum"])
    """

    def __init__(self, config: KinematicsConfig | None = None):
        self.config = config or KinematicsConfig()
        self._tracks: dict[int, _Track] = {}
        self._next_auto_id = 1_000_000  # 외부 tracker ID 와 겹치지 않도록 큰 수부터
        self._H = (
            np.asarray(self.config.homography, dtype=np.float64)
            if self.config.homography is not None else None
        )
        if self._H is not None and self._H.shape != (3, 3):
            raise ValueError("homography 는 3x3 행렬이어야 합니다")

    @property
    def unit(self) -> str:
        return "m" if (self._H is not None or self.config.meters_per_pixel) else "px"

    def reset(self) -> None:
        self._tracks.clear()

    # ------------------------------------------------------------------ 좌표
    def _position(self, bbox: tuple[int, int, int, int]) -> np.ndarray:
        x, y, w, h = bbox
        if self._H is not None:
            # 지면 접점 = bbox 하단 중심
            p = self._H @ np.array([x + w / 2.0, y + h, 1.0])
            return p[:2] / p[2] if abs(p[2]) > 1e-12 else p[:2]
        c = np.array([x + w / 2.0, y + h / 2.0])
        if self.config.meters_per_pixel:
            return c * self.config.meters_per_pixel
        return c

    def _mass(self, label: str) -> float | None:
        return self.config.mass_kg.get(label, self.config.default_mass_kg)

    # ------------------------------------------------------------------ 매칭
    def _assign_ids(self, detections: list[Detection]) -> None:
        """track_id 가 없는 검출에 같은 라벨 + IoU 탐욕 매칭으로 ID 를 부여한다."""
        taken = {d.track_id for d in detections if d.track_id is not None}
        pairs = []
        for i, d in enumerate(detections):
            if d.track_id is not None:
                continue
            for tid, t in self._tracks.items():
                if tid in taken or t.label != d.label:
                    continue
                iou = _iou(d.bbox, t.bbox)
                if iou >= self.config.iou_threshold:
                    pairs.append((iou, i, tid))
        pairs.sort(reverse=True)
        used_det: set[int] = set()
        for _, i, tid in pairs:
            if i in used_det or tid in taken:
                continue
            detections[i].track_id = tid
            used_det.add(i)
            taken.add(tid)
        for d in detections:
            if d.track_id is None:
                d.track_id = self._next_auto_id
                self._next_auto_id += 1

    # ------------------------------------------------------------------ 갱신
    def update(self, detections: Iterable[Detection], ts: float, predict_only: bool = False) -> None:
        """detections 에 track_id / kinematics 를 채운다 (in-place).

        predict_only=True: 분석기가 추론을 건너뛴(stale) 프레임. 상태는 바꾸지 않고
        직전 값을 그대로 붙인다 (같은 bbox 를 다시 미분하면 속도가 0 으로 튀므로).
        """
        dets = list(detections)
        self._assign_ids(dets)
        cfg = self.config

        for d in dets:
            t = self._tracks.get(d.track_id)
            if predict_only:
                if t is not None and t.last is not None:
                    d.kinematics = dict(t.last)
                continue

            pos = self._position(d.bbox)
            area = float(d.bbox[2] * d.bbox[3])
            if t is None or t.label != d.label:
                t = _Track(d.track_id, d.label, d.bbox, pos, area, ts)
                self._tracks[d.track_id] = t
            else:
                dt = ts - t.ts
                if dt >= cfg.min_dt_s:
                    v_raw = (pos - t.pos) / dt
                    v_new = cfg.velocity_alpha * v_raw + (1 - cfg.velocity_alpha) * t.vel \
                        if t.age > 1 else v_raw
                    if t.age >= 2:
                        a_raw = (v_new - t.vel) / dt
                        t.acc = cfg.acceleration_alpha * a_raw + (1 - cfg.acceleration_alpha) * t.acc
                    # 면적 변화율: 커지면(+) 다가오는 중. 1/TTC 근사치로 활용 가능
                    if t.area > 0:
                        rate = (area - t.area) / t.area / dt
                        t.approach = cfg.velocity_alpha * rate + (1 - cfg.velocity_alpha) * t.approach
                    t.vel = v_new
                    t.pos, t.bbox, t.area, t.ts = pos, d.bbox, area, ts
                    t.age += 1

            t.last = self._snapshot(t)
            d.kinematics = dict(t.last)

        if not predict_only:
            dead = [tid for tid, t in self._tracks.items() if ts - t.ts > cfg.max_age_s]
            for tid in dead:
                del self._tracks[tid]

    def _snapshot(self, t: _Track) -> dict[str, Any]:
        speed = float(np.hypot(*t.vel))
        acc = t.acc if t.age >= 3 else np.zeros(2)
        mass = self._mass(t.label)
        return {
            "unit": self.unit,
            "position": [round(float(v), 4) for v in t.pos],
            "velocity": [round(float(v), 4) for v in t.vel],
            "speed": round(speed, 4),
            "acceleration": [round(float(v), 4) for v in acc],
            "accel": round(float(np.hypot(*acc)), 4),
            "heading_deg": round(math.degrees(math.atan2(t.vel[1], t.vel[0])), 1) if speed > 0 else None,
            "momentum": round(mass * speed, 4) if mass is not None else None,
            "approach": round(t.approach, 4),
            "age": t.age,
        }
