"""판정 유스케이스: VlmCore로 추론하고 결과를 이력 저장소에 기록한다."""
from PIL import Image

from vision_judge.config import VLM_MODEL
from vision_judge.repository.image_repository import ImageRepository
from vision_judge.repository.judge_record_repository import JudgeRecordRepository
from vision_judge.service.vlm_core import VlmCore


class JudgeService:
    def __init__(
        self,
        core: VlmCore,
        record_repo: JudgeRecordRepository,
        image_repo: ImageRepository,
    ) -> None:
        self.core = core
        self.record_repo = record_repo
        self.image_repo = image_repo

    def judge_bool(self, image: Image.Image, image_bytes: bytes, filename: str, question: str) -> float:
        probability = self.core.judge_bool(image, question)
        image_filename = self.image_repo.save(image_bytes, filename)
        self.record_repo.insert(
            endpoint="bool",
            question=question,
            choices=None,
            result={"probability": probability},
            image_filename=image_filename,
            device=self.core.device,
            model_name=VLM_MODEL,
        )
        return probability

    def judge_choice(
        self, image: Image.Image, image_bytes: bytes, filename: str, question: str, choices: list[str]
    ) -> dict[str, float]:
        probabilities = self.core.judge_choice(image, question, choices)
        image_filename = self.image_repo.save(image_bytes, filename)
        self.record_repo.insert(
            endpoint="choice",
            question=question,
            choices=choices,
            result=probabilities,
            image_filename=image_filename,
            device=self.core.device,
            model_name=VLM_MODEL,
        )
        return probabilities
