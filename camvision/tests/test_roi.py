import json

import cv2
import numpy as np
import pytest

from camvision.analyzers import BrightnessAnalyzer, MotionAnalyzer
from camvision.analyzers.base import AnalysisResult, Detection
from camvision.pipeline import Pipeline
from camvision.roi import Zone, apply_zones, load_zones, normalize_points, save_zones


def blank(h=240, w=320, value=128):
    return np.full((h, w, 3), value, dtype=np.uint8)


LEFT_HALF = [[0.0, 0.0], [0.5, 0.0], [0.5, 1.0], [0.0, 1.0]]
RIGHT_HALF = [[0.5, 0.0], [1.0, 0.0], [1.0, 1.0], [0.5, 1.0]]


def test_save_and_load_round_trip(tmp_path):
    zones = [Zone(name="a", points=[(0.1, 0.1), (0.4, 0.1), (0.4, 0.4)], filter=False)]
    path = str(tmp_path / "roi.json")
    save_zones(path, zones)
    loaded = load_zones(path)
    assert len(loaded) == 1
    assert loaded[0].name == "a"
    assert loaded[0].filter is False
    assert loaded[0].points == [(0.1, 0.1), (0.4, 0.1), (0.4, 0.4)]


@pytest.mark.parametrize("bad_zones", [
    [{"name": "a", "points": [[0.1, 0.1], [0.2, 0.2]]}],  # 점 2개
    [{"name": "a", "points": [[0.1, 0.1], [0.2, 0.2], [1.5, 0.3]]}],  # 범위 초과
    [{"name": "a", "points": [[0, 0], [1, 0], [1, 1]]},
     {"name": "a", "points": [[0, 0], [0.5, 0], [0.5, 0.5]]}],  # 이름 중복
])
def test_load_zones_validation_errors(tmp_path, bad_zones):
    path = tmp_path / "roi.json"
    path.write_text(json.dumps({"zones": bad_zones}))
    with pytest.raises(ValueError):
        load_zones(str(path))


def test_contains_bbox_uses_bottom_center_anchor():
    zone = Zone(name="right", points=[tuple(p) for p in RIGHT_HALF])
    w, h = 320, 240
    # 박스 top 은 왼쪽에 걸치지만 바닥 중앙(anchor)은 오른쪽에 있음
    bbox_inside = (140, 0, 60, 200)  # anchor x = 170 (오른쪽)
    bbox_outside = (0, 0, 60, 200)  # anchor x = 30 (왼쪽)
    assert zone.contains_bbox(bbox_inside, w, h)
    assert not zone.contains_bbox(bbox_outside, w, h)


def test_normalize_points():
    pts = normalize_points([(160, 120), (320, 240)], 320, 240)
    assert pts == [[0.5, 0.5], [1.0, 1.0]]


def test_pipeline_filters_motion_outside_zone():
    zone = Zone(name="left", points=[tuple(p) for p in LEFT_HALF], filter=True)
    pipeline = Pipeline([MotionAnalyzer(min_area=20, warmup_frames=5)], analysis_width=320, zones=[zone])
    big = lambda: blank(h=480, w=640)  # noqa: E731
    for _ in range(10):
        pipeline.process(big())

    # 오른쪽에서 움직이는 사각형 -> zone(left) 밖 -> 제거됨
    frame = big()
    cv2.rectangle(frame, (500, 200), (600, 300), (255, 255, 255), -1)
    report = pipeline.process(frame)
    assert not report.triggered
    assert report.results[0].detections == []


def test_pipeline_keeps_motion_inside_zone_and_tags_it():
    zone = Zone(name="right", points=[tuple(p) for p in RIGHT_HALF], filter=True)
    pipeline = Pipeline([MotionAnalyzer(min_area=20, warmup_frames=5)], analysis_width=320, zones=[zone])
    big = lambda: blank(h=480, w=640)  # noqa: E731
    for _ in range(10):
        pipeline.process(big())

    frame = big()
    cv2.rectangle(frame, (500, 200), (600, 300), (255, 255, 255), -1)
    report = pipeline.process(frame)
    assert report.triggered
    d = report.results[0].detections[0]
    assert d.zones == ["right"]
    assert report.zone_hits["right"] == ["motion"]


def test_filter_false_tags_without_dropping():
    result = AnalysisResult("motion", detections=[Detection("motion", (500, 200, 50, 50))], triggered=True)

    class DummyAnalyzer:
        name = "motion"
        spatial = True

    zone = Zone(name="left", points=[tuple(p) for p in LEFT_HALF], filter=False)
    hits = apply_zones([result], [DummyAnalyzer()], [zone], 640, 480)
    assert result.detections  # 제거되지 않음
    assert result.detections[0].zones == []  # 왼쪽 구역 밖이라 태그도 안 됨
    assert hits["left"] == []


def test_zone_scoped_to_specific_analyzer_name():
    class Face:
        name = "face"
        spatial = True

    class Motion:
        name = "motion"
        spatial = True

    motion_result = AnalysisResult("motion", detections=[Detection("motion", (10, 10, 20, 20))], triggered=True)
    face_result = AnalysisResult("face", detections=[], triggered=False)

    zone = Zone(name="door", points=[(0.0, 0.0), (0.2, 0.0), (0.2, 0.2)], analyzers=["face"])
    apply_zones([motion_result, face_result], [Motion(), Face()], [zone], 100, 100)
    # motion 은 이 구역 대상이 아니므로 zones 태그가 붙지 않음
    assert motion_result.detections[0].zones == []


def test_brightness_not_affected_by_roi_filter():
    zone = Zone(name="left", points=[tuple(p) for p in LEFT_HALF], filter=True)
    pipeline = Pipeline([BrightnessAnalyzer()], analysis_width=320, zones=[zone])
    report = pipeline.process(blank(value=5))
    assert report.triggered
    assert report.results[0].triggered


def test_report_to_dict_omits_zone_keys_when_no_zones():
    pipeline = Pipeline([MotionAnalyzer(min_area=20, warmup_frames=5)], analysis_width=320)
    report = pipeline.process(blank(h=480, w=640))
    d = report.to_dict()
    assert "zone_hits" not in d
    assert "decision" not in d


def test_draw_with_zones_returns_same_shape():
    zone = Zone(name="left", points=[tuple(p) for p in LEFT_HALF])
    pipeline = Pipeline([MotionAnalyzer(min_area=20, warmup_frames=5)], analysis_width=320, zones=[zone])
    frame = blank(h=480, w=640)
    for _ in range(6):
        report = pipeline.process(frame)
    out = Pipeline.draw(frame, report)
    assert out.shape == frame.shape


def test_roi_tool_capture_saves_frame(tmp_path):
    from camvision import roi_tool

    video = tmp_path / "sample.avi"
    writer = cv2.VideoWriter(str(video), cv2.VideoWriter_fourcc(*"MJPG"), 30, (320, 240))
    for _ in range(5):
        writer.write(blank())
    writer.release()

    out = tmp_path / "frame.jpg"
    code = roi_tool.main(["--source", str(video), "--capture", str(out)])
    assert code == 0
    assert out.exists()
