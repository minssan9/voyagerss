import numpy as np
import pytest

from vision_cam.analyzers.base import Detection
from vision_cam.analyzers.object import VOC_CLASSES, ObjectAnalyzer
from vision_cam.kinematics import KinematicsConfig, KinematicsEstimator
from vision_cam.pipeline import Pipeline


def _det(x, y=100, w=40, h=40, label="person", tid=None):
    return Detection(label, (x, y, w, h), 0.9, track_id=tid)


def _run(est, xs, dt=0.1, **kw):
    out = []
    for i, x in enumerate(xs):
        d = _det(x, **kw)
        est.update([d], ts=i * dt)
        out.append(d)
    return out


def test_constant_velocity_in_pixels():
    est = KinematicsEstimator(KinematicsConfig(velocity_alpha=1.0))
    dets = _run(est, [0, 10, 20, 30, 40], tid=1)
    k = dets[-1].kinematics
    assert k["unit"] == "px"
    assert k["velocity"][0] == pytest.approx(100.0)  # 10px / 0.1s
    assert k["velocity"][1] == pytest.approx(0.0)
    assert k["accel"] == pytest.approx(0.0, abs=1e-6)
    assert k["heading_deg"] == pytest.approx(0.0)
    assert k["momentum"] is None  # 질량 미지정


def test_acceleration_and_momentum_in_meters():
    cfg = KinematicsConfig(meters_per_pixel=0.01, mass_kg={"person": 70.0},
                           velocity_alpha=1.0, acceleration_alpha=1.0)
    est = KinematicsEstimator(cfg)
    # x = 0.5 * a * t^2 with a = 200 px/s^2 = 2 m/s^2, dt = 0.1
    xs = [round(0.5 * 200 * (i * 0.1) ** 2) for i in range(8)]
    k = _run(est, xs, tid=7)[-1].kinematics
    assert k["unit"] == "m"
    assert k["acceleration"][0] == pytest.approx(2.0, rel=0.15)
    assert k["momentum"] == pytest.approx(70.0 * k["speed"])


def test_warmup_reports_zero_acceleration():
    est = KinematicsEstimator(KinematicsConfig(velocity_alpha=1.0, acceleration_alpha=1.0))
    dets = _run(est, [0, 10, 40], tid=1)
    assert dets[1].kinematics["accel"] == 0.0
    assert dets[1].kinematics["age"] == 2


def test_iou_matching_assigns_stable_ids_without_tracker():
    est = KinematicsEstimator()
    dets = _run(est, [0, 5, 10, 15])  # track_id 없음, 겹침 많음
    ids = {d.track_id for d in dets}
    assert len(ids) == 1
    assert dets[-1].kinematics["speed"] > 0


def test_different_labels_get_different_tracks():
    est = KinematicsEstimator()
    a, b = _det(0, label="person"), _det(0, label="dog")
    est.update([a, b], ts=0.0)
    assert a.track_id != b.track_id


def test_predict_only_keeps_last_values():
    est = KinematicsEstimator(KinematicsConfig(velocity_alpha=1.0))
    dets = _run(est, [0, 10], tid=3)
    stale = _det(10, tid=3)
    est.update([stale], ts=0.2, predict_only=True)
    assert stale.kinematics["speed"] == dets[-1].kinematics["speed"]


def test_tracks_expire_after_max_age():
    est = KinematicsEstimator(KinematicsConfig(max_age_s=0.5))
    est.update([_det(0, tid=1)], ts=0.0)
    est.update([], ts=1.0)
    d = _det(50, tid=1)
    est.update([d], ts=1.1)
    assert d.kinematics["age"] == 1  # 새 트랙으로 시작


def test_homography_maps_ground_contact_point():
    # 1px = 0.01m 스케일 호모그래피 → 하단 중심 기준
    H = [[0.01, 0, 0], [0, 0.01, 0], [0, 0, 1]]
    est = KinematicsEstimator(KinematicsConfig(homography=H))
    d = _det(0, y=0, w=20, h=40, tid=1)
    est.update([d], ts=0.0)
    assert d.kinematics["position"] == pytest.approx([0.1, 0.4])


def test_approach_positive_when_box_grows():
    est = KinematicsEstimator(KinematicsConfig(velocity_alpha=1.0))
    for i, s in enumerate([20, 30, 40]):
        d = Detection("car", (100, 100, s, s), 0.9, track_id=1)
        est.update([d], ts=i * 0.1)
    assert d.kinematics["approach"] > 0


def test_config_rejects_unknown_keys(tmp_path):
    p = tmp_path / "k.json"
    p.write_text('{"bogus": 1}')
    with pytest.raises(ValueError):
        KinematicsConfig.from_file(str(p))


class _MovingNet:
    """프레임마다 오른쪽으로 0.05 씩 이동하는 person 하나를 내는 FakeNet."""

    def __init__(self):
        self.i = 0

    def setInput(self, blob):
        pass

    def forward(self):
        x1 = 0.1 + 0.05 * self.i
        self.i += 1
        out = np.zeros((1, 1, 1, 7), dtype=np.float32)
        out[0, 0, 0] = [0, VOC_CLASSES.index("person"), 0.9, x1, 0.3, x1 + 0.2, 0.7]
        return out


def test_pipeline_attaches_kinematics_in_original_resolution():
    analyzer = ObjectAnalyzer(net=_MovingNet())
    pipe = Pipeline([analyzer], analysis_width=320,
                    kinematics=KinematicsEstimator(KinematicsConfig(velocity_alpha=1.0)))
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    for i in range(4):
        report = pipe.process(frame, timestamp=i * 0.1)
    d = report.results[0].detections[0]
    # 0.05 * 640px / 0.1s = 320 px/s (원본 해상도 기준)
    assert d.kinematics["velocity"][0] == pytest.approx(320, rel=0.05)
    assert report.results[0].metrics["speed_unit"] == "px/s"
    out = report.to_dict()["results"][0]["detections"][0]
    assert "kinematics" in out and "track_id" in out
    Pipeline.draw(frame, report)  # 오버레이가 예외 없이 그려져야 함
