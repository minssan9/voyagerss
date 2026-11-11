# vision_cam — OpenCV 실시간 카메라 분석

맥북에서 개발/테스트하고 라즈베리파이로 그대로 옮겨 실행하는 Python + OpenCV 모듈.

## 구조

```text
vision_cam/
├── vision_cam/
│   ├── __main__.py        # CLI 진입점 (python -m vision_cam)
│   ├── sources.py         # 카메라 입력: OpenCV(맥/USB/파일/RTSP), picamera2(파이 CSI)
│   ├── pipeline.py        # 축소 → 분석기 실행 → 좌표 복원 → 오버레이
│   ├── stream.py          # 헤드리스용 MJPEG 스트리밍 + /status JSON
│   ├── roi.py             # ROI(관심 영역) 구역 정의/필터링
│   ├── roi_tool.py        # ROI 구역을 클릭으로 그리는 도구 (python -m vision_cam.roi_tool)
│   ├── decision.py        # 자율주행 STOP/SLOW/GO 규칙 기반 판단
│   ├── kinematics.py      # 트랙별 속도/가속도/모멘텀 추정
│   └── analyzers/
│       ├── motion.py      # MOG2 배경 차분 움직임 감지
│       ├── face.py        # Haar cascade 얼굴 검출
│       ├── object.py      # MobileNet-SSD 객체 인식/분류
│       ├── yolo.py        # YOLO26 객체 검출 + ByteTrack 추적 (선택 의존성)
│       └── brightness.py  # 밝기 / 선명도(가림·초점) 측정
├── models/                 # object 분석기 가중치 (git 미포함, 다운로드 필요)
├── tests/                 # 카메라 없이 합성 프레임으로 테스트
├── deploy/
│   ├── install-pi.sh      # 파이 설치 스크립트
│   ├── download-models.sh # object 분석기 모델 다운로드
│   └── vision_cam.service  # systemd 유닛
├── roi.example.json       # ROI 구역 설정 예시
├── kinematics.example.json # 속도/모멘텀 보정(호모그래피·질량) 예시
├── requirements-yolo.txt  # yolo 분석기용 ultralytics
└── .env.example
```

## 분석기

| 이름 | 방식 | 트리거 조건 | 주요 metrics |
|---|---|---|---|
| `motion` | MOG2 background subtraction | `min_area` 이상 움직임 영역 존재 (warm-up 30프레임 이후) | `motion_ratio` |
| `face` | Haar cascade (frontal face) | 얼굴 1개 이상 | `faces` |
| `brightness` | 평균 밝기 + Laplacian variance | 어두움(<40) 또는 흐림(<30) | `brightness`, `sharpness` |
| `object` | MobileNet-SSD (Caffe, VOC 21클래스) via `cv2.dnn` | `trigger_classes` 클래스 검출 | `objects`, `classes`, `inference_ms`, `stale` |
| `yolo` | Ultralytics YOLO26 (COCO 80클래스) + ByteTrack | `trigger_classes` 클래스 검출 | 위와 동일 + `track_id` |

## 1. macOS 에서 테스트

```bash
cd vision_cam
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt

python -m vision_cam                                   # 내장 카메라 + 창 표시 (q 로 종료)
python -m vision_cam --analyzers motion --stream 8080  # 브라우저: http://localhost:8080
pytest -q                                             # 카메라 없이 테스트
```

> 처음 실행 시 macOS 가 카메라 권한을 묻습니다. 거부했다면 **시스템 설정 → 개인정보 보호 및 보안 → 카메라** 에서 터미널(iTerm/VS Code) 허용.

## 2. 라즈베리파이로 이관

권장: Raspberry Pi 4/5, Raspberry Pi OS Bookworm 64-bit.

```bash
git clone <repo> ~/voyagerss && cd ~/voyagerss/vision_cam
bash deploy/install-pi.sh

# CSI 카메라 모듈이면 picamera, USB 웹캠이면 0 (auto 는 자동 판별)
.venv/bin/python -m vision_cam --source auto --no-display --stream 8080
# → 같은 네트워크에서 http://<pi-ip>:8080 접속

# 서비스 등록 (부팅 시 자동 실행)
sudo cp deploy/vision_cam.service /etc/systemd/system/
sudo systemctl enable --now vision_cam
journalctl -u vision_cam -f
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
python -m vision_cam --events events.jsonl --snapshot-dir snapshots \
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
python -m vision_cam --analyzers object --object-classes person,car,bicycle
```

클래스 목록: `aeroplane, bicycle, bird, boat, bottle, bus, car, cat, chair, cow, diningtable, dog,
horse, motorbike, person, pottedplant, sheep, sofa, train, tvmonitor`

