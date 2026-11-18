# vision_cam 서버(로컬 x86_64/arm64 Linux) 실행용 이미지
#   기본:       docker build -t vision_cam .
#   YOLO26 포함: docker build -t vision_cam:yolo --build-arg WITH_YOLO=1 .
FROM python:3.12-slim

ARG WITH_YOLO=0
ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    VISION_CAM_MODEL_DIR=/app/models \
    YOLO_CONFIG_DIR=/app/models/.ultralytics

# curl: 모델 다운로드 / libgl1, libglib2.0-0: ultralytics 가 끌어오는 opencv-python 용
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl ca-certificates libglib2.0-0 \
 && if [ "$WITH_YOLO" = "1" ]; then apt-get install -y --no-install-recommends libgl1; fi \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt requirements-pi.txt requirements-yolo.txt ./
# 서버는 GUI 가 없으므로 headless OpenCV 사용
RUN pip install -r requirements-pi.txt \
 && if [ "$WITH_YOLO" = "1" ]; then \
      pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu \
      && pip install -r requirements-yolo.txt \
      && pip uninstall -y opencv-python && pip install --force-reinstall "opencv-python-headless>=4.8,<5"; \
    fi

COPY vision_cam ./vision_cam
COPY deploy ./deploy
COPY roi.example.json kinematics.example.json ./
RUN chmod +x deploy/*.sh && mkdir -p /app/models /app/data

EXPOSE 8080
ENTRYPOINT ["deploy/docker-entrypoint.sh"]
CMD ["--no-display"]
