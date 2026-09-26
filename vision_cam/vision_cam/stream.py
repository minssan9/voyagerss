"""헤드리스(라즈베리파이) 환경용 MJPEG 스트리밍 서버.

브라우저에서 http://<pi-ip>:8080/ 로 분석 화면을, /status 로 최신 JSON 결과를 본다.
"""
from __future__ import annotations

import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import cv2
import numpy as np

_INDEX = b"""<!doctype html><html><head><meta charset="utf-8"><title>vision_cam</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;background:#111;color:#eee;font-family:-apple-system,system-ui,sans-serif}
main{max-width:960px;margin:0 auto;padding:16px}img{width:100%;border-radius:12px}
pre{background:#1c1c1e;padding:12px;border-radius:12px;font-size:12px;overflow:auto}</style></head>
<body><main><h3>vision_cam</h3><img src="/stream.mjpg"><pre id="s"></pre></main>
<script>setInterval(()=>fetch('/status').then(r=>r.json()).then(j=>{
document.getElementById('s').textContent=JSON.stringify(j,null,2)}).catch(()=>{}),1000)</script>
</body></html>"""


class FrameBroadcaster:
    def __init__(self, jpeg_quality: int = 75):
        self.jpeg_quality = jpeg_quality
        self._jpeg: bytes | None = None
        self._status: dict = {}
        self._cond = threading.Condition()

    def publish(self, frame: np.ndarray, status: dict) -> None:
        ok, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, self.jpeg_quality])
        if not ok:
            return
        with self._cond:
            self._jpeg = buf.tobytes()
            self._status = status
            self._cond.notify_all()

    def wait_frame(self, timeout: float = 2.0) -> bytes | None:
        with self._cond:
            self._cond.wait(timeout)
            return self._jpeg

    @property
    def status(self) -> dict:
        with self._cond:
            return self._status


def serve(broadcaster: FrameBroadcaster, host: str = "0.0.0.0", port: int = 8080) -> ThreadingHTTPServer:
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):  # 요청 로그 억제
            pass

        def do_GET(self):
            if self.path == "/":
                self._send(200, "text/html; charset=utf-8", _INDEX)
            elif self.path == "/status":
                self._send(200, "application/json", json.dumps(broadcaster.status).encode())
            elif self.path == "/stream.mjpg":
                self.send_response(200)
                self.send_header("Cache-Control", "no-cache")
                self.send_header("Content-Type", "multipart/x-mixed-replace; boundary=frame")
                self.end_headers()
                try:
                    while True:
                        jpeg = broadcaster.wait_frame()
                        if jpeg is None:
                            continue
                        self.wfile.write(b"--frame\r\nContent-Type: image/jpeg\r\n")
                        self.wfile.write(f"Content-Length: {len(jpeg)}\r\n\r\n".encode())
                        self.wfile.write(jpeg + b"\r\n")
                except (BrokenPipeError, ConnectionResetError):
                    pass
            else:
                self._send(404, "text/plain", b"not found")

        def _send(self, code: int, ctype: str, body: bytes):
            self.send_response(code)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

    server = ThreadingHTTPServer((host, port), Handler)
    server.daemon_threads = True
    threading.Thread(target=server.serve_forever, name="mjpeg", daemon=True).start()
    return server
