# vision_judge

Qwen3-VL logit 기반 이미지 판단 FastAPI 서버. 이미지 + 질문을 1 forward pass로 전달해
선택지 토큰(logit) 확률만 계산한다 (텍스트 generation 없음). 모델은 서버 시작 시 1회만 로드된다.
모든 판정 요청/결과 이력은 SQLite에 저장된다. 화면은 Vite `/vision/judge`이고, 이 서버는 JSON API만 제공한다.

## 구조

```
vision_judge/
├── pyproject.toml          # 패키징/의존성 (pip install -e .)
├── src/vision_judge/
│   ├── main.py             # FastAPI 앱, lifespan에서 모델/DB/저장소 1회 초기화
│   ├── config.py           # 환경변수, device 자동 감지
│   ├── schemas.py          # API 응답 pydantic 모델
│   ├── router/             # HTTP 계층
│   │   ├── judge_router.py     # POST /judge/bool, /judge/choice
│   │   └── web_router.py       # GET /health, /api/records, /api/records/{id}
│   ├── service/            # 유스케이스 계층
│   │   ├── vlm_core.py         # Qwen3-VL 모델 로딩 + logit 판정 로직
│   │   └── judge_service.py    # 판정 실행 + 이력 저장 오케스트레이션
│   └── repository/         # 영속성 계층
│       ├── judge_record_repository.py  # SQLite CRUD (판정 이력)
│       └── image_repository.py         # 업로드 이미지 파일 저장
├── tests/test_api.py
└── run.sh
```

데이터(SQLite DB, 업로드 이미지)는 기본적으로 `vision_judge/data/`에 저장된다 (`DATA_DIR` 환경변수로 변경 가능).

## 설치

```bash
cd vision_judge
python3.12 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

## 실행

```bash
./run.sh
# 또는
VLM_MODEL="Qwen/Qwen3-VL-4B-Instruct" HOST=0.0.0.0 PORT=8000 ./run.sh
```

시작 시 cuda → mps → cpu 순으로 device를 자동 감지하고 로그에 출력한다.

화면은 Voyagerss Vite 모듈 `/vision/judge`이다. Nest가 아래 JSON API를 프록시한다.

## API

| 경로 | 설명 |
|---|---|
| `GET /health` | device, model_name |
| `GET /api/records` | 최근 판정 이력 (기본 50건) |
| `GET /api/records/{id}` | 판정 단건 |
| `GET /images/{filename}` | 저장된 업로드 이미지 |

### `POST /judge/bool`

이미지 + 질문에 대해 "Yes"일 확률을 반환한다. 호출 결과는 자동으로 이력에 저장된다.

```bash
curl -X POST http://localhost:8000/judge/bool \
  -F "image=@sample.png" \
  -F "question=Is this image mostly red?"
```

```json
{"probability": 1.0}
```

### `POST /judge/choice`

이미지 + 질문 + 콤마로 구분된 선택지에 대해 각 선택지의 확률을 반환한다.

```bash
curl -X POST http://localhost:8000/judge/choice \
  -F "image=@sample.png" \
  -F "question=What is the dominant color?" \
  -F "choices=red,blue,green"
```

```json
{"probabilities": {"red": 0.0, "blue": 1.0, "green": 0.0}}
```

잘못된 입력(빈 question, 선택지 2개 미만, 이미지가 아닌 파일)은 400을 반환한다.

## 테스트

```bash
source .venv/bin/activate
pytest tests/ -v
```

`tests/test_api.py`는 `VlmCore`(모델 로딩)를 mock 처리하고 `DATA_DIR`을 임시 디렉터리로 돌려
API 계약과 이력 JSON, health를 검증한다.

## Spring Boot 연동 예시 (RestClient, multipart)

```java
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.web.client.RestClient;

RestClient restClient = RestClient.create("http://localhost:8000");

MultipartBodyBuilder builder = new MultipartBodyBuilder();
builder.part("image", new FileSystemResource("sample.png"));
builder.part("question", "Is this image mostly red?");

record BoolJudgeResponse(double probability) {}

BoolJudgeResponse result = restClient.post()
        .uri("/judge/bool")
        .contentType(MediaType.MULTIPART_FORM_DATA)
        .body(builder.build())
        .retrieve()
        .body(BoolJudgeResponse.class);

System.out.println(result.probability());
```

`choices` 필드가 추가된 `/judge/choice` 호출도 동일한 패턴으로 `builder.part("choices", "red,blue,green")`
를 추가하면 된다.

## 환경변수

| 변수 | 기본값 | 설명 |
|---|---|---|
| `VLM_MODEL` | `Qwen/Qwen3-VL-4B-Instruct` | 사용할 Hugging Face 모델 |
| `HOST` | `0.0.0.0` | 바인딩 호스트 |
| `PORT` | `8000` | 바인딩 포트 |
| `DATA_DIR` | `data` (실행 위치 기준 상대경로) | SQLite DB 및 업로드 이미지 저장 위치 |
