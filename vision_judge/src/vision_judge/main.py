import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from vision_judge.config import get_db_path, get_image_dir
from vision_judge.repository.image_repository import ImageRepository
from vision_judge.repository.judge_record_repository import JudgeRecordRepository
from vision_judge.router import judge_router, web_router
from vision_judge.service.judge_service import JudgeService
from vision_judge.service.vlm_core import VlmCore

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    core = VlmCore()
    record_repo = JudgeRecordRepository(get_db_path())
    image_dir = get_image_dir()
    image_repo = ImageRepository(image_dir)

    app.state.judge_service = JudgeService(core, record_repo, image_repo)
    app.state.judge_record_repo = record_repo

    # 재기동/재진입 시 중복 mount 방지
    app.router.routes = [r for r in app.router.routes if getattr(r, "path", None) != "/images"]
    app.mount("/images", StaticFiles(directory=str(image_dir)), name="images")

    yield


app = FastAPI(title="vision_judge", lifespan=lifespan)
app.include_router(judge_router.router)
app.include_router(web_router.router)
