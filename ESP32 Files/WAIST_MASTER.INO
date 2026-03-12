/*
 * ═══════════════════════════════════════════════════════════════════════
 * CVACare - WAIST ESP32 (MASTER)
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * ROLE: WiFi Master + ESP-NOW Receiver
 * - Reads WAIST sensors (2x MPU6050)
 * - RECEIVES left foot data via ESP-NOW
 * - RECEIVES right foot data via ESP-NOW
 * - Combines all data and sends to backend via WiFi
 * 
 * HARDWARE:
 * - MPU6050 (LEFT_WAIST)  → I2C Address: 0x68
 * - MPU6050 (RIGHT_WAIST) → I2C Address: 0x69
 */

#include <esp_now.h>
#include <Wire.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

// ═══════════════════════════════════════════════════════════════════════
// WiFi Configuration
// ═══════════════════════════════════════════════════════════════════════
/* const char* ssid = "HONOR X9C";
const char* password = "buboycute"; */

const char* ssid = "hey";
const char* password = "heygwynhi";
// ═══════════════════════════════════════════════════════════════════════
// Backend Server URL - Using mDNS
// ═══════════════════════════════════════════════════════════════════════
const char* serverUrl = "http://cvacare.local:5000/api/wearable/data";

// ═══════════════════════════════════════════════════════════════════════
// ESP-NOW Data Structures
// ═══════════════════════════════════════════════════════════════════════
typedef struct struct_foot_message {
  float knee_ax, knee_ay, knee_az;
  float knee_gx, knee_gy, knee_gz;
  float ankle_ax, ankle_ay, ankle_az;
  float ankle_gx, ankle_gy, ankle_gz;
  float fsr[3];  // [toe, mid, heel]
  char device_id[20];  // "LEFT_FOOT" or "RIGHT_FOOT"
} struct_foot_message;

struct_foot_message leftFootData;
struct_foot_message rightFootData;
bool leftFootDataReceived = false;
bool rightFootDataReceived = false;

// ═══════════════════════════════════════════════════════════════════════
// MPU6050 I2C Addresses
// ═══════════════════════════════════════════════════════════════════════
#define MPU_LEFT   0x68   // AD0 pin LOW or floating
#define MPU_RIGHT  0x69   // AD0 pin connected to 3.3V

// ═══════════════════════════════════════════════════════════════════════
// ESP-NOW Callback - Receives foot data
// ═══════════════════════════════════════════════════════════════════════
void OnDataRecv(const esp_now_recv_info *info, const uint8_t *incomingData, int len) {
  struct_foot_message receivedData;
  memcpy(&receivedData, incomingData, sizeof(receivedData));
  
  if (strcmp(receivedData.device_id, "LEFT_FOOT") == 0) {
    memcpy(&leftFootData, &receivedData, sizeof(receivedData));
    leftFootDataReceived = true;
    Serial.println("✅ LEFT foot data received");
  } else if (strcmp(receivedData.device_id, "RIGHT_FOOT") == 0) {
    memcpy(&rightFootData, &receivedData, sizeof(receivedData));
    rightFootDataReceived = true;
    Serial.println("✅ RIGHT foot data received");
  }
}

