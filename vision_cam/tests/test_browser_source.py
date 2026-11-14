import json
import threading
import time
import urllib.error
import urllib.request

import cv2
import numpy as np

from vision_cam.analyzers import build_analyzers
from vision_cam.pipeline import Pipeline
from vision_cam.sources import BrowserSource, open_source
from vision_cam.stream import FrameBroadcaster, extract_image_bytes, serve


def test_open_source_browser_does_not_touch_a_device():
    source = open_source("browser", 640, 480, 30)
    assert isinstance(source, BrowserSource)
    with source:
        assert source.read() is None
        assert source.finished is False


def test_browser_source_keeps_only_the_latest_frame():
    source = BrowserSource().start()
    first = np.zeros((4, 4, 3), dtype=np.uint8)
    second = np.full((4, 4, 3), 255, dtype=np.uint8)
    seq1 = source.submit(first)
    seq2 = source.submit(second)
    frame = source.read()
    assert frame is not None
    assert int(frame[0, 0, 0]) == 255
    assert source.read() is None
    source.complete({"fps": 3.0, "results": [{"analyzer": "brightness"}]})
    assert source.wait_report(seq1, timeout=0.2)["fps"] == 3.0
    assert source.wait_report(seq2, timeout=0.2)["results"][0]["analyzer"] == "brightness"
    source.stop()


def test_extract_image_bytes_reads_multipart_field():
    jpeg = b"\xff\xd8\xff\xd9"
    boundary = "frameboundary"
    body = (
        f"--{boundary}\r\n"
        'Content-Disposition: form-data; name="image"; filename="frame.jpg"\r\n'
        "Content-Type: image/jpeg\r\n\r\n"
    ).encode() + jpeg + f"\r\n--{boundary}--\r\n".encode()
    found = extract_image_bytes(f"multipart/form-data; boundary={boundary}", body)
    assert found == jpeg


def _jpeg(value: int = 10) -> bytes:
    ok, encoded = cv2.imencode(".jpg", np.full((48, 64, 3), value, dtype=np.uint8))
    assert ok
    return encoded.tobytes()


def _multipart(jpeg: bytes, boundary: str = "frameboundary") -> tuple[str, bytes]:
    body = (
        f"--{boundary}\r\n"
        'Content-Disposition: form-data; name="image"; filename="frame.jpg"\r\n'
        "Content-Type: image/jpeg\r\n\r\n"
    ).encode() + jpeg + f"\r\n--{boundary}--\r\n".encode()
    return f"multipart/form-data; boundary={boundary}", body


def _pump(source: BrowserSource, broadcaster: FrameBroadcaster, stop: threading.Event) -> None:
    pipeline = Pipeline(build_analyzers(["brightness"]))
    while not stop.is_set():
        frame = source.read()
        if frame is None:
            time.sleep(0.005)
            continue
        report = pipeline.process(frame)
        payload = report.to_dict()
        broadcaster.publish(Pipeline.draw(frame, report), payload)
        source.complete(payload)


def test_post_frame_returns_analysis_report():
    source = BrowserSource().start()
    broadcaster = FrameBroadcaster()
    server = serve(broadcaster, host="127.0.0.1", port=0, ingest=source)
    port = server.server_address[1]
    stop = threading.Event()
    worker = threading.Thread(target=_pump, args=(source, broadcaster, stop), daemon=True)
    worker.start()
    try:
        content_type, body = _multipart(_jpeg(12))
        request = urllib.request.Request(
            f"http://127.0.0.1:{port}/frame",
            data=body,
            method="POST",
            headers={"Content-Type": content_type},
        )
        with urllib.request.urlopen(request, timeout=5) as response:
            report = json.loads(response.read().decode())
        assert response.status == 200
        assert "fps" in report
        assert report["results"]
        assert report["results"][0]["analyzer"] == "brightness"
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/status", timeout=2) as status:
            posted = json.loads(status.read().decode())
        assert posted["results"][0]["analyzer"] == "brightness"
    finally:
        stop.set()
        source.stop()
        server.shutdown()
        server.server_close()


def test_post_frame_rejects_empty_body():
    source = BrowserSource().start()
    server = serve(FrameBroadcaster(), host="127.0.0.1", port=0, ingest=source)
    port = server.server_address[1]
    try:
        request = urllib.request.Request(
            f"http://127.0.0.1:{port}/frame",
            data=b"",
            method="POST",
            headers={"Content-Type": "image/jpeg"},
        )
        try:
            urllib.request.urlopen(request, timeout=2)
            raise AssertionError("empty body should fail")
        except urllib.error.HTTPError as error:
            assert error.code == 400
            detail = json.loads(error.read().decode())["detail"]
            assert "JPEG" in detail
    finally:
        source.stop()
        server.shutdown()
        server.server_close()
