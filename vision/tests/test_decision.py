import json

import numpy as np
import pytest

from camvision.__main__ import EventSink
from camvision.analyzers.base import AnalysisResult, Detection
from camvision.decision import Action, Decision, DecisionRules, DrivingDecider
from camvision.pipeline import FrameReport


def make_report(detections, brightness_triggered=False, size=(640, 480), ts=1.0, motion=None):
    results = [AnalysisResult("object", detections=list(detections), triggered=bool(detections))]
    if motion is not None:
        results.append(AnalysisResult("motion", detections=list(motion), triggered=bool(motion)))
    results.append(AnalysisResult("brightness", triggered=brightness_triggered,
                                   metrics={"dark": brightness_triggered, "blurry": False}))
    return FrameReport(timestamp=ts, fps=30.0, results=results, frame_size=size)


def person(bbox, score=0.9, zones=None):
    return Detection("person", bbox, score, zones or [])


def test_stop_zone_triggers_stop():
    decider = DrivingDecider()
    report = make_report([person((100, 100, 20, 20), zones=["danger"])])
    d = decider.decide(report)
    assert d.action == Action.STOP
    assert d.reason == "obstacle_in_stop_zone"
    assert d.target["label"] == "person"


def test_slow_zone_steers_away_from_obstacle_on_left():
    decider = DrivingDecider()
    # 왼쪽에 있는 장애물 (frame width 640, x center ~ 80)
    report = make_report([person((50, 100, 60, 60), zones=["caution"])])
    d = decider.decide(report)
    assert d.action == Action.SLOW
    assert d.reason == "obstacle_in_slow_zone"
    assert d.steer > 0  # 오른쪽으로 조향 (장애물 반대 방향)


def test_slow_zone_steers_away_from_obstacle_on_right():
    decider = DrivingDecider()
    report = make_report([person((550, 100, 60, 60), zones=["caution"])])
    d = decider.decide(report)
    assert d.action == Action.SLOW
    assert d.steer < 0  # 왼쪽으로 조향


def test_large_box_without_zone_triggers_stop():
    decider = DrivingDecider()
    # 640*480 = 307200, 20% = 61440 이상
    report = make_report([person((0, 0, 300, 250))])  # 75000 -> 24%
    d = decider.decide(report)
    assert d.action == Action.STOP
    assert d.reason == "obstacle_large"


def test_medium_box_without_zone_triggers_slow():
    decider = DrivingDecider()
    # 5%  = 15360
    report = make_report([person((0, 0, 150, 110))])  # 16500 -> 5.4%
    d = decider.decide(report)
    assert d.action == Action.SLOW
    assert d.reason == "obstacle_medium"


def test_tiny_box_is_clear():
    decider = DrivingDecider()
    report = make_report([person((0, 0, 10, 10))])
    d = decider.decide(report)
    assert d.action == Action.GO
    assert d.reason == "clear"


def test_non_obstacle_class_ignored():
    decider = DrivingDecider()
    report = make_report([Detection("tvmonitor", (100, 100, 300, 300), 0.9)])
    d = decider.decide(report)
    assert d.action == Action.GO


def test_low_score_ignored():
    decider = DrivingDecider()
    report = make_report([person((0, 0, 300, 250), score=0.2)])
    d = decider.decide(report)
    assert d.action == Action.GO


def test_brightness_triggers_blind_stop():
    decider = DrivingDecider()
    report = make_report([], brightness_triggered=True)
    d = decider.decide(report)
    assert d.action == Action.STOP
    assert d.reason == "vision_degraded"


def test_hysteresis_holds_before_relaxing():
    decider = DrivingDecider(DecisionRules(clear_frames=5))
    stop_report = make_report([person((100, 100, 20, 20), zones=["danger"])])
    d = decider.decide(stop_report)
    assert d.action == Action.STOP and d.changed

    clear_report = make_report([])
    last = None
    for _ in range(4):
        last = decider.decide(clear_report)
        assert last.action == Action.STOP
        assert last.reason == "hold"
        assert not last.changed

    final = decider.decide(clear_report)
    assert final.action == Action.GO
    assert final.changed


def test_escalation_is_immediate():
    decider = DrivingDecider()
    d1 = decider.decide(make_report([]))
    assert d1.action == Action.GO
    d2 = decider.decide(make_report([person((100, 100, 20, 20), zones=["danger"])]))
    assert d2.action == Action.STOP
    assert d2.changed


def test_motion_as_obstacle():
    decider = DrivingDecider(DecisionRules(motion_as_obstacle=True))
    motion_det = [Detection("motion", (100, 100, 20, 20), zones=["danger"])]
    report = make_report([], motion=motion_det)
    d = decider.decide(report)
    assert d.action == Action.STOP


