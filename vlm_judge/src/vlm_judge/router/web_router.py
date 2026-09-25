from importlib import resources

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

from vlm_judge.config import VLM_MODEL
from vlm_judge.repository.judge_record_repository import JudgeRecordRepository

router = APIRouter(tags=["web"])
templates = Jinja2Templates(directory=str(resources.files("vlm_judge") / "templates"))


def _get_repo(request: Request) -> JudgeRecordRepository:
    return request.app.state.judge_record_repo


@router.get("/", response_class=HTMLResponse)
async def dashboard(request: Request):
    repo = _get_repo(request)
    records = repo.list_recent(limit=50)
    return templates.TemplateResponse(
        request,
        "index.html",
        {
            "records": records,
            "total_count": repo.count(),
            "device": request.app.state.judge_service.core.device,
            "model_name": VLM_MODEL,
        },
    )


@router.get("/records/{record_id}", response_class=HTMLResponse)
async def record_detail(request: Request, record_id: int):
    repo = _get_repo(request)
    record = repo.get(record_id)
    if record is None:
        raise HTTPException(status_code=404, detail="record not found")
    return templates.TemplateResponse(request, "record_detail.html", {"record": record})


@router.get("/health")
async def health(request: Request):
    return {
        "device": request.app.state.judge_service.core.device,
        "model_name": VLM_MODEL,
    }
