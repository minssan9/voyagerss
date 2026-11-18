#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/vision_cam"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

PY=".venv/bin/python"
if [[ ! -x "$PY" ]]; then
  echo "vision_cam .venv 가 없습니다. vision_cam/README.md 의 venv 설치를 먼저 하세요." >&2
  exit 1
fi

# vite dev(웹)로 접속하므로 기본은 클라이언트 브라우저 웹캠(browser 소스).
# 서버에 연결된 카메라를 쓰려면: VISION_CAM_DEV_SOURCE=auto pnpm dev
SOURCE="${VISION_CAM_DEV_SOURCE:-browser}"
echo "[dev-vision-cam] source=$SOURCE (브라우저 웹캠: /vision/cam 페이지)" >&2
exec "$PY" -m vision_cam --no-display --source "$SOURCE" --stream "${VISION_CAM_STREAM_PORT:-8080}"
