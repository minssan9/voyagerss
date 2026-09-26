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

exec "$PY" -m vision_cam --no-display --stream "${VISION_CAM_STREAM_PORT:-8080}"
