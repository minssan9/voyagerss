import cv2
import numpy as np

from vision_cam.analyzers import DroneAnalyzer, build_analyzers


def sky(h=240, w=320):
    """위는 밝은 하늘 그라데이션, 아래 40%는 어두운 지면."""
    frame = np.zeros((h, w, 3), dtype=np.uint8)
    for y in range(h):
        frame[y, :] = (230 - y // 4, 200 - y // 4, 170 - y // 4)
    frame[int(h * 0.6):] = (40, 60, 50)
    return frame


def run(analyzer, frames):
    return [analyzer.analyze(f) for f in frames]


def warm(analyzer, n=25):
    run(analyzer, [sky() for _ in range(n)])


def test_small_moving_blob_in_sky_is_detected_after_persistence():
    analyzer = DroneAnalyzer(warmup_frames=20, persist_window=6, persist_min=4)
    warm(analyzer)
    results = []
    for i in range(8):
        frame = sky()
        cv2.circle(frame, (60 + i * 6, 50 + i * 2), 4, (30, 30, 30), -1)
        results.append(analyzer.analyze(frame))
    assert not results[0].triggered  # 한 프레임만으로는 판정하지 않음
    assert results[-1].triggered
    det = results[-1].detections[0]
    assert det.label == "aerial"
    x, y, w, h = det.bbox
    assert abs((x + w / 2) - (60 + 7 * 6)) < 8


def test_single_frame_flicker_is_ignored():
    analyzer = DroneAnalyzer(warmup_frames=20, persist_window=6, persist_min=4)
    warm(analyzer)
    flicker = sky()
    cv2.circle(flicker, (100, 40), 4, (30, 30, 30), -1)
    results = run(analyzer, [flicker] + [sky() for _ in range(6)])
    assert not any(r.triggered for r in results)


def test_motion_below_sky_line_is_ignored():
    analyzer = DroneAnalyzer(sky_ratio=0.6, warmup_frames=20, persist_window=6, persist_min=4)
    warm(analyzer)
    results = []
    for i in range(8):
        frame = sky()
        cv2.circle(frame, (60 + i * 6, 200), 4, (255, 255, 255), -1)
        results.append(analyzer.analyze(frame))
    assert not any(r.triggered for r in results)


def test_large_object_is_not_a_drone_candidate():
    analyzer = DroneAnalyzer(max_area=400, warmup_frames=20, persist_window=6, persist_min=4)
    warm(analyzer)
    results = []
    for i in range(8):
        frame = sky()
        cv2.rectangle(frame, (40 + i * 5, 20), (120 + i * 5, 100), (20, 20, 20), -1)
        results.append(analyzer.analyze(frame))
    assert not any(r.triggered for r in results)


def test_drone_registered_in_build_analyzers():
    [analyzer] = build_analyzers(["drone"], {"drone": {"sky_ratio": 1.0}})
    assert isinstance(analyzer, DroneAnalyzer)
    assert analyzer.sky_ratio == 1.0
