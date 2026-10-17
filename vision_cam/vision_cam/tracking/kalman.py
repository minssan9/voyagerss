"""(방위각, 고각, 거리) 등속 모델 칼만 필터.

상태 x = [az, el, r, d_az, d_el, d_r] (deg, deg, m, deg/s, deg/s, m/s).
카메라는 [az, el] 만, 레이더는 [az, el, r, 시선속도=d_r] 을 관측한다.
"""
from __future__ import annotations

import numpy as np

from .geometry import wrap_deg

CAMERA_H = np.array([[1, 0, 0, 0, 0, 0], [0, 1, 0, 0, 0, 0]], dtype=float)
RADAR_H = np.array(
    [[1, 0, 0, 0, 0, 0], [0, 1, 0, 0, 0, 0], [0, 0, 1, 0, 0, 0], [0, 0, 0, 0, 0, 1]], dtype=float
)


class AngleRangeKalman:
    def __init__(
        self,
        az: float,
        el: float,
        r: float | None = None,
        vr: float | None = None,
        angle_accel: float = 6.0,
        range_accel: float = 4.0,
    ):
        unknown_range = r is None
        self.x = np.array([az, el, 100.0 if unknown_range else r, 0.0, 0.0, 0.0 if vr is None else vr])
        self.P = np.diag([4.0, 4.0, 80.0**2 if unknown_range else 4.0, 25.0, 25.0, 100.0 if vr is None else 1.0])
        self.angle_accel = angle_accel
        self.range_accel = range_accel
        self.range_known = not unknown_range

    def predict(self, dt: float) -> None:
        if dt <= 0:
            return
        F = np.eye(6)
        F[0, 3] = F[1, 4] = F[2, 5] = dt
        self.x = F @ self.x
        self.x[0] = wrap_deg(self.x[0])
        q = np.array([self.angle_accel, self.angle_accel, self.range_accel]) ** 2
        Q = np.zeros((6, 6))
        for i in range(3):
            Q[i, i] = q[i] * dt**4 / 4
            Q[i, i + 3] = Q[i + 3, i] = q[i] * dt**3 / 2
            Q[i + 3, i + 3] = q[i] * dt**2
        self.P = F @ self.P @ F.T + Q

    def innovation(self, z: np.ndarray, H: np.ndarray, R: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        y = z - H @ self.x
        y[0] = wrap_deg(y[0])
        S = H @ self.P @ H.T + R
        return y, S

    def mahalanobis2(self, z: np.ndarray, H: np.ndarray, R: np.ndarray) -> float:
        y, S = self.innovation(z, H, R)
        return float(y @ np.linalg.solve(S, y))

    def update(self, z: np.ndarray, H: np.ndarray, R: np.ndarray) -> None:
        y, S = self.innovation(z, H, R)
        K = self.P @ H.T @ np.linalg.inv(S)
        self.x = self.x + K @ y
        self.x[0] = wrap_deg(self.x[0])
        self.P = (np.eye(6) - K @ H) @ self.P
        if H.shape[0] > 2:
            self.range_known = True
