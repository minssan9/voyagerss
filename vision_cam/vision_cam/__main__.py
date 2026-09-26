"""실행: python -m vision_cam [옵션]

예)
  python -m vision_cam                                  # macOS: 내장 카메라 + 창 표시
  python -m vision_cam --analyzers motion,face --stream 8080
  python -m vision_cam --source picamera --no-display --stream 8080   # 라즈베리파이
  python -m vision_cam --source sample.mp4 --events events.jsonl
  python -m vision_cam --analyzers object --object-every 3 --roi roi.json --decide
  python -m vision_cam.roi_tool                          # ROI 구역 그리기 도구
"""
from __future__ import annotations

import argparse
import json
import os
import signal
import sys
import threading
import time
import urllib.request

import cv2

from .analyzers import REGISTRY, build_analyzers
from .decision import DecisionRules, DrivingDecider
from .pipeline import FrameReport, Pipeline
from .roi import load_zones
from .sources import open_source


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    env = os.environ.get
    p = argparse.ArgumentParser(prog="vision_cam", description="OpenCV 실시간 카메라 분석")
    p.add_argument("--source", default=env("VISION_CAM_SOURCE", "auto"),
                   help="auto | picamera | 카메라 인덱스(0) | 파일 경로 | rtsp URL")
    p.add_argument("--width", type=int, default=int(env("VISION_CAM_WIDTH", 640)))
    p.add_argument("--height", type=int, default=int(env("VISION_CAM_HEIGHT", 480)))
    p.add_argument("--fps", type=int, default=int(env("VISION_CAM_FPS", 30)))
    p.add_argument("--analyzers", default=env("VISION_CAM_ANALYZERS", "motion,face,brightness"),
                   help=f"쉼표 구분. 사용 가능: {','.join(sorted(REGISTRY))}")
    p.add_argument("--analysis-width", type=int, default=int(env("VISION_CAM_ANALYSIS_WIDTH", 320)),
                   help="분석용 축소 폭 (0=원본). 파이에서는 320 이하 권장")
    p.add_argument("--display", dest="display", action="store_true", default=None,
                   help="OpenCV 창 표시 (기본: GUI 환경이면 켬)")
    p.add_argument("--no-display", dest="display", action="store_false")
    p.add_argument("--stream", type=int, metavar="PORT", default=int(env("VISION_CAM_STREAM_PORT", 0)),
                   help="MJPEG 스트리밍 포트 (0=끔)")
    p.add_argument("--events", metavar="FILE", default=env("VISION_CAM_EVENTS_FILE"),
                   help="트리거 이벤트를 JSON Lines 로 저장")
    p.add_argument("--webhook", metavar="URL", default=env("VISION_CAM_WEBHOOK_URL"),
                   help="트리거 이벤트를 POST 할 URL (예: 백엔드 API)")
    p.add_argument("--snapshot-dir", default=env("VISION_CAM_SNAPSHOT_DIR"),
                   help="트리거 시 오버레이 이미지를 JPEG 로 저장할 폴더")
    p.add_argument("--cooldown", type=float, default=float(env("VISION_CAM_COOLDOWN", 5.0)),
                   help="같은 분석기의 이벤트 최소 간격(초)")
    p.add_argument("--roi", metavar="FILE", default=env("VISION_CAM_ROI_FILE"),
                   help="ROI 구역 JSON 파일 (python -m vision_cam.roi_tool 로 생성)")
    p.add_argument("--object-model", metavar="DIR", default=env("VISION_CAM_MODEL_DIR"),
                   help="object 분석기 모델 폴더 (기본: vision_cam/models, deploy/download-models.sh 로 다운로드)")
    p.add_argument("--object-confidence", type=float,
                   default=float(env("VISION_CAM_OBJECT_CONFIDENCE", 0.5)),
                   help="object 분석기 최소 신뢰도")
    p.add_argument("--object-classes", default=env("VISION_CAM_OBJECT_CLASSES", ""),
                   help="object 분석기가 검출할 클래스 (쉼표 구분, 비우면 전체)")
    p.add_argument("--object-every", type=int, default=int(env("VISION_CAM_OBJECT_EVERY", 1)),
                   help="N 프레임마다 1회 추론 (파이에서는 3 권장)")
    p.add_argument("--decide", action="store_true",
                   default=env("VISION_CAM_DECIDE", "").lower() in ("1", "true"),
                   help="자율주행 STOP/SLOW/GO 판단 레이어 활성화")
    p.add_argument("--decision-config", metavar="FILE", default=env("VISION_CAM_DECISION_CONFIG"),
                   help="DecisionRules 오버라이드 JSON 파일")
    p.add_argument("--decision-heartbeat", type=float,
                   default=float(env("VISION_CAM_DECISION_HEARTBEAT", 0.0)),
                   help="변화 없어도 이 간격(초)마다 driving 이벤트 재전송 (0=끔)")
    p.add_argument("--max-frames", type=int, default=0, help="이 프레임 수 처리 후 종료 (테스트용)")
    args = p.parse_args(argv)
    if args.display is None:
        args.display = sys.platform == "darwin" or bool(os.environ.get("DISPLAY"))
    return args


