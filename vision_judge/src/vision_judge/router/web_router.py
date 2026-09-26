from dataclasses import asdict

from fastapi import APIRouter, HTTPException, Query, Request

from vision_judge.config import VLM_MODEL
from vision_judge.repository.judge_record_repository import JudgeRecordRepository

router = APIRouter(tags=["api"])


def _get_repo(request: Request) -> JudgeRecordRepository:
    return request.app.state.judge_record_repo


@router.get("/api/records")
async def list_records(request: Request, limit: int = Query(default=50, ge=1, le=200)):
    records = _get_repo(request).list_recent(limit=limit)
    return [asdict(record) for record in records]


@router.get("/api/records/{record_id}")
async def get_record(request: Request, record_id: int):
    record = _get_repo(request).get(record_id)
    if record is None:
        raise HTTPException(status_code=404, detail="record not found")
    return asdict(record)


@router.get("/health")
async def health(request: Request):
    return {
        "device": request.app.state.judge_service.core.device,
        "model_name": VLM_MODEL,
    }
