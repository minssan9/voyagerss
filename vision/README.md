# camvision — OpenCV 실시간 카메라 분석

맥북에서 개발/테스트하고 라즈베리파이로 그대로 옮겨 실행하는 Python + OpenCV 모듈.

## 구조

```text
vision/
├── camvision/
│   ├── __main__.py        # CLI 진입점 (python -m camvision)
│   ├── sources.py         # 카메라 입력: OpenCV(맥/USB/파일/RTSP), picamera2(파이 CSI)
│   ├── pipeline.py        # 축소 → 분석기 실행 → 좌표 복원 → 오버레이
│   ├── stream.py          # 헤드리스용 MJPEG 스트리밍 + /status JSON
│   ├── roi.py             # ROI(관심 영역) 구역 정의/필터링
│   ├── roi_tool.py        # ROI 구역을 클릭으로 그리는 도구 (python -m camvision.roi_tool)
│   ├── decision.py        # 자율주행 STOP/SLOW/GO 규칙 기반 판단
│   └── analyzers/
│       ├── motion.py      # MOG2 배경 차분 움직임 감지
│       ├── face.py        # Haar cascade 얼굴 검출
│       ├── object.py      # MobileNet-SSD 객체 인식/분류
│       └── brightness.py  # 밝기 / 선명도(가림·초점) 측정
├── models/                 # object 분석기 가중치 (git 미포함, 다운로드 필요)
├── tests/                 # 카메라 없이 합성 프레임으로 테스트
├── deploy/
│   ├── install-pi.sh      # 파이 설치 스크립트
│   ├── download-models.sh # object 분석기 모델 다운로드
│   └── camvision.service  # systemd 유닛
├── roi.example.json       # ROI 구역 설정 예시
└── .env.example
```

## 분석기

| 이름 | 방식 | 트리거 조건 | 주요 metrics |
|---|---|---|---|
| `motion` | MOG2 background subtraction | `min_area` 이상 움직임 영역 존재 (warm-up 30프레임 이후) | `motion_ratio` |
| `face` | Haar cascade (frontal face) | 얼굴 1개 이상 | `faces` |
| `brightness` | 평균 밝기 + Laplacian variance | 어두움(<40) 또는 흐림(<30) | `brightness`, `sharpness` |
| `object` | MobileNet-SSD (Caffe, VOC 21클래스) via `cv2.dnn` | `trigger_classes` 클래스 검출 | `objects`, `classes`, `inference_ms`, `stale` |

## 1. macOS 에서 테스트

```bash
cd vision
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt

python -m camvision                                   # 내장 카메라 + 창 표시 (q 로 종료)
python -m camvision --analyzers motion --stream 8080  # 브라우저: http://localhost:8080
pytest -q                                             # 카메라 없이 테스트
```

> 처음 실행 시 macOS 가 카메라 권한을 묻습니다. 거부했다면 **시스템 설정 → 개인정보 보호 및 보안 → 카메라** 에서 터미널(iTerm/VS Code) 허용.

## 2. 라즈베리파이로 이관

권장: Raspberry Pi 4/5, Raspberry Pi OS Bookworm 64-bit.

```bash
git clone <repo> ~/voyagerss && cd ~/voyagerss/vision
bash deploy/install-pi.sh

# CSI 카메라 모듈이면 picamera, USB 웹캠이면 0 (auto 는 자동 판별)
.venv/bin/python -m camvision --source auto --no-display --stream 8080
# → 같은 네트워크에서 http://<pi-ip>:8080 접속

# 서비스 등록 (부팅 시 자동 실행)
sudo cp deploy/camvision.service /etc/systemd/system/
sudo systemctl enable --now camvision
journalctl -u camvision -f
```

### 맥 ↔ 파이 차이

| 항목 | macOS | Raspberry Pi |
|---|---|---|
| OpenCV 패키지 | `opencv-python` (GUI 포함) | `opencv-python-headless` |
| 캡처 backend | AVFoundation | V4L2 (USB) / picamera2 (CSI) |
| 화면 출력 | `cv2.imshow` 창 | `--stream` MJPEG 브라우저 |
| 권장 `--analysis-width` | 320~640 | 240~320 |

## 이벤트 출력

트리거 시 (분석기별 `--cooldown` 초 간격) JSON 한 줄을 stdout 에 출력하고, 옵션에 따라 파일·웹훅·스냅샷으로 저장합니다.

```bash
python -m camvision --events events.jsonl --snapshot-dir snapshots \
  --webhook http://localhost:9002/api/camera/events
```

