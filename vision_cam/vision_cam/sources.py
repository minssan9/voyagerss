"""카메라 입력 추상화.

- OpenCVSource : macOS 내장/USB 웹캠, 라즈베리파이 USB 웹캠, 동영상 파일, RTSP URL
- PiCamera2Source : 라즈베리파이 카메라 모듈 (libcamera / picamera2)
- BrowserSource : 장치를 열지 않고 POST /frame 으로 받은 최신 프레임만 유지

별도 스레드에서 계속 최신 프레임만 가져와 두기 때문에, 분석이 느려도
버퍼에 오래된 프레임이 쌓여 지연(latency)이 커지지 않는다.
"""
from __future__ import annotations

import platform
import sys
import threading
import time

import cv2
import numpy as np


class FrameSource:
    def start(self) -> "FrameSource":
        raise NotImplementedError

    def read(self) -> np.ndarray | None:
        """마지막 호출 이후 새로 들어온 가장 최근 프레임(BGR). 없으면 None."""
        raise NotImplementedError

    def stop(self) -> None:
        raise NotImplementedError

    @property
    def finished(self) -> bool:
        """파일 입력이 끝났거나 카메라가 끊겼으면 True."""
        return False

    def __enter__(self):
        return self.start()

    def __exit__(self, *exc):
        self.stop()


def _default_backend() -> int:
    if sys.platform == "darwin":
        return cv2.CAP_AVFOUNDATION
    if sys.platform.startswith("linux"):
        return cv2.CAP_V4L2
    return cv2.CAP_ANY


class OpenCVSource(FrameSource):
    def __init__(self, source: int | str = 0, width: int = 640, height: int = 480, fps: int = 30):
        self.source = source
        self.width, self.height, self.fps = width, height, fps
        self._is_file = isinstance(source, str)
        self._cap: cv2.VideoCapture | None = None
        self._frame: np.ndarray | None = None
        self._fresh = False
        self._lock = threading.Lock()
        self._running = False
        self._finished = False
        self._thread: threading.Thread | None = None

    def start(self) -> "OpenCVSource":
        backend = cv2.CAP_ANY if self._is_file else _default_backend()
        self._cap = cv2.VideoCapture(self.source, backend)
        if not self._cap.isOpened():
            hint = ""
            if sys.platform == "darwin":
                hint = " (macOS: 시스템 설정 > 개인정보 보호 > 카메라 에서 터미널 권한 허용 필요)"
            raise RuntimeError(f"카메라/영상을 열 수 없습니다: {self.source!r}{hint}")
        if not self._is_file:
            self._cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
            self._cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
            self._cap.set(cv2.CAP_PROP_FPS, self.fps)
            self._cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        self._running = True
        self._thread = threading.Thread(target=self._loop, name="camera", daemon=True)
        self._thread.start()
        return self

    def _loop(self) -> None:
        # 파일은 원래 속도로 재생 (그렇지 않으면 순식간에 끝나버림)
        delay = 1.0 / (self._cap.get(cv2.CAP_PROP_FPS) or self.fps) if self._is_file else 0.0
        while self._running:
            ok, frame = self._cap.read()
            if not ok:
                self._finished = True
                break
            with self._lock:
                self._frame = frame
                self._fresh = True
            if delay:
                time.sleep(delay)

    def read(self) -> np.ndarray | None:
        with self._lock:
            if not self._fresh:
                return None
            self._fresh = False
            return self._frame

    @property
    def finished(self) -> bool:
        return self._finished

    def stop(self) -> None:
        self._running = False
        if self._thread:
            self._thread.join(timeout=2)
        if self._cap:
            self._cap.release()


