import io

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from PIL import Image, UnidentifiedImageError

from vision_judge.schemas import BoolJudgeResponse, ChoiceJudgeResponse
from vision_judge.service.judge_service import JudgeService

router = APIRouter(prefix="/judge", tags=["judge"])


def _get_service(request: Request) -> JudgeService:
    return request.app.state.judge_service


def _validate_question(question: str) -> None:
    if not question.strip():
        raise HTTPException(status_code=400, detail="question must not be empty")


def _load_image(data: bytes) -> Image.Image:
    try:
        return Image.open(io.BytesIO(data)).convert("RGB")
    except UnidentifiedImageError:
        raise HTTPException(status_code=400, detail="invalid image file")


@router.post("/bool", response_model=BoolJudgeResponse)
async def judge_bool(
    request: Request,
    image: UploadFile = File(...),
    question: str = Form(...),
):
    _validate_question(question)
    data = await image.read()
    pil_image = _load_image(data)
    service = _get_service(request)
    probability = service.judge_bool(pil_image, data, image.filename or "upload.png", question)
    return BoolJudgeResponse(probability=probability)


@router.post("/choice", response_model=ChoiceJudgeResponse)
async def judge_choice(
    request: Request,
    image: UploadFile = File(...),
    question: str = Form(...),
    choices: str = Form(...),
):
    _validate_question(question)
    choice_list = [c.strip() for c in choices.split(",") if c.strip()]
    if len(choice_list) < 2:
        raise HTTPException(status_code=400, detail="choices must contain at least 2 items, comma-separated")
    data = await image.read()
    pil_image = _load_image(data)
    service = _get_service(request)
    probabilities = service.judge_choice(pil_image, data, image.filename or "upload.png", question, choice_list)
    return ChoiceJudgeResponse(probabilities=probabilities)
