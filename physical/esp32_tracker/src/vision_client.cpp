#include "vision_client.h"

#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFi.h>

using tracking::Detection;
using tracking::kLabelLen;
using tracking::kMaxDetections;

void VisionClient::begin(const char* url, uint32_t timeoutMs, const char* const* analyzers,
                         size_t analyzerCount) {
  url_ = url;
  timeoutMs_ = timeoutMs;
  analyzers_ = analyzers;
  analyzerCount_ = analyzerCount;
}

bool VisionClient::useAnalyzer(const char* name) const {
  if (analyzerCount_ == 0) return true;
  for (size_t i = 0; i < analyzerCount_; ++i) {
    if (strcmp(analyzers_[i], "*") == 0 || strcmp(name, analyzers_[i]) == 0) return true;
  }
  return false;
}

bool VisionClient::analyze(const uint8_t* jpeg, size_t len, VisionReport& out) {
  out = VisionReport();
  if (WiFi.status() != WL_CONNECTED) {
    lastCode_ = 0;
    lastError_ = "wifi down";
    return false;
  }

  WiFiClient client;
  HTTPClient http;
  http.setTimeout(timeoutMs_);
  http.setConnectTimeout(timeoutMs_);
  if (!http.begin(client, url_)) {
    lastCode_ = 0;
    lastError_ = "bad url";
    return false;
  }
  http.addHeader("Content-Type", "image/jpeg");
  lastCode_ = http.POST(const_cast<uint8_t*>(jpeg), len);
  if (lastCode_ != HTTP_CODE_OK) {
    lastError_ = lastCode_ < 0 ? HTTPClient::errorToString(lastCode_) : http.getString();
    http.end();
    return false;
  }
  const String body = http.getString();
  http.end();

  // 응답 중 추적에 필요한 필드만 파싱 (kinematics, metrics 등은 버려 메모리 절약)
  JsonDocument filter;
  filter["fps"] = true;
  JsonObject rf = filter["results"].add<JsonObject>();
  rf["analyzer"] = true;
  JsonObject df = rf["detections"].add<JsonObject>();
  df["label"] = true;
  df["bbox"] = true;
  df["score"] = true;
  df["track_id"] = true;
  filter["decision"]["action"] = true;
  filter["decision"]["speed"] = true;
  filter["decision"]["steer"] = true;

  JsonDocument doc;
  const DeserializationError err = deserializeJson(doc, body.c_str(), body.length(), DeserializationOption::Filter(filter));
  if (err) {
    lastError_ = String("json: ") + String(err.c_str());
    return false;
  }

  out.fps = doc["fps"] | 0.0f;
  for (JsonObject result : doc["results"].as<JsonArray>()) {
    if (!useAnalyzer(result["analyzer"] | "")) continue;
    for (JsonObject d : result["detections"].as<JsonArray>()) {
      if (out.count >= kMaxDetections) break;
      JsonArray bbox = d["bbox"];
      if (bbox.size() != 4) continue;
      Detection& det = out.dets[out.count++];
      strlcpy(det.label, d["label"] | "", kLabelLen);
      det.x = bbox[0];
      det.y = bbox[1];
      det.w = bbox[2];
      det.h = bbox[3];
      det.score = d["score"] | 0.0f;
      det.trackId = d["track_id"] | -1;
    }
  }

  JsonObject decision = doc["decision"];
  if (!decision.isNull()) {
    out.action = tracking::parseAction(decision["action"] | "");
    out.speed = decision["speed"] | 0.0f;
    out.steer = decision["steer"] | 0.0f;
  }
  lastError_ = "";
  return true;
}
