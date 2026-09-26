from __future__ import annotations

import os

import cv2
import numpy as np

from .base import AnalysisResult, Analyzer, Detection

_CASCADE_FILE = "haarcascade_frontalface_default.xml"
# pip 휠(cv2.data)이 없는 apt 설치(python3-opencv) 대비 후보 경로
_FALLBACK_DIRS = (
    "/usr/share/opencv4/haarcascades",
    "/usr/local/share/opencv4/haarcascades",
    "/opt/homebrew/share/opencv4/haarcascades",
)


def find_cascade(filename: str = _CASCADE_FILE) -> str:
    dirs = []
    data = getattr(cv2, "data", None)
    if data is not None and getattr(data, "haarcascades", None):
        dirs.append(data.haarcascades)
    dirs.extend(_FALLBACK_DIRS)
    for d in dirs:
        path = os.path.join(d, filename)
        if os.path.exists(path):
            return path
    raise FileNotFoundError(f"{filename} 를 찾을 수 없습니다. 검색 경로: {dirs}")


class FaceAnalyzer(Analyzer):
    """Haar cascade 얼굴 검출. 라즈베리파이에서도 CPU 만으로 실시간 동작하는 가벼운 방식."""

    name = "face"

    def __init__(self, cascade_path: str | None = None, min_size: int = 40,
                 scale_factor: float = 1.1, min_neighbors: int = 5):
        if not hasattr(cv2, "CascadeClassifier"):
            raise RuntimeError("이 OpenCV 빌드에는 CascadeClassifier 가 없습니다 (OpenCV 4.x 필요)")
        self._cascade = cv2.CascadeClassifier(cascade_path or find_cascade())
        if self._cascade.empty():
            raise RuntimeError("cascade 파일 로드 실패")
        self.min_size = min_size
        self.scale_factor = scale_factor
        self.min_neighbors = min_neighbors

    def analyze(self, frame: np.ndarray) -> AnalysisResult:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gray = cv2.equalizeHist(gray)
        faces = self._cascade.detectMultiScale(
            gray,
            scaleFactor=self.scale_factor,
            minNeighbors=self.min_neighbors,
            minSize=(self.min_size, self.min_size),
        )
        detections = [Detection("face", tuple(int(v) for v in f)) for f in faces]
        return AnalysisResult(
            analyzer=self.name,
            detections=detections,
            metrics={"faces": len(detections)},
            triggered=bool(detections),
        )
