#include "gimbal.h"

#include "tracking.h"

namespace {
constexpr uint32_t kServoHz = 50;
constexpr uint8_t kResolutionBits = 16;
constexpr uint32_t kPeriodUs = 1000000UL / kServoHz;
}  // namespace

void ServoAxis::begin(const ServoAxisConfig& cfg) {
  cfg_ = cfg;
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  ledcAttachChannel(cfg_.pin, kServoHz, kResolutionBits, cfg_.channel);
#else
  ledcSetup(cfg_.channel, kServoHz, kResolutionBits);
  ledcAttachPin(cfg_.pin, cfg_.channel);
#endif
  write(cfg_.homeDeg);
}

void ServoAxis::write(float deg) {
  angle_ = tracking::clampf(deg, cfg_.minDeg, cfg_.maxDeg);
  const float us = cfg_.minUs + (cfg_.maxUs - cfg_.minUs) * (angle_ / 180.0f);
  const uint32_t duty = static_cast<uint32_t>(us * ((1UL << kResolutionBits) - 1) / kPeriodUs);
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  ledcWrite(cfg_.pin, duty);
#else
  ledcWrite(cfg_.channel, duty);
#endif
}

void ServoAxis::nudge(float deltaDeg) {
  if (deltaDeg == 0.0f) return;
  write(angle_ + (cfg_.invert ? -deltaDeg : deltaDeg));
}

void ServoAxis::moveToward(float deg, float maxStep) {
  write(tracking::stepToward(angle_, deg, maxStep));
}

void Gimbal::begin(const ServoAxisConfig& panCfg, const ServoAxisConfig& tiltCfg) {
  pan.begin(panCfg);
  tilt.begin(tiltCfg);
}

void Gimbal::nudge(float dPan, float dTilt) {
  pan.nudge(dPan);
  tilt.nudge(dTilt);
}

void Gimbal::stepHome(float maxStep) {
  pan.moveToward(pan.home(), maxStep);
  tilt.moveToward(tilt.home(), maxStep);
}
