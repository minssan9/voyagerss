from pydantic import BaseModel


class BoolJudgeResponse(BaseModel):
    probability: float


class ChoiceJudgeResponse(BaseModel):
    probabilities: dict[str, float]
