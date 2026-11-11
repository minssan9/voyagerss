import numpy as np
import pytest

from vision_cam.analyzers import build_analyzers
from vision_cam.analyzers.yolo import YoloAnalyzer
from vision_cam.decision import Action, DrivingDecider
from vision_cam.kinematics import KinematicsConfig, KinematicsEstimator
from vision_cam.pipeline import Pipeline

NAMES = {0: "person", 2: "car", 7: "truck"}


class _Boxes:
    def __init__(self, rows, with_ids=True):
        arr = np.array(rows, dtype=np.float32).reshape(-1, 7)
        self.xyxy = arr[:, 0:4]
        self.conf = arr[:, 4]
        self.cls = arr[:, 5]
        self.id = arr[:, 6] if with_ids else None


class _Result:
    def __init__(self, rows, with_ids=True):
        self.boxes = _Boxes(rows, with_ids)
        self.names = NAMES


class FakeYOLO:
    """ultralytics.YOLO 흉내. frames: 호출마다 돌려줄 (x1,y1,x2,y2,conf,cls,id) 목록."""

    names = NAMES

    def __init__(self, frames, with_ids=True):
        self.frames = frames
        self.with_ids = with_ids
        self.calls = []

    def _next(self, kind, kwargs):
        self.calls.append((kind, kwargs))
        rows = self.frames[min(len(self.calls) - 1, len(self.frames) - 1)]
        return [_Result(rows, self.with_ids)]

    def track(self, frame, **kwargs):
        return self._next("track", kwargs)

    def predict(self, frame, **kwargs):
        return self._next("predict", kwargs)


def frame(h=240, w=320):
    return np.zeros((h, w, 3), dtype=np.uint8)


def test_parses_boxes_with_track_ids():
    model = FakeYOLO([[(10, 20, 110, 220, 0.9, 0, 5)]])
    a = YoloAnalyzer(model_obj=model, trigger_classes=["person"])
    r = a.analyze(frame())
    d = r.detections[0]
    assert (d.label, d.bbox, d.track_id) == ("person", (10, 20, 100, 200), 5)
    assert r.triggered
    kind, kwargs = model.calls[0]
    assert kind == "track" and kwargs["persist"] is True and kwargs["imgsz"] == 320


def test_track_disabled_uses_predict_and_class_filter():
    model = FakeYOLO([[(0, 0, 10, 10, 0.8, 2, 1)]], with_ids=False)
    a = YoloAnalyzer(model_obj=model, track=False, classes=["car"])
    d = a.analyze(frame()).detections[0]
    kind, kwargs = model.calls[0]
    assert kind == "predict" and kwargs["classes"] == [2]
    assert d.track_id is None


def test_unknown_class_rejected():
    with pytest.raises(ValueError):
        YoloAnalyzer(model_obj=FakeYOLO([[]]), classes=["unicorn"])


def test_every_n_skips_inference():
    model = FakeYOLO([[(0, 0, 10, 10, 0.8, 0, 1)]])
    a = YoloAnalyzer(model_obj=model, every_n=3)
    stale = [a.analyze(frame()).metrics["stale"] for _ in range(6)]
    assert stale == [False, True, True, False, True, True]
    assert len(model.calls) == 2


def test_registered_in_registry():
    [a] = build_analyzers(["yolo"], {"yolo": {"model_obj": FakeYOLO([[]])}})
    assert isinstance(a, YoloAnalyzer)


def test_pipeline_kinematics_with_tracker_ids_and_decision():
    # track 9 가 프레임마다 오른쪽으로 16px(분석 해상도) 이동
    frames = [[(16 * i, 0, 16 * i + 100, 230, 0.9, 7, 9)] for i in range(5)]
    a = YoloAnalyzer(model_obj=FakeYOLO(frames))
    pipe = Pipeline(
        [a], analysis_width=320,
        kinematics=KinematicsEstimator(KinematicsConfig(velocity_alpha=1.0, mass_kg={"truck": 2000})),
        decider=DrivingDecider(),
    )
    for i in range(5):
        report = pipe.process(frame(480, 640), timestamp=i * 0.1)
    d = report.results[0].detections[0]
    assert d.track_id == 9
    assert d.kinematics["velocity"][0] == pytest.approx(320, rel=0.05)  # 32px(원본)/0.1s
    assert d.kinematics["momentum"] == pytest.approx(2000 * d.kinematics["speed"])
    # 큰 truck 박스 → decider 가 yolo 결과도 장애물로 본다
    assert report.decision.action == Action.STOP