class EventSink:
    """트리거된 결과를 cooldown 적용 후 파일/웹훅/스냅샷으로 내보낸다."""

    def __init__(self, events_file: str | None, webhook: str | None,
                 snapshot_dir: str | None, cooldown: float, decision_heartbeat: float = 0.0):
        self.events_file = events_file
        self.webhook = webhook
        self.snapshot_dir = snapshot_dir
        self.cooldown = cooldown
        self.decision_heartbeat = decision_heartbeat
        self._last: dict[str, float] = {}
        self._last_decision_ts = 0.0
        if snapshot_dir:
            os.makedirs(snapshot_dir, exist_ok=True)

    def _snapshot(self, report: FrameReport, overlay, tag: str) -> str:
        name = f"{time.strftime('%Y%m%d-%H%M%S', time.localtime(report.timestamp))}_{tag}.jpg"
        path = os.path.join(self.snapshot_dir, name)
        cv2.imwrite(path, overlay)
        return path

    def handle(self, report: FrameReport, overlay) -> list[dict]:
        fired = []
        for r in report.triggered:
            if report.timestamp - self._last.get(r.analyzer, 0.0) < self.cooldown:
                continue
            self._last[r.analyzer] = report.timestamp
            event = {"ts": round(report.timestamp, 3), **r.to_dict()}
            if self.snapshot_dir:
                event["snapshot"] = self._snapshot(report, overlay, r.analyzer)
            fired.append(event)

        # 주행 판단 이벤트는 STOP 이 지연되면 안 되므로 cooldown 을 적용하지 않는다.
        decision = report.decision
        if decision is not None:
            due_heartbeat = (
                self.decision_heartbeat > 0
                and report.timestamp - self._last_decision_ts >= self.decision_heartbeat
            )
            if decision.changed or due_heartbeat:
                self._last_decision_ts = report.timestamp
                event = {
                    "ts": round(report.timestamp, 3),
                    "analyzer": "driving",
                    "triggered": True,
                    "decision": decision.to_dict(),
                    "zone_hits": report.zone_hits,
                }
                if self.snapshot_dir and decision.changed:
                    event["snapshot"] = self._snapshot(report, overlay, "driving")
                fired.append(event)

        for event in fired:
            line = json.dumps(event, ensure_ascii=False)
            print(line, flush=True)
            if self.events_file:
                with open(self.events_file, "a", encoding="utf-8") as f:
                    f.write(line + "\n")
            if self.webhook:
                threading.Thread(target=self._post, args=(event,), daemon=True).start()
        return fired

    def _post(self, event: dict) -> None:
        req = urllib.request.Request(
            self.webhook, data=json.dumps(event).encode(), method="POST",
            headers={"Content-Type": "application/json"},
        )
        try:
            urllib.request.urlopen(req, timeout=5).close()
        except Exception as e:  # 네트워크 오류가 분석 루프를 멈추면 안 됨
            print(f"[webhook] 전송 실패: {e}", file=sys.stderr)


def run(args: argparse.Namespace) -> int:
    names = [n.strip() for n in args.analyzers.split(",") if n.strip()]

    options: dict[str, dict] = {}
    if "object" in names:
        object_opts: dict = {
            "confidence": args.object_confidence,
            "every_n": args.object_every,
        }
        if args.object_model:
            object_opts["model_dir"] = args.object_model
        classes = [c.strip() for c in args.object_classes.split(",") if c.strip()]
        if classes:
            object_opts["classes"] = classes
        options["object"] = object_opts

    zones = load_zones(args.roi) if args.roi else None
    decider = None
    if args.decide:
        rules = DecisionRules.from_file(args.decision_config) if args.decision_config else None
        decider = DrivingDecider(rules)

    pipeline = Pipeline(
        build_analyzers(names, options), analysis_width=args.analysis_width,
        zones=zones, decider=decider,
    )
    sink = EventSink(args.events, args.webhook, args.snapshot_dir, args.cooldown,
                      decision_heartbeat=args.decision_heartbeat)

    broadcaster = server = None
    if args.stream:
        from .stream import FrameBroadcaster, serve
        broadcaster = FrameBroadcaster()
        server = serve(broadcaster, port=args.stream)
        print(f"[stream] http://0.0.0.0:{args.stream}/", file=sys.stderr)

    stop = threading.Event()
    signal.signal(signal.SIGTERM, lambda *_: stop.set())

    source = open_source(args.source, args.width, args.height, args.fps)
    zone_names = [z.name for z in (zones or [])]
    print(f"[vision_cam] source={args.source} analyzers={names} "
          f"roi={zone_names or 'off'} decide={'on' if decider else 'off'}", file=sys.stderr)
    frames = 0
    try:
        with source:
            while not stop.is_set():
                frame = source.read()
                if frame is None:
                    if source.finished:
                        break
                    time.sleep(0.005)
                    continue
                report = pipeline.process(frame)
                overlay = Pipeline.draw(frame, report)
                sink.handle(report, overlay)
                if broadcaster:
                    broadcaster.publish(overlay, report.to_dict())
                if args.display:
                    cv2.imshow("vision_cam (q: quit)", overlay)
                    if cv2.waitKey(1) & 0xFF in (ord("q"), 27):
                        break
                frames += 1
                if args.max_frames and frames >= args.max_frames:
                    break
    except KeyboardInterrupt:
        pass
    finally:
        if args.display:
            cv2.destroyAllWindows()
        if server:
            server.shutdown()
    print(f"[vision_cam] {frames} frames processed", file=sys.stderr)
    return 0


def main(argv: list[str] | None = None) -> int:
    return run(parse_args(argv))


if __name__ == "__main__":
    sys.exit(main())
