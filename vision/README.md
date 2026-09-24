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
│   └── analyzers/
│       ├── motion.py      # MOG2 배경 차분 움직임 감지
│       ├── face.py        # Haar cascade 얼굴 검출
│       └── brightness.py  # 밝기 / 선명도(가림·초점) 측정
├── tests/                 # 카메라 없이 합성 프레임으로 테스트
├── deploy/
│   ├── install-pi.sh      # 파이 설치 스크립트
│   └── camvision.service  # systemd 유닛
└── .env.example
```

## 분석기

| 이름 | 방식 | 트리거 조건 | 주요 metrics |
|---|---|---|---|
| `motion` | MOG2 background subtraction | `min_area` 이상 움직임 영역 존재 (warm-up 30프레임 이후) | `motion_ratio` |
| `face` | Haar cascade (frontal face) | 얼굴 1개 이상 | `faces` |
| `brightness` | 평균 밝기 + Laplacian variance | 어두움(<40) 또는 흐림(<30) | `brightness`, `sharpness` |

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

## 참고

- OpenCV 5.x 에서는 `CascadeClassifier` 가 제거되어 `>=4.8,<5` 로 고정했습니다.
- 모든 CLI 옵션은 `CAMVISION_*` 환경변수로도 지정할 수 있습니다 (`.env.example` 참고).
