import cv2
import numpy as np
import pytest

from vision_cam.analyzers import BrightnessAnalyzer, FaceAnalyzer, MotionAnalyzer, build_analyzers
from vision_cam.pipeline import Pipeline


def blank(h=240, w=320, value=128):
    return np.full((h, w, 3), value, dtype=np.uint8)


def test_motion_detects_moving_square_after_warmup():
    analyzer = MotionAnalyzer(min_area=100, warmup_frames=10)
    for _ in range(20):
        result = analyzer.analyze(blank())
    assert not result.triggered

    triggered = False
    for i in range(5):
        frame = blank()
        x = 40 + i * 30
        cv2.rectangle(frame, (x, 80), (x + 60, 160), (255, 255, 255), -1)
        result = analyzer.analyze(frame)
        triggered |= result.triggered
    assert triggered
    assert result.detections and result.detections[0].label == "motion"


def test_motion_suppressed_during_warmup():
    analyzer = MotionAnalyzer(min_area=10, warmup_frames=100)
    frame = blank()
    cv2.circle(frame, (100, 100), 40, (0, 0, 0), -1)
    result = analyzer.analyze(frame)
    assert result.metrics["warming_up"] is True
    assert not result.triggered and not result.detections


def test_brightness_flags_dark_and_blurry():
    result = BrightnessAnalyzer().analyze(blank(value=10))
    assert result.metrics["dark"] is True
    assert result.metrics["blurry"] is True  # 단색 화면은 선명도 0
    assert result.triggered


def test_brightness_ok_on_textured_frame():
    rng = np.random.default_rng(0)
    frame = rng.integers(60, 200, size=(240, 320, 3), dtype=np.uint8)
    result = BrightnessAnalyzer().analyze(frame)
    assert not result.triggered
    assert result.metrics["brightness"] > 40


def test_face_analyzer_runs_on_empty_frame():
    result = FaceAnalyzer().analyze(blank())
    assert result.metrics["faces"] == 0
    assert not result.triggered


def test_build_analyzers_rejects_unknown():
    with pytest.raises(ValueError):
        build_analyzers(["motion", "nope"])


def test_pipeline_rescales_bboxes_to_original_resolution():
    pipeline = Pipeline([MotionAnalyzer(min_area=20, warmup_frames=5)], analysis_width=320)
    big = lambda: blank(h=480, w=640)  # noqa: E731
    for _ in range(10):
        pipeline.process(big())
    frame = big()
    cv2.rectangle(frame, (400, 200), (560, 360), (255, 255, 255), -1)
    report = pipeline.process(frame)
    assert report.triggered
    x, y, w, h = report.results[0].detections[0].bbox
    assert 380 <= x <= 420 and 180 <= y <= 220  # 원본(640) 좌표계
    assert Pipeline.draw(frame, report).shape == frame.shape
