// 보드별 카메라/주변기기 핀. platformio.ini 의 build_flags 로 보드를 고른다.
#pragma once

#if defined(BOARD_XIAO_ESP32S3_SENSE)
// Seeed XIAO ESP32S3 Sense (OV2640/OV3660 확장보드)
#define CAM_PIN_PWDN -1
#define CAM_PIN_RESET -1
#define CAM_PIN_XCLK 10
#define CAM_PIN_SIOD 40
#define CAM_PIN_SIOC 39
#define CAM_PIN_D7 48
#define CAM_PIN_D6 11
#define CAM_PIN_D5 12
#define CAM_PIN_D4 14
#define CAM_PIN_D3 16
#define CAM_PIN_D2 18
#define CAM_PIN_D1 17
#define CAM_PIN_D0 15
#define CAM_PIN_VSYNC 38
#define CAM_PIN_HREF 47
#define CAM_PIN_PCLK 13

#define PIN_SERVO_PAN 1    // D0
#define PIN_SERVO_TILT 2   // D1
#define PIN_STATUS_LED 3   // D2 → WS2812B DIN
#define PIN_BUZZER 4       // D3 → NPN 베이스 (능동 부저)

#elif defined(BOARD_AI_THINKER_ESP32CAM)
// AI-Thinker ESP32-CAM. SD 카드 미사용 전제로 SD 핀을 재활용한다.
#define CAM_PIN_PWDN 32
#define CAM_PIN_RESET -1
#define CAM_PIN_XCLK 0
#define CAM_PIN_SIOD 26
#define CAM_PIN_SIOC 27
#define CAM_PIN_D7 35
#define CAM_PIN_D6 34
#define CAM_PIN_D5 39
#define CAM_PIN_D4 36
#define CAM_PIN_D3 21
#define CAM_PIN_D2 19
#define CAM_PIN_D1 18
#define CAM_PIN_D0 5
#define CAM_PIN_VSYNC 25
#define CAM_PIN_HREF 23
#define CAM_PIN_PCLK 22

#define PIN_SERVO_PAN 14
#define PIN_SERVO_TILT 15
#define PIN_STATUS_LED 13
// GPIO2/12 는 부팅 스트래핑 핀이라 기본 비활성. 쓰려면 2 로 바꾸고 베이스에 10kΩ 풀다운.
#define PIN_BUZZER -1

#else
#error "보드 미지정: platformio.ini build_flags 에 BOARD_XIAO_ESP32S3_SENSE 또는 BOARD_AI_THINKER_ESP32CAM"
#endif

// LEDC 채널 0/타이머 0 은 카메라 XCLK 가 사용 → 서보는 채널 4/5 (타이머 2)
#define LEDC_CH_PAN 4
#define LEDC_CH_TILT 5