| 옵션 | 설명 |
|---|---|
| `--object-model DIR` | 모델 폴더 (기본: `vision_cam/models`) |
| `--object-confidence` | 최소 신뢰도 (기본 0.5) |
| `--object-classes` | 검출할 클래스 (쉼표 구분, 비우면 전체) |
| `--object-every N` | N 프레임마다 1회 추론 |

**파이 성능 팁**: 라즈베리파이 4 에서 1회 추론은 대략 100~200ms 걸립니다. `--object-every 3`
(3프레임마다 1회) 과 `--analysis-width 320` 을 함께 쓰면 대략 5~8 FPS 로 동작합니다. SSD 는
내부적으로 300x300 으로 리사이즈하므로 `--analysis-width` 를 더 키워도 정확도 이득은 적습니다.

## YOLO26 객체 추적 (yolo)

### 도입 검토

| 항목 | `object` (MobileNet-SSD) | `yolo` (YOLO26n) |
|---|---|---|
| 클래스 | VOC 21 | COCO 80 (truck, traffic light, stop sign 등 포함) |
| 정확도 | VOC mAP≈72 (구형, 작은 객체 약함) | COCO mAP50-95≈40.9 (Ultralytics 공개치) |
| 후처리 | 고정 출력 | **NMS-free** end-to-end → 지연 일정, export 단순 |
| 추적(ID) | 없음 → kinematics 의 IoU 매칭으로 보완 | **ByteTrack / BoT-SORT 내장** (`model.track`) |
| 의존성 | OpenCV 만 | ultralytics + PyTorch (~1GB) |
| 라즈베리파이 | 4 기준 100~200ms/회 | NCNN export 권장, 실측 필요 (imgsz 320) |
| 라이선스 | MIT 계열 | **AGPL-3.0** (비공개 상용 배포 시 Enterprise 라이선스) |

결론: 개발/서버(맥, x86, Jetson)는 `yolo` 기본, 의존성·라이선스 제약이 있는 곳은 `object` 유지.
두 분석기 모두 같은 `Detection` 을 내므로 ROI·decision·kinematics 가 그대로 동작한다.
(이 저장소 환경 CPU 실측: yolo26n, imgsz 640 → 약 31ms/프레임)

```bash
pip install -r requirements-yolo.txt
python -m vision_cam --analyzers yolo --yolo-classes person,car,bicycle --kinematics

# 라즈베리파이: PC 에서 NCNN 으로 변환 후 폴더째 복사
yolo export model=yolo26n.pt format=ncnn imgsz=320
python -m vision_cam --analyzers yolo --yolo-model yolo26n_ncnn_model --yolo-every 2 --no-display --stream 8080
```

| 옵션 | 설명 |
|---|---|
| `--yolo-model` | `yolo26n.pt`(기본, 자동 다운로드) / `yolo26s.pt` / export 한 모델 |
| `--yolo-confidence` | 최소 신뢰도 (기본 0.4) |
| `--yolo-classes` | COCO 클래스 필터 (쉼표 구분) |
| `--yolo-every N` | N 프레임마다 1회 추론 |
| `--yolo-imgsz` | 추론 입력 크기 (기본 320) |
| `--yolo-tracker` | `bytetrack.yaml`(기본) / `botsort.yaml` / `none` |

## 속도·가속도·모멘텀 (kinematics)

`--kinematics` 를 켜면 `object` / `yolo` 검출마다 `track_id` 와 `kinematics` 가 붙는다.

```json
{"label": "person", "track_id": 3, "bbox": [281, 405, 123, 455],
 "kinematics": {"unit": "m", "position": [1.2, 3.4], "velocity": [1.1, -0.1], "speed": 1.1,
                "acceleration": [0.3, 0.0], "accel": 0.3, "heading_deg": -5.2,
                "momentum": 77.0, "approach": 0.12, "age": 14}}
```

| 값 | 계산 | 단위 |
|---|---|---|
| `velocity` / `speed` | 기준점 위치 차분 / dt → EMA(`velocity_alpha`) | unit/s |
| `acceleration` / `accel` | 속도 차분 / dt → EMA(`acceleration_alpha`), age<3 이면 0 | unit/s² |
| `momentum` | `mass_kg[label] × speed` (질량 미지정 시 null) | kg·unit/s |
| `approach` | bbox 면적 변화율, **양수 = 카메라로 접근** (≈ 1/TTC) | 1/s |

단위 보정 (없으면 `px`):

- `--meters-per-pixel 0.002` — 카메라가 평면을 정면/위에서 볼 때 (탑뷰)
- `--kinematics-config kinematics.example.json` 의 `homography` — 비스듬한 시점에서 지면 좌표(m)로 변환. bbox **하단 중심(지면 접점)** 을 사용. 지면에 아는 크기의 사각형 4점을 찍어 `cv2.getPerspectiveTransform` 으로 구한다.

