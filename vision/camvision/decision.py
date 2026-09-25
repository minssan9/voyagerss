"""자율주행(소형 RC카/로봇)을 위한 규칙 기반 판단 레이어.

⚠️ 이것은 실제 자율주행 시스템이 아니다. 카메라 한 대의 2D 검출 결과만으로
STOP/SLOW/GO 를 결정하는 단순한 규칙 기반 안전장치이며, 소형 RC카나 로봇
프로젝트 수준의 참고용이다. 실제 차량 제어부는 반드시 자체 워치독을 둬야
한다: 예를 들어 --decision-heartbeat 간격의 2배 동안 이벤트가 오지 않으면
정지하도록 구현할 것.

판단 순서 (첫 번째로 맞는 규칙 적용):
  1. brightness 분석기가 트리거됨(너무 어둡거나 흐림) → blind_action (기본 STOP)
  2. 장애물이 stop_zone 안에 있거나, 박스 면적비가 stop_area_ratio 이상 → STOP
  3. 장애물이 slow_zone 안에 있거나, 박스 면적비가 slow_area_ratio 이상 → SLOW
  4. 그 외 → GO

히스테리시스: 더 위험한 상태로는 즉시 전환하고, 더 안전한 상태로는
clear_frames 프레임 연속으로 같은 결론이 나와야 전환한다 (깜빡임 방지).

점진적 반영(ramp): STOP/SLOW/GO 라는 "판단"과, 실제 차량에 내려보낼 "속도/조향
값"은 분리되어 있다. 판단이 바뀌어도 속도·조향은 accel_step/decel_step/steer_step
으로 정한 폭만큼씩만 목표값에 다가가므로 급가속·급조향이 생기지 않는다.
단, STOP 만은 예외로 속도·조향을 즉시 0 으로 만든다 — 정지가 지연되는 것은
안전상 절대 허용할 수 없기 때문이다(가속은 점진적, 제동은 즉시).
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from enum import Enum
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from .pipeline import FrameReport


class Action(str, Enum):
    GO = "GO"
    SLOW = "SLOW"
    STOP = "STOP"


_SEVERITY = {Action.GO: 0, Action.SLOW: 1, Action.STOP: 2}

_DEFAULT_OBSTACLE_CLASSES = (
    "person", "bicycle", "car", "motorbike", "bus", "dog", "cat", "horse",
    "sheep", "cow", "chair", "bottle", "pottedplant",
)


@dataclass
class DecisionRules:
    obstacle_classes: list[str] = field(default_factory=lambda: list(_DEFAULT_OBSTACLE_CLASSES))
    min_score: float = 0.5
    motion_as_obstacle: bool = False
    stop_zone: str = "danger"
    slow_zone: str = "caution"
    stop_area_ratio: float = 0.15
    slow_area_ratio: float = 0.03
    blind_action: str = "STOP"
    clear_frames: int = 5

    # 판단(STOP/SLOW/GO)에 대응하는 목표 속도 (0~1, 차량 제어부가 이 비율로 해석)
    go_speed: float = 1.0
    slow_speed: float = 0.4
    stop_speed: float = 0.0
    # 프레임당 최대 변화폭 (점진적 반영). STOP 은 예외로 항상 즉시 반영된다.
    accel_step: float = 0.15
    decel_step: float = 0.35
    steer_step: float = 0.3

    @classmethod
    def from_file(cls, path: str) -> "DecisionRules":
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        valid = {f_.name for f_ in cls.__dataclass_fields__.values()}
        unknown = [k for k in data if k not in valid]
        if unknown:
            raise ValueError(f"알 수 없는 설정 키: {unknown} (사용 가능: {sorted(valid)})")
        return cls(**data)

    def to_dict(self) -> dict[str, Any]:
        return {
            "obstacle_classes": list(self.obstacle_classes),
            "min_score": self.min_score,
            "motion_as_obstacle": self.motion_as_obstacle,
            "stop_zone": self.stop_zone,
            "slow_zone": self.slow_zone,
            "stop_area_ratio": self.stop_area_ratio,
            "slow_area_ratio": self.slow_area_ratio,
            "blind_action": self.blind_action,
            "clear_frames": self.clear_frames,
            "go_speed": self.go_speed,
            "slow_speed": self.slow_speed,
            "stop_speed": self.stop_speed,
            "accel_step": self.accel_step,
            "decel_step": self.decel_step,
            "steer_step": self.steer_step,
        }


@dataclass
class Decision:
    action: Action
    reason: str
    steer: float = 0.0
    # 실제 차량에 내려보낼 점진적(ramped) 목표 속도 (0~1). action 이 바로 그 프레임의
    # 목표는 아니다 — 여러 프레임에 걸쳐 accel_step/decel_step 만큼씩 다가간 "현재" 값.
    speed: float = 0.0
    target: dict | None = None
    changed: bool = False
    ts: float = 0.0

    def to_dict(self) -> dict[str, Any]:
        return {
            "action": self.action.value if isinstance(self.action, Action) else str(self.action),
            "reason": self.reason,
            "steer": round(self.steer, 2),
            "speed": round(self.speed, 3),
            "target": self.target,
            "changed": self.changed,
            "ts": round(self.ts, 3),
        }


def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


class DrivingDecider:
    """FrameReport 를 받아 STOP/SLOW/GO 판단을 내린다."""

    def __init__(self, rules: DecisionRules | None = None):
        self.rules = rules or DecisionRules()
        self._current = Action.GO
        self._relax_count = 0
        # 차량에 실제로 내려보내는 값 (점진적 반영 상태). 시작은 정지 상태로 둔다.
        self._speed = 0.0
        self._steer = 0.0

    def decide(self, report: "FrameReport") -> Decision:
        w, h = report.frame_size
        frame_area = w * h
        if frame_area <= 0:
            return self._apply_ramp(Decision(action=Action.GO, reason="clear", ts=report.timestamp))

        r = self.rules
        results_by_name = {res.analyzer: res for res in report.results}

        blind = results_by_name.get("brightness")
        if blind is not None and blind.triggered:
            raw = Action(r.blind_action)
            target = None
            reason = "vision_degraded"
            return self._apply_ramp(self._settle(raw, reason, target, report.timestamp))

        obstacles = []
        obj = results_by_name.get("object")
        if obj is not None:
            for d in obj.detections:
                if d.label in r.obstacle_classes and d.score >= r.min_score:
                    obstacles.append(d)
        if r.motion_as_obstacle:
            motion = results_by_name.get("motion")
            if motion is not None:
                for d in motion.detections:
                    obstacles.append(d)

        def area_ratio(d) -> float:
            return (d.bbox[2] * d.bbox[3]) / frame_area

        stop_candidates = [
            d for d in obstacles if r.stop_zone in d.zones or area_ratio(d) >= r.stop_area_ratio
        ]
        slow_candidates = [
            d for d in obstacles if r.slow_zone in d.zones or area_ratio(d) >= r.slow_area_ratio
        ]

        if stop_candidates:
            biggest = max(stop_candidates, key=area_ratio)
            reason = "obstacle_in_stop_zone" if r.stop_zone in biggest.zones else "obstacle_large"
            decision = self._settle(Action.STOP, reason, self._target_dict(biggest, area_ratio(biggest)),
                                     report.timestamp)
            return self._apply_ramp(decision)

        if slow_candidates:
            biggest = max(slow_candidates, key=area_ratio)
            reason = "obstacle_in_slow_zone" if r.slow_zone in biggest.zones else "obstacle_medium"
            raw_steer = self._steer_away(slow_candidates, w)
            decision = self._settle(Action.SLOW, reason, self._target_dict(biggest, area_ratio(biggest)),
                                     report.timestamp)
            return self._apply_ramp(decision, raw_steer)

        return self._apply_ramp(self._settle(Action.GO, "clear", None, report.timestamp))

    def _steer_away(self, obstacles, w: int) -> float:
        total_area = sum((d.bbox[2] * d.bbox[3]) for d in obstacles) or 1.0
        cx_norm = sum((d.bbox[0] + d.bbox[2] / 2) * (d.bbox[2] * d.bbox[3]) for d in obstacles) \
            / total_area / w
        if abs(cx_norm - 0.5) < 0.05:
            return 0.0
        return _clamp(-(cx_norm - 0.5) * 2, -1.0, 1.0)

    def _apply_ramp(self, decision: Decision, raw_steer: float = 0.0) -> Decision:
        """확정된 action(STOP/SLOW/GO)을 실제 속도/조향 값으로 점진적으로 반영한다.

        STOP 은 안전을 위해 즉시 0 으로 만들고, 그 외에는 accel_step(가속)/
        decel_step(감속)/steer_step 만큼씩만 목표값에 다가간다.
        """
        r = self.rules
        if decision.action == Action.STOP:
            self._speed = r.stop_speed
            self._steer = 0.0
        else:
            target_speed = r.go_speed if decision.action == Action.GO else r.slow_speed
            self._speed = self._step_toward(self._speed, target_speed, r.accel_step, r.decel_step)
            self._steer = self._step_toward(self._steer, raw_steer, r.steer_step, r.steer_step)
        decision.speed = self._speed
        decision.steer = self._steer
        return decision

    @staticmethod
    def _step_toward(current: float, target: float, step_up: float, step_down: float) -> float:
        diff = target - current
        if diff > 0:
            return min(current + step_up, target)
        if diff < 0:
            return max(current - step_down, target)
        return current

    @staticmethod
    def _target_dict(d, ratio: float) -> dict:
        return {
            "label": d.label, "score": round(d.score, 3), "bbox": list(d.bbox),
            "zones": list(d.zones), "area_ratio": round(ratio, 4),
        }

    def _settle(self, raw: Action, reason: str, target: dict | None, ts: float) -> Decision:
        previous = self._current
        if _SEVERITY[raw] >= _SEVERITY[previous]:
            self._current = raw
            self._relax_count = 0
            final_reason = reason
            final_target = target
        else:
            self._relax_count += 1
            if self._relax_count >= self.rules.clear_frames:
                self._current = raw
                self._relax_count = 0
                final_reason = reason
                final_target = target
            else:
                final_reason = "hold"
                final_target = None

        changed = self._current != previous
        return Decision(action=self._current, reason=final_reason, target=final_target,
                         changed=changed, ts=ts)
