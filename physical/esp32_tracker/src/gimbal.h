// 팬/틸트 서보 2축. LEDC 50Hz PWM 으로 직접 구동 (카메라 XCLK 타이머와 분리).
#pragma once

#include <Arduino.h>

struct ServoAxisConfig {
  int pin;
  int channel;
  float minDeg;
  float maxDeg;
  float homeDeg;
  uint16_t minUs;  // 0°
  uint16_t maxUs;  // 180°
  bool invert;
};

class ServoAxis {
 public:
  void begin(const ServoAxisConfig& cfg);
  void nudge(float deltaDeg);              // 오차 보정 방향(invert 반영)
  void moveToward(float deg, float maxStep);
  float angle() const { return angle_; }
  float home() const { return cfg_.homeDeg; }

 private:
  void write(float deg);

  ServoAxisConfig cfg_{};
  float angle_ = 90.0f;
};

class Gimbal {
 public:
  void begin(const ServoAxisConfig& pan, const ServoAxisConfig& tilt);
  void nudge(float dPan, float dTilt);
  void stepHome(float maxStep);

  ServoAxis pan;
  ServoAxis tilt;
};
