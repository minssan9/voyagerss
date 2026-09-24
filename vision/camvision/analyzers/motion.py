from __future__ import annotations

import cv2
import numpy as np

from .base import AnalysisResult, Analyzer, Detection


class MotionAnalyzer(Analyzer):
    """MOG2 배경 차분으로 움직이는 영역을 찾는다.

    min_area: 이보다 작은 윤곽선은 노이즈로 무시 (분석 해상도 기준 픽셀²)
    warmup_frames: 배경 모델이 안정될 때까지 이벤트를 발생시키지 않을 프레임 수
    """

    name = "motion"

    def __init__(self, min_area: int = 500, warmup_frames: int = 30, history: int = 300):
        self.min_area = min_area
        self.warmup_frames = warmup_frames
        self._frames = 0
        self._subtractor = cv2.createBackgroundSubtractorMOG2(
            history=history, varThreshold=25, detectShadows=False
        )
        self._kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))

    def analyze(self, frame: np.ndarray) -> AnalysisResult:
        self._frames += 1
        blurred = cv2.GaussianBlur(frame, (5, 5), 0)
        mask = self._subtractor.apply(blurred)
        _, mask = cv2.threshold(mask, 200, 255, cv2.THRESH_BINARY)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, self._kernel)
        mask = cv2.dilate(mask, self._kernel, iterations=2)

        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        detections = [
            Detection("motion", tuple(int(v) for v in cv2.boundingRect(c)), float(cv2.contourArea(c)))
            for c in contours
            if cv2.contourArea(c) >= self.min_area
        ]
        ratio = float(np.count_nonzero(mask)) / mask.size
        warming_up = self._frames <= self.warmup_frames

        return AnalysisResult(
            analyzer=self.name,
            detections=[] if warming_up else detections,
            metrics={"motion_ratio": round(ratio, 4), "warming_up": warming_up},
            triggered=bool(detections) and not warming_up,
        )
