import numpy as np
import pytest

from vision_cam.tracking import CameraMeasurement, MultiTargetTracker, RadarMeasurement, ThreatRules
from vision_cam.tracking.assignment import hungarian
from vision_cam.tracking.geometry import (
    pixel_to_sensor_bearing,
    sensor_bearing_to_world,
    sensor_to_world,
    spherical_to_xyz,
    world_to_sensor,
    xyz_to_spherical,
)
from vision_cam.tracking.threat import assess


def test_hungarian_finds_global_minimum_not_greedy():
    cost = np.array([[1.0, 2.0], [1.5, 10.0]])  # 탐욕이면 (0,0) 후 (1,1)=11, 최적은 2+1.5=3.5
    assert hungarian(cost, max_cost=20) == [(0, 1), (1, 0)]


def test_hungarian_drops_pairs_over_gate_and_handles_rectangular():
    cost = np.array([[1.0, 50.0, 3.0]])
    assert hungarian(cost, max_cost=5) == [(0, 0)]
    assert hungarian(np.array([[50.0], [60.0]]), max_cost=5) == []


@pytest.mark.parametrize("pan,tilt", [(0, 0), (35, 20), (-70, 60)])
def test_sensor_world_roundtrip(pan, tilt):
    v = spherical_to_xyz(12, -5, 40)
    back = world_to_sensor(sensor_to_world(v, pan, tilt), pan, tilt)
    assert np.allclose(v, back)


def test_boresight_maps_to_gimbal_pose():
    az, el = sensor_bearing_to_world(0, 0, 30, 15)
    assert az == pytest.approx(30) and el == pytest.approx(15)


def test_pixel_bearing_center_and_edge():
    assert pixel_to_sensor_bearing(320, 240, 640, 480, 66, 41) == pytest.approx((0, 0))
    az, el = pixel_to_sensor_bearing(640, 240, 640, 480, 66, 41)
    assert az == pytest.approx(33, abs=0.01) and el == pytest.approx(0)


def _radar(az, el, r, vr, snr=20):
    return RadarMeasurement(az, el, r, vr, snr)


def test_radar_track_confirms_and_estimates_closing_speed():
    tracker = MultiTargetTracker()
    for k in range(10):
        t = k * 0.1
        tracker.step(t, radar=[_radar(10, 20, 100 - 6 * t, -6)])
    [track] = tracker.confirmed()
    d = track.to_dict()
    assert d["range"] == pytest.approx(100 - 6 * 0.9, abs=1.0)
    assert d["radialVelocity"] == pytest.approx(-6, abs=0.5)
    assert d["sources"] == ["radar"]


def test_camera_and_radar_fuse_into_one_track():
    tracker = MultiTargetTracker()
    for k in range(8):
        t = k * 0.1
        tracker.step(t, camera=[CameraMeasurement(10.2, 19.8, "drone")], radar=[_radar(10, 20, 80, -2)])
    assert len(tracker.tracks) == 1
    d = tracker.tracks[0].to_dict()
    assert d["sources"] == ["camera", "radar"]
    assert d["label"] == "drone" and d["range"] is not None


def test_camera_only_track_has_no_range_then_gains_it_from_radar():
    tracker = MultiTargetTracker()
    for k in range(5):
        tracker.step(k * 0.1, camera=[CameraMeasurement(-20, 30)])
    assert tracker.tracks[0].to_dict()["range"] is None
    tracker.step(0.5, camera=[CameraMeasurement(-20, 30)], radar=[_radar(-20.5, 30.5, 55, 0)])
    assert len(tracker.tracks) == 1
    assert tracker.tracks[0].to_dict()["range"] == pytest.approx(55, abs=2)


def test_two_targets_keep_their_ids_and_lost_track_is_dropped():
    tracker = MultiTargetTracker()
    for k in range(6):
        tracker.step(k * 0.1, radar=[_radar(-30, 10, 60, 0), _radar(30, 10, 90, 0)])
    ids = {round(t.kf.x[0]): t.id for t in tracker.tracks}
    assert set(ids) == {-30, 30}
    for k in range(6, 40):
        tracker.step(k * 0.1, radar=[_radar(30, 10, 90, 0)])
    assert [t.id for t in tracker.tracks] == [ids[30]]


def test_tentative_clutter_never_confirms():
    tracker = MultiTargetTracker()
    rng = np.random.default_rng(0)
    for k in range(30):
        tracker.step(k * 0.1, radar=[_radar(rng.uniform(-60, 60), rng.uniform(0, 60), rng.uniform(5, 150), 0)])
    assert tracker.confirmed() == []


def test_threat_levels():
    rules = ThreatRules()
    assert assess(25, -8, "drone", True, rules)[0] == "HIGH"
    assert assess(140, 1, "aerial", True, rules)[0] == "LOW"
    assert assess(25, -8, "bird", True, rules)[0] == "LOW"
    assert assess(25, -8, "drone", False, rules) == ("LOW", 0.0)
    assert assess(None, None, "drone", True, rules)[0] == "LOW"
    assert xyz_to_spherical(spherical_to_xyz(10, 20, 30))[2] == pytest.approx(30)
