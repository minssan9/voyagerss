"""Ultralytics YOLO26 객체 검출 + 추적 분석기.

YOLO26 특징 (MobileNet-SSD 대비):
  - NMS-free end-to-end 추론 → 후처리 지연이 없고 export(ONNX/NCNN/TFLite)가 단순
  - COCO 80클래스 (truck, traffic light, stop sign 등 주행 관련 클래스 포함)
  - 작은 객체 검출 개선 (ProgLoss + STAL)
  - model.track() 으로 ByteTrack / BoT-SORT 추적기 내장 → 객체별 track_id 제공
    (kinematics 의 속도/가속도 계산이 ID 단위로 안정적이 됨)

의존성: pip install -r requirements-yolo.txt  (ultralytics, PyTorch 포함 — 무거움)
라즈베리파이: 맥/PC 에서 `yolo export model=yolo26n.pt format=ncnn imgsz=320` 후
          생성된 `yolo26n_ncnn_model/` 폴더를 --yolo-model 로 지정하는 것을 권장.

⚠️ 라이선스: Ultralytics YOLO 는 AGPL-3.0 (상용 비공개 배포 시 Enterprise 라이선스 필요).
"""
from __future__ import annotations

import time
from dataclasses import replace
from typing import Any

import numpy as np

from .base import AnalysisResult, Analyzer, Detection

DEFAULT_MODEL = "yolo26n.pt"


def _np(x: Any) -> np.ndarray:
    """torch.Tensor / numpy / list 를 numpy 로 통일."""
    if x is None:
        return np.zeros((0,))
    if hasattr(x, "cpu"):
        x = x.cpu()
    if hasattr(x, "numpy"):
        x = x.numpy()
    return np.asarray(x)


def _load_model(model: str):
    try:
        from ultralytics import YOLO
    except ImportError as e:  # pragma: no cover - 환경 의존
        raise ImportError(
            "yolo 분석기에는 ultralytics 가 필요합니다: pip install -r requirements-yolo.txt"
        ) from e
    return YOLO(model)


class YoloAnalyzer(Analyzer):
    """YOLO26 으로 객체를 검출하고(track=True 면) 프레임 간 ID 를 유지한다.

    track_id 가 Detection.track_id 에 채워지므로 Pipeline 의 KinematicsEstimator 가
    그대로 사용해 속도/가속도/모멘텀을 계산한다.
    """

    name = "yolo"

    def __init__(
        self,
        model: str = DEFAULT_MODEL,
        confidence: float = 0.4,
        classes: list[str] | None = None,
        trigger_classes: list[str] | None = None,
        every_n: int = 1,
        imgsz: int = 320,
        track: bool = True,
        tracker: str = "bytetrack.yaml",
        device: str | None = None,
        model_obj=None,
    ):
        self.confidence = confidence
        self.classes = list(classes) if classes else None
        self.trigger_classes = set(trigger_classes if trigger_classes is not None else (classes or []))
        self.every_n = max(1, every_n)
        self.imgsz = imgsz
        self.track = track
        self.tracker = tracker
        self.device = device

        self._model = model_obj if model_obj is not None else _load_model(model)
        names = getattr(self._model, "names", None) or {}
        self._names: dict[int, str] = dict(names) if isinstance(names, dict) else dict(enumerate(names))
        self._class_ids: list[int] | None = None
        if self.classes and self._names:
            by_name = {v: k for k, v in self._names.items()}
            unknown = [c for c in self.classes if c not in by_name]
            if unknown:
                raise ValueError(f"알 수 없는 클래스: {unknown} (사용 가능: {sorted(by_name)})")
            self._class_ids = [by_name[c] for c in self.classes]

        self._frames = 0
        self._last: list[Detection] = []
        self._last_inference_ms = 0.0

    def analyze(self, frame: np.ndarray) -> AnalysisResult:
        self._frames += 1
        stale = (self._frames - 1) % self.every_n != 0
        if not stale:
            self._last = self._infer(frame)

        # Pipeline 이 bbox 를 in-place 로 재조정하므로 매번 사본을 반환한다.
        detections = [replace(d, zones=[], kinematics=None) for d in self._last]

        classes_count: dict[str, int] = {}
        for d in detections:
            classes_count[d.label] = classes_count.get(d.label, 0) + 1

        return AnalysisResult(
            analyzer=self.name,
            detections=detections,
            metrics={
                "objects": len(detections),
                "classes": classes_count,
                "inference_ms": round(self._last_inference_ms, 1),
                "stale": stale,
            },
            triggered=any(d.label in self.trigger_classes for d in detections),
        )

    def _infer(self, frame: np.ndarray) -> list[Detection]:
        kwargs: dict[str, Any] = {
            "conf": self.confidence, "imgsz": self.imgsz, "verbose": False,
        }
        if self._class_ids is not None:
            kwargs["classes"] = self._class_ids
        if self.device:
            kwargs["device"] = self.device

        t0 = time.perf_counter()
        if self.track:
            results = self._model.track(frame, persist=True, tracker=self.tracker, **kwargs)
        else:
            results = self._model.predict(frame, **kwargs)
        self._last_inference_ms = (time.perf_counter() - t0) * 1000

        if not results:
            return []
        r = results[0]
        boxes = getattr(r, "boxes", None)
        if boxes is None:
            return []
        names = getattr(r, "names", None) or self._names
        xyxy = _np(boxes.xyxy).reshape(-1, 4)
        conf = _np(boxes.conf).reshape(-1)
        cls = _np(boxes.cls).reshape(-1)
        ids = getattr(boxes, "id", None)
        ids = _np(ids).reshape(-1) if ids is not None else None

        h, w = frame.shape[:2]
        detections: list[Detection] = []
        for i in range(len(xyxy)):
            x1, y1, x2, y2 = xyxy[i]
            x1, x2 = max(0.0, min(w, x1)), max(0.0, min(w, x2))
            y1, y2 = max(0.0, min(h, y1)), max(0.0, min(h, y2))
            label = names.get(int(cls[i]), str(int(cls[i])))
            track_id = int(ids[i]) if ids is not None and i < len(ids) else None
            detections.append(Detection(
                label,
                (int(round(x1)), int(round(y1)), max(1, int(round(x2 - x1))), max(1, int(round(y2 - y1)))),
                float(conf[i]),
                track_id=track_id,
            ))
        detections.sort(key=lambda d: d.score, reverse=True)
        return detections
