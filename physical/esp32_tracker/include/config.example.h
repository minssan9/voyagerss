// 이 파일을 include/config.h 로 복사해서 값을 채운다 (config.h 는 git 미포함).
//   cp include/config.example.h include/config.h
#pragma once

// ── Wi-Fi ───────────────────────────────────────────────────────────
#define WIFI_SSID "your-ssid"
#define WIFI_PASSWORD "your-password"

// ── vision_cam 연동 ─────────────────────────────────────────────────
// vision_cam 을 VISION_CAM_SOURCE=browser + --stream 8080 으로 실행한 PC/파이 주소.
// ESP32 가 JPEG 를 POST 하면 YOLO+ByteTrack 결과(track_id 포함)를 응답 JSON 으로 받는다.
#define VISION_CAM_FRAME_URL "http://192.168.0.10:8080/frame"
#define VISION_HTTP_TIMEOUT_MS 3000
// 이 시간 동안 정상 응답이 없으면 LINK LOST (서보 정지 + 경고등)
#define LINK_TIMEOUT_MS 2000

// ── 카메라 ──────────────────────────────────────────────────────────
// QVGA(320x240) 권장: vision_cam --analysis-width 320 과 같아 전송·추론 모두 빠름
#define CAM_FRAME_SIZE FRAMESIZE_QVGA
#define CAM_JPEG_QUALITY 12  // 0(고화질)~63(저화질)
#define CAM_HFLIP 0
#define CAM_VFLIP 0
// 프레임 전송 최소 간격(ms). 0 = 응답 오는 대로 즉시 다음 프레임
#define MIN_FRAME_INTERVAL_MS 0

// ── 추적 대상 ───────────────────────────────────────────────────────
// 이 분석기 결과의 detections 만 사용 (yolo 가 track_id 를 준다). {"*"} 이면 전부
#define TRACK_ANALYZERS {"yolo", "object", "face"}
// 따라갈 라벨 (COCO: person, car, dog ...). {"*"} 이면 모든 라벨
#define TRACK_CLASSES {"person"}
#define TRACK_MIN_SCORE 0.45f
// 잠근 track_id 를 놓쳐도 이 프레임 수 동안은 다른 객체로 바꾸지 않음
#define TRACK_LOST_FRAMES 8
// 타깃이 사라진 뒤 이 시간(ms) 지나면 홈 위치로 천천히 복귀
#define TRACK_LOST_HOLD_MS 1500
#define HOME_SPEED_DEG_PER_S 30.0f

// ── 팬/틸트 서보 (SG90 / MG90S) ─────────────────────────────────────
#define SERVO_MIN_US 500
#define SERVO_MAX_US 2400
#define PAN_MIN_DEG 10.0f
#define PAN_MAX_DEG 170.0f
#define PAN_HOME_DEG 90.0f
#define TILT_MIN_DEG 45.0f
#define TILT_MAX_DEG 135.0f
#define TILT_HOME_DEG 90.0f
// 타깃 반대 방향으로 돌면 1 로 바꾼다 (서보 장착 방향에 따라 다름)
#define PAN_INVERT 0
#define TILT_INVERT 0

// PD 게인: 오차 1.0(화면 끝) → KP 도 이동. 흔들리면 KP↓ 또는 DEADBAND↑
#define PAN_KP 12.0f
#define PAN_KD 0.5f
#define TILT_KP 9.0f
#define TILT_KD 0.4f
#define AXIS_DEADBAND 0.06f
#define AXIS_MAX_STEP_DEG 8.0f

// ── 상태 표시 ───────────────────────────────────────────────────────
#define STATUS_LED_BRIGHTNESS 40  // 0~255
#define BUZZER_ON_STOP 1          // decision 이 STOP 으로 바뀌면 짧게 울림
// 프레임마다 시리얼로 JSON 한 줄 텔레메트리 출력
#define TELEMETRY_SERIAL 1
