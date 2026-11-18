#!/usr/bin/env bash
# Docker 없이 서버(로컬 Linux)에서 vision_cam 을 venv + systemd 로 자동 실행한다.
#
#   bash deploy/run-local.sh install [--yolo]   # venv 생성 + 의존성 + 모델 + .env
#   bash deploy/run-local.sh run [옵션...]       # 포그라운드 실행 (옵션은 vision_cam 으로 전달)
#   bash deploy/run-local.sh enable             # systemd 서비스 등록 + 부팅 시 자동 시작
#   bash deploy/run-local.sh disable            # 서비스 중지 + 해제
#   bash deploy/run-local.sh status | logs
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
VENV="$APP_DIR/.venv"
SERVICE=vision_cam
UNIT="/etc/systemd/system/$SERVICE.service"
RUN_USER="${SUDO_USER:-$(id -un)}"
cd "$APP_DIR"

need_venv() {
  [ -x "$VENV/bin/python" ] || { echo "먼저 설치하세요: bash deploy/run-local.sh install" >&2; exit 1; }
}

cmd_install() {
  local with_yolo=0
  [ "${1:-}" = "--yolo" ] && with_yolo=1
  python3 -m venv "$VENV"
  "$VENV/bin/pip" install --upgrade pip
  "$VENV/bin/pip" install -r requirements-pi.txt   # headless OpenCV
  if [ "$with_yolo" = 1 ]; then
    "$VENV/bin/pip" install torch torchvision --index-url https://download.pytorch.org/whl/cpu
    "$VENV/bin/pip" install -r requirements-yolo.txt
    # ultralytics 가 GUI 용 opencv-python 을 끌어오므로 headless 로 되돌린다
    "$VENV/bin/pip" uninstall -y opencv-python || true
    "$VENV/bin/pip" install --force-reinstall "opencv-python-headless>=4.8,<5"
  fi
  bash deploy/download-models.sh
  [ -f .env ] || cp .env.example .env
  echo "설치 완료. .env 를 편집한 뒤: bash deploy/run-local.sh run  또는  enable"
}

cmd_run() {
  need_venv
  set -a; [ -f .env ] && . ./.env; set +a
  exec "$VENV/bin/python" -m vision_cam --no-display "$@"
}

cmd_enable() {
  need_venv
  sudo tee "$UNIT" >/dev/null <<UNIT
[Unit]
Description=vision_cam - realtime camera analysis
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$RUN_USER
SupplementaryGroups=video
WorkingDirectory=$APP_DIR
EnvironmentFile=-$APP_DIR/.env
ExecStart=$VENV/bin/python -m vision_cam --no-display
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT
  sudo systemctl daemon-reload
  sudo systemctl enable --now "$SERVICE"
  echo "등록 완료: $UNIT (user=$RUN_USER)"
  sudo systemctl --no-pager status "$SERVICE" | head -5
}

cmd_disable() {
  sudo systemctl disable --now "$SERVICE" 2>/dev/null || true
  sudo rm -f "$UNIT"
  sudo systemctl daemon-reload
  echo "서비스 해제 완료"
}

case "${1:-}" in
  install) shift; cmd_install "$@" ;;
  run)     shift; cmd_run "$@" ;;
  enable)  cmd_enable ;;
  disable) cmd_disable ;;
  status)  systemctl --no-pager status "$SERVICE" ;;
  logs)    journalctl -u "$SERVICE" -f ;;
  *) sed -n '2,9p' "$0" | sed 's/^# \{0,1\}//'; exit 1 ;;
esac
