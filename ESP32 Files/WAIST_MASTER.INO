/*
 * CVACare - WAIST ESP32 (MASTER)
 *
 * ROLE: WiFi Master + ESP-NOW Receiver + Cloud uploader
 * - Reads WAIST sensors (2x MPU6050)
 * - Receives left foot data via ESP-NOW
 * - Receives right foot data via ESP-NOW
 * - Buffers synchronized gait samples locally
 * - Uploads batched payloads to backend over WiFi
 */

#include <esp_now.h>
#include <Wire.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

// WiFi Configuration
const char* ssid = "hey";
const char* password = "higwynhi";

// Backend Configuration
const char* serverUrl = "https://cvaped-backend-qrjmay7wva-uc.a.run.app/api/wearable/data";
const char* wearableToken = "pM4ZKYHgv7gKEEFm6HnZXZPfz5RHlmomrEFTJzeEEto";
const char* patientUserId = "";
const bool allowInsecureTls = true;

// Sampling and upload settings
const uint16_t SAMPLE_INTERVAL_MS = 200;
const uint16_t LIVE_UPLOAD_INTERVAL_MS = 1000;
const uint8_t BATCH_SAMPLES = 60;
const uint16_t FOOT_DATA_STALE_MS = 600;
const uint16_t HTTP_TIMEOUT_MS = 15000;
const uint32_t UPLOAD_RETRY_MS = 5000;
const size_t JSON_DOC_CAPACITY = 98304;

// MPU6050 I2C Addresses
#define MPU_LEFT   0x68
#define MPU_RIGHT  0x69

struct struct_foot_message {
  float knee_ax, knee_ay, knee_az;
  float knee_gx, knee_gy, knee_gz;
  float ankle_ax, ankle_ay, ankle_az;
  float ankle_gx, ankle_gy, ankle_gz;
  float fsr[3];
  char device_id[20];
};

struct ImuSample {
  uint32_t timestamp;
  float ax, ay, az;
  float gx, gy, gz;
};

struct_foot_message leftFootData;
struct_foot_message rightFootData;
bool leftFootDataReceived = false;
bool rightFootDataReceived = false;
unsigned long lastLeftFootReceivedAt = 0;
unsigned long lastRightFootReceivedAt = 0;

ImuSample leftWaistSamples[BATCH_SAMPLES];
ImuSample rightWaistSamples[BATCH_SAMPLES];
ImuSample leftKneeSamples[BATCH_SAMPLES];
ImuSample rightKneeSamples[BATCH_SAMPLES];
ImuSample leftAnkleSamples[BATCH_SAMPLES];
ImuSample rightAnkleSamples[BATCH_SAMPLES];

float leftHeelFsrSamples[BATCH_SAMPLES];
float leftMidFsrSamples[BATCH_SAMPLES];
float leftToeFsrSamples[BATCH_SAMPLES];
float rightHeelFsrSamples[BATCH_SAMPLES];
float rightMidFsrSamples[BATCH_SAMPLES];
float rightToeFsrSamples[BATCH_SAMPLES];

uint8_t sampleCount = 0;
bool batchReady = false;
unsigned long lastSampleAt = 0;
unsigned long lastUploadAttemptAt = 0;
unsigned long lastLiveUploadAt = 0;
unsigned long lastWaitLogAt = 0;
unsigned long batchStartedAt = 0;
unsigned long batchSequence = 1;

WiFiClientSecure secureClient;

void OnDataRecv(const esp_now_recv_info *info, const uint8_t *incomingData, int len) {
  if (len != sizeof(struct_foot_message)) {
    Serial.printf("Unexpected ESP-NOW packet size: %d\n", len);
    return;
  }

  struct_foot_message receivedData;
  memcpy(&receivedData, incomingData, sizeof(receivedData));

  if (strcmp(receivedData.device_id, "LEFT_FOOT") == 0) {
    memcpy(&leftFootData, &receivedData, sizeof(receivedData));
    if (!leftFootDataReceived) {
      Serial.println("LEFT foot data stream detected");
    }
    leftFootDataReceived = true;
    lastLeftFootReceivedAt = millis();
  } else if (strcmp(receivedData.device_id, "RIGHT_FOOT") == 0) {
    memcpy(&rightFootData, &receivedData, sizeof(receivedData));
    if (!rightFootDataReceived) {
      Serial.println("RIGHT foot data stream detected");
    }
    rightFootDataReceived = true;
    lastRightFootReceivedAt = millis();
  }
}

