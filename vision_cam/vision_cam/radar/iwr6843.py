"""TI IWR6843 mmWave SDK out-of-box demo UART 출력(TLV) 파서.

프레임 = magic(8B) + header(32B) + TLV 들. 쓰는 TLV:
  1: 검출 점 (x, y, z, doppler) float32 x4
  7: 점별 부가정보 (snr, noise) int16 x2, 단위 0.1 dB
좌표계(센서 기준): +y 정면, +x 오른쪽, +z 위, 단위 m / m/s.
"""
from __future__ import annotations

import math
import struct
from dataclasses import dataclass, field

MAGIC = b"\x02\x01\x04\x03\x06\x05\x08\x07"
HEADER = struct.Struct("<8I")  # version, totalPacketLen, platform, frameNumber, timeCpuCycles, numDetectedObj, numTLVs, subFrameNumber
TLV_HEADER = struct.Struct("<2I")
POINT = struct.Struct("<4f")
SIDE_INFO = struct.Struct("<2h")
TLV_POINTS = 1
TLV_SIDE_INFO = 7
MAX_PACKET = 64 * 1024


@dataclass
class RadarPoint:
    x: float
    y: float
    z: float
    doppler: float
    snr_db: float = 0.0

    @property
    def range(self) -> float:
        return math.sqrt(self.x * self.x + self.y * self.y + self.z * self.z)

    @property
    def azimuth_deg(self) -> float:
        return math.degrees(math.atan2(self.x, self.y))

    @property
    def elevation_deg(self) -> float:
        return math.degrees(math.atan2(self.z, math.hypot(self.x, self.y)))


@dataclass
class RadarFrame:
    frame_number: int
    points: list[RadarPoint] = field(default_factory=list)


def encode_frame(frame_number: int, points: list[RadarPoint]) -> bytes:
    """테스트·시뮬레이터용: 파서가 읽는 것과 같은 바이트열을 만든다."""
    tlvs = b""
    if points:
        body = b"".join(POINT.pack(p.x, p.y, p.z, p.doppler) for p in points)
        tlvs += TLV_HEADER.pack(TLV_POINTS, len(body)) + body
        side = b"".join(SIDE_INFO.pack(int(round(p.snr_db * 10)), 0) for p in points)
        tlvs += TLV_HEADER.pack(TLV_SIDE_INFO, len(side)) + side
    num_tlvs = 2 if points else 0
    total = len(MAGIC) + HEADER.size + len(tlvs)
    header = HEADER.pack(0x03060000, total, 0xA6843, frame_number, 0, len(points), num_tlvs, 0)
    return MAGIC + header + tlvs


class TlvParser:
    """UART 바이트를 조금씩 넣으면 완성된 RadarFrame 들을 돌려준다."""

    def __init__(self):
        self._buf = bytearray()

    def feed(self, data: bytes) -> list[RadarFrame]:
        self._buf += data
        frames = []
        while True:
            start = self._buf.find(MAGIC)
            if start < 0:
                del self._buf[: max(0, len(self._buf) - len(MAGIC) + 1)]
                return frames
            if start:
                del self._buf[:start]
            if len(self._buf) < len(MAGIC) + HEADER.size:
                return frames
            fields = HEADER.unpack_from(self._buf, len(MAGIC))
            total = fields[1]
            if total < len(MAGIC) + HEADER.size or total > MAX_PACKET:
                del self._buf[: len(MAGIC)]  # 깨진 헤더: 다음 magic 을 찾는다
                continue
            if len(self._buf) < total:
                return frames
            packet = bytes(self._buf[:total])
            del self._buf[:total]
            frame = _parse_packet(packet, fields)
            if frame is not None:
                frames.append(frame)


def _parse_packet(packet: bytes, fields: tuple) -> RadarFrame | None:
    frame_number, num_points, num_tlvs = fields[3], fields[5], fields[6]
    offset = len(MAGIC) + HEADER.size
    points: list[RadarPoint] = []
    snrs: list[float] = []
    for _ in range(num_tlvs):
        if offset + TLV_HEADER.size > len(packet):
            return None
        tlv_type, length = TLV_HEADER.unpack_from(packet, offset)
        offset += TLV_HEADER.size
        body = packet[offset: offset + length]
        if len(body) < length:
            return None
        offset += length
        if tlv_type == TLV_POINTS:
            n = min(num_points, length // POINT.size)
            points = [RadarPoint(*POINT.unpack_from(body, i * POINT.size)) for i in range(n)]
        elif tlv_type == TLV_SIDE_INFO:
            n = length // SIDE_INFO.size
            snrs = [SIDE_INFO.unpack_from(body, i * SIDE_INFO.size)[0] / 10.0 for i in range(n)]
    for p, snr in zip(points, snrs):
        p.snr_db = snr
    return RadarFrame(frame_number, points)