def test_decision_rules_from_file(tmp_path):
    path = tmp_path / "rules.json"
    path.write_text(json.dumps({"stop_area_ratio": 0.5, "clear_frames": 1}))
    rules = DecisionRules.from_file(str(path))
    assert rules.stop_area_ratio == 0.5
    assert rules.clear_frames == 1
    assert rules.slow_area_ratio == DecisionRules().slow_area_ratio  # 나머지는 기본값


def test_decision_rules_from_file_rejects_unknown_key(tmp_path):
    path = tmp_path / "rules.json"
    path.write_text(json.dumps({"not_a_field": 1}))
    with pytest.raises(ValueError):
        DecisionRules.from_file(str(path))


def test_event_sink_emits_driving_event_on_change(tmp_path):
    sink = EventSink(events_file=str(tmp_path / "events.jsonl"), webhook=None,
                      snapshot_dir=None, cooldown=1000.0)
    report = make_report([person((100, 100, 20, 20), zones=["danger"])])
    report.decision = Decision(action=Action.STOP, reason="obstacle_in_stop_zone", changed=True, ts=1.0)
    overlay = np.zeros((480, 640, 3), dtype=np.uint8)
    fired = sink.handle(report, overlay)
    assert any(e["analyzer"] == "driving" for e in fired)


def test_event_sink_heartbeat_resends_unchanged_decision(tmp_path):
    sink = EventSink(events_file=None, webhook=None, snapshot_dir=None,
                      cooldown=1000.0, decision_heartbeat=1.0)
    report = make_report([], ts=0.5)
    report.decision = Decision(action=Action.GO, reason="clear", changed=False, ts=0.5)
    assert sink.handle(report, np.zeros((10, 10, 3), np.uint8)) == []  # 아직 heartbeat 간격 미달

    report2 = make_report([], ts=2.5)
    report2.decision = Decision(action=Action.GO, reason="clear", changed=False, ts=2.5)
    fired = sink.handle(report2, np.zeros((10, 10, 3), np.uint8))
    assert any(e["analyzer"] == "driving" for e in fired)


def test_speed_ramps_up_gradually_on_go():
    decider = DrivingDecider(DecisionRules(accel_step=0.2, decel_step=0.5))
    d1 = decider.decide(make_report([]))  # GO, 시작 speed=0.0
    assert d1.action == Action.GO
    assert d1.speed == pytest.approx(0.2)  # 목표 1.0 이지만 accel_step 만큼만 증가
    d2 = decider.decide(make_report([]))
    assert d2.speed == pytest.approx(0.4)
    d3 = decider.decide(make_report([]))
    assert d3.speed == pytest.approx(0.6)


def test_stop_forces_speed_and_steer_to_zero_immediately():
    decider = DrivingDecider()
    # 먼저 GO 로 몇 프레임 가속시켜 speed > 0 을 만든다
    for _ in range(5):
        decider.decide(make_report([]))
    assert decider._speed > 0.5

    d = decider.decide(make_report([person((100, 100, 20, 20), zones=["danger"])]))
    assert d.action == Action.STOP
    assert d.speed == 0.0  # 램프 없이 즉시 정지
    assert d.steer == 0.0


def test_speed_decelerates_gradually_when_action_relaxes_without_full_stop():
    rules = DecisionRules(accel_step=1.0, decel_step=0.1, slow_area_ratio=0.01, stop_area_ratio=0.9)
    decider = DrivingDecider(rules)
    # GO 로 속도를 최대까지 올림 (accel_step=1.0 이므로 한 번에 도달)
    d1 = decider.decide(make_report([]))
    assert d1.speed == pytest.approx(1.0)

    # SLOW 로 전환 (장애물 medium) -> decel_step=0.1 만큼만 감속
    d2 = decider.decide(make_report([person((0, 0, 150, 110))]))
    assert d2.action == Action.SLOW
    assert d2.speed == pytest.approx(0.9)


def test_steer_ramps_toward_target_by_steer_step():
    decider = DrivingDecider(DecisionRules(steer_step=0.1))
    report = make_report([person((50, 100, 60, 60), zones=["caution"])])
    d1 = decider.decide(report)
    assert d1.steer == pytest.approx(0.1)
    d2 = decider.decide(report)
    assert d2.steer == pytest.approx(0.2)


def test_decision_to_dict_includes_speed():
    decider = DrivingDecider()
    d = decider.decide(make_report([]))
    assert "speed" in d.to_dict()


def test_decision_rules_from_file_overrides_ramp_fields(tmp_path):
    path = tmp_path / "rules.json"
    path.write_text(json.dumps({"accel_step": 0.5, "slow_speed": 0.2}))
    rules = DecisionRules.from_file(str(path))
    assert rules.accel_step == 0.5
    assert rules.slow_speed == 0.2
    assert rules.decel_step == DecisionRules().decel_step