int16_t read16(uint8_t addr, uint8_t reg) {
  Wire.beginTransmission(addr);
  Wire.write(reg);
  if (Wire.endTransmission(false) != 0) return 0;
  Wire.requestFrom(addr, (uint8_t)2);
  if (Wire.available() < 2) return 0;
  return (Wire.read() << 8) | Wire.read();
}

void wakeMPU(uint8_t addr) {
  Wire.beginTransmission(addr);
  Wire.write(0x6B);
  Wire.write(0x00);
  Wire.endTransmission();
  delay(100);
}

bool testMPU(uint8_t addr) {
  Wire.beginTransmission(addr);
  return (Wire.endTransmission() == 0);
}

bool connectToWiFi() {
  Serial.printf("Connecting to WiFi SSID: %s\n", ssid);
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\nWiFi connection failed");
    return false;
  }

  Serial.println("\nWiFi connected");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
  Serial.print("Backend URL: ");
  Serial.println(serverUrl);
  Serial.printf("WiFi Channel: %d\n", WiFi.channel());
  return true;
}

bool ensureWiFiConnected() {
  if (WiFi.status() == WL_CONNECTED) {
    return true;
  }

  Serial.println("WiFi disconnected, reconnecting...");
  WiFi.disconnect();
  delay(250);
  return connectToWiFi();
}

bool isFootDataFresh(unsigned long lastReceivedAt) {
  return lastReceivedAt > 0 && (millis() - lastReceivedAt) <= FOOT_DATA_STALE_MS;
}

void storeImuSample(ImuSample& sample, uint32_t timestamp, float ax, float ay, float az, float gx, float gy, float gz) {
  sample.timestamp = timestamp;
  sample.ax = ax;
  sample.ay = ay;
  sample.az = az;
  sample.gx = gx;
  sample.gy = gy;
  sample.gz = gz;
}

