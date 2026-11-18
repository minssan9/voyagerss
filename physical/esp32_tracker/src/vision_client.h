// vision_cam POST /frame 클라이언트.
// JPEG 를 image/jpeg 본문으로 보내고, 응답 FrameReport JSON 에서 필요한 필드만 꺼낸다.
#pragma once

#include <Arduino.h>

#include "tracking.h"

struct VisionReport {
  tracking::Detection dets[tracking::kMaxDetections];
  size_t count = 0;
  float fps = 0.0f;
  tracking::Action action = tracking::Action::None;  // vision_cam --decide 일 때만
  float speed = 0.0f;
  float steer = 0.0f;
};

class VisionClient {
 public:
  void begin(const char* url, uint32_t timeoutMs, const char* const* analyzers, size_t analyzerCount);
  bool analyze(const uint8_t* jpeg, size_t len, VisionReport& out);

  int lastHttpCode() const { return lastCode_; }
  const String& lastError() const { return lastError_; }

 private:
  bool useAnalyzer(const char* name) const;

  const char* url_ = nullptr;
  uint32_t timeoutMs_ = 3000;
  const char* const* analyzers_ = nullptr;
  size_t analyzerCount_ = 0;
  int lastCode_ = 0;
  String lastError_;
};
