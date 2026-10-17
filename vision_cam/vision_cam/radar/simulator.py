"""하드웨어 없이 돌려보기 위한 가상 공역.

월드 좌표(m)의 등속 목표물을 두고, 현재 팬·틸트 자세에서 레이더가 보게 될 점들과
카메라가 보게 될 하늘 프레임을 만든다. 레이더 점은 실제 UART 바이트로도 인코딩할 수 있다.
"""
from __future__ import annotations

import math
from dataclasses import dataclass

import cv2
import numpy as np

from ..tracking.geometry import spherical_to_xyz, world_to_sensor, xyz_to_spherical
from .iwr6843 import RadarFrame, RadarPoint, encode_frame


@dataclass
class SimTarget:
    name: str
    position: tuple[float, float, float]
    velocity: tuple[float, float, float]
    size_m: float = 0.4
    start: float = 0.0
    end: float = math.inf

    def at(self, t: float) -> np.ndarray | None:
        if not (self.start <= t <= self.end):
            return None
        dt = t - self.start
        return np.array(self.position) + dt * np.array(self.velocity)


def default_scenario() -> list[SimTarget]:
    """정면 오른쪽에서 접근하는 드론 1, 왼쪽을 가로지르는 새 1, 늦게 나타나는 드론 1."""
    return [
        SimTarget("drone-a", tuple(spherical_to_xyz(20, 15, 120)), (-1.5, -6.0, -0.5), 0.35),
        SimTarget("bird", tuple(spherical_to_xyz(-35, 25, 60)), (4.0, 0.5, 0.2), 0.25, end=25),
        SimTarget("drone-b", tuple(spherical_to_xyz(-10, 30, 90)), (2.0, -3.0, 0.0), 0.35, start=8),
    ]


class AirspaceSimulator:
    def __init__(
        self,
        targets: list[SimTarget] | None = None,
        radar_fov_deg: float = 60.0,
        radar_max_range: float = 150.0,
        angle_noise_deg: float = 0.8,
        range_noise_m: float = 0.3,
        clutter_per_frame: float = 1.5,
        seed: int = 0,
    ):
        self.targets = default_scenario() if targets is None else targets
        self.radar_fov_deg = radar_fov_deg
        self.radar_max_range = radar_max_range
        self.angle_noise_deg = angle_noise_deg
        self.range_noise_m = range_noise_m
        self.clutter_per_frame = clutter_per_frame
        self._rng = np.random.default_rng(seed)
        self._frame_number = 0

    def truth(self, t: float) -> list[tuple[str, np.ndarray]]:
        out = []
        for target in self.targets:
            pos = target.at(t)
            if pos is not None:
                out.append((target.name, pos))
        return out

    def radar_frame(self, t: float, pan_deg: float, tilt_deg: float) -> RadarFrame:
        self._frame_number += 1
        points = []
        for target in self.targets:
            pos = target.at(t)
            if pos is None:
                continue
            az, el, r = xyz_to_spherical(world_to_sensor(pos, pan_deg, tilt_deg))
            if r > self.radar_max_range or abs(az) > self.radar_fov_deg or abs(el) > self.radar_fov_deg:
                continue
            radial = float(np.dot(np.array(target.velocity), pos / np.linalg.norm(pos)))
            snr = max(6.0, 30.0 - 20 * math.log10(max(r, 1.0) / 10))
            for _ in range(int(self._rng.integers(2, 5))):
                naz = az + self._rng.normal(0, self.angle_noise_deg)
                nel = el + self._rng.normal(0, self.angle_noise_deg)
                nr = r + self._rng.normal(0, self.range_noise_m)
                x, y, z = spherical_to_xyz(naz, nel, nr)
                points.append(RadarPoint(x, y, z, radial + self._rng.normal(0, 0.1), snr + self._rng.normal(0, 1)))
        for _ in range(int(self._rng.poisson(self.clutter_per_frame))):
            x, y, z = spherical_to_xyz(
                self._rng.uniform(-self.radar_fov_deg, self.radar_fov_deg),
                self._rng.uniform(-5, self.radar_fov_deg),
                self._rng.uniform(5, self.radar_max_range),
            )
            points.append(RadarPoint(x, y, z, self._rng.normal(0, 0.3), self._rng.uniform(0, 8)))
        return RadarFrame(self._frame_number, points)

    def radar_bytes(self, t: float, pan_deg: float, tilt_deg: float) -> bytes:
        frame = self.radar_frame(t, pan_deg, tilt_deg)
        return encode_frame(frame.frame_number, frame.points)

    def camera_frame(
        self, t: float, pan_deg: float, tilt_deg: float, width: int, height: int, hfov_deg: float, vfov_deg: float
    ) -> np.ndarray:
        """하늘 그라데이션 위에 목표물을 원근에 맞는 크기의 점으로 그린다."""
        frame = np.zeros((height, width, 3), dtype=np.uint8)
        top = np.array([235, 205, 165], dtype=np.float32)
        bottom = np.array([200, 185, 170], dtype=np.float32)
        ramp = np.linspace(0, 1, height, dtype=np.float32)[:, None]
        frame[:] = (top * (1 - ramp) + bottom * ramp).astype(np.uint8)[:, None, :]
        fx = (width / 2) / math.tan(math.radians(hfov_deg) / 2)
        fy = (height / 2) / math.tan(math.radians(vfov_deg) / 2)
        for target in self.targets:
            pos = target.at(t)
            if pos is None:
                continue
            x, y, z = world_to_sensor(pos, pan_deg, tilt_deg)
            if y <= 1.0:
                continue
            px, py = width / 2 + fx * x / y, height / 2 - fy * z / y
            radius = max(2, int(round(fx * target.size_m / y)))
            if -radius <= px < width + radius and -radius <= py < height + radius:
                cv2.circle(frame, (int(px), int(py)), radius, (40, 40, 45), -1)
        noise = self._rng.normal(0, 2.0, frame.shape)
        return np.clip(frame.astype(np.float32) + noise, 0, 255).astype(np.uint8)
