from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import cv2
import numpy as np

from .base import AnalysisResult, Analyzer, Detection


@dataclass
class _Candidate:
    cx: float
    cy: float
    bbox: tuple[int, int, int, int]
    hits: list[bool] = field(default_factory=list)
    label: str = "aerial"
    score: float = 0.0


class DroneAnalyzer(Analyzer):
    """하늘 영역의 작은 이동체(드론 후보)를 찾는다.

    배경 차분으로 작은 blob 을 뽑고, 프레임 간 최근접 연결로 같은 물체가
    persist_window 프레임 중 persist_min 번 이상 보일 때만 검출로 낸다.
    구름·나뭇잎처럼 한두 프레임 깜빡이는 노이즈를 거르기 위함이다.

    sky_ratio: 프레임 위쪽 이 비율만 하늘로 보고 분석 (1.0 이면 전체)
    min_area/max_area: blob 넓이 범위 (분석 해상도 기준 픽셀²)
    max_jump: 프레임 간 같은 물체로 볼 최대 이동 거리 (픽셀)
    classifier_model: 선택. 64x64 crop → [drone, bird, other] 확률을 내는 ONNX 분류기
    """

    name = "drone"
    CLASSES = ("drone", "bird", "other")

    def __init__(
        self,
        sky_ratio: float = 0.6,
        min_area: int = 4,
        max_area: int = 1500,
        max_aspect: float = 4.0,
        warmup_frames: int = 20,
        persist_window: int = 8,
        persist_min: int = 5,
        max_jump: float = 25.0,
        classifier_model: str | None = None,
        classifier_threshold: float = 0.5,
    ):
        self.sky_ratio = sky_ratio
        self.min_area = min_area
        self.max_area = max_area
        self.max_aspect = max_aspect
        self.warmup_frames = warmup_frames
        self.persist_window = persist_window
        self.persist_min = persist_min
        self.max_jump = max_jump
        self.classifier_threshold = classifier_threshold
        self._frames = 0
        self._candidates: list[_Candidate] = []
        self._subtractor = cv2.createBackgroundSubtractorMOG2(history=200, varThreshold=16, detectShadows=False)
        self._kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        self._net = None
        if classifier_model:
            path = Path(classifier_model)
            if not path.exists():
                raise FileNotFoundError(f"drone 분류기 모델이 없습니다: {path}")
            self._net = cv2.dnn.readNetFromONNX(str(path))

    def analyze(self, frame: np.ndarray) -> AnalysisResult:
        self._frames += 1
        h, w = frame.shape[:2]
        sky_h = max(1, int(h * self.sky_ratio))
        sky = frame[:sky_h]

        gray = cv2.cvtColor(sky, cv2.COLOR_BGR2GRAY) if sky.ndim == 3 else sky
        mask = self._subtractor.apply(cv2.GaussianBlur(gray, (3, 3), 0))
        _, mask = cv2.threshold(mask, 200, 255, cv2.THRESH_BINARY)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, self._kernel)
        mask = cv2.dilate(mask, self._kernel, iterations=1)

        blobs = []
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for c in contours:
            area = cv2.contourArea(c)
            x, y, bw, bh = cv2.boundingRect(c)
            box_area = bw * bh
            if not (self.min_area <= max(area, box_area) <= self.max_area):
                continue
            if max(bw, bh) / max(1, min(bw, bh)) > self.max_aspect:
                continue
            blobs.append((x + bw / 2, y + bh / 2, (x, y, bw, bh)))

        warming_up = self._frames <= self.warmup_frames
        if warming_up:
            self._candidates = []
        else:
            self._associate(blobs)

        detections = []
        for cand in self._candidates:
            if not cand.hits[-1] or sum(cand.hits) < self.persist_min:
                continue
            if self._net is not None:
                self._classify(frame, cand)
                if cand.label != "drone":
                    continue
            else:
                cand.score = sum(cand.hits) / self.persist_window
            detections.append(Detection(cand.label, cand.bbox, round(cand.score, 3)))

        return AnalysisResult(
            analyzer=self.name,
            detections=detections,
            metrics={"blobs": len(blobs), "candidates": len(self._candidates), "warming_up": warming_up},
            triggered=bool(detections),
        )

    def _associate(self, blobs: list[tuple[float, float, tuple[int, int, int, int]]]) -> None:
        unused = list(range(len(blobs)))
        for cand in self._candidates:
            best, best_d = None, self.max_jump
            for i in unused:
                d = float(np.hypot(blobs[i][0] - cand.cx, blobs[i][1] - cand.cy))
                if d <= best_d:
                    best, best_d = i, d
            if best is None:
                cand.hits.append(False)
            else:
                unused.remove(best)
                cand.cx, cand.cy, cand.bbox = blobs[best]
                cand.hits.append(True)
            del cand.hits[:-self.persist_window]
        for i in unused:
            cx, cy, bbox = blobs[i]
            self._candidates.append(_Candidate(cx, cy, bbox, [True]))
        self._candidates = [c for c in self._candidates if any(c.hits)]

    def _classify(self, frame: np.ndarray, cand: _Candidate) -> None:
        x, y, bw, bh = cand.bbox
        pad = max(bw, bh)
        x0, y0 = max(0, int(x - pad)), max(0, int(y - pad))
        crop = frame[y0:int(y + bh + pad), x0:int(x + bw + pad)]
        if crop.size == 0:
            cand.label, cand.score = "other", 0.0
            return
        blob = cv2.dnn.blobFromImage(crop, 1 / 255.0, (64, 64), swapRB=True)
        self._net.setInput(blob)
        logits = self._net.forward().reshape(-1)[: len(self.CLASSES)]
        probs = np.exp(logits - logits.max())
        probs /= probs.sum()
        k = int(np.argmax(probs))
        label = self.CLASSES[k] if probs[k] >= self.classifier_threshold else "other"
        cand.label, cand.score = label, float(probs[k])
