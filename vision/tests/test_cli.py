import json

import cv2
import numpy as np

from camvision.__main__ import main


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
