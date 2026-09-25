import numpy as np
import pytest

from camvision.analyzers import build_analyzers
from camvision.analyzers.object import VOC_CLASSES, ObjectAnalyzer, find_model
from camvision.pipeline import Pipeline


class FakeNet:
    """cv2.dnn Net 을 흉내내는 테스트 더블. rows 는 (class_id, conf, x1,y1,x2,y2) 튜플 목록."""

    def __init__(self, rows):
        self.rows = rows
        self.last_blob_shape = None

    def setInput(self, blob):
        self.last_blob_shape = blob.shape

    def forward(self):
        n = len(self.rows)
        out = np.zeros((1, 1, max(n, 1), 7), dtype=np.float32)
        for i, (class_id, conf, x1, y1, x2, y2) in enumerate(self.rows):
            out[0, 0, i] = [0, class_id, conf, x1, y1, x2, y2]
        return out


def blank(h=240, w=320, value=128):
    return np.full((h, w, 3), value, dtype=np.uint8)


PERSON_ID = VOC_CLASSES.index("person")
CAR_ID = VOC_CLASSES.index("car")


def test_parses_detections_to_pixel_bboxes():
    net = FakeNet([(PERSON_ID, 0.9, 0.25, 0.5, 0.75, 1.0)])
    analyzer = ObjectAnalyzer(net=net, confidence=0.5)
    result = analyzer.analyze(blank(h=240, w=320))
    # classes/trigger_classes 를 지정하지 않으면 trigger_classes 는 비어 있어 triggered=False
    assert not result.triggered
    assert result.metrics["objects"] == 1
    d = result.detections[0]
    assert d.label == "person"
    x, y, w, h = d.bbox
    assert 75 <= x <= 85 and 115 <= y <= 125
    assert 155 <= w <= 165 and 115 <= h <= 125


def test_trigger_classes_control_triggered_flag():
    net = FakeNet([(PERSON_ID, 0.9, 0.25, 0.5, 0.75, 1.0)])
    analyzer = ObjectAnalyzer(net=net, trigger_classes=["car"])
    result = analyzer.analyze(blank())
    assert not result.triggered

    net2 = FakeNet([(PERSON_ID, 0.9, 0.25, 0.5, 0.75, 1.0)])
    analyzer2 = ObjectAnalyzer(net=net2, trigger_classes=["person"])
    result2 = analyzer2.analyze(blank())
    assert result2.triggered


def test_confidence_threshold_and_background_ignored():
    net = FakeNet([
        (PERSON_ID, 0.2, 0.1, 0.1, 0.2, 0.2),  # 신뢰도 미달
        (0, 0.99, 0.0, 0.0, 1.0, 1.0),  # background
        (PERSON_ID, 0.8, 0.3, 0.3, 0.4, 0.4),
    ])
    analyzer = ObjectAnalyzer(net=net, confidence=0.5)
    result = analyzer.analyze(blank())
    assert result.metrics["objects"] == 1
    assert result.detections[0].score == pytest.approx(0.8)


def test_class_filter():
    net = FakeNet([
        (PERSON_ID, 0.9, 0.1, 0.1, 0.2, 0.2),
        (CAR_ID, 0.9, 0.3, 0.3, 0.5, 0.5),
    ])
    analyzer = ObjectAnalyzer(net=net, classes=["car"])
    result = analyzer.analyze(blank())
    assert result.metrics["objects"] == 1
    assert result.detections[0].label == "car"


def test_every_n_reuses_last_and_marks_stale():
    net = FakeNet([(PERSON_ID, 0.9, 0.1, 0.1, 0.5, 0.5)])
    analyzer = ObjectAnalyzer(net=net, every_n=3)
    r1 = analyzer.analyze(blank())
    r2 = analyzer.analyze(blank())
    r3 = analyzer.analyze(blank())
    assert r1.metrics["stale"] is False
    assert r2.metrics["stale"] is True
    assert r3.metrics["stale"] is True
    assert r1.detections[0].bbox == r2.detections[0].bbox == r3.detections[0].bbox


def test_reused_detections_not_double_scaled_in_pipeline():
    net = FakeNet([(PERSON_ID, 0.9, 0.5, 0.5, 0.6, 0.6)])
    analyzer = ObjectAnalyzer(net=net, every_n=3)
    pipeline = Pipeline([analyzer], analysis_width=320)
    big = lambda: blank(h=480, w=640)  # noqa: E731

    bboxes = []
    for _ in range(3):
        report = pipeline.process(big())
        bboxes.append(report.results[0].detections[0].bbox)
    assert bboxes[0] == bboxes[1] == bboxes[2]


def test_missing_model_raises_with_hint(tmp_path):
    with pytest.raises(FileNotFoundError) as exc:
        find_model(str(tmp_path))
    assert "download-models.sh" in str(exc.value)

    with pytest.raises(FileNotFoundError):
        ObjectAnalyzer(model_dir=str(tmp_path))


def test_unknown_class_rejected():
    net = FakeNet([])
    with pytest.raises(ValueError):
        ObjectAnalyzer(net=net, classes=["not-a-class"])


def test_build_analyzers_passes_options():
    net = FakeNet([(PERSON_ID, 0.9, 0.1, 0.1, 0.5, 0.5)])
    analyzers = build_analyzers(["object"], {"object": {"net": net, "confidence": 0.3}})
    assert isinstance(analyzers[0], ObjectAnalyzer)
    result = analyzers[0].analyze(blank())
    assert result.metrics["objects"] == 1


def test_real_model_smoke():
    try:
        proto, weights = find_model()
    except FileNotFoundError:
        pytest.skip("모델 파일 없음 (bash deploy/download-models.sh 실행 필요)")
    analyzer = ObjectAnalyzer()
    result = analyzer.analyze(blank())
    assert isinstance(result.metrics["objects"], int)