bool captureSample() {
  if (sampleCount >= BATCH_SAMPLES) {
    batchReady = true;
    return false;
  }

  if (!leftFootDataReceived || !rightFootDataReceived || !isFootDataFresh(lastLeftFootReceivedAt) || !isFootDataFresh(lastRightFootReceivedAt)) {
    unsigned long now = millis();
    if (now - lastWaitLogAt >= 2000) {
      Serial.printf(
        "Waiting for synchronized foot data (left=%s right=%s)\n",
        isFootDataFresh(lastLeftFootReceivedAt) ? "fresh" : "stale",
        isFootDataFresh(lastRightFootReceivedAt) ? "fresh" : "stale"
      );
      lastWaitLogAt = now;
    }
    return false;
  }

  struct_foot_message leftSnapshot;
  struct_foot_message rightSnapshot;
  noInterrupts();
  memcpy(&leftSnapshot, &leftFootData, sizeof(leftSnapshot));
  memcpy(&rightSnapshot, &rightFootData, sizeof(rightSnapshot));
  interrupts();

  uint32_t timestamp = millis();
  if (sampleCount == 0) {
    batchStartedAt = timestamp;
  }

  float leftWaistAx = read16(MPU_LEFT, 0x3B) / 16384.0;
  float leftWaistAy = read16(MPU_LEFT, 0x3D) / 16384.0;
  float leftWaistAz = read16(MPU_LEFT, 0x3F) / 16384.0;
  float leftWaistGx = read16(MPU_LEFT, 0x43) / 131.0;
  float leftWaistGy = read16(MPU_LEFT, 0x45) / 131.0;
  float leftWaistGz = read16(MPU_LEFT, 0x47) / 131.0;

  float rightWaistAx = read16(MPU_RIGHT, 0x3B) / 16384.0;
  float rightWaistAy = read16(MPU_RIGHT, 0x3D) / 16384.0;
  float rightWaistAz = read16(MPU_RIGHT, 0x3F) / 16384.0;
  float rightWaistGx = read16(MPU_RIGHT, 0x43) / 131.0;
  float rightWaistGy = read16(MPU_RIGHT, 0x45) / 131.0;
  float rightWaistGz = read16(MPU_RIGHT, 0x47) / 131.0;

  storeImuSample(leftWaistSamples[sampleCount], timestamp, leftWaistAx, leftWaistAy, leftWaistAz, leftWaistGx, leftWaistGy, leftWaistGz);
  storeImuSample(rightWaistSamples[sampleCount], timestamp, rightWaistAx, rightWaistAy, rightWaistAz, rightWaistGx, rightWaistGy, rightWaistGz);
  storeImuSample(leftKneeSamples[sampleCount], timestamp, leftSnapshot.knee_ax, leftSnapshot.knee_ay, leftSnapshot.knee_az, leftSnapshot.knee_gx, leftSnapshot.knee_gy, leftSnapshot.knee_gz);
  storeImuSample(rightKneeSamples[sampleCount], timestamp, rightSnapshot.knee_ax, rightSnapshot.knee_ay, rightSnapshot.knee_az, rightSnapshot.knee_gx, rightSnapshot.knee_gy, rightSnapshot.knee_gz);
  storeImuSample(leftAnkleSamples[sampleCount], timestamp, leftSnapshot.ankle_ax, leftSnapshot.ankle_ay, leftSnapshot.ankle_az, leftSnapshot.ankle_gx, leftSnapshot.ankle_gy, leftSnapshot.ankle_gz);
  storeImuSample(rightAnkleSamples[sampleCount], timestamp, rightSnapshot.ankle_ax, rightSnapshot.ankle_ay, rightSnapshot.ankle_az, rightSnapshot.ankle_gx, rightSnapshot.ankle_gy, rightSnapshot.ankle_gz);

  leftToeFsrSamples[sampleCount] = leftSnapshot.fsr[0];
  leftMidFsrSamples[sampleCount] = leftSnapshot.fsr[1];
  leftHeelFsrSamples[sampleCount] = leftSnapshot.fsr[2];
  rightToeFsrSamples[sampleCount] = rightSnapshot.fsr[0];
  rightMidFsrSamples[sampleCount] = rightSnapshot.fsr[1];
  rightHeelFsrSamples[sampleCount] = rightSnapshot.fsr[2];

  sampleCount++;

  if (sampleCount >= BATCH_SAMPLES) {
    batchReady = true;
    lastUploadAttemptAt = 0;
    Serial.printf("Captured %d synchronized samples (%.2fs). Preparing upload...\n", sampleCount, (millis() - batchStartedAt) / 1000.0);
  }

  return true;
}

void addImuSamples(JsonArray sensorArray, ImuSample samples[], uint8_t count) {
  for (uint8_t i = 0; i < count; i++) {
    JsonObject sample = sensorArray.createNestedObject();
    sample["timestamp"] = samples[i].timestamp;
    sample["ax"] = samples[i].ax;
    sample["ay"] = samples[i].ay;
    sample["az"] = samples[i].az;
    sample["gx"] = samples[i].gx;
    sample["gy"] = samples[i].gy;
    sample["gz"] = samples[i].gz;
  }
}

void copyImuSampleToJson(JsonObject sampleJson, const ImuSample& sample) {
  sampleJson["timestamp"] = sample.timestamp;
  sampleJson["ax"] = sample.ax;
  sampleJson["ay"] = sample.ay;
  sampleJson["az"] = sample.az;
  sampleJson["gx"] = sample.gx;
  sampleJson["gy"] = sample.gy;
  sampleJson["gz"] = sample.gz;
}

void addFloatSamples(JsonArray valuesArray, float values[], uint8_t count) {
  for (uint8_t i = 0; i < count; i++) {
    valuesArray.add(values[i]);
  }
}

