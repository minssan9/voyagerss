"""ROI 구역을 마우스로 클릭해서 그리는 도구.

실행: python -m vision_cam.roi_tool [옵션]

맥/파이 어디서든 정규화 좌표(0~1)로 저장하므로, 한쪽에서 그린 roi.json 을
해상도가 다른 다른 쪽에서도 그대로 쓸 수 있다.

헤드리스(파이, GUI 없음) 환경에서 그리는 방법:
  1. 파이에서: python -m vision_cam.roi_tool --source picamera --capture frame.jpg
  2. frame.jpg 를 scp 로 맥에 복사
  3. 맥에서: python -m vision_cam.roi_tool --image frame.jpg --out roi.json
  4. roi.json 을 scp 로 파이에 복사

GUI 조작:
  좌클릭 : 현재 다각형에 점 추가
  u      : 마지막 점 취소
  n/Enter: 현재 다각형 닫기 (점 3개 이상 필요) → 터미널에서 이름 입력
  f      : 다음에 닫을 구역의 filter on/off 전환
  c      : 모든 구역 지우기
  s      : roi.json 으로 저장
  q/Esc  : 종료
"""
from __future__ import annotations

import argparse
import os
import sys
import time

import cv2
import numpy as np

from .roi import Zone, load_zones, normalize_points, save_zones
from .sources import open_source


def _grab_frame(source_spec: str, width: int, height: int, fps: int, timeout: float = 5.0) -> np.ndarray:
    with open_source(source_spec, width, height, fps) as src:
        deadline = time.time() + timeout
        while time.time() < deadline:
            frame = src.read()
            if frame is not None:
                return frame
            time.sleep(0.05)
    raise RuntimeError(f"{timeout}초 안에 프레임을 받지 못했습니다: {source_spec!r}")


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(prog="vision_cam.roi_tool", description="ROI 구역 그리기 도구")
    p.add_argument("--source", default="auto", help="카메라에서 캡처할 때 사용 (auto|picamera|0|파일)")
    p.add_argument("--image", help="카메라 대신 이 이미지 파일을 편집")
    p.add_argument("--capture", help="한 프레임만 캡처해 이 경로에 저장하고 종료 (헤드리스용)")
    p.add_argument("--out", default="roi.json", help="저장할 ROI JSON 경로 (기본: roi.json)")
    p.add_argument("--width", type=int, default=640)
    p.add_argument("--height", type=int, default=480)
    p.add_argument("--fps", type=int, default=30)
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)

    if args.capture:
        frame = _grab_frame(args.source, args.width, args.height, args.fps)
        cv2.imwrite(args.capture, frame)
        print(f"저장됨: {args.capture}", file=sys.stderr)
        return 0

    if args.image:
        frame = cv2.imread(args.image)
        if frame is None:
            raise RuntimeError(f"이미지를 읽을 수 없습니다: {args.image}")
    else:
        frame = _grab_frame(args.source, args.width, args.height, args.fps)

    h, w = frame.shape[:2]
    zones: list[Zone] = load_zones(args.out) if os.path.exists(args.out) else []
    current: list[tuple[int, int]] = []
    next_filter = True

    def on_mouse(event, x, y, flags, userdata):
        if event == cv2.EVENT_LBUTTONDOWN:
            current.append((x, y))

    win = "vision_cam roi_tool (h: 도움말)"
    cv2.namedWindow(win)
    cv2.setMouseCallback(win, on_mouse)

    help_lines = [
        "click:점추가 u:취소 n/Enter:닫기 f:filter전환 c:전체지우기 s:저장 q:종료",
    ]

    while True:
        view = frame.copy()
        for z in zones:
            poly = z.to_pixels(w, h)
            color = (0, 0, 255) if z.filter else (255, 0, 255)
            cv2.polylines(view, [poly], True, color, 2)
            x0, y0 = poly[0][0]
            cv2.putText(view, z.name, (int(x0), max(12, int(y0) - 6)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)
        if current:
            pts = np.array(current, dtype=np.int32).reshape((-1, 1, 2))
            cv2.polylines(view, [pts], False, (0, 255, 255), 2)
            for px, py in current:
                cv2.circle(view, (px, py), 3, (0, 255, 255), -1)

        status = f"filter(다음 구역)={'ON' if next_filter else 'OFF'}  구역수={len(zones)}"
        for i, text in enumerate([status] + help_lines):
            cv2.putText(view, text, (8, 20 + i * 18), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 3)
            cv2.putText(view, text, (8, 20 + i * 18), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

        cv2.imshow(win, view)
        key = cv2.waitKey(20) & 0xFF

        if key in (ord("q"), 27):
            break
        elif key == ord("u") and current:
            current.pop()
        elif key in (ord("n"), 13) and len(current) >= 3:
            name = input(f"구역 이름 (기본 zone{len(zones)}): ").strip() or f"zone{len(zones)}"
            zones.append(Zone(
                name=name,
                points=[tuple(p) for p in normalize_points(current, w, h)],
                filter=next_filter,
            ))
            current = []
            next_filter = True
        elif key == ord("f"):
            next_filter = not next_filter
        elif key == ord("c"):
            zones = []
            current = []
        elif key == ord("s"):
            save_zones(args.out, zones)
            print(f"저장됨: {args.out}", file=sys.stderr)

    cv2.destroyAllWindows()
    return 0


if __name__ == "__main__":
    sys.exit(main())
