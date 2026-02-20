/*
 * ═══════════════════════════════════════════════════════════════════════
 * CVACare - LEFT FOOT ESP32 (SLAVE)
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * ROLE: ESP-NOW Sender Only (NO WiFi)
 * - Reads LEFT KNEE & LEFT ANKLE sensors (MPU6050)
 * - Reads LEFT FOOT pressure sensors (FSR via ADS1115)
 * - SENDS all data to RIGHT foot via ESP-NOW
 * - Does NOT connect to WiFi or backend
 * 
 * HARDWARE:
 * - MPU6050 (LEFT KNEE) → I2C Address: 0x68
 * - MPU6050 (LEFT ANKLE) → I2C Address: 0x69
 * - ADS1115 (FSR Sensors) → I2C Address: 0x48
 *   - A0: Heel FSR
 *   - A1: Mid FSR
 *   - A2: Toe FSR
 */

#include <esp_now.h>
#include <WiFi.h>
#include <Wire.h>
#include <Adafruit_ADS1X15.h>
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

// ═══════════════════════════════════════════════════════════════════════
// RIGHT FOOT ESP32 MAC Address
// ═══════════════════════════════════════════════════════════════════════
// ⚠️  IMPORTANT: Get this from RIGHT foot Serial Monitor!
//     Upload RIGHT foot code first, copy the MAC address shown,
//     then paste it here before uploading LEFT foot code.
// ═══════════════════════════════════════════════════════════════════════
uint8_t rightFootMacAddress[] = {0x38, 0x18, 0x2B, 0x84, 0xF8, 0xE4};

// ═══════════════════════════════════════════════════════════════════════
// ESP-NOW Data Structure
// ═══════════════════════════════════════════════════════════════════════
typedef struct struct_message {
  float left_knee_ax, left_knee_ay, left_knee_az;
  float left_knee_gx, left_knee_gy, left_knee_gz;
  float left_ankle_ax, left_ankle_ay, left_ankle_az;
  float left_ankle_gx, left_ankle_gy, left_ankle_gz;
  float left_fsr[3];  // [toe, mid, heel]
} struct_message;

struct_message leftFootData;

// ═══════════════════════════════════════════════════════════════════════
// Hardware Configuration
// ═══════════════════════════════════════════════════════════════════════
#define MPU_KNEE   0x68  // LEFT KNEE
#define MPU_ANKLE  0x69  // LEFT ANKLE
#define ADS_ADDR   0x48  // ADS1115

Adafruit_ADS1115 ads;