class PiCamera2Source(FrameSource):
    """라즈베리파이 카메라 모듈 (CSI). picamera2 는 apt 로 설치해야 한다."""

    def __init__(self, width: int = 640, height: int = 480, fps: int = 30):
        try:
            from picamera2 import Picamera2  # type: ignore
        except ImportError as e:  # pragma: no cover - Pi 전용
            raise RuntimeError(
                "picamera2 가 없습니다. `sudo apt install -y python3-picamera2` 후 "
                "venv 를 --system-site-packages 로 만드세요."
            ) from e
        self._Picamera2 = Picamera2
        self.width, self.height, self.fps = width, height, fps
        self._cam = None

    def start(self) -> "PiCamera2Source":  # pragma: no cover - Pi 전용
        self._cam = self._Picamera2()
        config = self._cam.create_video_configuration(
            main={"size": (self.width, self.height), "format": "RGB888"},
            controls={"FrameRate": self.fps},
        )
        self._cam.configure(config)
        self._cam.start()
        return self

    def read(self) -> np.ndarray | None:  # pragma: no cover - Pi 전용
        # picamera2 의 "RGB888" 은 메모리상 BGR 순서라 OpenCV 에 그대로 사용 가능
        return self._cam.capture_array("main")

    def stop(self) -> None:  # pragma: no cover - Pi 전용
        if self._cam:
            self._cam.stop()
            self._cam.close()


class BrowserSource(FrameSource):
    """장치를 열지 않는다. submit() 으로 넣은 가장 최근 BGR 프레임만 분석 루프에 넘긴다."""

    def __init__(self):
        self._cond = threading.Condition()
        self._frame: np.ndarray | None = None
        self._fresh = False
        self._running = False
        self._seq = 0
        self._inflight = 0
        self._completed_seq = 0
        self._last_report: dict | None = None

    def start(self) -> "BrowserSource":
        with self._cond:
            self._running = True
        return self

    def submit(self, frame: np.ndarray) -> int:
        """최신 프레임을 교체하고 이 요청의 순번을 돌려준다. 이전 미처리 프레임은 버린다."""
        with self._cond:
            self._seq += 1
            seq = self._seq
            self._frame = frame
            self._fresh = True
            self._cond.notify_all()
            return seq

    def read(self) -> np.ndarray | None:
        with self._cond:
            if not self._fresh or self._frame is None:
                return None
            self._fresh = False
            self._inflight = self._seq
            return self._frame

    def complete(self, report: dict) -> None:
        """분석 루프가 read() 로 꺼낸 프레임의 결과를 게시한다."""
        with self._cond:
            self._completed_seq = self._inflight
            self._last_report = report
            self._cond.notify_all()

    def wait_report(self, seq: int, timeout: float = 5.0) -> dict | None:
        """seq 이상 프레임이 처리되면 가장 최근 리포트를 돌려준다. 더 새 프레임에 밀린 요청도 그 결과를 받는다."""
        deadline = time.monotonic() + timeout
        with self._cond:
            while self._running and self._completed_seq < seq:
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    return None
                self._cond.wait(remaining)
            if self._completed_seq >= seq and self._last_report is not None:
                return dict(self._last_report)
            return None

    def stop(self) -> None:
        with self._cond:
            self._running = False
            self._cond.notify_all()


def is_raspberry_pi() -> bool:
    try:
        with open("/proc/device-tree/model") as f:
            return "raspberry pi" in f.read().lower()
    except OSError:
        return platform.machine() in ("aarch64", "armv7l") and sys.platform.startswith("linux")


def open_source(spec: str, width: int, height: int, fps: int) -> FrameSource:
    """spec: 'auto' | 'browser' | 'picamera' | 카메라 인덱스('0') | 파일 경로 | rtsp/http URL"""
    if spec == "browser":
        return BrowserSource()
    if spec == "auto":
        if is_raspberry_pi():
            try:
                return PiCamera2Source(width, height, fps)
            except RuntimeError:
                pass  # picamera2 없으면 USB 웹캠으로
        return OpenCVSource(0, width, height, fps)
    if spec == "picamera":
        return PiCamera2Source(width, height, fps)
    if spec.isdigit():
        return OpenCVSource(int(spec), width, height, fps)
    return OpenCVSource(spec, width, height, fps)
