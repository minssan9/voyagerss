#!/usr/bin/env bash
# 라즈베리파이 OS (Bookworm, 64-bit) 에서 실행: bash deploy/install-pi.sh
set -euo pipefail
cd "$(dirname "$0")/.."

sudo apt update
sudo apt install -y python3-venv python3-picamera2

# picamera2 를 venv 에서 쓰려면 system site-packages 공유가 필요
python3 -m venv --system-site-packages .venv
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -r requirements-pi.txt

bash deploy/download-models.sh

[ -f .env ] || cp .env.example .env
echo "설치 완료. 테스트: .venv/bin/python -m vision_cam --no-display --stream 8080"
