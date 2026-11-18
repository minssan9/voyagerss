// 추적 순수 로직 — Arduino 의존성 없음 (pio test -e native 로 호스트에서 테스트).
//
// vision_cam 의 POST /frame 응답(detections + track_id)을 받아
//   1) 따라갈 타깃 하나를 고르고 (TargetSelector, track_id 잠금)
//   2) 화면 중심 대비 오차를 서보 각도 증분으로 바꾼다 (AxisController, PD)
#pragma once

#include <cstddef>

namespace tracking {

constexpr size_t kLabelLen = 24;
constexpr size_t kMaxDetections = 16;

// vision_cam Detection 과 같은 의미. bbox 는 원본 프레임 픽셀 (x, y, w, h).
struct Detection {
  char label[kLabelLen] = {0};
  int x = 0;
  int y = 0;
  int w = 0;
  int h = 0;
  float score = 0.0f;
  int trackId = -1;  // -1 = 추적 ID 없음 (face/motion 분석기 등)
};

struct Target {
  bool found = false;
  int trackId = -1;
  float errX = 0.0f;       // -1(왼쪽) ~ +1(오른쪽), 화면 중심 기준
  float errY = 0.0f;       // -1(위) ~ +1(아래)
  float areaRatio = 0.0f;  // bbox 면적 / 프레임 면적
  char label[kLabelLen] = {0};
};

struct SelectorConfig {
  const char* const* classes = nullptr;  // 비우거나 "*" 가 있으면 모든 라벨 허용
  size_t classCount = 0;
  float minScore = 0.4f;
  // 잠근 track_id 가 이 프레임 수만큼 연속으로 안 보이면 잠금 해제 후 다른 타깃 선택
  int lostFrames = 8;
};

class TargetSelector {
 public:
  explicit TargetSelector(const SelectorConfig& cfg) : cfg_(cfg) {}

  Target select(const Detection* dets, size_t count, int frameW, int frameH);
  void reset();
  int lockedId() const { return locked_; }

 private:
  bool allowed(const Detection& d) const;

  SelectorConfig cfg_;
  int locked_ = -1;
  int missed_ = 0;
};

struct AxisGains {
  float kp = 12.0f;          // 오차 1.0(화면 끝) 당 이동 각도(°)
  float kd = 0.5f;           // 오차 변화율(1/s) 당 각도(°)
  float deadband = 0.06f;    // 이 이하 오차는 0 으로 간주 (떨림 방지)
  float maxStepDeg = 8.0f;   // 한 번 갱신에 움직일 최대 각도
};

// 오차 → 서보 각도 증분(°). 프레임 왕복 지연이 크므로 P 위주, D 로 오버슈트 억제.
class AxisController {
 public:
  explicit AxisController(const AxisGains& g) : g_(g) {}

  float update(float err, float dtSec);
  void reset();

 private:
  AxisGains g_;
  float prev_ = 0.0f;
  bool hasPrev_ = false;
};

// cur 를 target 쪽으로 최대 maxStep 만큼 이동한 값
float stepToward(float cur, float target, float maxStep);
float clampf(float v, float lo, float hi);

// vision_cam --decide 의 decision.action
enum class Action { None, Go, Slow, Stop };
Action parseAction(const char* s);
const char* actionName(Action a);

}  // namespace tracking
