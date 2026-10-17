import json
import math
import urllib.request

import numpy as np
import pytest

from vision_cam.airspace import EventRecorder, build_system, parse_args, serve
from vision_cam.radar.simulator import AirspaceSimulator, SimTarget
from vision_cam.stream import FrameBroadcaster
from vision_cam.tracking.geometry import spherical_to_xyz, xyz_to_spherical


def run_sim(targets, seconds=8.0, fps=20):
    args = parse_args(["--simulate", "--width", "640", "--height", "480"])
    system = build_system(args)
    sim = AirspaceSimulator(targets, seed=3)
    tracks = []
    for k in range(int(seconds * fps)):
        t = k / fps
        pose = system.gimbal.pose
        frame = sim.camera_frame(t, *pose, 640, 480, args.hfov, args.vfov)
        _, tracks = system.step(t, frame, [sim.radar_frame(t, *pose)])
    return system, sim, tracks, t


def test_single_drone_is_fused_tracked_and_followed():
    drone = SimTarget("d", tuple(spherical_to_xyz(25, 20, 70)), (-1.0, -4.0, 0.0), 0.4)
    system, sim, tracks, t = run_sim([drone])
    confirmed = [tr for tr in tracks if tr.confirmed]
    assert len(confirmed) == 1
    tr = confirmed[0]
    az, el, r = xyz_to_spherical(drone.at(t))
    assert tr.kf.x[0] == pytest.approx(az, abs=2.0)
    assert tr.kf.x[1] == pytest.approx(el, abs=2.0)
    assert tr.range == pytest.approx(r, abs=4.0)
    assert set(tr.to_dict()["sources"]) == {"camera", "radar"}
    assert system.gimbal.target_id == tr.id
    pan, tilt = system.gimbal.pose
    assert pan == pytest.approx(az, abs=3.0) and tilt == pytest.approx(el, abs=3.0)


def test_two_targets_two_tracks():
    targets = [
        SimTarget("a", tuple(spherical_to_xyz(-20, 25, 60)), (0, 0, 0)),
        SimTarget("b", tuple(spherical_to_xyz(30, 15, 100)), (0, 0, 0)),
    ]
    _, _, tracks, _ = run_sim(targets, seconds=4)
    confirmed = sorted((tr for tr in tracks if tr.confirmed), key=lambda tr: tr.kf.x[0])
    assert [round(tr.kf.x[0] / 10) for tr in confirmed] == [-2, 3]


def test_snapshot_shape_matches_backend_contract():
    drone = SimTarget("d", tuple(spherical_to_xyz(0, 20, 50)), (0, -3, 0))
    system, _, tracks, t = run_sim([drone], seconds=2)
    from vision_cam.pipeline import FrameReport

    snap = json.loads(json.dumps(system.snapshot(t, FrameReport(t, 20.0), tracks)))
    assert set(snap) >= {"ts", "gimbal", "sensors", "camera", "tracks"}
    assert set(snap["gimbal"]) == {"pan", "tilt", "targetId"}
    track = snap["tracks"][0]
    assert {"id", "status", "label", "azimuth", "elevation", "range", "threat", "threatScore", "sources"} <= set(track)


def test_event_recorder_fires_once_per_new_track_and_level():
    _, _, tracks, _ = run_sim([SimTarget("d", tuple(spherical_to_xyz(0, 20, 40)), (0, -5, 0))], seconds=3)
    rec = EventRecorder(None, None)
    overlay = np.zeros((10, 10, 3), np.uint8)
    first = rec.handle(tracks, overlay)
    assert [e["type"] for e in first] == ["track_new"]
    assert rec.handle(tracks, overlay) == []
    assert [e["type"] for e in rec.handle([], overlay)] == ["track_lost"]


def test_http_tracks_endpoint():
    b = FrameBroadcaster()
    b.publish(np.zeros((8, 8, 3), np.uint8), {"ts": 1.0, "tracks": [{"id": 1}], "gimbal": {}})
    server = serve(b, port=0, host="127.0.0.1")
    port = server.server_address[1]
    try:
        body = json.loads(urllib.request.urlopen(f"http://127.0.0.1:{port}/tracks", timeout=3).read())
        assert body == {"ts": 1.0, "tracks": [{"id": 1}]}
    finally:
        server.shutdown()
