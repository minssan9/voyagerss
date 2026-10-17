"""센서 좌표 ↔ 월드 좌표 변환.

월드: 마운트 기준 +y 정면(팬 0°), +x 오른쪽, +z 위. 방위각은 +y 에서 +x 쪽(시계방향)이 양수,
고각은 위가 양수. 센서(카메라·레이더)는 헤드에 붙어 팬·틸트로 같이 돈다.
"""
from __future__ import annotations

import math

import numpy as np


def wrap_deg(a: float) -> float:
    return (a + 180.0) % 360.0 - 180.0


def spherical_to_xyz(az_deg: float, el_deg: float, r: float = 1.0) -> np.ndarray:
    az, el = math.radians(az_deg), math.radians(el_deg)
    return np.array([r * math.cos(el) * math.sin(az), r * math.cos(el) * math.cos(az), r * math.sin(el)])


def xyz_to_spherical(v: np.ndarray) -> tuple[float, float, float]:
    x, y, z = (float(c) for c in v)
    r = math.sqrt(x * x + y * y + z * z)
    return math.degrees(math.atan2(x, y)), math.degrees(math.atan2(z, math.hypot(x, y))), r


def _rot_pan(p_deg: float) -> np.ndarray:
    p = math.radians(p_deg)
    c, s = math.cos(p), math.sin(p)
    return np.array([[c, s, 0.0], [-s, c, 0.0], [0.0, 0.0, 1.0]])


def _rot_tilt(t_deg: float) -> np.ndarray:
    t = math.radians(t_deg)
    c, s = math.cos(t), math.sin(t)
    return np.array([[1.0, 0.0, 0.0], [0.0, c, -s], [0.0, s, c]])


def sensor_to_world(v: np.ndarray, pan_deg: float, tilt_deg: float) -> np.ndarray:
    return _rot_pan(pan_deg) @ (_rot_tilt(tilt_deg) @ v)


def world_to_sensor(v: np.ndarray, pan_deg: float, tilt_deg: float) -> np.ndarray:
    return _rot_tilt(tilt_deg).T @ (_rot_pan(pan_deg).T @ v)


def sensor_bearing_to_world(az_deg: float, el_deg: float, pan_deg: float, tilt_deg: float) -> tuple[float, float]:
    az, el, _ = xyz_to_spherical(sensor_to_world(spherical_to_xyz(az_deg, el_deg), pan_deg, tilt_deg))
    return az, el


def pixel_to_sensor_bearing(
    px: float, py: float, width: int, height: int, hfov_deg: float, vfov_deg: float
) -> tuple[float, float]:
    """핀홀 카메라: 화소 → 센서 기준 (방위각, 고각)."""
    fx = (width / 2) / math.tan(math.radians(hfov_deg) / 2)
    fy = (height / 2) / math.tan(math.radians(vfov_deg) / 2)
    dx = (px - width / 2) / fx
    dy = (height / 2 - py) / fy
    v = np.array([dx, 1.0, dy])
    az, el, _ = xyz_to_spherical(v)
    return az, el
