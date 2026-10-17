"""mmWave 레이더 입력: IWR6843 UART 파서, 점 군집화, 시뮬레이터."""
from __future__ import annotations

import math
from dataclasses import dataclass

from .iwr6843 import RadarFrame, RadarPoint, TlvParser, encode_frame


@dataclass
class RadarDetection:
    """점 군집 하나. 각도는 센서 기준, 거리 m, 시선속도 m/s(+ 멀어짐)."""

    range: float
    azimuth_deg: float
    elevation_deg: float
    radial_velocity: float
    snr_db: float
    points: int


def cluster_points(
    points: list[RadarPoint], range_eps: float = 1.5, angle_eps_deg: float = 4.0, min_snr_db: float = 0.0
) -> list[RadarDetection]:
    """거리차 range_eps(m) 와 각도차 angle_eps_deg 안으로 이어진 점들을 한 물체로 묶는다.

    레이더 각도 오차는 거리에 비례해 점을 벌리므로, 직교 좌표 거리 대신 극좌표로 판단한다.
    """
    pts = [p for p in points if p.snr_db >= min_snr_db]
    seen = [False] * len(pts)
    out = []
    for i in range(len(pts)):
        if seen[i]:
            continue
        seen[i] = True
        group, stack = [], [i]
        while stack:
            j = stack.pop()
            group.append(pts[j])
            for k in range(len(pts)):
                if not seen[k] and _near(pts[j], pts[k], range_eps, angle_eps_deg):
                    seen[k] = True
                    stack.append(k)
        weights = [max(p.snr_db, 0.1) for p in group]
        total = sum(weights)
        cx = sum(p.x * w for p, w in zip(group, weights)) / total
        cy = sum(p.y * w for p, w in zip(group, weights)) / total
        cz = sum(p.z * w for p, w in zip(group, weights)) / total
        centroid = RadarPoint(cx, cy, cz, sum(p.doppler * w for p, w in zip(group, weights)) / total)
        out.append(RadarDetection(
            range=centroid.range,
            azimuth_deg=centroid.azimuth_deg,
            elevation_deg=centroid.elevation_deg,
            radial_velocity=centroid.doppler,
            snr_db=max(p.snr_db for p in group),
            points=len(group),
        ))
    return out


def _near(a: RadarPoint, b: RadarPoint, range_eps: float, angle_eps_deg: float) -> bool:
    if abs(a.range - b.range) > range_eps:
        return False
    dot = (a.x * b.x + a.y * b.y + a.z * b.z) / max(a.range * b.range, 1e-9)
    return math.degrees(math.acos(max(-1.0, min(1.0, dot)))) <= angle_eps_deg


class SerialRadar:
    """IWR6843 데이터 UART 를 읽는다. pyserial 필요 (pip install pyserial).

    CLI 포트로 chirp 설정(.cfg)을 보내는 일은 TI 데모 도구로 미리 해둔다고 가정한다.
    """

    def __init__(self, port: str, baudrate: int = 921600, timeout: float = 0.05):
        import serial  # 선택 의존성

        self._serial = serial.Serial(port, baudrate=baudrate, timeout=timeout)
        self._parser = TlvParser()

    def read(self) -> list[RadarFrame]:
        data = self._serial.read(self._serial.in_waiting or 1)
        return self._parser.feed(data) if data else []

    def close(self) -> None:
        self._serial.close()


__all__ = [
    "RadarDetection",
    "RadarFrame",
    "RadarPoint",
    "SerialRadar",
    "TlvParser",
    "cluster_points",
    "encode_frame",
]
