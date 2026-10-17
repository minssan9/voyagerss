"""팬·틸트 마운트 추종 제어 (관측·촬영용).

경보 점수가 가장 높은 확정 트랙으로 카메라를 돌린다. 각도는 tracking.geometry 의 월드 규약
(팬 0° = 정면, 오른쪽 +, 틸트 0° = 수평, 위 +)이고, 서보 각도로는 드라이버 직전에 바꾼다.
하드웨어: hardware/airspace_tracker (MG996R x2 + PCA9685).
"""
from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Protocol

from .tracking import Track

PCA9685_ADDR = 0x40
_MODE1, _MODE2, _PRESCALE, _LED0_ON_L = 0x00, 0x01, 0xFE, 0x06


class ServoDriver(Protocol):
    def set_angle(self, channel: int, servo_deg: float) -> None: ...
    def release(self) -> None: ...


class MockServoDriver:
    """하드웨어 없이 마지막 명령 각도만 기억한다 (맥 개발·테스트용)."""

    def __init__(self):
        self.angles: dict[int, float] = {}

    def set_angle(self, channel: int, servo_deg: float) -> None:
        self.angles[channel] = servo_deg

    def release(self) -> None:
        self.angles.clear()


class Pca9685Driver:
    """PCA9685 를 I²C 로 직접 구동한다. 라즈베리파이에서 pip install smbus2 필요."""

    def __init__(self, bus: int = 1, address: int = PCA9685_ADDR, freq_hz: float = 50.0,
                 min_pulse_us: float = 500.0, max_pulse_us: float = 2500.0):
        from smbus2 import SMBus  # 선택 의존성

        self._bus = SMBus(bus)
        self._addr = address
        self._period_us = 1_000_000 / freq_hz
        self.min_pulse_us, self.max_pulse_us = min_pulse_us, max_pulse_us
        prescale = round(25_000_000 / (4096 * freq_hz)) - 1
        self._bus.write_byte_data(self._addr, _MODE1, 0x10)  # sleep
        self._bus.write_byte_data(self._addr, _PRESCALE, prescale)
        self._bus.write_byte_data(self._addr, _MODE2, 0x04)  # totem pole
        self._bus.write_byte_data(self._addr, _MODE1, 0x20)  # wake + auto-increment
        time.sleep(0.005)

    def set_angle(self, channel: int, servo_deg: float) -> None:
        servo_deg = max(0.0, min(180.0, servo_deg))
        pulse = self.min_pulse_us + (self.max_pulse_us - self.min_pulse_us) * servo_deg / 180.0
        self._write(channel, int(round(pulse * 4096 / self._period_us)))

    def release(self) -> None:
        for ch in range(16):
            self._write(ch, 0)

    def _write(self, channel: int, off: int) -> None:
        reg = _LED0_ON_L + 4 * channel
        self._bus.write_i2c_block_data(self._addr, reg, [0, 0, off & 0xFF, off >> 8])


@dataclass
class GimbalConfig:
    pan_channel: int = 0
    tilt_channel: int = 1
    pan_min: float = -90.0
    pan_max: float = 90.0
    tilt_min: float = -10.0
    tilt_max: float = 90.0
    # 서보 각도 = center + sign * 월드 각도 (조립 방향에 맞춰 부호·트림 조정)
    pan_center: float = 90.0
    pan_sign: float = 1.0
    tilt_center: float = 90.0
    tilt_sign: float = -1.0
    max_rate_dps: float = 120.0
    deadband_deg: float = 0.5
    lead_s: float = 0.15
    switch_margin: float = 0.15
    lost_timeout_s: float = 3.0
    home_pan: float = 0.0
    home_tilt: float = 20.0


class GimbalController:
    def __init__(self, driver: ServoDriver, config: GimbalConfig | None = None):
        self.driver = driver
        self.config = config or GimbalConfig()
        self.pan = self.config.home_pan
        self.tilt = self.config.home_tilt
        self.target_id: int | None = None
        self._last_t: float | None = None
        self._last_seen: float | None = None
        self._send()

    @property
    def pose(self) -> tuple[float, float]:
        return self.pan, self.tilt

    def select(self, tracks: list[Track]) -> Track | None:
        confirmed = [t for t in tracks if t.confirmed]
        if not confirmed:
            return None
        best = max(confirmed, key=lambda t: (t.threat_score, -(t.range or 1e9)))
        current = next((t for t in confirmed if t.id == self.target_id), None)
        if current is not None and best.threat_score - current.threat_score < self.config.switch_margin:
            return current
        return best

    def update(self, tracks: list[Track], now: float) -> tuple[float, float]:
        c = self.config
        dt = 0.0 if self._last_t is None else max(0.0, now - self._last_t)
        self._last_t = now

        target = self.select(tracks)
        if target is not None:
            self.target_id = target.id
            self._last_seen = now
            az, el, _, daz, de, _ = (float(v) for v in target.kf.x)
            want = (az + daz * c.lead_s, el + de * c.lead_s)
        elif self._last_seen is not None and now - self._last_seen < c.lost_timeout_s:
            want = (self.pan, self.tilt)  # 잠깐 놓치면 그 자리에서 기다린다
        else:
            self.target_id = None
            want = (c.home_pan, c.home_tilt)

        want_pan = max(c.pan_min, min(c.pan_max, want[0]))
        want_tilt = max(c.tilt_min, min(c.tilt_max, want[1]))
        step = c.max_rate_dps * dt
        self.pan = _approach(self.pan, want_pan, step, c.deadband_deg)
        self.tilt = _approach(self.tilt, want_tilt, step, c.deadband_deg)
        self._send()
        return self.pose

    def to_dict(self) -> dict:
        return {"pan": round(self.pan, 2), "tilt": round(self.tilt, 2), "targetId": self.target_id}

    def release(self) -> None:
        self.driver.release()

    def _send(self) -> None:
        c = self.config
        self.driver.set_angle(c.pan_channel, c.pan_center + c.pan_sign * self.pan)
        self.driver.set_angle(c.tilt_channel, c.tilt_center + c.tilt_sign * self.tilt)


def _approach(current: float, target: float, max_step: float, deadband: float) -> float:
    err = target - current
    if abs(err) <= deadband:
        return current
    return current + max(-max_step, min(max_step, err))
