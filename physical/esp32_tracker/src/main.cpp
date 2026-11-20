// ESP32 팬/틸트 추적 카메라
//
// 흐름 (프레임마다):
//   OV2640 JPEG 캡처 → vision_cam POST /frame → YOLO+ByteTrack 결과(track_id)
//   → TargetSelector 로 타깃 잠금 → PD 제어로 팬/틸트 서보 보정 → 상태등/부저
//
// vision_cam 쪽 실행 예:
//   VISION_CAM_SOURCE=browser python -m vision_cam --analyzers yolo --kinematics
//       --no-display --stream 8080 [--decide --roi roi.json]
// 같은 /stream.mjpg · /status 를 웹(/vision/cam)이 그대로 보여주므로 별도 백엔드 변경 없음.
#include <Arduino.h>
#include <WiFi.h>
#include <esp_camera.h>

#include "board_pins.h"
#if __has_include("config.h")
#include "config.h"
#else
#warning "include/config.h 없음 → config.example.h 사용. Wi-Fi/URL 을 채운 config.h 를 만드세요."
#include "config.example.h"
#endif

#include "gimbal.h"
#include "status_light.h"
#include "tracking.h"
#include "vision_client.h"

using tracking::Action;

namespace {

const char* const kAnalyzers[] = TRACK_ANALYZERS;
const char* const kClasses[] = TRACK_CLASSES;

VisionClient vision;
Gimbal gimbal;
StatusLight light(PIN_STATUS_LED, PIN_BUZZER, STATUS_LED_BRIGHTNESS);

tracking::TargetSelector selector([] {
  tracking::SelectorConfig c;
  c.classes = kClasses;
  c.classCount = sizeof(kClasses) / sizeof(kClasses[0]);
  c.minScore = TRACK_MIN_SCORE;
  c.lostFrames = TRACK_LOST_FRAMES;
  return c;
}());

tracking::AxisController panCtl({PAN_KP, PAN_KD, AXIS_DEADBAND, AXIS_MAX_STEP_DEG});
tracking::AxisController tiltCtl({TILT_KP, TILT_KD, AXIS_DEADBAND, AXIS_MAX_STEP_DEG});

VisionReport report;  // 크기가 커서 스택 대신 전역
uint32_t lastOkMs = 0;
uint32_t lastSeenMs = 0;
uint32_t lastLoopMs = 0;
Action lastAction = Action::None;

bool initCamera() {
  camera_config_t c = {};
  c.pin_pwdn = CAM_PIN_PWDN;
  c.pin_reset = CAM_PIN_RESET;
  c.pin_xclk = CAM_PIN_XCLK;
  c.pin_sccb_sda = CAM_PIN_SIOD;
  c.pin_sccb_scl = CAM_PIN_SIOC;
  c.pin_d7 = CAM_PIN_D7;
  c.pin_d6 = CAM_PIN_D6;
  c.pin_d5 = CAM_PIN_D5;
  c.pin_d4 = CAM_PIN_D4;
  c.pin_d3 = CAM_PIN_D3;
  c.pin_d2 = CAM_PIN_D2;
  c.pin_d1 = CAM_PIN_D1;
  c.pin_d0 = CAM_PIN_D0;
  c.pin_vsync = CAM_PIN_VSYNC;
  c.pin_href = CAM_PIN_HREF;
  c.pin_pclk = CAM_PIN_PCLK;
  c.xclk_freq_hz = 20000000;
  c.ledc_timer = LEDC_TIMER_0;
  c.ledc_channel = LEDC_CHANNEL_0;
  c.pixel_format = PIXFORMAT_JPEG;
  c.frame_size = CAM_FRAME_SIZE;
  c.jpeg_quality = CAM_JPEG_QUALITY;
  c.fb_count = psramFound() ? 2 : 1;
  c.fb_location = psramFound() ? CAMERA_FB_IN_PSRAM : CAMERA_FB_IN_DRAM;
  c.grab_mode = CAMERA_GRAB_LATEST;  // 서보가 움직이는 동안 쌓인 옛 프레임은 버림

  const esp_err_t err = esp_camera_init(&c);
  if (err != ESP_OK) {
    Serial.printf("[cam] init failed 0x%x\n", err);
    return false;
  }
  sensor_t* s = esp_camera_sensor_get();
  s->set_hmirror(s, CAM_HFLIP);
  s->set_vflip(s, CAM_VFLIP);
  return true;
}

void ensureWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  light.set(LightState::WifiConnecting);
  Serial.printf("[wifi] connecting to %s\n", WIFI_SSID);
  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  const uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
    light.loop();
    delay(50);
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[wifi] ip=%s rssi=%d\n", WiFi.localIP().toString().c_str(), WiFi.RSSI());
  }
}

