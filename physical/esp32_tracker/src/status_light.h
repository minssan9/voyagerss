// WS2812B 1구 상태등 + 능동 부저. 핀이 -1 이면 아무것도 하지 않는다.
//
//  상태            색 / 패턴
//  WIFI_CONNECTING 파랑 깜빡임
//  LINK_LOST       빨강 빠른 깜빡임 (vision_cam 응답 없음)
//  SEARCHING       흰색 은은하게
//  TRACKING        청록
//  GO / SLOW / STOP  초록 / 주황 / 빨강 (vision_cam --decide 일 때 추적색보다 우선)
#pragma once

#include <Adafruit_NeoPixel.h>
#include <Arduino.h>

enum class LightState { WifiConnecting, LinkLost, Searching, Tracking, Go, Slow, Stop };

class StatusLight {
 public:
  StatusLight(int ledPin, int buzzerPin, uint8_t brightness);
  void begin();
  void set(LightState s) { state_ = s; }
  void beep(uint16_t ms);
  void loop();  // 매 루프 호출 (깜빡임/부저 타이머)

 private:
  uint32_t colorFor(LightState s, bool blinkOn) const;

  Adafruit_NeoPixel pixel_;
  int ledPin_;
  int buzzerPin_;
  uint8_t brightness_;
  LightState state_ = LightState::WifiConnecting;
  uint32_t lastColor_ = 0xFFFFFFFF;
  uint32_t buzzerOffAt_ = 0;
};
