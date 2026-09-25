#!/usr/bin/env bash
# MobileNet-SSD(Caffe, VOC) 가중치를 camvision/models/ 에 내려받는다.
# 바이너리 가중치는 git 에 커밋하지 않으므로 최초 1회 실행 필요.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p models

PROTO_URL="https://raw.githubusercontent.com/chuanqi305/MobileNet-SSD/master/deploy.prototxt"
MODEL_URL="https://raw.githubusercontent.com/chuanqi305/MobileNet-SSD/master/mobilenet_iter_73000.caffemodel"
PROTO_OUT="models/MobileNetSSD_deploy.prototxt"
MODEL_OUT="models/MobileNetSSD_deploy.caffemodel"

fetch() {
  local url="$1" out="$2"
  if [ -s "$out" ]; then
    echo "이미 존재함, 건너뜀: $out"
    return
  fi
  echo "다운로드 중: $out"
  curl -fL --retry 3 -o "$out" "$url"
}

fetch "$PROTO_URL" "$PROTO_OUT"
fetch "$MODEL_URL" "$MODEL_OUT"

size=$(wc -c < "$MODEL_OUT" | tr -d ' ')
if [ "$size" -lt 20000000 ]; then
  echo "다운로드 실패: $MODEL_OUT 크기가 너무 작습니다 ($size bytes)" >&2
  exit 1
fi

echo "모델 다운로드 완료: models/"
