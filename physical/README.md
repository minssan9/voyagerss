# physical — 하드웨어(피지컬) 모음

`vision_cam` 실시간 추적(YOLO26 + ByteTrack)과 연동되는 ESP32 팬/틸트 추적 카메라.

```text
physical/
├── README.md                    # 이 문서 (전체 구성·실행 순서)
├── esp32_tracker/               # ESP32 펌웨어 (PlatformIO, Arduino)
│   ├── platformio.ini           # env: xiao_esp32s3_sense(권장) / esp32cam_ai_thinker / native
│   ├── include/
│   │   ├── board_pins.h         # 보드별 카메라·서보·LED 핀
│   │   └── config.example.h     # → config.h 로 복사 (Wi-Fi, vision_cam URL, 게인)
│   ├── lib/tracking/src/        # 타깃 선택·PD 제어 순수 로직 (보드 없이 테스트)
│   ├── src/
│   │   ├── main.cpp             # 캡처 → POST /frame → 추적 → 서보/상태등
│   │   ├── vision_client.*      # vision_cam HTTP 클라이언트 + JSON 파싱
│   │   ├── gimbal.*             # LEDC 50Hz 서보 2축
│   │   └── status_light.*       # WS2812B 상태등 + 부저
│   └── test/test_tracking/      # Unity 테스트 (pio test -e native)
└── hardware/
    ├── BOM.md                   # 필요 부품
    ├── wiring.md                # 배선도·전원 설계
    └── 3d-design-prompts.md     # 3D 하우징 설계용 프롬프트
```

## 동작 구조

```text
 ┌──────────── ESP32 (팬/틸트 헤드) ────────────┐        ┌──────── PC / 라즈베리파이 ────────┐
 │ OV2640 ─JPEG─▶ VisionClient ──POST /frame──────────▶ vision_cam (source=browser)        │
 │                                              │        │  yolo + ByteTrack (+kinematics)   │
 │ Gimbal ◀─PD─ TargetSelector ◀──JSON report─────────── │  (+decide: STOP/SLOW/GO)          │
 │ StatusLight ◀─ decision.action               │        │  /stream.mjpg · /status           │
 └──────────────────────────────────────────────┘        └───────────────┬──────────────────┘
                                                                          │ (기존 경로 그대로)
                                                         backend /api/vision/cam/* → 웹 /vision/cam
```

- ESP32 는 **카메라 + 액추에이터**, 추론은 **vision_cam** 이 담당 (ESP32 에서 YOLO 는 무리).
- 응답의 `track_id` 로 한 객체를 잠그고 화면 중앙에 오도록 서보를 돌린다.
- vision_cam 이 오버레이를 `/stream.mjpg` 로 그대로 내보내므로 웹 `/vision/cam` 에서 결과 확인 가능. **백엔드 변경 없음.**

## 실행 순서

### 1. vision_cam (분석 서버)

```bash
cd vision_cam
pip install -r requirements.txt -r requirements-yolo.txt
VISION_CAM_SOURCE=browser python -m vision_cam \
  --analyzers yolo --yolo-classes person --kinematics \
  --no-display --stream 8080
# 선택: --decide --roi roi.json  → 상태등 GO/SLOW/STOP
```

> 웹 `/vision/cam` 에서 **브라우저 카메라 전송**을 동시에 켜면 ESP32 프레임과 섞입니다. ESP32 사용 중엔 스트림 보기만 쓰세요.

### 2. 펌웨어

```bash
pip install platformio
cd physical/esp32_tracker
cp include/config.example.h include/config.h   # WIFI_*, VISION_CAM_FRAME_URL 수정

pio test -e native                             # 추적 로직 단위 테스트 (보드 불필요)
pio run -e xiao_esp32s3_sense -t upload        # ESP32-CAM 은 -e esp32cam_ai_thinker
pio device monitor                             # 프레임별 JSON 텔레메트리
```

시리얼 출력 예:

```json
{"ms":51234,"rtt":142,"link":1,"n":2,"id":3,"label":"person","ex":0.18,"ey":-0.05,"pan":97.5,"tilt":88.0,"action":"GO","fps":7.1}
```

### 3. 튜닝 체크

| 증상 | 조정 (`config.h`) |
|---|---|
| 타깃 반대로 돈다 | `PAN_INVERT` / `TILT_INVERT` 토글 |
| 좌우로 흔들림(오버슈트) | `PAN_KP` ↓, `PAN_KD` ↑, `AXIS_DEADBAND` ↑ |
| 너무 느리게 따라감 | `PAN_KP` ↑, `AXIS_MAX_STEP_DEG` ↑ |
| 영상이 뒤집힘 | `CAM_HFLIP` / `CAM_VFLIP` |
| `rtt` 가 300ms 이상 | `CAM_JPEG_QUALITY` ↑(용량↓), vision_cam `--yolo-imgsz 320`, 공유기 근처 배치 |
| 다른 사람으로 자주 바뀜 | `TRACK_LOST_FRAMES` ↑ |

## 상태등

| 색 | 의미 |
|---|---|
| 파랑 깜빡임 | Wi-Fi 연결 중 |
| 빨강 빠른 깜빡임 | vision_cam 응답 없음 (`LINK_TIMEOUT_MS`) → 서보 정지 |
| 흰색 | 대상 탐색 중 |
| 청록 | 추적 중 |
| 초록 / 주황 / 빨강 | `--decide` 판단 GO / SLOW / STOP |

## 안전·제약

- vision_cam `/frame` 은 인증이 없습니다. **신뢰할 수 있는 로컬 네트워크**에서만 사용하세요.
- 통신 두절 시 펌웨어는 action 을 STOP 으로 간주합니다. 이 보드로 모터를 구동하도록 확장한다면 이 워치독을 반드시 유지하세요 (`vision_cam/vision_cam/decision.py` 주석 참고).
- 왕복 지연(약 100~300ms) 때문에 빠른 물체 추적에는 한계가 있습니다.

부품은 [hardware/BOM.md](hardware/BOM.md), 배선은 [hardware/wiring.md](hardware/wiring.md), 하우징은 [hardware/3d-design-prompts.md](hardware/3d-design-prompts.md).
