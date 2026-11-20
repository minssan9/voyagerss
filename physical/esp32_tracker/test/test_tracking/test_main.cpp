#include <cstring>

#include <unity.h>

#include "tracking.h"

using namespace tracking;

static Detection det(const char* label, int x, int y, int w, int h, float score, int id) {
  Detection d;
  std::strncpy(d.label, label, kLabelLen - 1);
  d.x = x;
  d.y = y;
  d.w = w;
  d.h = h;
  d.score = score;
  d.trackId = id;
  return d;
}

static const char* const kPerson[] = {"person"};

void setUp() {}
void tearDown() {}

void test_picks_largest_allowed_and_locks() {
  SelectorConfig cfg;
  cfg.classes = kPerson;
  cfg.classCount = 1;
  TargetSelector sel(cfg);
  Detection d[] = {
      det("person", 0, 0, 20, 20, 0.9f, 1),
      det("car", 0, 0, 200, 200, 0.9f, 2),       // 라벨 필터
      det("person", 100, 100, 60, 60, 0.9f, 3),  // 가장 큰 person
      det("person", 0, 0, 100, 100, 0.2f, 4),    // 점수 미달
  };
  Target t = sel.select(d, 4, 320, 240);
  TEST_ASSERT_TRUE(t.found);
  TEST_ASSERT_EQUAL_INT(3, t.trackId);
  TEST_ASSERT_EQUAL_INT(3, sel.lockedId());
}

void test_error_is_normalized_from_center() {
  SelectorConfig cfg;
  TargetSelector sel(cfg);
  Detection centered = det("person", 150, 110, 20, 20, 0.9f, 1);
  Target t = sel.select(&centered, 1, 320, 240);
  TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, t.errX);
  TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, t.errY);

  sel.reset();
  Detection right = det("person", 300, 0, 20, 20, 0.9f, 1);  // 중심 x=310, y=10
  t = sel.select(&right, 1, 320, 240);
  TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.9375f, t.errX);
  TEST_ASSERT_FLOAT_WITHIN(0.001f, -0.9167f, t.errY);
}

void test_keeps_lock_while_bigger_object_appears() {
  SelectorConfig cfg;
  TargetSelector sel(cfg);
  Detection first = det("person", 0, 0, 30, 30, 0.9f, 7);
  sel.select(&first, 1, 320, 240);
  Detection both[] = {det("person", 0, 0, 30, 30, 0.9f, 7), det("person", 0, 0, 200, 200, 0.9f, 8)};
  Target t = sel.select(both, 2, 320, 240);
  TEST_ASSERT_EQUAL_INT(7, t.trackId);
}

void test_releases_lock_after_lost_frames() {
  SelectorConfig cfg;
  cfg.lostFrames = 3;
  TargetSelector sel(cfg);
  Detection a = det("person", 0, 0, 30, 30, 0.9f, 7);
  sel.select(&a, 1, 320, 240);
  Detection b = det("person", 0, 0, 30, 30, 0.9f, 9);
  TEST_ASSERT_FALSE(sel.select(&b, 1, 320, 240).found);  // missed 1
  TEST_ASSERT_FALSE(sel.select(&b, 1, 320, 240).found);  // missed 2
  Target t = sel.select(&b, 1, 320, 240);                // missed 3 → 해제 후 9 선택
  TEST_ASSERT_TRUE(t.found);
  TEST_ASSERT_EQUAL_INT(9, t.trackId);
}

void test_axis_controller_deadband_and_clamp() {
  AxisGains g;
  g.kp = 20.0f;
  g.kd = 0.0f;
  g.deadband = 0.1f;
  g.maxStepDeg = 5.0f;
  AxisController c(g);
  TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, c.update(0.05f, 0.1f));
  TEST_ASSERT_FLOAT_WITHIN(0.001f, 4.0f, c.update(0.2f, 0.1f));
  TEST_ASSERT_FLOAT_WITHIN(0.001f, -5.0f, c.update(-0.9f, 0.1f));
}

void test_step_toward_and_action() {
  TEST_ASSERT_FLOAT_WITHIN(0.001f, 93.0f, stepToward(90.0f, 120.0f, 3.0f));
  TEST_ASSERT_FLOAT_WITHIN(0.001f, 120.0f, stepToward(119.0f, 120.0f, 3.0f));
  TEST_ASSERT_TRUE(parseAction("STOP") == Action::Stop);
  TEST_ASSERT_TRUE(parseAction("bogus") == Action::None);
  TEST_ASSERT_TRUE(parseAction(nullptr) == Action::None);
}

int main(int, char**) {
  UNITY_BEGIN();
  RUN_TEST(test_picks_largest_allowed_and_locks);
  RUN_TEST(test_error_is_normalized_from_center);
  RUN_TEST(test_keeps_lock_while_bigger_object_appears);
  RUN_TEST(test_releases_lock_after_lost_frames);
  RUN_TEST(test_axis_controller_deadband_and_clamp);
  RUN_TEST(test_step_toward_and_action);
  return UNITY_END();
}
