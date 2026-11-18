#include "status_light.h"

StatusLight::StatusLight(int ledPin, int buzzerPin, uint8_t brightness)
    : pixel_(1, ledPin < 0 ? 0 : ledPin, NEO_GRB + NEO_KHZ800),
      ledPin_(ledPin),
      buzzerPin_(buzzerPin),
      brightness_(brightness) {}

void StatusLight::begin() {
  if (ledPin_ >= 0) {
    pixel_.begin();
    pixel_.setBrightness(brightness_);
    pixel_.clear();
    pixel_.show();
  }
  if (buzzerPin_ >= 0) {
    pinMode(buzzerPin_, OUTPUT);
    digitalWrite(buzzerPin_, LOW);
  }
}

void StatusLight::beep(uint16_t ms) {
  if (buzzerPin_ < 0) return;
  digitalWrite(buzzerPin_, HIGH);
  buzzerOffAt_ = millis() + ms;
}

uint32_t StatusLight::colorFor(LightState s, bool blinkOn) const {
  switch (s) {
    case LightState::WifiConnecting: return blinkOn ? Adafruit_NeoPixel::Color(0, 60, 255) : 0;
    case LightState::LinkLost: return blinkOn ? Adafruit_NeoPixel::Color(255, 0, 0) : 0;
    case LightState::Searching: return Adafruit_NeoPixel::Color(40, 40, 40);
    case LightState::Tracking: return Adafruit_NeoPixel::Color(0, 200, 200);
    case LightState::Go: return Adafruit_NeoPixel::Color(0, 220, 60);
    case LightState::Slow: return Adafruit_NeoPixel::Color(255, 140, 0);
    case LightState::Stop: return Adafruit_NeoPixel::Color(255, 0, 0);
  }
  return 0;
}

void StatusLight::loop() {
  const uint32_t now = millis();
  if (buzzerPin_ >= 0 && buzzerOffAt_ != 0 && (int32_t)(now - buzzerOffAt_) >= 0) {
    digitalWrite(buzzerPin_, LOW);
    buzzerOffAt_ = 0;
  }
  if (ledPin_ < 0) return;
  const uint32_t period = state_ == LightState::LinkLost ? 250 : 600;
  const uint32_t color = colorFor(state_, (now / period) % 2 == 0);
  if (color != lastColor_) {
    pixel_.setPixelColor(0, color);
    pixel_.show();
    lastColor_ = color;
  }
}
