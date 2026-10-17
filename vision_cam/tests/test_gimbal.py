import pytest

from vision_cam.gimbal import GimbalConfig, GimbalController, MockServoDriver
from vision_cam.tracking import MultiTargetTracker, RadarMeasurement


def confirmed_tracker(*targets):
    tracker = MultiTargetTracker()
    for k in range(5):
        tracker.step(k * 0.1, radar=[RadarMeasurement(az, el, r, vr, 20) for az, el, r, vr in targets])
    return tracker


def test_starts_at_home_and_writes_servo_angles():
    driver = MockServoDriver()
    GimbalController(driver, GimbalConfig(home_pan=0, home_tilt=20))
    assert driver.angles == {0: 90.0, 1: 70.0}


def test_rate_limited_slew_toward_target():
    tracker = confirmed_tracker((40, 30, 50, 0))
    g = GimbalController(MockServoDriver(), GimbalConfig(max_rate_dps=100, home_tilt=0, lead_s=0))
    g.update(tracker.tracks, 0.0)
    pan, tilt = g.update(tracker.tracks, 0.1)
    assert pan == pytest.approx(10, abs=0.01) and tilt == pytest.approx(10, abs=0.01)
    for k in range(2, 12):
        pan, tilt = g.update(tracker.tracks, k * 0.1)
    assert pan == pytest.approx(40, abs=1) and tilt == pytest.approx(30, abs=1)
    assert g.target_id == tracker.tracks[0].id


def test_clamps_to_mechanical_limits():
    tracker = confirmed_tracker((120, -40, 50, 0))
    g = GimbalController(MockServoDriver(), GimbalConfig(max_rate_dps=1e6, lead_s=0))
    g.update(tracker.tracks, 0.0)
    pan, tilt = g.update(tracker.tracks, 1.0)
    assert pan == 90 and tilt == -10


def test_prefers_highest_threat_with_hysteresis():
    tracker = confirmed_tracker((-30, 20, 140, 0), (30, 20, 35, -6))
    g = GimbalController(MockServoDriver())
    near = max(tracker.tracks, key=lambda t: t.threat_score)
    assert g.select(tracker.tracks).id == near.id


def test_holds_then_returns_home_after_loss():
    tracker = confirmed_tracker((40, 30, 50, 0))
    cfg = GimbalConfig(max_rate_dps=1e6, lost_timeout_s=1.0, home_pan=0, home_tilt=20, lead_s=0)
    g = GimbalController(MockServoDriver(), cfg)
    g.update(tracker.tracks, 0.0)
    g.update(tracker.tracks, 0.1)
    assert g.pose == pytest.approx((40, 30), abs=1)
    assert g.update([], 0.5) == pytest.approx((40, 30), abs=1)
    assert g.update([], 2.0) == (0, 20)
    assert g.target_id is None
