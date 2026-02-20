/*
 * ═══════════════════════════════════════════════════════════════════════
 * CVACare - RIGHT FOOT ESP32 (MASTER)
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * ROLE: WiFi Master + ESP-NOW Receiver
 * - Reads RIGHT KNEE & RIGHT ANKLE sensors (MPU6050)
 * - Reads RIGHT FOOT pressure sensors (FSR via ADS1115)
 * - RECEIVES left foot data via ESP-NOW
 * - Combines all data and sends to backend via WiFi
 * 
 * HARDWARE:
 * - MPU6050 (RIGHT KNEE) → I2C Address: 0x68
 * - MPU6050 (RIGHT ANKLE) → I2C Address: 0x69
 * - ADS1115 (FSR Sensors) → I2C Address: 0x48
 *   - A0: Heel FSR
 *   - A1: Mid FSR
 *   - A2: Toe FSR
 */

#include <esp_now.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_ADS1X15.h>
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

// ═══════════════════════════════════════════════════════════════════════
// WiFi Configuration - CHANGE THESE TO YOUR WIFI!
// ═══════════════════════════════════════════════════════════════════════
const char* ssid = "HONOR X9C";          // YOUR WIFI NAME
const char* password = "buboycute";      // YOUR WIFI PASSWORD

// ═══════════════════════════════════════════════════════════════════════
// Backend Server URL - Using mDNS (No more IP changes!)
// ═══════════════════════════════════════════════════════════════════════
const char* serverUrl = "http://cvacare.local:5000/api/wearable/data";

// ═══════════════════════════════════════════════════════════════════════
// ESP-NOW Data Structure (LEFT foot sends this)
// ═══════════════════════════════════════════════════════════════════════
typedef struct struct_message {
  float left_knee_ax, left_knee_ay, left_knee_az;
  float left_knee_gx, left_knee_gy, left_knee_gz;
  float left_ankle_ax, left_ankle_ay, left_ankle_az;
  float left_ankle_gx, left_ankle_gy, left_ankle_gz;
  float left_fsr[3];  // [toe, mid, heel]
} struct_message;

struct_message leftFootData;
bool leftFootDataReceived = false;

// ═══════════════════════════════════════════════════════════════════════
// Hardware Configuration
// ═══════════════════════════════════════════════════════════════════════
#define MPU_KNEE   0x68  // RIGHT KNEE
#define MPU_ANKLE  0x69  // RIGHT ANKLE
#define ADS_ADDR   0x48  // ADS1115

Adafruit_ADS1115 ads;

