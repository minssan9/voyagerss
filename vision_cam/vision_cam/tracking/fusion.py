"""카메라 방위 + 레이더 거리 융합 다중 표적 추적기.

측정은 모두 월드 좌표 각도(geometry.py 규약)로 넣는다. 레이더 측정을 먼저 매칭하고
남은 트랙에 카메라 측정을 매칭한다. 둘 다 같은 트랙의 칼만 필터를 갱신한다.
"""
from __future__ import annotations

import itertools
from dataclasses import dataclass, field

import numpy as np

from .assignment import hungarian
from .geometry import spherical_to_xyz
from .kalman import CAMERA_H, RADAR_H, AngleRangeKalman
from .threat import ThreatRules, assess

CHI2_2DOF_99 = 9.21
CHI2_4DOF_99 = 13.28


@dataclass
class CameraMeasurement:
    az: float
    el: float
    label: str = "aerial"
    score: float = 1.0


@dataclass
class RadarMeasurement:
    az: float
    el: float
    range: float
    radial_velocity: float
    snr_db: float = 0.0


@dataclass
class TrackerConfig:
    camera_sigma_deg: float = 0.6
    radar_angle_sigma_deg: float = 2.0
    radar_range_sigma_m: float = 0.6
    radar_velocity_sigma: float = 0.4
    confirm_hits: int = 3
    tentative_max_misses: int = 3
    max_coast_s: float = 2.0
    min_radar_snr_for_birth: float = 10.0
    merge_angle_deg: float = 2.5
    merge_range_m: float = 5.0


@dataclass
class Track:
    id: int
    kf: AngleRangeKalman
    created: float
    updated: float
    label: str = "aerial"
    hits: int = 1
    misses: int = 0
    confirmed: bool = False
    camera_hits: int = 0
    radar_hits: int = 0
    threat: str = "LOW"
    threat_score: float = 0.0
    history: list[tuple[float, float]] = field(default_factory=list)

    @property
    def range(self) -> float | None:
        return float(self.kf.x[2]) if self.kf.range_known else None

    def to_dict(self) -> dict:
        az, el, r, daz, de, dr = (float(v) for v in self.kf.x)
        out = {
            "id": self.id,
            "status": "confirmed" if self.confirmed else "tentative",
            "label": self.label,
            "azimuth": round(az, 2),
            "elevation": round(el, 2),
            "range": round(r, 1) if self.kf.range_known else None,
            "radialVelocity": round(dr, 2) if self.kf.range_known else None,
            "angularRate": [round(daz, 2), round(de, 2)],
            "sources": [s for s, n in (("camera", self.camera_hits), ("radar", self.radar_hits)) if n],
            "hits": self.hits,
            "age": round(self.updated - self.created, 2),
            "threat": self.threat,
            "threatScore": self.threat_score,
            "updatedAt": round(self.updated, 3),
        }
        if self.kf.range_known:
            out["position"] = [round(float(c), 1) for c in spherical_to_xyz(az, el, r)]
        return out


