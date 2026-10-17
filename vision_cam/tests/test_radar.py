import math

import pytest

from vision_cam.radar import RadarPoint, TlvParser, cluster_points, encode_frame
from vision_cam.radar.simulator import AirspaceSimulator, SimTarget
from vision_cam.tracking.geometry import spherical_to_xyz, xyz_to_spherical


def test_tlv_roundtrip_through_chunked_stream():
    points = [RadarPoint(1.0, 10.0, 2.0, -3.5, 18.2), RadarPoint(-2.0, 30.0, 5.0, 0.5, 9.9)]
    data = b"\x00garbage" + encode_frame(7, points) + encode_frame(8, [])
    parser = TlvParser()
    frames = []
    for i in range(0, len(data), 13):  # UART 처럼 잘게 쪼개 넣는다
        frames += parser.feed(data[i:i + 13])
    assert [f.frame_number for f in frames] == [7, 8]
    got = frames[0].points
    assert len(got) == 2 and frames[1].points == []
    assert got[0].y == pytest.approx(10.0) and got[0].doppler == pytest.approx(-3.5)
    assert got[1].snr_db == pytest.approx(9.9)


def test_parser_skips_corrupt_header_and_recovers():
    bad = bytearray(encode_frame(1, [RadarPoint(0, 5, 0, 0, 10)]))
    bad[12:16] = (10**6).to_bytes(4, "little")  # 말이 안 되는 패킷 길이
    good = encode_frame(2, [RadarPoint(0, 6, 0, 0, 10)])
    frames = TlvParser().feed(bytes(bad) + good)
    assert [f.frame_number for f in frames] == [2]


def test_point_angles_follow_sensor_convention():
    p = RadarPoint(10.0, 10.0, 0.0, 0.0)
    assert p.azimuth_deg == pytest.approx(45.0)
    assert p.elevation_deg == pytest.approx(0.0)
    assert p.range == pytest.approx(math.sqrt(200))


def test_cluster_merges_nearby_points_and_separates_far_ones():
    pts = [RadarPoint(0, 20, 5, -2, 15), RadarPoint(0.3, 20.2, 5.1, -2.2, 12), RadarPoint(10, 50, 10, 1, 20)]
    dets = sorted(cluster_points(pts), key=lambda d: d.range)
    assert [d.points for d in dets] == [2, 1]
    assert dets[0].radial_velocity == pytest.approx(-2.1, abs=0.1)


def test_cluster_keeps_far_target_with_angular_spread_together():
    # 100 m 에서 각도 오차 1.5° 는 점 사이 2.6 m 이지만 같은 물체다.
    pts = [RadarPoint(*spherical_to_xyz(az, 10, 100), -5, 15) for az in (19.0, 20.5, 20.0)]
    assert len(cluster_points(pts)) == 1


def test_simulator_respects_gimbal_pose_and_fov():
    sim = AirspaceSimulator(
        [SimTarget("t", tuple(spherical_to_xyz(80, 10, 50)), (0, 0, 0))], clutter_per_frame=0, angle_noise_deg=0,
        range_noise_m=0,
    )
    assert sim.radar_frame(0, pan_deg=0, tilt_deg=0).points == []  # 정면 ±60° 밖
    frame = sim.radar_frame(0, pan_deg=80, tilt_deg=10)
    assert frame.points
    az, el, r = xyz_to_spherical([frame.points[0].x, frame.points[0].y, frame.points[0].z])
    assert abs(az) < 0.5 and abs(el) < 0.5 and r == pytest.approx(50, abs=0.5)


def test_simulator_bytes_parse_back():
    sim = AirspaceSimulator(seed=1)
    frames = TlvParser().feed(sim.radar_bytes(1.0, 0, 15))
    assert len(frames) == 1 and frames[0].points