// ═══════════════════════════════════════════════════════════════════════
// ESP-NOW Callback - Receives LEFT foot data
// ═══════════════════════════════════════════════════════════════════════
void OnDataRecv(const esp_now_recv_info *info, const uint8_t *incomingData, int len) {
  memcpy(&leftFootData, incomingData, sizeof(leftFootData));
  leftFootDataReceived = true;
  Serial.println("✅ LEFT foot data received via ESP-NOW");
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

bool testI2C(uint8_t addr) {
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
  Serial.println("║    RIGHT FOOT ESP32 (MASTER)          ║");
  Serial.println("╚════════════════════════════════════════╝");

  // ─────────────────────────────────────────────────────────────────────
  // Initialize I2C Sensors
  // ─────────────────────────────────────────────────────────────────────
  Wire.begin(21, 22);
  Wire.setClock(100000);
  delay(100);

  Serial.println("\n🔍 Detecting Sensors...");
  
  if (testI2C(MPU_KNEE)) {
    Serial.println("  ✅ RIGHT KNEE (MPU6050)");
    wakeMPU(MPU_KNEE);
  } else {
    Serial.println("  ❌ RIGHT KNEE NOT FOUND!");
  }

  if (testI2C(MPU_ANKLE)) {
    Serial.println("  ✅ RIGHT ANKLE (MPU6050)");
    wakeMPU(MPU_ANKLE);
  } else {
    Serial.println("  ❌ RIGHT ANKLE NOT FOUND!");
  }

  if (ads.begin(ADS_ADDR)) {
    ads.setGain(GAIN_TWOTHIRDS);
    Serial.println("  ✅ RIGHT FOOT FSR (ADS1115)");
  } else {
    Serial.println("  ❌ ADS1115 NOT FOUND!");
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
    Serial.println("   Check SSID and password!");
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
  Serial.println("\n📍 MY MAC ADDRESS (Copy to LEFT foot code):");
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

  // Wait for LEFT foot data (timeout after 2 seconds)
  unsigned long startWait = millis();
  while (!leftFootDataReceived && (millis() - startWait) < 2000) {
    delay(10);
  }

  // ─────────────────────────────────────────────────────────────────────
  // Read RIGHT FOOT Sensors
  // ─────────────────────────────────────────────────────────────────────
  float right_knee_ax = read16(MPU_KNEE, 0x3B) / 16384.0;
  float right_knee_ay = read16(MPU_KNEE, 0x3D) / 16384.0;
  float right_knee_az = read16(MPU_KNEE, 0x3F) / 16384.0;
  float right_knee_gx = read16(MPU_KNEE, 0x43) / 131.0;
  float right_knee_gy = read16(MPU_KNEE, 0x45) / 131.0;
  float right_knee_gz = read16(MPU_KNEE, 0x47) / 131.0;

  float right_ankle_ax = read16(MPU_ANKLE, 0x3B) / 16384.0;
  float right_ankle_ay = read16(MPU_ANKLE, 0x3D) / 16384.0;
  float right_ankle_az = read16(MPU_ANKLE, 0x3F) / 16384.0;
  float right_ankle_gx = read16(MPU_ANKLE, 0x43) / 131.0;
  float right_ankle_gy = read16(MPU_ANKLE, 0x45) / 131.0;
  float right_ankle_gz = read16(MPU_ANKLE, 0x47) / 131.0;

  float right_fsr_heel = ads.readADC_SingleEnded(0) * 0.1875 / 1000.0;
  float right_fsr_mid  = ads.readADC_SingleEnded(1) * 0.1875 / 1000.0;
  float right_fsr_toe  = ads.readADC_SingleEnded(2) * 0.1875 / 1000.0;

  // ─────────────────────────────────────────────────────────────────────
  // Build JSON Payload
  // ─────────────────────────────────────────────────────────────────────
  StaticJsonDocument<1536> doc;
  
  doc["device_id"] = "RIGHT_FOOT_MASTER";
  doc["timestamp"] = millis();
  doc["synchronized"] = leftFootDataReceived;

  // RIGHT FOOT DATA
  JsonObject rightKnee = doc.createNestedObject("RIGHT_KNEE");
  rightKnee["ax"] = right_knee_ax;
  rightKnee["ay"] = right_knee_ay;
  rightKnee["az"] = right_knee_az;
  rightKnee["gx"] = right_knee_gx;
  rightKnee["gy"] = right_knee_gy;
  rightKnee["gz"] = right_knee_gz;

  JsonObject rightAnkle = doc.createNestedObject("RIGHT_ANKLE");
  rightAnkle["ax"] = right_ankle_ax;
  rightAnkle["ay"] = right_ankle_ay;
  rightAnkle["az"] = right_ankle_az;
  rightAnkle["gx"] = right_ankle_gx;
  rightAnkle["gy"] = right_ankle_gy;
  rightAnkle["gz"] = right_ankle_gz;

  JsonArray rightFsr = doc.createNestedArray("RIGHT_FOOT_FSR");
  rightFsr.add(right_fsr_toe);
  rightFsr.add(right_fsr_mid);
  rightFsr.add(right_fsr_heel);

  // LEFT FOOT DATA (if received)
  if (leftFootDataReceived) {
    JsonObject leftKnee = doc.createNestedObject("LEFT_KNEE");
    leftKnee["ax"] = leftFootData.left_knee_ax;
    leftKnee["ay"] = leftFootData.left_knee_ay;
    leftKnee["az"] = leftFootData.left_knee_az;
    leftKnee["gx"] = leftFootData.left_knee_gx;
    leftKnee["gy"] = leftFootData.left_knee_gy;
    leftKnee["gz"] = leftFootData.left_knee_gz;

    JsonObject leftAnkle = doc.createNestedObject("LEFT_ANKLE");
    leftAnkle["ax"] = leftFootData.left_ankle_ax;
    leftAnkle["ay"] = leftFootData.left_ankle_ay;
    leftAnkle["az"] = leftFootData.left_ankle_az;
    leftAnkle["gx"] = leftFootData.left_ankle_gx;
    leftAnkle["gy"] = leftFootData.left_ankle_gy;
    leftAnkle["gz"] = leftFootData.left_ankle_gz;

    JsonArray leftFsr = doc.createNestedArray("LEFT_FOOT_FSR");
    leftFsr.add(leftFootData.left_fsr[0]);  // toe
    leftFsr.add(leftFootData.left_fsr[1]);  // mid
    leftFsr.add(leftFootData.left_fsr[2]);  // heel
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
  Serial.printf("📊 Data Sent (Sync: %s)\n", leftFootDataReceived ? "YES" : "NO");
  Serial.printf("   RIGHT: Knee(%.2f,%.2f,%.2f) FSR(%.2f,%.2f,%.2f)\n", 
                right_knee_ax, right_knee_ay, right_knee_az,
                right_fsr_toe, right_fsr_mid, right_fsr_heel);
  
  if (leftFootDataReceived) {
    Serial.printf("   LEFT:  Knee(%.2f,%.2f,%.2f) FSR(%.2f,%.2f,%.2f)\n",
                  leftFootData.left_knee_ax, leftFootData.left_knee_ay, leftFootData.left_knee_az,
                  leftFootData.left_fsr[0], leftFootData.left_fsr[1], leftFootData.left_fsr[2]);
  }
  
  Serial.printf("📤 HTTP Response: %d %s\n", httpCode, 
                httpCode == 200 ? "✅ OK" : "❌ ERROR");
  Serial.println("════════════════════════════════════════\n");

  http.end();

  // Reset flag for next cycle
  leftFootDataReceived = false;
  
  delay(1000);  // Send every 1 second
}