```json
{"ts": 1790212425.02, "analyzer": "motion", "triggered": true,
 "metrics": {"motion_ratio": 0.0123, "warming_up": false},
 "detections": [{"label": "motion", "bbox": [150, 88, 32, 124], "score": 873.0}],
 "snapshot": "snapshots/20260924-101345_motion.jpg"}
```

## 객체 인식 (object)

MobileNet-SSD(Caffe, PASCAL VOC 21클래스)를 `cv2.dnn` 으로 돌립니다. 가중치(약 23MB)는 git 에
커밋하지 않으므로 최초 1회 다운로드해야 합니다.

```bash
bash deploy/download-models.sh
python -m camvision --analyzers object --object-classes person,car,bicycle
```

클래스 목록: `aeroplane, bicycle, bird, boat, bottle, bus, car, cat, chair, cow, diningtable, dog,
horse, motorbike, person, pottedplant, sheep, sofa, train, tvmonitor`

| 옵션 | 설명 |
|---|---|
| `--object-model DIR` | 모델 폴더 (기본: `vision/models`) |
| `--object-confidence` | 최소 신뢰도 (기본 0.5) |
| `--object-classes` | 검출할 클래스 (쉼표 구분, 비우면 전체) |
| `--object-every N` | N 프레임마다 1회 추론 |

**파이 성능 팁**: 라즈베리파이 4 에서 1회 추론은 대략 100~200ms 걸립니다. `--object-every 3`
(3프레임마다 1회) 과 `--analysis-width 320` 을 함께 쓰면 대략 5~8 FPS 로 동작합니다. SSD 는
내부적으로 300x300 으로 리사이즈하므로 `--analysis-width` 를 더 키워도 정확도 이득은 적습니다.

## ROI 구역 설정

특정 영역만 분석 대상으로 삼거나(예: 문 앞), 위치별로 다른 의미(위험/주의 구역)를 부여할 수
있습니다. 좌표는 0~1 로 정규화되어 있어 해상도가 달라도(맥 640x480, 파이 다른 해상도) 같은
파일을 그대로 씁니다.

```json
{
  "zones": [
    {"name": "danger", "points": [[0.25,0.65],[0.75,0.65],[0.95,1.0],[0.05,1.0]], "filter": false},
    {"name": "door", "points": [[0.1,0.1],[0.4,0.1],[0.4,0.5],[0.1,0.5]], "analyzers": ["motion"]}
  ]
}
```

- **판정 기준**: 검출 박스의 바닥 중앙점(지면에 닿는 지점)이 다각형 안에 있으면 "그 구역 안".
- **`filter`**: `true`(기본값) 면 모든 구역 밖의 검출은 제거됩니다. `false` 면 구역 이름만
  태그하고 제거하지 않습니다 (자율주행 위험/주의 구역처럼 위치만 알고 싶을 때).
- **`analyzers`**: 이 구역을 적용할 분석기 이름 목록. 생략하면 위치 정보가 있는(`spatial=True`)
  모든 분석기에 적용됩니다. `brightness` 처럼 프레임 전체를 보는 분석기는 `spatial=False` 라
  ROI 의 영향을 받지 않습니다.

```bash
python -m camvision --analyzers motion,object --roi roi.json
```

### roi_tool 로 구역 그리기

```bash
python -m camvision.roi_tool                 # 맥: 카메라로 클릭해서 그리기
```

조작: 좌클릭(점 추가) · `u`(취소) · `n`/Enter(닫기+이름 입력) · `f`(filter on/off) ·
`c`(전체 지우기) · `s`(저장) · `q`(종료)

**파이(헤드리스)에서 그리는 방법** — GUI 창을 띄울 수 없으므로 한 프레임만 캡처해 맥으로 옮깁니다:

```bash
# 1. 파이에서 한 프레임 캡처
python -m camvision.roi_tool --source picamera --capture frame.jpg
scp pi@raspberrypi:~/voyagerss/vision/frame.jpg .

# 2. 맥에서 그 이미지로 편집
python -m camvision.roi_tool --image frame.jpg --out roi.json

# 3. 완성된 roi.json 을 파이로 복사
scp roi.json pi@raspberrypi:~/voyagerss/vision/
```

## 자율주행 판단 (decision)

> ⚠️ 실제 자율주행 시스템이 아닙니다. 카메라 한 대의 2D 검출만으로 STOP/SLOW/GO 를 정하는
> **단순 규칙 기반** 안전장치이며, 소형 RC카/로봇 프로젝트 수준을 위한 것입니다.