bool buildLivePayload(String& payload) {
  if (sampleCount == 0) {
    return false;
  }

  const uint8_t latestIndex = sampleCount - 1;
  DynamicJsonDocument doc(4096);

  doc["device_id"] = "WAIST_MASTER";
  doc["timestamp"] = leftWaistSamples[latestIndex].timestamp;
  doc["payload_type"] = "live";

  if (strlen(patientUserId) > 0) {
    doc["user_id"] = patientUserId;
  }

  copyImuSampleToJson(doc.createNestedObject("LEFT_WAIST"), leftWaistSamples[latestIndex]);
  copyImuSampleToJson(doc.createNestedObject("RIGHT_WAIST"), rightWaistSamples[latestIndex]);
  copyImuSampleToJson(doc.createNestedObject("LEFT_KNEE"), leftKneeSamples[latestIndex]);
  copyImuSampleToJson(doc.createNestedObject("RIGHT_KNEE"), rightKneeSamples[latestIndex]);
  copyImuSampleToJson(doc.createNestedObject("LEFT_ANKLE"), leftAnkleSamples[latestIndex]);
  copyImuSampleToJson(doc.createNestedObject("RIGHT_ANKLE"), rightAnkleSamples[latestIndex]);

  JsonArray leftFsr = doc.createNestedArray("LEFT_FOOT_FSR");
  leftFsr.add(leftToeFsrSamples[latestIndex]);
  leftFsr.add(leftMidFsrSamples[latestIndex]);
  leftFsr.add(leftHeelFsrSamples[latestIndex]);

  JsonArray rightFsr = doc.createNestedArray("RIGHT_FOOT_FSR");
  rightFsr.add(rightToeFsrSamples[latestIndex]);
  rightFsr.add(rightMidFsrSamples[latestIndex]);
  rightFsr.add(rightHeelFsrSamples[latestIndex]);

  payload = "";
  payload.reserve(2048);
  if (serializeJson(doc, payload) == 0) {
    Serial.println("Failed to serialize live payload");
    return false;
  }

  return true;
}

bool buildBatchPayload(String& payload) {
  DynamicJsonDocument doc(JSON_DOC_CAPACITY);

  doc["device_id"] = "WAIST_MASTER";
  doc["timestamp"] = millis();
  doc["batch_id"] = batchSequence;
  doc["sample_count"] = sampleCount;
  doc["sample_interval_ms"] = SAMPLE_INTERVAL_MS;
  doc["batch_duration_ms"] = sampleCount > 1 ? (leftWaistSamples[sampleCount - 1].timestamp - leftWaistSamples[0].timestamp) : 0;
  doc["synchronized"] = true;

  if (strlen(patientUserId) > 0) {
    doc["user_id"] = patientUserId;
  }

  JsonObject sensors = doc.createNestedObject("sensors");
  addImuSamples(sensors.createNestedArray("LEFT_WAIST"), leftWaistSamples, sampleCount);
  addImuSamples(sensors.createNestedArray("RIGHT_WAIST"), rightWaistSamples, sampleCount);
  addImuSamples(sensors.createNestedArray("LEFT_KNEE"), leftKneeSamples, sampleCount);
  addImuSamples(sensors.createNestedArray("RIGHT_KNEE"), rightKneeSamples, sampleCount);
  addImuSamples(sensors.createNestedArray("LEFT_ANKLE"), leftAnkleSamples, sampleCount);
  addImuSamples(sensors.createNestedArray("RIGHT_ANKLE"), rightAnkleSamples, sampleCount);

  JsonObject fsr = doc.createNestedObject("fsr");
  addFloatSamples(fsr.createNestedArray("LEFT_HEEL"), leftHeelFsrSamples, sampleCount);
  addFloatSamples(fsr.createNestedArray("LEFT_MID"), leftMidFsrSamples, sampleCount);
  addFloatSamples(fsr.createNestedArray("LEFT_TOE"), leftToeFsrSamples, sampleCount);
  addFloatSamples(fsr.createNestedArray("RIGHT_HEEL"), rightHeelFsrSamples, sampleCount);
  addFloatSamples(fsr.createNestedArray("RIGHT_MID"), rightMidFsrSamples, sampleCount);
  addFloatSamples(fsr.createNestedArray("RIGHT_TOE"), rightToeFsrSamples, sampleCount);

  payload = "";
  payload.reserve(45000);
  if (serializeJson(doc, payload) == 0) {
    Serial.println("Failed to serialize gait payload");
    return false;
  }

  return true;
}

bool beginHttpClient(HTTPClient& http) {
  String url = String(serverUrl);
  if (url.startsWith("https://")) {
    if (allowInsecureTls) {
      secureClient.setInsecure();
    }
    secureClient.setTimeout(HTTP_TIMEOUT_MS / 1000);
    return http.begin(secureClient, serverUrl);
  }

  return http.begin(serverUrl);
}

void clearBatch() {
  sampleCount = 0;
  batchReady = false;
  batchStartedAt = 0;
  lastUploadAttemptAt = 0;
}

