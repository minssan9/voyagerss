"""헝가리안(Kuhn–Munkres) 최소 비용 매칭. 직사각 행렬, numpy 만 사용."""
from __future__ import annotations

import numpy as np


def hungarian(cost: np.ndarray, max_cost: float) -> list[tuple[int, int]]:
    """cost[i, j] 최소 합 매칭 중 max_cost 이하인 (i, j) 쌍만 돌려준다."""
    n_rows, n_cols = cost.shape
    if n_rows == 0 or n_cols == 0:
        return []
    n = max(n_rows, n_cols)
    big = max_cost * 10 + 1
    C = np.full((n, n), big, dtype=float)
    C[:n_rows, :n_cols] = np.minimum(cost, big)

    u = np.zeros(n + 1)
    v = np.zeros(n + 1)
    p = np.zeros(n + 1, dtype=int)  # p[j]: 열 j 에 배정된 행 (1-based)
    way = np.zeros(n + 1, dtype=int)
    for i in range(1, n + 1):
        p[0] = i
        j0 = 0
        minv = np.full(n + 1, np.inf)
        used = np.zeros(n + 1, dtype=bool)
        while True:
            used[j0] = True
            i0 = p[j0]
            delta, j1 = np.inf, 0
            for j in range(1, n + 1):
                if used[j]:
                    continue
                cur = C[i0 - 1, j - 1] - u[i0] - v[j]
                if cur < minv[j]:
                    minv[j], way[j] = cur, j0
                if minv[j] < delta:
                    delta, j1 = minv[j], j
            for j in range(n + 1):
                if used[j]:
                    u[p[j]] += delta
                    v[j] -= delta
                else:
                    minv[j] -= delta
            j0 = j1
            if p[j0] == 0:
                break
        while True:
            j1 = way[j0]
            p[j0] = p[j1]
            j0 = j1
            if j0 == 0:
                break

    pairs = []
    for j in range(1, n + 1):
        i = p[j] - 1
        if i < n_rows and j - 1 < n_cols and cost[i, j - 1] <= max_cost:
            pairs.append((i, j - 1))
    return sorted(pairs)
