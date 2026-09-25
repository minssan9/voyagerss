from __future__ import annotations

import os
import time
from dataclasses import replace
from pathlib import Path

import cv2
import numpy as np

from .base import AnalysisResult, Analyzer, Detection

# MobileNet-SSD (Caffe, PASCAL VOC) — chuanqi305/MobileNet-SSD
# 라즈베리파이 CPU 만으로도 수 FPS 로 동작하는 가벼운 21클래스 검출기.
VOC_CLASSES = (
    "background", "aeroplane", "bicycle", "bird", "boat", "bottle", "bus", "car",
    "cat", "chair", "cow", "diningtable", "dog", "horse", "motorbike", "person",
    "pottedplant", "sheep", "sofa", "train", "tvmonitor",
)

PROTOTXT = "MobileNetSSD_deploy.prototxt"
CAFFEMODEL = "MobileNetSSD_deploy.caffemodel"
_INPUT_SIZE = 300
_MEAN = 127.5
_SCALE = 0.007843  # 1/127.5


def _default_model_dir() -> str:
    env = os.environ.get("CAMVISION_MODEL_DIR")
    if env:
        return env
    # <repo>/camvision/models  (이 파일은 camvision/camvision/analyzers/object.py)
    return str(Path(__file__).resolve().parents[2] / "models")


def find_model(model_dir: str | None = None) -> tuple[str, str]:
    """(prototxt 경로, caffemodel 경로) 를 돌려준다. 없으면 다운로드 안내와 함께 예외."""
    d = model_dir or _default_model_dir()
    proto = os.path.join(d, PROTOTXT)
    weights = os.path.join(d, CAFFEMODEL)
    if not (os.path.exists(proto) and os.path.exists(weights)):
        raise FileNotFoundError(
            f"모델 파일이 없습니다. bash deploy/download-models.sh 를 실행하세요 (경로: {d})"
        )
    return proto, weights


class ObjectAnalyzer(Analyzer):
    """MobileNet-SSD(Caffe, VOC 21클래스) 로 일반 객체를 검출/분류한다.

    macOS 에서는 `opencv-python` 이 GPU 없이도 실시간에 가깝게 동작하고,
    라즈베리파이 4 에서는 1회 추론에 대략 100~200ms 가 걸린다. 파이에서는
    `every_n=3` (3프레임마다 1회 추론) 과 `--analysis-width 320` 정도를 권장한다
    (SSD 는 어차피 300x300 으로 리사이즈해서 넣으므로 더 키워도 의미가 적다).

    trigger_classes 에 속한 라벨이 하나라도 검출되면 triggered=True.
    """

    name = "object"

    def __init__(
        self,
        model_dir: str | None = None,
        confidence: float = 0.5,
        classes: list[str] | None = None,
        trigger_classes: list[str] | None = None,
        every_n: int = 1,
        input_size: int = _INPUT_SIZE,
        net=None,
    ):
        self.confidence = confidence
        self.classes = list(classes) if classes else None
        self.trigger_classes = set(trigger_classes if trigger_classes is not None else (classes or []))
        self.every_n = max(1, every_n)
        self.input_size = input_size

        if self.classes:
            unknown = [c for c in self.classes if c not in VOC_CLASSES]
            if unknown:
                raise ValueError(f"알 수 없는 클래스: {unknown} (사용 가능: {list(VOC_CLASSES[1:])})")

        if net is not None:
            self._net = net
        else:
            proto, weights = find_model(model_dir)
            self._net = cv2.dnn.readNetFromCaffe(proto, weights)
            self._net.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
            self._net.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)

        self._frames = 0
        self._last: list[Detection] = []
        self._last_inference_ms = 0.0

    def analyze(self, frame: np.ndarray) -> AnalysisResult:
        self._frames += 1
        stale = (self._frames - 1) % self.every_n != 0
        if not stale:
            self._last = self._infer(frame)

        # Pipeline 이 bbox 를 in-place 로 재조정하므로, 캐시를 그대로 돌려주면
        # every_n>1 일 때 스킵 프레임마다 좌표가 반복 축소/확대되어 어긋난다.
        # 매번 새 Detection 사본을 반환한다.
        detections = [replace(d, zones=[]) for d in self._last]

        classes_count: dict[str, int] = {}
        for d in detections:
            classes_count[d.label] = classes_count.get(d.label, 0) + 1

        triggered = any(d.label in self.trigger_classes for d in detections)
        return AnalysisResult(
            analyzer=self.name,
            detections=detections,
            metrics={
                "objects": len(detections),
                "classes": classes_count,
                "inference_ms": round(self._last_inference_ms, 1),
                "stale": stale,
            },
            triggered=triggered,
        )

    def _infer(self, frame: np.ndarray) -> list[Detection]:
        h, w = frame.shape[:2]
        blob = cv2.dnn.blobFromImage(
            frame, _SCALE, (self.input_size, self.input_size), _MEAN,
        )
        self._net.setInput(blob)
        t0 = time.perf_counter()
        out = self._net.forward()
        self._last_inference_ms = (time.perf_counter() - t0) * 1000

        detections: list[Detection] = []
        for row in out[0, 0]:
            _, class_id, conf, x1, y1, x2, y2 = row[:7]
            class_id = int(class_id)
            if conf < self.confidence or class_id <= 0 or class_id >= len(VOC_CLASSES):
                continue
            label = VOC_CLASSES[class_id]
            if self.classes and label not in self.classes:
                continue
            px1 = int(round(max(0.0, min(1.0, x1)) * w))
            py1 = int(round(max(0.0, min(1.0, y1)) * h))
            px2 = int(round(max(0.0, min(1.0, x2)) * w))
            py2 = int(round(max(0.0, min(1.0, y2)) * h))
            bw = max(1, px2 - px1)
            bh = max(1, py2 - py1)
            detections.append(Detection(label, (px1, py1, bw, bh), float(conf)))

        detections.sort(key=lambda d: d.score, reverse=True)
        return detections
