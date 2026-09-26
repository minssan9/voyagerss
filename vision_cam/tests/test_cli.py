import json

import cv2
import numpy as np

from vision_cam.__main__ import main


def test_runs_end_to_end_on_video_file(tmp_path, capsys):
    video = tmp_path / "sample.avi"
    writer = cv2.VideoWriter(str(video), cv2.VideoWriter_fourcc(*"MJPG"), 60, (320, 240))
    for i in range(60):
        frame = np.full((240, 320, 3), 128, dtype=np.uint8)
        if i >= 40:
            x = (i - 40) * 10
            cv2.rectangle(frame, (x, 60), (x + 80, 180), (255, 255, 255), -1)
        writer.write(frame)
    writer.release()

    events = tmp_path / "events.jsonl"
    snaps = tmp_path / "snaps"
    code = main([
        "--source", str(video), "--no-display", "--analyzers", "motion",
        "--events", str(events), "--snapshot-dir", str(snaps), "--cooldown", "0",
    ])
    assert code == 0
    lines = [json.loads(l) for l in events.read_text().splitlines()]
    assert lines and all(e["analyzer"] == "motion" for e in lines)
    assert any(snaps.iterdir())


def _write_moving_square_video(path, w=320, h=240, frames=60, fourcc="MJPG", fps=60):
    writer = cv2.VideoWriter(str(path), cv2.VideoWriter_fourcc(*fourcc), fps, (w, h))
    for i in range(frames):
        frame = np.full((h, w, 3), 128, dtype=np.uint8)
        if i >= 40:
            x = (i - 40) * 10
            cv2.rectangle(frame, (x, 60), (x + 80, 180), (255, 255, 255), -1)
        writer.write(frame)
    writer.release()


def test_roi_and_decide_end_to_end(tmp_path):
    video = tmp_path / "sample.avi"
    _write_moving_square_video(video)

    roi = tmp_path / "roi.json"
    roi.write_text(json.dumps({
        "zones": [{"name": "danger", "points": [[0.5, 0.0], [1.0, 0.0], [1.0, 1.0], [0.5, 1.0]],
                   "filter": False}],
    }))
    rules = tmp_path / "rules.json"
    rules.write_text(json.dumps({
        "motion_as_obstacle": True, "clear_frames": 1,
        "stop_area_ratio": 0.9, "slow_area_ratio": 0.9,
    }))
    events = tmp_path / "events.jsonl"

    code = main([
        "--source", str(video), "--no-display", "--analyzers", "motion",
        "--roi", str(roi), "--decide", "--decision-config", str(rules),
        "--events", str(events), "--cooldown", "0",
    ])
    assert code == 0
    lines = [json.loads(l) for l in events.read_text().splitlines()]
    driving = [e for e in lines if e["analyzer"] == "driving"]
    assert driving
    assert any(e["decision"]["action"] in ("STOP", "SLOW") for e in driving)
    assert any(e["decision"]["reason"] == "obstacle_in_stop_zone" for e in driving)