// ═══════════════════════════════════════════════════════════════════════
// MPU6050 Helper Functions
// ═══════════════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════════════
// SETUP
// ═══════════════════════════════════════════════════════════════════════
void setup() {
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);
  Serial.begin(115200);
  delay(2000);

  Serial.println("\n╔════════════════════════════════════════╗");
  Serial.println("║     WAIST ESP32 (MASTER)              ║");
  Serial.println("╚════════════════════════════════════════╝");

  // ─────────────────────────────────────────────────────────────────────
  // Initialize I2C Sensors
  // ─────────────────────────────────────────────────────────────────────
  Wire.begin(21, 22);
  Wire.setClock(100000);
  delay(100);

  Serial.println("\n🔍 Detecting Sensors...");
  
  if (testMPU(MPU_LEFT)) {
    Serial.println("  ✅ LEFT_WAIST (MPU6050)");
    wakeMPU(MPU_LEFT);
  } else {
    Serial.println("  ❌ LEFT_WAIST NOT FOUND!");
  }

  if (testMPU(MPU_RIGHT)) {
    Serial.println("  ✅ RIGHT_WAIST (MPU6050)");
    wakeMPU(MPU_RIGHT);
  } else {
    Serial.println("  ❌ RIGHT_WAIST NOT FOUND!");
  }

  // ─────────────────────────────────────────────────────────────────────
  // Connect to WiFi
  // ─────────────────────────────────────────────────────────────────────
  Serial.println("\n📡 Connecting to WiFi...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi Connected!");
    Serial.print("   IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("   Gateway: ");
    Serial.println(WiFi.gatewayIP());
    Serial.println("   Backend: http://cvacare.local:5000");
  } else {
    Serial.println("\n❌ WiFi Connection FAILED!");
  }

  // ─────────────────────────────────────────────────────────────────────
  // Initialize ESP-NOW
  // ─────────────────────────────────────────────────────────────────────
  Serial.println("\n🔗 Initializing ESP-NOW...");
  
  if (esp_now_init() != ESP_OK) {
    Serial.println("❌ ESP-NOW Init Failed!");
    return;
  }
  
  Serial.println("✅ ESP-NOW Ready");
  esp_now_register_recv_cb(OnDataRecv);

  // ─────────────────────────────────────────────────────────────────────
  // Display MAC Address
  // ─────────────────────────────────────────────────────────────────────
  Serial.println("\n📍 MY MAC ADDRESS (Copy to BOTH foot ESP32s):");
  Serial.print("   ");
  Serial.println(WiFi.macAddress());

  Serial.println("\n════════════════════════════════════════");
  Serial.println("  SYSTEM READY - WAITING FOR DATA");
  Serial.println("════════════════════════════════════════\n");
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN LOOP
// ═══════════════════════════════════════════════════════════════════════
void loop() {
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️  WiFi disconnected, reconnecting...");
    WiFi.reconnect();
    delay(3000);
    return;
  }

  // Wait for foot data (timeout after 2 seconds)
  unsigned long startWait = millis();
  while ((!leftFootDataReceived || !rightFootDataReceived) && (millis() - startWait) < 2000) {
    delay(10);
  }

  // ─────────────────────────────────────────────────────────────────────
  // Read WAIST Sensors
  // ─────────────────────────────────────────────────────────────────────
  float left_waist_ax = read16(MPU_LEFT, 0x3B) / 16384.0;
  float left_waist_ay = read16(MPU_LEFT, 0x3D) / 16384.0;
  float left_waist_az = read16(MPU_LEFT, 0x3F) / 16384.0;
  float left_waist_gx = read16(MPU_LEFT, 0x43) / 131.0;
  float left_waist_gy = read16(MPU_LEFT, 0x45) / 131.0;
  float left_waist_gz = read16(MPU_LEFT, 0x47) / 131.0;

  float right_waist_ax = read16(MPU_RIGHT, 0x3B) / 16384.0;
  float right_waist_ay = read16(MPU_RIGHT, 0x3D) / 16384.0;
  float right_waist_az = read16(MPU_RIGHT, 0x3F) / 16384.0;
  float right_waist_gx = read16(MPU_RIGHT, 0x43) / 131.0;
  float right_waist_gy = read16(MPU_RIGHT, 0x45) / 131.0;
  float right_waist_gz = read16(MPU_RIGHT, 0x47) / 131.0;

  // ─────────────────────────────────────────────────────────────────────
  // Build JSON Payload
  // ─────────────────────────────────────────────────────────────────────
  StaticJsonDocument<2048> doc;
  
  doc["device_id"] = "WAIST_MASTER";
  doc["timestamp"] = millis();
  doc["synchronized"] = leftFootDataReceived && rightFootDataReceived;

  // WAIST DATA
  JsonObject leftWaist = doc.createNestedObject("LEFT_WAIST");
  leftWaist["ax"] = left_waist_ax;
  leftWaist["ay"] = left_waist_ay;
  leftWaist["az"] = left_waist_az;
  leftWaist["gx"] = left_waist_gx;
  leftWaist["gy"] = left_waist_gy;
  leftWaist["gz"] = left_waist_gz;

  JsonObject rightWaist = doc.createNestedObject("RIGHT_WAIST");
  rightWaist["ax"] = right_waist_ax;
  rightWaist["ay"] = right_waist_ay;
  rightWaist["az"] = right_waist_az;
  rightWaist["gx"] = right_waist_gx;
  rightWaist["gy"] = right_waist_gy;
  rightWaist["gz"] = right_waist_gz;

  // LEFT FOOT DATA (if received)
  if (leftFootDataReceived) {
    JsonObject leftKnee = doc.createNestedObject("LEFT_KNEE");
    leftKnee["ax"] = leftFootData.knee_ax;
    leftKnee["ay"] = leftFootData.knee_ay;
    leftKnee["az"] = leftFootData.knee_az;
    leftKnee["gx"] = leftFootData.knee_gx;
    leftKnee["gy"] = leftFootData.knee_gy;
    leftKnee["gz"] = leftFootData.knee_gz;

    JsonObject leftAnkle = doc.createNestedObject("LEFT_ANKLE");
    leftAnkle["ax"] = leftFootData.ankle_ax;
    leftAnkle["ay"] = leftFootData.ankle_ay;
    leftAnkle["az"] = leftFootData.ankle_az;
    leftAnkle["gx"] = leftFootData.ankle_gx;
    leftAnkle["gy"] = leftFootData.ankle_gy;
    leftAnkle["gz"] = leftFootData.ankle_gz;

    JsonArray leftFsr = doc.createNestedArray("LEFT_FOOT_FSR");
    leftFsr.add(leftFootData.fsr[0]);  // toe
    leftFsr.add(leftFootData.fsr[1]);  // mid
    leftFsr.add(leftFootData.fsr[2]);  // heel
  }

  // RIGHT FOOT DATA (if received)
  if (rightFootDataReceived) {
    JsonObject rightKnee = doc.createNestedObject("RIGHT_KNEE");
    rightKnee["ax"] = rightFootData.knee_ax;
    rightKnee["ay"] = rightFootData.knee_ay;
    rightKnee["az"] = rightFootData.knee_az;
    rightKnee["gx"] = rightFootData.knee_gx;
    rightKnee["gy"] = rightFootData.knee_gy;
    rightKnee["gz"] = rightFootData.knee_gz;

    JsonObject rightAnkle = doc.createNestedObject("RIGHT_ANKLE");
    rightAnkle["ax"] = rightFootData.ankle_ax;
    rightAnkle["ay"] = rightFootData.ankle_ay;
    rightAnkle["az"] = rightFootData.ankle_az;
    rightAnkle["gx"] = rightFootData.ankle_gx;
    rightAnkle["gy"] = rightFootData.ankle_gy;
    rightAnkle["gz"] = rightFootData.ankle_gz;

    JsonArray rightFsr = doc.createNestedArray("RIGHT_FOOT_FSR");
    rightFsr.add(rightFootData.fsr[0]);  // toe
    rightFsr.add(rightFootData.fsr[1]);  // mid
    rightFsr.add(rightFootData.fsr[2]);  // heel
  }

  // ─────────────────────────────────────────────────────────────────────
  // Send to Backend
  // ─────────────────────────────────────────────────────────────────────
  String payload;
  serializeJson(doc, payload);

  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  int httpCode = http.POST(payload);

  // ─────────────────────────────────────────────────────────────────────
  // Display Results
  // ─────────────────────────────────────────────────────────────────────
  Serial.println("════════════════════════════════════════");
  Serial.printf("📊 Data Sent (Sync: L=%s R=%s)\n", 
                leftFootDataReceived ? "✓" : "✗",
                rightFootDataReceived ? "✓" : "✗");
  Serial.printf("   WAIST: L(%.2f,%.2f,%.2f) R(%.2f,%.2f,%.2f)\n", 
                left_waist_ax, left_waist_ay, left_waist_az,
                right_waist_ax, right_waist_ay, right_waist_az);
  
  if (leftFootDataReceived) {
    Serial.printf("   LEFT:  Knee(%.2f,%.2f,%.2f) FSR(%.2f,%.2f,%.2f)\n",
                  leftFootData.knee_ax, leftFootData.knee_ay, leftFootData.knee_az,
                  leftFootData.fsr[0], leftFootData.fsr[1], leftFootData.fsr[2]);
  }
  
  if (rightFootDataReceived) {
    Serial.printf("   RIGHT: Knee(%.2f,%.2f,%.2f) FSR(%.2f,%.2f,%.2f)\n",
                  rightFootData.knee_ax, rightFootData.knee_ay, rightFootData.knee_az,
                  rightFootData.fsr[0], rightFootData.fsr[1], rightFootData.fsr[2]);
  }
  
  Serial.printf("📤 HTTP Response: %d %s\n", httpCode, 
                httpCode == 200 ? "✅ OK" : "❌ ERROR");
  Serial.println("════════════════════════════════════════\n");

  http.end();

  // Reset flags for next cycle
  leftFootDataReceived = false;
  rightFootDataReceived = false;
  
  delay(1000);  // Send every 1 second
}
