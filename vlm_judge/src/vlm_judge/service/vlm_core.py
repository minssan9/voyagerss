"""Qwen3-VL logit 기반 선택지 확률 판정 로직. 1 forward pass로 답변 후보 토큰의 logit만 비교한다."""
import logging

import torch
from PIL import Image
from transformers import AutoModelForImageTextToText, AutoProcessor

from vlm_judge.config import VLM_MODEL, detect_device

logger = logging.getLogger("vlm_judge")

BOOL_CHOICES = ["Yes", "No"]


class VlmCore:
    def __init__(self) -> None:
        self.device = detect_device()
        logger.info("loading model: %s", VLM_MODEL)
        dtype = torch.float16 if self.device != "cpu" else torch.float32
        self.processor = AutoProcessor.from_pretrained(VLM_MODEL)
        self.model = AutoModelForImageTextToText.from_pretrained(
            VLM_MODEL, dtype=dtype
        ).to(self.device)
        self.model.eval()
        logger.info("model loaded on %s", self.device)

    def _choice_token_ids(self, choices: list[str]) -> list[int]:
        ids = []
        for choice in choices:
            token_ids = self.processor.tokenizer.encode(choice, add_special_tokens=False)
            if not token_ids:
                raise ValueError(f"choice '{choice}' produced no tokens")
            ids.append(token_ids[0])
        return ids

    @torch.inference_mode()
    def _score_choices(self, image: Image.Image, question: str, choices: list[str]) -> dict[str, float]:
        options_text = ", ".join(choices)
        prompt = f"{question}\nAnswer with exactly one of: {options_text}."
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "image", "image": image},
                    {"type": "text", "text": prompt},
                ],
            }
        ]
        inputs = self.processor.apply_chat_template(
            messages,
            tokenize=True,
            add_generation_prompt=True,
            return_dict=True,
            return_tensors="pt",
        ).to(self.device)

        outputs = self.model(**inputs)
        last_logits = outputs.logits[0, -1, :]

        choice_ids = self._choice_token_ids(choices)
        choice_logits = last_logits[choice_ids]
        probs = torch.softmax(choice_logits, dim=-1).tolist()
        return dict(zip(choices, probs))

    def judge_bool(self, image: Image.Image, question: str) -> float:
        probs = self._score_choices(image, question, BOOL_CHOICES)
        return probs["Yes"]

    def judge_choice(self, image: Image.Image, question: str, choices: list[str]) -> dict[str, float]:
        return self._score_choices(image, question, choices)