bool uploadBatch() {
  if (!batchReady || sampleCount == 0) {
    return false;
  }

  String payload;
  if (!buildBatchPayload(payload)) {
    return false;
  }

  HTTPClient http;
  if (!beginHttpClient(http)) {
    Serial.println("Failed to initialize HTTP client");
    return false;
  }

  http.setTimeout(HTTP_TIMEOUT_MS);
  http.addHeader("Content-Type", "application/json");
  if (strlen(wearableToken) > 0) {
    http.addHeader("X-Wearable-Token", wearableToken);
  }

  int httpCode = http.POST((uint8_t*)payload.c_str(), payload.length());
  String responseBody = http.getString();
  http.end();

  if (httpCode >= 200 && httpCode < 300) {
    Serial.printf("Uploaded gait batch %lu successfully (HTTP %d)\n", batchSequence, httpCode);
    Serial.printf("Samples: %d, duration: %.2fs\n", sampleCount, (leftWaistSamples[sampleCount - 1].timestamp - leftWaistSamples[0].timestamp) / 1000.0);
    clearBatch();
    batchSequence++;
    return true;
  }

  Serial.printf("Batch upload failed (HTTP %d)\n", httpCode);
  if (responseBody.length() > 0) {
    Serial.println(responseBody);
  }
  return false;
}

bool uploadLiveSnapshot() {
  String payload;
  if (!buildLivePayload(payload)) {
    return false;
  }

  HTTPClient http;
  if (!beginHttpClient(http)) {
    Serial.println("Failed to initialize HTTP client for live upload");
    return false;
  }

  http.setTimeout(HTTP_TIMEOUT_MS);
  http.addHeader("Content-Type", "application/json");
  if (strlen(wearableToken) > 0) {
    http.addHeader("X-Wearable-Token", wearableToken);
  }

  int httpCode = http.POST((uint8_t*)payload.c_str(), payload.length());
  String responseBody = http.getString();
  http.end();

  if (httpCode >= 200 && httpCode < 300) {
    Serial.printf("Live snapshot uploaded (HTTP %d)\n", httpCode);
    return true;
  }

  Serial.printf("Live snapshot upload failed (HTTP %d)\n", httpCode);
  if (responseBody.length() > 0) {
    Serial.println(responseBody);
  }
  return false;
}

void setup() {
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);
  Serial.begin(115200);
  delay(2000);

  Serial.println("\nCVACare WAIST MASTER");

  Wire.begin(21, 22);
  Wire.setClock(100000);
  delay(100);

  Serial.println("Detecting waist sensors...");
  if (testMPU(MPU_LEFT)) {
    Serial.println("LEFT_WAIST OK");
    wakeMPU(MPU_LEFT);
  } else {
    Serial.println("LEFT_WAIST NOT FOUND");
  }

  if (testMPU(MPU_RIGHT)) {
    Serial.println("RIGHT_WAIST OK");
    wakeMPU(MPU_RIGHT);
  } else {
    Serial.println("RIGHT_WAIST NOT FOUND");
  }

  connectToWiFi();

  Serial.println("Initializing ESP-NOW...");
  if (esp_now_init() != ESP_OK) {
    Serial.println("ESP-NOW init failed");
    return;
  }

  esp_now_register_recv_cb(OnDataRecv);
  Serial.println("ESP-NOW ready");
  Serial.print("WAIST MAC Address: ");
  Serial.println(WiFi.macAddress());
  Serial.println("Waiting for foot sensor streams...");
}

void loop() {
  if (!ensureWiFiConnected()) {
    delay(1000);
    return;
  }

  unsigned long now = millis();

  if (!batchReady && (now - lastSampleAt) >= SAMPLE_INTERVAL_MS) {
    lastSampleAt = now;
    captureSample();
  }

  if (sampleCount > 0 && (now - lastLiveUploadAt) >= LIVE_UPLOAD_INTERVAL_MS) {
    lastLiveUploadAt = now;
    uploadLiveSnapshot();
  }

  if (batchReady && (lastUploadAttemptAt == 0 || (now - lastUploadAttemptAt) >= UPLOAD_RETRY_MS)) {
    lastUploadAttemptAt = now;
    uploadBatch();
  }

  delay(10);
}
