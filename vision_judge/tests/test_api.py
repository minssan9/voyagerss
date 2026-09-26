import io

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from vision_judge import main
from vision_judge.service import vlm_core


class FakeVlmCore:
    """모델 로딩 없이 API 계약만 검증하기 위한 mock."""

    def __init__(self) -> None:
        self.device = "cpu"

    def judge_bool(self, image, question):
        return 0.75

    def judge_choice(self, image, question, choices):
        share = 1.0 / len(choices)
        return {c: share for c in choices}


@pytest.fixture
def client(monkeypatch, tmp_path):
    monkeypatch.setattr(vlm_core, "VlmCore", FakeVlmCore)
    monkeypatch.setattr(main, "VlmCore", FakeVlmCore)
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    with TestClient(main.app) as c:
        yield c


def _sample_image_bytes() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (32, 32), color="red").save(buf, format="PNG")
    return buf.getvalue()


def test_judge_bool_ok(client):
    files = {"image": ("test.png", _sample_image_bytes(), "image/png")}
    data = {"question": "Is this a cat?"}
    res = client.post("/judge/bool", files=files, data=data)
    assert res.status_code == 200
    assert res.json() == {"probability": 0.75}


def test_judge_bool_missing_question(client):
    files = {"image": ("test.png", _sample_image_bytes(), "image/png")}
    res = client.post("/judge/bool", files=files, data={"question": "   "})
    assert res.status_code == 400


def test_judge_bool_invalid_image(client):
    files = {"image": ("test.txt", b"not an image", "text/plain")}
    res = client.post("/judge/bool", files=files, data={"question": "ok?"})
    assert res.status_code == 400


def test_judge_choice_ok(client):
    files = {"image": ("test.png", _sample_image_bytes(), "image/png")}
    data = {"question": "Which animal?", "choices": "cat,dog,bird"}
    res = client.post("/judge/choice", files=files, data=data)
    assert res.status_code == 200
    body = res.json()
    assert set(body["probabilities"].keys()) == {"cat", "dog", "bird"}


def test_judge_choice_too_few_choices(client):
    files = {"image": ("test.png", _sample_image_bytes(), "image/png")}
    data = {"question": "Which animal?", "choices": "cat"}
    res = client.post("/judge/choice", files=files, data=data)
    assert res.status_code == 400


def test_api_records_list_detail_and_missing(client):
    files = {"image": ("test.png", _sample_image_bytes(), "image/png")}
    client.post("/judge/bool", files=files, data={"question": "Is this a cat?"})

    res = client.get("/api/records")
    assert res.status_code == 200
    body = res.json()
    assert len(body) == 1
    assert body[0]["question"] == "Is this a cat?"
    assert body[0]["endpoint"] == "bool"
    assert body[0]["result"]["probability"] == 0.75
    assert body[0]["image_filename"]

    res = client.get("/api/records/1")
    assert res.status_code == 200
    assert res.json()["id"] == 1

    res = client.get("/api/records/9999")
    assert res.status_code == 404


def test_health(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["device"] == "cpu"
