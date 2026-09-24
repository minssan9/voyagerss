from __future__ import annotations

import cv2
import numpy as np

from .base import AnalysisResult, Analyzer


class BrightnessAnalyzer(Analyzer):
    """평균 밝기(0~255)와 선명도(Laplacian 분산)를 측정한다.

    dark_threshold 미만이면 '어두움', blur_threshold 미만이면 '흐림(초점/가림)' 으로 트리거.
    """

    name = "brightness"

    def __init__(self, dark_threshold: float = 40.0, blur_threshold: float = 30.0):
        self.dark_threshold = dark_threshold
        self.blur_threshold = blur_threshold

    def analyze(self, frame: np.ndarray) -> AnalysisResult:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        brightness = float(gray.mean())
        sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        is_dark = brightness < self.dark_threshold
        is_blurry = sharpness < self.blur_threshold
        return AnalysisResult(
            analyzer=self.name,
            metrics={
                "brightness": round(brightness, 2),
                "sharpness": round(sharpness, 2),
                "dark": is_dark,
                "blurry": is_blurry,
            },
            triggered=is_dark or is_blurry,
        )
