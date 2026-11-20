#include "tracking.h"

#include <cmath>
#include <cstring>

namespace tracking {

float clampf(float v, float lo, float hi) { return v < lo ? lo : (v > hi ? hi : v); }

float stepToward(float cur, float target, float maxStep) {
  const float diff = target - cur;
  if (std::fabs(diff) <= maxStep) return target;
  return cur + (diff > 0 ? maxStep : -maxStep);
}

bool TargetSelector::allowed(const Detection& d) const {
  if (d.score < cfg_.minScore || d.w <= 0 || d.h <= 0) return false;
  if (cfg_.classCount == 0 || cfg_.classes == nullptr) return true;
  for (size_t i = 0; i < cfg_.classCount; ++i) {
    if (std::strcmp(cfg_.classes[i], "*") == 0 || std::strcmp(d.label, cfg_.classes[i]) == 0) return true;
  }
  return false;
}

void TargetSelector::reset() {
  locked_ = -1;
  missed_ = 0;
}

Target TargetSelector::select(const Detection* dets, size_t count, int frameW, int frameH) {
  Target out;
  if (frameW <= 0 || frameH <= 0) return out;

  int best = -1;
  if (locked_ >= 0) {
    for (size_t i = 0; i < count; ++i) {
      if (dets[i].trackId == locked_ && allowed(dets[i])) {
        best = static_cast<int>(i);
        break;
      }
    }
    if (best < 0) {
      // 잠깐 가려진 경우 다른 객체로 튀지 않도록 유예
      if (++missed_ < cfg_.lostFrames) return out;
      locked_ = -1;
    }
  }

  if (best < 0) {
    long bestArea = -1;
    for (size_t i = 0; i < count; ++i) {
      if (!allowed(dets[i])) continue;
      const long area = static_cast<long>(dets[i].w) * dets[i].h;
      if (area > bestArea) {
        bestArea = area;
        best = static_cast<int>(i);
      }
    }
    if (best < 0) return out;
    locked_ = dets[best].trackId;  // ID 없는 분석기면 -1 → 매 프레임 가장 큰 것
  }

  missed_ = 0;
  const Detection& d = dets[best];
  const float halfW = frameW / 2.0f;
  const float halfH = frameH / 2.0f;
  out.found = true;
  out.trackId = d.trackId;
  out.errX = clampf((d.x + d.w / 2.0f - halfW) / halfW, -1.0f, 1.0f);
  out.errY = clampf((d.y + d.h / 2.0f - halfH) / halfH, -1.0f, 1.0f);
  out.areaRatio = static_cast<float>(d.w) * d.h / (static_cast<float>(frameW) * frameH);
  std::strncpy(out.label, d.label, kLabelLen - 1);
  return out;
}

float AxisController::update(float err, float dtSec) {
  if (std::fabs(err) < g_.deadband) err = 0.0f;
  if (dtSec <= 0.0f) dtSec = 0.001f;
  const float deriv = hasPrev_ ? (err - prev_) / dtSec : 0.0f;
  prev_ = err;
  hasPrev_ = true;
  return clampf(g_.kp * err + g_.kd * deriv, -g_.maxStepDeg, g_.maxStepDeg);
}

void AxisController::reset() {
  prev_ = 0.0f;
  hasPrev_ = false;
}

Action parseAction(const char* s) {
  if (s == nullptr) return Action::None;
  if (std::strcmp(s, "GO") == 0) return Action::Go;
  if (std::strcmp(s, "SLOW") == 0) return Action::Slow;
  if (std::strcmp(s, "STOP") == 0) return Action::Stop;
  return Action::None;
}

const char* actionName(Action a) {
  switch (a) {
    case Action::Go: return "GO";
    case Action::Slow: return "SLOW";
    case Action::Stop: return "STOP";
    default: return "-";
  }
}

}  // namespace tracking
