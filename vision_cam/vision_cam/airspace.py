"""공역 감시 실행기: 카메라 드론 탐지 + mmWave 레이더 → 융합 추적 → 팬틸트 추종 → 경보.

관측·기록·경보 전용이다. 무력화·발사 장치를 제어하지 않는다.

    python -m vision_cam.airspace --simulate --stream 8090           # 하드웨어 없이
    python -m vision_cam.airspace --radar /dev/ttyUSB1 --gimbal pca9685 --stream 8090

HTTP (--stream): /  /stream.mjpg  /status  /tracks
백엔드 연동 (--backend): 스냅샷을 POST <backend>/api/airspace/ingest 로 초당 --push-hz 번 보낸다.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import queue
import signal
import socketserver
import sys
import threading
import time
import urllib.request
from dataclasses import dataclass, field
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import cv2
import numpy as np

from .analyzers import build_analyzers
from .gimbal import GimbalConfig, GimbalController, MockServoDriver
from .pipeline import FrameReport, Pipeline
from .radar import RadarFrame, cluster_points
from .radar.simulator import AirspaceSimulator
from .tracking import CameraMeasurement, MultiTargetTracker, RadarMeasurement, Track
from .tracking.geometry import pixel_to_sensor_bearing, sensor_bearing_to_world, spherical_to_xyz, world_to_sensor

THREAT_COLORS = {"HIGH": (0, 0, 255), "MEDIUM": (0, 165, 255), "LOW": (0, 200, 0)}


@dataclass
class CameraModel:
    hfov_deg: float = 66.0  # Pi Camera Module 3 (표준 렌즈)
    vfov_deg: float = 41.0

    def project(self, az: float, el: float, pan: float, tilt: float, w: int, h: int) -> tuple[int, int] | None:
        x, y, z = world_to_sensor(spherical_to_xyz(az, el), pan, tilt)
        if y <= 1e-3:
            return None
        fx = (w / 2) / math.tan(math.radians(self.hfov_deg) / 2)
        fy = (h / 2) / math.tan(math.radians(self.vfov_deg) / 2)
        px, py = w / 2 + fx * x / y, h / 2 - fy * z / y
        if not (0 <= px < w and 0 <= py < h):
            return None
        return int(px), int(py)


@dataclass
class AirspaceSystem:
    pipeline: Pipeline
    tracker: MultiTargetTracker
    gimbal: GimbalController
    camera: CameraModel = field(default_factory=CameraModel)
    radar_mode: str = "off"
    min_cluster_snr_db: float = 0.0

    def step(self, t: float, frame: np.ndarray, radar_frames: list[RadarFrame]) -> tuple[FrameReport, list[Track]]:
        pan, tilt = self.gimbal.pose  # 이 프레임을 찍을 때의 자세
        report = self.pipeline.process(frame)
        h, w = frame.shape[:2]

        cams = []
        for result in report.results:
            if result.analyzer != "drone":
                continue
            for d in result.detections:
                x, y, bw, bh = d.bbox
                saz, sel = pixel_to_sensor_bearing(x + bw / 2, y + bh / 2, w, h, self.camera.hfov_deg, self.camera.vfov_deg)
                az, el = sensor_bearing_to_world(saz, sel, pan, tilt)
                cams.append(CameraMeasurement(az, el, d.label, d.score))

        radars = []
        for rf in radar_frames:
            for det in cluster_points(rf.points, min_snr_db=self.min_cluster_snr_db):
                az, el = sensor_bearing_to_world(det.azimuth_deg, det.elevation_deg, pan, tilt)
                radars.append(RadarMeasurement(az, el, det.range, det.radial_velocity, det.snr_db))

        tracks = self.tracker.step(t, cams, radars)
        self.gimbal.update(tracks, t)
        return report, tracks

    def snapshot(self, t: float, report: FrameReport, tracks: list[Track]) -> dict:
        return {
            "ts": round(time.time(), 3),
            "t": round(t, 3),
            "fps": round(report.fps, 1),
            "gimbal": self.gimbal.to_dict(),
            "sensors": {"camera": True, "radar": self.radar_mode},
            "camera": {"hfov": self.camera.hfov_deg, "vfov": self.camera.vfov_deg},
            "tracks": [tr.to_dict() for tr in tracks],
        }

    def draw(self, frame: np.ndarray, report: FrameReport, tracks: list[Track]) -> np.ndarray:
        out = Pipeline.draw(frame, report)
        h, w = out.shape[:2]
        pan, tilt = self.gimbal.pose
        for tr in tracks:
            if not tr.confirmed:
                continue
            p = self.camera.project(float(tr.kf.x[0]), float(tr.kf.x[1]), pan, tilt, w, h)
            if p is None:
                continue
            color = THREAT_COLORS.get(tr.threat, (255, 255, 255))
            cv2.drawMarker(out, p, color, cv2.MARKER_SQUARE, 22, 2)
            rng = f" {tr.range:.0f}m" if tr.range is not None else ""
            cv2.putText(out, f"T{tr.id} {tr.threat}{rng}", (p[0] + 14, p[1] - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, color, 1)
        cv2.drawMarker(out, (w // 2, h // 2), (255, 255, 255), cv2.MARKER_CROSS, 18, 1)
        hud = f"PAN {pan:+.1f}  TILT {tilt:+.1f}  TGT {self.gimbal.target_id or '-'}  RADAR {self.radar_mode}"
        cv2.putText(out, hud, (8, h - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)
        return out


class SnapshotPusher:
    """백엔드로 최신 스냅샷만 보낸다. 밀리면 오래된 것은 버린다."""

    def __init__(self, url: str, token: str | None, hz: float):
        self.url, self.token, self.period = url, token, 1.0 / max(hz, 0.1)
        self._q: queue.Queue[dict] = queue.Queue(maxsize=1)
        self._last = 0.0
        self._warned = False
        threading.Thread(target=self._run, name="airspace-push", daemon=True).start()

    def offer(self, snapshot: dict) -> None:
        now = time.monotonic()
        if now - self._last < self.period:
            return
        self._last = now
        try:
            self._q.get_nowait()
        except queue.Empty:
            pass
        self._q.put_nowait(snapshot)

    def _run(self) -> None:
        while True:
            body = json.dumps(self._q.get()).encode()
            headers = {"Content-Type": "application/json"}
            if self.token:
                headers["X-Airspace-Token"] = self.token
            try:
                urllib.request.urlopen(urllib.request.Request(self.url, body, headers, method="POST"), timeout=3).close()
                self._warned = False
            except Exception as e:  # 백엔드가 죽어도 감시 루프는 계속 돈다
                if not self._warned:
                    print(f"[airspace] 백엔드 전송 실패: {e}", file=sys.stderr)
                    self._warned = True


class EventRecorder:
    """새 확정 트랙·경보 상승을 JSONL 로 남기고, HIGH 진입 시 화면을 저장한다."""

    def __init__(self, events_file: str | None, snapshot_dir: str | None):
        self.events_file = events_file
        self.snapshot_dir = Path(snapshot_dir) if snapshot_dir else None
        if self.snapshot_dir:
            self.snapshot_dir.mkdir(parents=True, exist_ok=True)
        self._seen: dict[int, str] = {}

    def handle(self, tracks: list[Track], overlay: np.ndarray) -> list[dict]:
        order = {"LOW": 0, "MEDIUM": 1, "HIGH": 2}
        events = []
        live = {tr.id for tr in tracks if tr.confirmed}
        for tr in tracks:
            if not tr.confirmed:
                continue
            prev = self._seen.get(tr.id)
            if prev is None or order[tr.threat] > order[prev]:
                ev = {"ts": round(time.time(), 3), "type": "track_new" if prev is None else "threat_up",
                      "track": tr.to_dict()}
                if self.snapshot_dir and tr.threat == "HIGH":
                    path = self.snapshot_dir / f"airspace_{int(time.time() * 1000)}_T{tr.id}.jpg"
                    cv2.imwrite(str(path), overlay)
                    ev["snapshot"] = str(path)
                events.append(ev)
                self._seen[tr.id] = tr.threat  # 지금까지의 최고 등급만 기억해 깜빡임 경보를 막는다
        for tid in [t for t in self._seen if t not in live]:
            events.append({"ts": round(time.time(), 3), "type": "track_lost", "trackId": tid})
            del self._seen[tid]
        for ev in events:
            line = json.dumps(ev, ensure_ascii=False)
            print(line, flush=True)
            if self.events_file:
                with open(self.events_file, "a", encoding="utf-8") as f:
                    f.write(line + "\n")
        return events


_INDEX = b"""<!doctype html><html><head><meta charset="utf-8"><title>airspace</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;background:#111;color:#eee;font-family:-apple-system,system-ui,sans-serif}
main{max-width:960px;margin:0 auto;padding:16px}img{width:100%;border-radius:12px}
pre{background:#1c1c1e;padding:12px;border-radius:12px;font-size:12px;overflow:auto}</style></head>
<body><main><h3>airspace</h3><img src="/stream.mjpg"><pre id="s"></pre></main>
<script>setInterval(()=>fetch('/tracks').then(r=>r.json()).then(j=>{
document.getElementById('s').textContent=JSON.stringify(j,null,2)}).catch(()=>{}),500)</script>
</body></html>"""


class _Server(ThreadingHTTPServer):
    daemon_threads = True

    def server_bind(self):
        # HTTPServer.server_bind 의 getfqdn() 역방향 DNS 조회는 환경에 따라 수십 초 걸린다.
        socketserver.TCPServer.server_bind(self)
        self.server_name, self.server_port = self.server_address[:2]


def serve(broadcaster, port: int, host: str = "0.0.0.0") -> ThreadingHTTPServer:
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def do_GET(self):
            path = self.path.split("?", 1)[0]
            if path == "/":
                self._send(200, "text/html; charset=utf-8", _INDEX)
            elif path in ("/status", "/tracks"):
                status = broadcaster.status
                body = status if path == "/status" else {"ts": status.get("ts"), "tracks": status.get("tracks", [])}
                self._send(200, "application/json", json.dumps(body).encode())
            elif path == "/stream.mjpg":
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
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(body)

    server = _Server((host, port), Handler)
    threading.Thread(target=server.serve_forever, name="airspace-http", daemon=True).start()
    return server


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    env = os.environ.get
    p = argparse.ArgumentParser(prog="vision_cam.airspace", description="카메라+레이더 공역 감시 (관측·경보 전용)")
    p.add_argument("--simulate", action="store_true", help="가상 카메라·레이더·목표물로 실행")
    p.add_argument("--source", default=env("VISION_CAM_SOURCE", "auto"), help="카메라 (vision_cam 과 같은 형식)")
    p.add_argument("--width", type=int, default=int(env("VISION_CAM_WIDTH", 640)))
    p.add_argument("--height", type=int, default=int(env("VISION_CAM_HEIGHT", 480)))
    p.add_argument("--fps", type=int, default=int(env("VISION_CAM_FPS", 20)))
    p.add_argument("--analysis-width", type=int, default=int(env("VISION_CAM_ANALYSIS_WIDTH", 640)),
                   help="작은 드론을 놓치지 않도록 기본은 축소하지 않는다")
    p.add_argument("--hfov", type=float, default=float(env("AIRSPACE_HFOV", 66.0)))
    p.add_argument("--vfov", type=float, default=float(env("AIRSPACE_VFOV", 41.0)))
    p.add_argument("--sky-ratio", type=float, default=float(env("AIRSPACE_SKY_RATIO", 1.0)),
                   help="드론 분석기가 볼 화면 위쪽 비율 (팬틸트가 하늘을 보므로 기본 전체)")
    p.add_argument("--drone-model", default=env("AIRSPACE_DRONE_MODEL"), help="선택: ONNX 드론/새 분류기")
    p.add_argument("--radar", default=env("AIRSPACE_RADAR", "off"), help="off | sim | 시리얼 포트(/dev/ttyUSB1)")
    p.add_argument("--radar-baud", type=int, default=int(env("AIRSPACE_RADAR_BAUD", 921600)))
    p.add_argument("--gimbal", default=env("AIRSPACE_GIMBAL", "mock"), help="mock | pca9685")
    p.add_argument("--i2c-bus", type=int, default=int(env("AIRSPACE_I2C_BUS", 1)))
    p.add_argument("--stream", type=int, metavar="PORT", default=int(env("AIRSPACE_STREAM_PORT", 0)))
    p.add_argument("--backend", default=env("AIRSPACE_BACKEND_URL"), help="예: http://localhost:3000")
    p.add_argument("--backend-token", default=env("AIRSPACE_INGEST_TOKEN"))
    p.add_argument("--push-hz", type=float, default=float(env("AIRSPACE_PUSH_HZ", 5)))
    p.add_argument("--events", default=env("AIRSPACE_EVENTS_FILE"), help="이벤트 JSONL 경로")
    p.add_argument("--snapshot-dir", default=env("AIRSPACE_SNAPSHOT_DIR"), help="HIGH 경보 화면 저장 폴더")
    p.add_argument("--display", action="store_true")
    p.add_argument("--max-frames", type=int, default=0, help="이 프레임 수 처리 후 종료 (테스트용)")
    p.add_argument("--fast", action="store_true", help="--simulate 에서 실시간 대기 없이 돌린다")
    args = p.parse_args(argv)
    if args.simulate and args.radar == "off":
        args.radar = "sim"
    return args


def build_system(args: argparse.Namespace) -> AirspaceSystem:
    drone_opts = {"sky_ratio": args.sky_ratio}
    if args.drone_model:
        drone_opts["classifier_model"] = args.drone_model
    pipeline = Pipeline(build_analyzers(["drone"], {"drone": drone_opts}), analysis_width=args.analysis_width)
    if args.gimbal == "pca9685":
        from .gimbal import Pca9685Driver
        driver = Pca9685Driver(bus=args.i2c_bus)
    else:
        driver = MockServoDriver()
    radar_mode = "sim" if args.radar == "sim" else ("off" if args.radar == "off" else "serial")
    return AirspaceSystem(
        pipeline=pipeline,
        tracker=MultiTargetTracker(),
        gimbal=GimbalController(driver, GimbalConfig()),
        camera=CameraModel(args.hfov, args.vfov),
        radar_mode=radar_mode,
    )


def run(args: argparse.Namespace) -> int:
    system = build_system(args)
    stop = threading.Event()
    signal.signal(signal.SIGTERM, lambda *_: stop.set())

    sim = AirspaceSimulator() if args.simulate or args.radar == "sim" else None
    serial_radar = None
    if args.radar not in ("off", "sim"):
        from .radar import SerialRadar
        serial_radar = SerialRadar(args.radar, args.radar_baud)

    broadcaster = None
    if args.stream:
        from .stream import FrameBroadcaster
        broadcaster = FrameBroadcaster()
        serve(broadcaster, args.stream)
        print(f"[airspace] http://0.0.0.0:{args.stream}/", file=sys.stderr)
    pusher = SnapshotPusher(args.backend.rstrip("/") + "/api/airspace/ingest", args.backend_token, args.push_hz) \
        if args.backend else None
    recorder = EventRecorder(args.events, args.snapshot_dir)

    source = None
    if not args.simulate:
        from .sources import open_source
        source = open_source(args.source, args.width, args.height, args.fps).start()

    print(f"[airspace] camera={'sim' if args.simulate else args.source} radar={system.radar_mode} "
          f"gimbal={args.gimbal} backend={args.backend or 'off'}", file=sys.stderr)
    t0 = time.monotonic()
    frames = 0
    try:
        while not stop.is_set():
            if args.simulate:
                t = frames / args.fps
                pan, tilt = system.gimbal.pose
                frame = sim.camera_frame(t, pan, tilt, args.width, args.height, args.hfov, args.vfov)
                if not args.fast:
                    time.sleep(max(0.0, t0 + t - time.monotonic()))
            else:
                frame = source.read()
                if frame is None:
                    if source.finished:
                        break
                    time.sleep(0.005)
                    continue
                t = time.monotonic() - t0

            if sim is not None:
                radar_frames = [sim.radar_frame(t, *system.gimbal.pose)]
            elif serial_radar is not None:
                radar_frames = serial_radar.read()
            else:
                radar_frames = []

            report, tracks = system.step(t, frame, radar_frames)
            overlay = system.draw(frame, report, tracks)
            snap = system.snapshot(t, report, tracks)
            recorder.handle(tracks, overlay)
            if broadcaster:
                broadcaster.publish(overlay, snap)
            if pusher:
                pusher.offer(snap)
            if args.display:
                cv2.imshow("airspace (q: quit)", overlay)
                if cv2.waitKey(1) & 0xFF in (ord("q"), 27):
                    break
            frames += 1
            if args.max_frames and frames >= args.max_frames:
                break
    except KeyboardInterrupt:
        pass
    finally:
        if source is not None:
            source.stop()
        if serial_radar is not None:
            serial_radar.close()
        system.gimbal.release()
        if args.display:
            cv2.destroyAllWindows()
    return 0


def main(argv: list[str] | None = None) -> int:
    return run(parse_args(argv))


if __name__ == "__main__":
    sys.exit(main())