```bash
python -m camvision --analyzers object,brightness --roi roi.json --decide
```

판단 순서 (먼저 맞는 규칙 적용):

| 순서 | 조건 | 결과 |
|---|---|---|
| 1 | `brightness` 트리거(너무 어둡거나 흐림) | `blind_action` (기본 STOP) |
| 2 | 장애물이 `stop_zone` 안 또는 면적비 ≥ `stop_area_ratio` | STOP |
| 3 | 장애물이 `slow_zone` 안 또는 면적비 ≥ `slow_area_ratio` | SLOW |
| 4 | 그 외 | GO |

**히스테리시스**: 더 위험한 상태로는 즉시 전환하고, 더 안전한 상태로 완화하려면
`clear_frames` 프레임 연속 같은 결론이 나와야 합니다 (깜빡임 방지).

**조향(steer)**: SLOW 일 때만 `-1`(왼쪽) ~ `1`(오른쪽) 값을 계산합니다. 장애물 반대 방향으로
조향을 제안합니다 (예: 장애물이 화면 왼쪽에 있으면 `steer > 0`, 오른쪽으로 피함).

`--decision-config rules.json` 으로 기본값을 덮어씁니다 (아래는 기본값):

```json
{
  "obstacle_classes": ["person","bicycle","car","motorbike","bus","dog","cat","horse",
                        "sheep","cow","chair","bottle","pottedplant"],
  "min_score": 0.5,
  "motion_as_obstacle": false,
  "stop_zone": "danger",
  "slow_zone": "caution",
  "stop_area_ratio": 0.15,
  "slow_area_ratio": 0.03,
  "blind_action": "STOP",
  "clear_frames": 5
}
```

판단 결과는 `driving` 이벤트로 기록됩니다 (다른 분석기와 달리 STOP 지연을 막기 위해
`--cooldown` 을 적용하지 않고, 변화가 있을 때마다 즉시 내보냅니다):

```json
{"ts": 1790213216.12, "analyzer": "driving", "triggered": true,
 "decision": {"action": "STOP", "reason": "obstacle_in_stop_zone", "steer": 0.0,
              "target": {"label": "person", "score": 0.91, "bbox": [10,54,93,133],
                         "zones": ["danger"], "area_ratio": 0.16},
              "changed": true, "ts": 1790213216.12},
 "zone_hits": {"danger": ["person"], "caution": []}}
```

`--decision-heartbeat 1` 을 주면 변화가 없어도 1초마다 현재 판단을 다시 내보냅니다. 차량
제어부는 이 heartbeat 을 워치독으로 활용해, heartbeat 간격의 2배 이상 이벤트가 오지 않으면
스스로 정지하도록 구현하는 것을 권장합니다.

라즈베리파이 RC카 예시:

```bash
python -m camvision --source picamera --no-display \
  --analyzers object,brightness --object-every 3 \
  --roi roi.json --decide --decision-heartbeat 1 \
  --webhook http://<car-controller>/decision --stream 8080
```

## 분석기 추가

```python
# camvision/analyzers/edge.py
import cv2
from .base import AnalysisResult, Analyzer

class EdgeAnalyzer(Analyzer):
    name = "edge"

    def analyze(self, frame):
        edges = cv2.Canny(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY), 100, 200)
        ratio = float((edges > 0).mean())
        return AnalysisResult(self.name, metrics={"edge_ratio": round(ratio, 4)}, triggered=ratio > 0.2)
```

그 다음 `analyzers/__init__.py` 의 `REGISTRY` 에 등록하면 `--analyzers motion,edge` 로 사용 가능합니다.
위치 정보가 의미 없는 분석기(프레임 전체 지표 등)는 `spatial = False` 로 선언하면 ROI
필터링 대상에서 제외됩니다. 생성자 인자는 `build_analyzers(names, {"edge": {...}})` 처럼
`options` 딕셔너리로 전달할 수 있습니다.

## 참고

- OpenCV 5.x 에서는 `CascadeClassifier` 가 제거되어 `>=4.8,<5` 로 고정했습니다. `cv2.dnn` 은
  `opencv-python`/`opencv-python-headless` 4.8+ 에 기본 포함되어 있어 추가 의존성이 없습니다.
- 모든 CLI 옵션은 `CAMVISION_*` 환경변수로도 지정할 수 있습니다 (`.env.example` 참고).
