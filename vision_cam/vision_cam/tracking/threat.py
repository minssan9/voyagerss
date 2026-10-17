"""거리·접근 속도·분류로 트랙의 경보 등급을 매긴다 (관측·경보용)."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class ThreatRules:
    near_m: float = 30.0
    far_m: float = 150.0
    closing_full_mps: float = 8.0
    unknown_range_proximity: float = 0.3
    bird_factor: float = 0.3
    high: float = 0.65
    medium: float = 0.35


def _clamp(v: float) -> float:
    return max(0.0, min(1.0, v))


def assess(
    range_m: float | None, radial_velocity: float | None, label: str, confirmed: bool, rules: ThreatRules
) -> tuple[str, float]:
    if not confirmed:
        return "LOW", 0.0
    if range_m is None:
        proximity = rules.unknown_range_proximity
    else:
        proximity = _clamp((rules.far_m - range_m) / (rules.far_m - rules.near_m))
    closing = _clamp(-(radial_velocity or 0.0) / rules.closing_full_mps)
    score = 0.55 * proximity + 0.35 * closing + (0.10 if label == "drone" else 0.05)
    if label == "bird":
        score *= rules.bird_factor
    score = round(_clamp(score), 3)
    level = "HIGH" if score >= rules.high else "MEDIUM" if score >= rules.medium else "LOW"
    return level, score
