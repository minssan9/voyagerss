#!/usr/bin/env bash
# 컨테이너 시작 시: 필요한 모델이 없으면 받아두고 vision_cam 실행.
set -euo pipefail
cd /app

analyzers="${VISION_CAM_ANALYZERS:-motion,face,brightness}"
# CLI 인자 --analyzers X / --analyzers=X 가 있으면 환경변수보다 우선
prev=""
for arg in "$@"; do
  [ "$prev" = "--analyzers" ] && analyzers="$arg"
  case "$arg" in --analyzers=*) analyzers="${arg#--analyzers=}" ;; esac
  prev="$arg"
done

# object 분석기 → MobileNet-SSD 가중치 (models 볼륨에 캐시)
if [[ ",$analyzers," == *",object,"* ]]; then
  bash deploy/download-models.sh
fi

# yolo 분석기 → yolo26*.pt 를 models 볼륨에 미리 받아둔다 (재시작마다 재다운로드 방지)
if [[ ",$analyzers," == *",yolo,"* ]]; then
  model="${VISION_CAM_YOLO_MODEL:-yolo26n.pt}"
  if [[ "$model" != /* && "$model" == *.pt ]]; then
    export VISION_CAM_YOLO_MODEL="/app/models/$model"
    if [ ! -s "$VISION_CAM_YOLO_MODEL" ]; then
      echo "[entrypoint] YOLO 가중치 다운로드: $model"
      (cd /app/models && python -c "from ultralytics import YOLO; YOLO('$model')")
    fi
  fi
fi

exec python -m vision_cam "$@"