// ═══════════════════════════════════════════════════════════════════════
// ESP-NOW Callback - Confirms data was sent
// ═══════════════════════════════════════════════════════════════════════
void OnDataSent(const wifi_tx_info_t *info, esp_now_send_status_t status) {
  Serial.print("📤 Send Status: ");
  Serial.println(status == ESP_NOW_SEND_SUCCESS ? "✅ SUCCESS" : "❌ FAILED");
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
  Serial.println("║     LEFT FOOT ESP32 (SLAVE)           ║");
  Serial.println("╚════════════════════════════════════════╝");

  // ─────────────────────────────────────────────────────────────────────
  // WiFi Mode (NO CONNECTION - ESP-NOW only!)
  // ─────────────────────────────────────────────────────────────────────
  WiFi.mode(WIFI_STA);
  
  Serial.println("\n📍 My MAC Address:");
  Serial.print("   ");
  Serial.println(WiFi.macAddress());

  // ─────────────────────────────────────────────────────────────────────
  // Initialize I2C Sensors
  // ─────────────────────────────────────────────────────────────────────
  Wire.begin(21, 22);
  Wire.setClock(100000);
  delay(100);

  Serial.println("\n🔍 Detecting Sensors...");
  
  if (testI2C(MPU_KNEE)) {
    Serial.println("  ✅ LEFT KNEE (MPU6050)");
    wakeMPU(MPU_KNEE);
  } else {
    Serial.println("  ❌ LEFT KNEE NOT FOUND!");
  }

  if (testI2C(MPU_ANKLE)) {
    Serial.println("  ✅ LEFT ANKLE (MPU6050)");
    wakeMPU(MPU_ANKLE);
  } else {
    Serial.println("  ❌ LEFT ANKLE NOT FOUND!");
  }

  if (ads.begin(ADS_ADDR)) {
    ads.setGain(GAIN_TWOTHIRDS);
    Serial.println("  ✅ LEFT FOOT FSR (ADS1115)");
  } else {
    Serial.println("  ❌ ADS1115 NOT FOUND!");
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
  esp_now_register_send_cb(OnDataSent);

  // ─────────────────────────────────────────────────────────────────────
  // Register RIGHT foot as peer
  // ─────────────────────────────────────────────────────────────────────
  Serial.println("\n📡 Registering RIGHT foot peer...");
  
  esp_now_peer_info_t peerInfo;
  memset(&peerInfo, 0, sizeof(peerInfo));
  memcpy(peerInfo.peer_addr, rightFootMacAddress, 6);
  peerInfo.channel = 0;
  peerInfo.encrypt = false;

  if (esp_now_add_peer(&peerInfo) != ESP_OK) {
    Serial.println("❌ Failed to register RIGHT foot!");
    Serial.println("⚠️  Check MAC address in code!");
    return;
  }
  
  Serial.println("✅ RIGHT foot registered");
  Serial.print("   MAC: ");
  for (int i = 0; i < 6; i++) {
    Serial.printf("%02X", rightFootMacAddress[i]);
    if (i < 5) Serial.print(":");
  }
  Serial.println();

  Serial.println("\n════════════════════════════════════════");
  Serial.println("  SYSTEM READY - SENDING TO RIGHT FOOT");
  Serial.println("════════════════════════════════════════\n");
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN LOOP
// ═══════════════════════════════════════════════════════════════════════
void loop() {
  // ─────────────────────────────────────────────────────────────────────
  // Read LEFT KNEE Sensor
  // ─────────────────────────────────────────────────────────────────────
  leftFootData.left_knee_ax = read16(MPU_KNEE, 0x3B) / 16384.0;
  leftFootData.left_knee_ay = read16(MPU_KNEE, 0x3D) / 16384.0;
  leftFootData.left_knee_az = read16(MPU_KNEE, 0x3F) / 16384.0;
  leftFootData.left_knee_gx = read16(MPU_KNEE, 0x43) / 131.0;
  leftFootData.left_knee_gy = read16(MPU_KNEE, 0x45) / 131.0;
  leftFootData.left_knee_gz = read16(MPU_KNEE, 0x47) / 131.0;

  // ─────────────────────────────────────────────────────────────────────
  // Read LEFT ANKLE Sensor
  // ─────────────────────────────────────────────────────────────────────
  leftFootData.left_ankle_ax = read16(MPU_ANKLE, 0x3B) / 16384.0;
  leftFootData.left_ankle_ay = read16(MPU_ANKLE, 0x3D) / 16384.0;
  leftFootData.left_ankle_az = read16(MPU_ANKLE, 0x3F) / 16384.0;
  leftFootData.left_ankle_gx = read16(MPU_ANKLE, 0x43) / 131.0;
  leftFootData.left_ankle_gy = read16(MPU_ANKLE, 0x45) / 131.0;
  leftFootData.left_ankle_gz = read16(MPU_ANKLE, 0x47) / 131.0;

  // ─────────────────────────────────────────────────────────────────────
  // Read LEFT FOOT FSR Sensors
  // ─────────────────────────────────────────────────────────────────────
  float heel = ads.readADC_SingleEnded(0) * 0.1875 / 1000.0;
  float mid  = ads.readADC_SingleEnded(1) * 0.1875 / 1000.0;
  float toe  = ads.readADC_SingleEnded(2) * 0.1875 / 1000.0;

  leftFootData.left_fsr[0] = toe;
  leftFootData.left_fsr[1] = mid;
  leftFootData.left_fsr[2] = heel;

  // ─────────────────────────────────────────────────────────────────────
  // Display Data
  // ─────────────────────────────────────────────────────────────────────
  Serial.println("════════════════════════════════════════");
  Serial.printf("📊 LEFT Knee: (%.2f, %.2f, %.2f)\n",
                leftFootData.left_knee_ax,
                leftFootData.left_knee_ay,
                leftFootData.left_knee_az);
  Serial.printf("📊 LEFT Ankle: (%.2f, %.2f, %.2f)\n",
                leftFootData.left_ankle_ax,
                leftFootData.left_ankle_ay,
                leftFootData.left_ankle_az);
  Serial.printf("📊 LEFT FSR: Toe=%.2fV Mid=%.2fV Heel=%.2fV\n",
                toe, mid, heel);

  // ─────────────────────────────────────────────────────────────────────
  // Send to RIGHT FOOT via ESP-NOW
  // ─────────────────────────────────────────────────────────────────────
  esp_err_t result = esp_now_send(rightFootMacAddress, 
                                   (uint8_t*)&leftFootData, 
                                   sizeof(leftFootData));
  
  if (result != ESP_OK) {
    Serial.println("❌ ESP-NOW Send Error!");
  }

  Serial.println("════════════════════════════════════════\n");

  delay(1000);  // Send every 1 second
}
