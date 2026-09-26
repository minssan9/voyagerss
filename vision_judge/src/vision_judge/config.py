"""환경변수 로드 및 device(cuda/mps/cpu) 자동 감지."""
import logging
import os
from pathlib import Path

import torch

logger = logging.getLogger("vision_judge")

VLM_MODEL = os.environ.get("VLM_MODEL", "Qwen/Qwen3-VL-4B-Instruct")
HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", "8000"))


def get_data_dir() -> Path:
    path = Path(os.environ.get("DATA_DIR", "data")).resolve()
    path.mkdir(parents=True, exist_ok=True)
    return path


def get_db_path() -> Path:
    return get_data_dir() / "vision_judge.db"


def get_image_dir() -> Path:
    path = get_data_dir() / "images"
    path.mkdir(parents=True, exist_ok=True)
    return path


def detect_device() -> str:
    """cuda -> mps -> cpu 순으로 감지하고 로그를 남긴다."""
    if torch.cuda.is_available():
        device = "cuda"
    elif torch.backends.mps.is_available():
        device = "mps"
    else:
        device = "cpu"
    logger.info("device detected: %s", device)
    return device