class MultiTargetTracker:
    def __init__(self, config: TrackerConfig | None = None, threat_rules: ThreatRules | None = None):
        self.config = config or TrackerConfig()
        self.threat_rules = threat_rules or ThreatRules()
        self.tracks: list[Track] = []
        self._ids = itertools.count(1)
        self._last_t: float | None = None
        c = self.config
        self._R_cam = np.diag([c.camera_sigma_deg**2] * 2)
        self._R_radar = np.diag([
            c.radar_angle_sigma_deg**2, c.radar_angle_sigma_deg**2, c.radar_range_sigma_m**2, c.radar_velocity_sigma**2,
        ])

    def step(
        self, t: float, camera: list[CameraMeasurement] | None = None, radar: list[RadarMeasurement] | None = None
    ) -> list[Track]:
        camera, radar = camera or [], radar or []
        dt = 0.0 if self._last_t is None else t - self._last_t
        self._last_t = t
        for tr in self.tracks:
            tr.kf.predict(dt)

        radar_left, updated = self._match(
            radar, RADAR_H, self._R_radar, CHI2_4DOF_99,
            lambda m: np.array([m.az, m.el, m.range, m.radial_velocity]),
            lambda tr, m: self._on_radar(tr, m, t),
        )
        # 새 레이더 트랙을 먼저 만들어 같은 물체의 카메라 측정이 그 트랙에 붙게 한다.
        # 카메라는 레이더로 이미 갱신된 트랙에도 매칭한다 (두 센서가 같은 물체를 보는 정상 경우).
        born = set()
        for m in radar_left:
            if m.snr_db >= self.config.min_radar_snr_for_birth:
                tr = self._new(t, AngleRangeKalman(m.az, m.el, m.range, m.radial_velocity))
                tr.radar_hits = 1
                born.add(tr.id)
        camera_left, camera_hit = self._match(
            camera, CAMERA_H, self._R_cam, CHI2_2DOF_99,
            lambda m: np.array([m.az, m.el]),
            lambda tr, m: self._on_camera(tr, m, t),
        )
        updated |= born | camera_hit

        for tr in self.tracks:
            if tr.id not in updated:
                tr.misses += 1
        for m in camera_left:
            tr = self._new(t, AngleRangeKalman(m.az, m.el))
            tr.camera_hits, tr.label = 1, m.label

        self._merge()
        self._prune(t)
        for tr in self.tracks:
            tr.threat, tr.threat_score = assess(
                tr.range, float(tr.kf.x[5]) if tr.kf.range_known else None, tr.label, tr.confirmed, self.threat_rules
            )
        return self.tracks

    def confirmed(self) -> list[Track]:
        return [t for t in self.tracks if t.confirmed]

    def _match(self, measurements, H, R, gate, to_z, on_hit):
        """측정-트랙 매칭. (남은 측정, 갱신된 트랙 id) 를 돌려준다."""
        candidates = list(self.tracks)
        if not measurements or not candidates:
            return list(measurements), set()
        cost = np.array([[tr.kf.mahalanobis2(to_z(m), H, R) for m in measurements] for tr in candidates])
        matched, hit = set(), set()
        for i, j in hungarian(cost, gate):
            tr, m = candidates[i], measurements[j]
            tr.kf.update(to_z(m), H, R)
            on_hit(tr, m)
            hit.add(tr.id)
            matched.add(j)
        return [m for j, m in enumerate(measurements) if j not in matched], hit

    def _on_radar(self, tr: Track, m: RadarMeasurement, t: float) -> None:
        tr.radar_hits += 1
        self._hit(tr, t)

    def _on_camera(self, tr: Track, m: CameraMeasurement, t: float) -> None:
        tr.camera_hits += 1
        if m.label != "aerial" or tr.label == "aerial":
            tr.label = m.label
        self._hit(tr, t)

    def _hit(self, tr: Track, t: float) -> None:
        if tr.updated != t:  # 한 스텝에 두 센서가 갱신해도 1회로 센다
            tr.hits += 1
        tr.misses = 0
        tr.updated = t
        if tr.hits >= self.config.confirm_hits:
            tr.confirmed = True
        tr.history.append((round(float(tr.kf.x[0]), 2), round(float(tr.kf.x[1]), 2)))
        del tr.history[:-50]

    def _new(self, t: float, kf: AngleRangeKalman) -> Track:
        tr = Track(id=next(self._ids), kf=kf, created=t, updated=t)
        tr.history.append((round(float(kf.x[0]), 2), round(float(kf.x[1]), 2)))
        self.tracks.append(tr)
        return tr

    def _merge(self) -> None:
        """같은 물체로 보이는 트랙을 하나로 합친다. 거리를 아는 트랙, 오래된 트랙을 남긴다."""
        c = self.config
        ranked = sorted(self.tracks, key=lambda tr: (not tr.kf.range_known, not tr.confirmed, -tr.hits, tr.id))
        kept: list[Track] = []
        for tr in ranked:
            twin = next((k for k in kept if self._same_object(k, tr)), None)
            if twin is None:
                kept.append(tr)
                continue
            twin.camera_hits += tr.camera_hits
            twin.radar_hits += tr.radar_hits
            if twin.label == "aerial":
                twin.label = tr.label
        self.tracks = sorted(kept, key=lambda tr: tr.id)

    def _same_object(self, a: Track, b: Track) -> bool:
        c = self.config
        va, vb = spherical_to_xyz(a.kf.x[0], a.kf.x[1]), spherical_to_xyz(b.kf.x[0], b.kf.x[1])
        sep = float(np.degrees(np.arccos(np.clip(va @ vb, -1.0, 1.0))))
        if sep > c.merge_angle_deg:
            return False
        if a.kf.range_known and b.kf.range_known:
            return abs(float(a.kf.x[2] - b.kf.x[2])) <= c.merge_range_m
        return True

    def _prune(self, t: float) -> None:
        c = self.config
        self.tracks = [
            tr for tr in self.tracks
            if (tr.confirmed and t - tr.updated <= c.max_coast_s)
            or (not tr.confirmed and tr.misses < c.tentative_max_misses)
        ]
