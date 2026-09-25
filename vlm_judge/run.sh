#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

PYTHON_BIN="${PYTHON_BIN:-python3.12}"

if [ ! -d ".venv" ]; then
    "$PYTHON_BIN" -m venv .venv
fi

source .venv/bin/activate
pip install -q --upgrade pip
pip install -q -e ".[dev]"

exec uvicorn vlm_judge.main:app --host "${HOST:-0.0.0.0}" --port "${PORT:-8000}"