```python
import cv2, numpy as np
img_pts = np.float32([[210, 400], [430, 400], [520, 470], [120, 470]])  # 화면상 4점(px)
ground = np.float32([[0, 0], [1, 0], [1, 0.5], [0, 0.5]])              # 실제 좌표(m)
print(cv2.getPerspectiveTransform(img_pts, ground).tolist())           # → homography
```

⚠️ 한계: 단안 카메라라 깊이를 모른다. 보정 없이 px/s 는 같은 물체라도 멀수록 작게 나온다.
카메라가 움직이면(차량 탑재) 값은 카메라 기준 **상대 운동**이다. 가속도는 2차 미분이라 노이즈가 커서
판단 근거로는 `speed`·`approach` 를 우선 쓰고, 가속도는 추세 확인용으로 쓰는 것을 권장한다.

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
python -m vision_cam --analyzers motion,object --roi roi.json
```

### roi_tool 로 구역 그리기

```bash
python -m vision_cam.roi_tool                 # 맥: 카메라로 클릭해서 그리기
```

조작: 좌클릭(점 추가) · `u`(취소) · `n`/Enter(닫기+이름 입력) · `f`(filter on/off) ·
`c`(전체 지우기) · `s`(저장) · `q`(종료)

**파이(헤드리스)에서 그리는 방법** — GUI 창을 띄울 수 없으므로 한 프레임만 캡처해 맥으로 옮깁니다:

```bash
# 1. 파이에서 한 프레임 캡처
python -m vision_cam.roi_tool --source picamera --capture frame.jpg
scp pi@raspberrypi:~/voyagerss/vision_cam/frame.jpg .

# 2. 맥에서 그 이미지로 편집
python -m vision_cam.roi_tool --image frame.jpg --out roi.json

# 3. 완성된 roi.json 을 파이로 복사
scp roi.json pi@raspberrypi:~/voyagerss/vision_cam/
```

## 자율주행 판단 (decision)

> ⚠️ 실제 자율주행 시스템이 아닙니다. 카메라 한 대의 2D 검출만으로 STOP/SLOW/GO 를 정하는
> **단순 규칙 기반** 안전장치이며, 소형 RC카/로봇 프로젝트 수준을 위한 것입니다.

```bash
python -m vision_cam --analyzers object,brightness --roi roi.json --decide
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

### 점진적 반영 (ramp) — 차량에 내려보내는 속도/조향

`action`(STOP/SLOW/GO)은 판단이고, 실제로 차량에 내려보내는 **속도(`speed`, 0~1)와
조향(`steer`)은 프레임마다 정해진 폭만큼씩만 목표값에 다가갑니다.** 판단이 바뀌었다고
바로 목표 속도로 점프하지 않으므로 급가속·급조향 없이 부드럽게 반영됩니다.

- **`STOP` 은 예외**: 속도·조향을 즉시 0으로 만듭니다. 제동이 지연되는 것은 안전상
  허용할 수 없기 때문에, 정지만은 점진적 반영을 거치지 않습니다.
- `accel_step` : GO 방향으로 속도가 늘어날 때 프레임당 최대 증가폭
- `decel_step` : STOP 이 아닌 감속(GO→SLOW 등)일 때 프레임당 최대 감소폭
- `steer_step` : 조향이 목표값에 다가가는 프레임당 최대 변화폭
- `go_speed`/`slow_speed`/`stop_speed` : 각 판단에 대응하는 목표 속도

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
  "clear_frames": 5,
  "go_speed": 1.0,
  "slow_speed": 0.4,
  "stop_speed": 0.0,
  "accel_step": 0.15,
  "decel_step": 0.35,
  "steer_step": 0.3
}
```

판단 결과는 `driving` 이벤트로 기록됩니다 (다른 분석기와 달리 STOP 지연을 막기 위해
`--cooldown` 을 적용하지 않고, 변화가 있을 때마다 즉시 내보냅니다). 차량 제어부는
`decision.action` 이 아니라 **`decision.speed`/`decision.steer` 를 그대로 목표값으로
사용**하면 됩니다 (이미 점진적으로 다듬어진 값이므로 제어부에서 추가로 스무딩할 필요가
없습니다):

```json
{"ts": 1790213216.12, "analyzer": "driving", "triggered": true,
 "decision": {"action": "STOP", "reason": "obstacle_in_stop_zone", "steer": 0.0,
              "speed": 0.0,
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
python -m vision_cam --source picamera --no-display \
  --analyzers object,brightness --object-every 3 \
  --roi roi.json --decide --decision-heartbeat 1 \
  --webhook http://<car-controller>/decision --stream 8080
```

## 분석기 추가

```python
# vision_cam/analyzers/edge.py
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
- 모든 CLI 옵션은 `VISION_CAM_*` 환경변수로도 지정할 수 있습니다 (`.env.example` 참고).