LightState lightFor(bool linkOk, bool tracking, Action action) {
  if (!linkOk) return LightState::LinkLost;
  switch (action) {
    case Action::Stop: return LightState::Stop;
    case Action::Slow: return LightState::Slow;
    case Action::Go: return tracking ? LightState::Tracking : LightState::Go;
    default: return tracking ? LightState::Tracking : LightState::Searching;
  }
}

}  // namespace

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("\n[esp32_tracker] boot");

  light.begin();
  gimbal.begin(
      {PIN_SERVO_PAN, LEDC_CH_PAN, PAN_MIN_DEG, PAN_MAX_DEG, PAN_HOME_DEG, SERVO_MIN_US, SERVO_MAX_US,
       PAN_INVERT != 0},
      {PIN_SERVO_TILT, LEDC_CH_TILT, TILT_MIN_DEG, TILT_MAX_DEG, TILT_HOME_DEG, SERVO_MIN_US,
       SERVO_MAX_US, TILT_INVERT != 0});

  if (!initCamera()) {
    light.set(LightState::LinkLost);
    for (;;) {  // 카메라 없으면 진행 불가: 경고등 유지 후 재부팅
      light.loop();
      delay(20);
      if (millis() > 10000) ESP.restart();
    }
  }

  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);  // 모뎀 슬립 끄기 → 왕복 지연 감소
  ensureWifi();

  vision.begin(VISION_CAM_FRAME_URL, VISION_HTTP_TIMEOUT_MS, kAnalyzers,
               sizeof(kAnalyzers) / sizeof(kAnalyzers[0]));
  lastOkMs = lastSeenMs = lastLoopMs = millis();
}

void loop() {
  light.loop();
  ensureWifi();

  const uint32_t frameStart = millis();
  camera_fb_t* fb = esp_camera_fb_get();
  if (fb == nullptr) {
    Serial.println("[cam] capture failed");
    delay(50);
    return;
  }
  const int frameW = fb->width;
  const int frameH = fb->height;
  const bool ok = vision.analyze(fb->buf, fb->len, report);
  esp_camera_fb_return(fb);

  const uint32_t now = millis();
  const float dt = (now - lastLoopMs) / 1000.0f;
  lastLoopMs = now;

  if (ok) lastOkMs = now;
  const bool linkOk = now - lastOkMs < LINK_TIMEOUT_MS;
  if (!ok) {
    Serial.printf("[vision] http=%d %s\n", vision.lastHttpCode(), vision.lastError().c_str());
  }

  tracking::Target target;
  if (ok) {
    target = selector.select(report.dets, report.count, frameW, frameH);
    if (target.found) {
      lastSeenMs = now;
      gimbal.nudge(panCtl.update(target.errX, dt), tiltCtl.update(target.errY, dt));
    } else {
      panCtl.reset();
      tiltCtl.reset();
      if (now - lastSeenMs > TRACK_LOST_HOLD_MS) gimbal.stepHome(HOME_SPEED_DEG_PER_S * dt);
    }
  }
  // 링크가 끊기면 서보는 현재 자세를 유지 (쫓던 방향으로 계속 돌지 않음)

  const Action action = linkOk ? report.action : Action::Stop;  // 통신 두절 = 안전측 STOP
  if (BUZZER_ON_STOP && action == Action::Stop && lastAction != Action::Stop) light.beep(120);
  lastAction = action;
  light.set(lightFor(linkOk, target.found, ok ? report.action : Action::None));

#if TELEMETRY_SERIAL
  Serial.printf(
      "{\"ms\":%lu,\"rtt\":%lu,\"link\":%d,\"n\":%u,\"id\":%d,\"label\":\"%s\",\"ex\":%.2f,\"ey\":%.2f,"
      "\"pan\":%.1f,\"tilt\":%.1f,\"action\":\"%s\",\"fps\":%.1f}\n",
      (unsigned long)now, (unsigned long)(now - frameStart), linkOk ? 1 : 0, (unsigned)report.count,
      target.trackId, target.label, target.errX, target.errY, gimbal.pan.angle(), gimbal.tilt.angle(),
      tracking::actionName(action), report.fps);
#endif

#if MIN_FRAME_INTERVAL_MS > 0
  const uint32_t elapsed = millis() - frameStart;
  if (elapsed < MIN_FRAME_INTERVAL_MS) delay(MIN_FRAME_INTERVAL_MS - elapsed);
#endif
}
