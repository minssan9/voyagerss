#!/usr/bin/env bash
# Docker 없이 vision_cam 을 venv 로 설치하고 자동 실행으로 등록한다.
#   서버(Linux)  → systemd 서비스 (부팅 시 시작)
#   로컬(macOS)  → launchd LaunchAgent (로그인 시 시작, 카메라 권한 때문에 사용자 세션에서 실행)
#
#   bash deploy/run-local.sh install [--yolo]   # venv + 의존성 + 모델 + .env
#   bash deploy/run-local.sh run [옵션...]       # 포그라운드 실행 (옵션은 vision_cam 으로 전달)
#   bash deploy/run-local.sh enable             # 자동 실행 등록 + 시작
#   bash deploy/run-local.sh disable            # 중지 + 등록 해제
#   bash deploy/run-local.sh status | logs
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
VENV="$APP_DIR/.venv"
SERVICE=vision_cam
OS="$(uname -s)"
cd "$APP_DIR"

# --- Linux(systemd) ---
UNIT="/etc/systemd/system/$SERVICE.service"
RUN_USER="${SUDO_USER:-$(id -un)}"
# --- macOS(launchd) ---
LABEL="com.voyagerss.vision_cam"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
MAC_LOG_DIR="$HOME/Library/Logs/vision_cam"

need_venv() {
  [ -x "$VENV/bin/python" ] || { echo "먼저 설치하세요: bash deploy/run-local.sh install" >&2; exit 1; }
}

cmd_install() {
  local with_yolo=0
  [ "${1:-}" = "--yolo" ] && with_yolo=1
  python3 -m venv "$VENV"
  "$VENV/bin/pip" install --upgrade pip
  if [ "$OS" = "Darwin" ]; then
    "$VENV/bin/pip" install -r requirements.txt       # GUI 포함 OpenCV (창 표시 가능)
  else
    "$VENV/bin/pip" install -r requirements-pi.txt    # 서버: headless OpenCV
  fi
  if [ "$with_yolo" = 1 ]; then
    if [ "$OS" = "Darwin" ]; then
      "$VENV/bin/pip" install -r requirements-yolo.txt   # macOS 는 MPS 지원 torch 가 기본
    else
      "$VENV/bin/pip" install torch torchvision --index-url https://download.pytorch.org/whl/cpu
      "$VENV/bin/pip" install -r requirements-yolo.txt
      # ultralytics 가 GUI 용 opencv-python 을 끌어오므로 headless 로 되돌린다
      "$VENV/bin/pip" uninstall -y opencv-python || true
      "$VENV/bin/pip" install --force-reinstall "opencv-python-headless>=4.8,<5"
    fi
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

enable_linux() {
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
}

enable_mac() {
  mkdir -p "$(dirname "$PLIST")" "$MAC_LOG_DIR"
  # launchd 는 .env 를 읽지 못하므로 run 서브커맨드(.env 로드)를 실행시킨다
  cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$APP_DIR/deploy/run-local.sh</string>
    <string>run</string>
  </array>
  <key>WorkingDirectory</key><string>$APP_DIR</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>5</integer>
  <key>StandardOutPath</key><string>$MAC_LOG_DIR/out.log</string>
  <key>StandardErrorPath</key><string>$MAC_LOG_DIR/err.log</string>
</dict>
</plist>
PLIST
  launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
  launchctl bootstrap "gui/$(id -u)" "$PLIST"
  echo "등록 완료: $PLIST"
  echo "※ 내장 카메라를 쓰면 처음 한 번 '시스템 설정 → 개인정보 보호 및 보안 → 카메라' 에서 bash/터미널 허용 필요"
}

cmd_enable() {
  need_venv
  case "$OS" in
    Linux)  enable_linux ;;
    Darwin) enable_mac ;;
    *) echo "지원하지 않는 OS: $OS (Docker Compose 를 사용하세요)" >&2; exit 1 ;;
  esac
}

cmd_disable() {
  if [ "$OS" = "Darwin" ]; then
    launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
    rm -f "$PLIST"
  else
    sudo systemctl disable --now "$SERVICE" 2>/dev/null || true
    sudo rm -f "$UNIT"
    sudo systemctl daemon-reload
  fi
  echo "자동 실행 해제 완료"
}

cmd_status() {
  if [ "$OS" = "Darwin" ]; then
    launchctl print "gui/$(id -u)/$LABEL" 2>/dev/null | grep -E "state|pid|last exit" || echo "등록되지 않음"
  else
    systemctl --no-pager status "$SERVICE"
  fi
}

cmd_logs() {
  if [ "$OS" = "Darwin" ]; then
    tail -f "$MAC_LOG_DIR/out.log" "$MAC_LOG_DIR/err.log"
  else
    journalctl -u "$SERVICE" -f
  fi
}

case "${1:-}" in
  install) shift; cmd_install "$@" ;;
  run)     shift; cmd_run "$@" ;;
  enable)  cmd_enable ;;
  disable) cmd_disable ;;
  status)  cmd_status ;;
  logs)    cmd_logs ;;
  *) sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'; exit 1 ;;
esac
