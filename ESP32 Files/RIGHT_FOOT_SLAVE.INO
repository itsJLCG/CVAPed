/*
 * ═══════════════════════════════════════════════════════════════════════
 * CVACare - RIGHT FOOT ESP32 (SLAVE)
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * ROLE: ESP-NOW Sender Only (NO WiFi)
 * - Reads RIGHT KNEE & RIGHT ANKLE sensors (MPU6050)
 * - Reads RIGHT FOOT pressure sensors (FSR via ADS1115)
 * - SENDS all data to WAIST MASTER via ESP-NOW
 * - Does NOT connect to WiFi or backend
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
#include <esp_wifi.h>
#include <WiFi.h>
#include <Wire.h>
#include <Adafruit_ADS1X15.h>
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

// ═══════════════════════════════════════════════════════════════════════
// ESP-NOW Channel Configuration
// ═══════════════════════════════════════════════════════════════════════
// ⚠️  IMPORTANT: This MUST match the WiFi channel the WAIST Master is on!
//     1. Upload & run WAIST_MASTER first.
//     2. Check its Serial Monitor for "WiFi Channel: X".
//     3. Set ESPNOW_CHANNEL to that value, then upload this file.
// ═══════════════════════════════════════════════════════════════════════
#define ESPNOW_CHANNEL 11  // Change to match WAIST Master's WiFi channel

// ═══════════════════════════════════════════════════════════════════════
// WAIST ESP32 MAC Address
// ═══════════════════════════════════════════════════════════════════════
// ⚠️  IMPORTANT: Get this from WAIST Serial Monitor!
//     Upload WAIST code first, copy the MAC address shown,
//     then paste it here before uploading RIGHT foot code.
// ═══════════════════════════════════════════════════════════════════════
uint8_t waistMacAddress[] = {0xFC, 0xE8, 0xC0, 0x7B, 0xB4, 0x14};  // FC:E8:C0:7B:B4:14

#define ESPNOW_SEND_RETRIES 3     // Retry count on send failure
#define ESPNOW_RETRY_DELAY_MS 50  // Delay between retries (ms)

// ═══════════════════════════════════════════════════════════════════════
// ESP-NOW Data Structure
// ═══════════════════════════════════════════════════════════════════════
typedef struct struct_foot_message {
  float knee_ax, knee_ay, knee_az;
  float knee_gx, knee_gy, knee_gz;
  float ankle_ax, ankle_ay, ankle_az;
  float ankle_gx, ankle_gy, ankle_gz;
  float fsr[3];  // [toe, mid, heel]
  char device_id[20];
} struct_foot_message;

struct_foot_message rightFootData;

// ═══════════════════════════════════════════════════════════════════════
// Hardware Configuration
// ═══════════════════════════════════════════════════════════════════════
#define MPU_KNEE   0x68  // RIGHT KNEE
#define MPU_ANKLE  0x69  // RIGHT ANKLE
#define ADS_ADDR   0x48  // ADS1115

Adafruit_ADS1115 ads;

// ═══════════════════════════════════════════════════════════════════════
// ESP-NOW Callback - Confirms data was sent
// ═══════════════════════════════════════════════════════════════════════
void OnDataSent(const wifi_tx_info_t *info, esp_now_send_status_t status) {
  Serial.print("Send Status: ");
  Serial.println(status == ESP_NOW_SEND_SUCCESS ? "SUCCESS" : "FAILED");
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
  Serial.println("║    RIGHT FOOT ESP32 (SLAVE)           ║");
  Serial.println("╚════════════════════════════════════════╝");

  // ─────────────────────────────────────────────────────────────────────
  // WiFi Mode (NO CONNECTION - ESP-NOW only!)
  // ─────────────────────────────────────────────────────────────────────
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();

  // Force the radio onto the same channel the WAIST Master's WiFi uses.
  // Without this, the slave defaults to channel 1 while the master may
  // be on a different channel, causing packets to never arrive.
  esp_wifi_set_channel(ESPNOW_CHANNEL, WIFI_SECOND_CHAN_NONE);
  
  Serial.println("\nMy MAC Address:");
  Serial.print("   ");
  Serial.println(WiFi.macAddress());

  uint8_t primaryCh;
  wifi_second_chan_t secondCh;
  esp_wifi_get_channel(&primaryCh, &secondCh);
  Serial.printf("   ESP-NOW Channel: %d\n", primaryCh);

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
  // Register WAIST as peer
  // ─────────────────────────────────────────────────────────────────────
  Serial.println("\n📡 Registering WAIST peer...");
  
  esp_now_peer_info_t peerInfo;
  memset(&peerInfo, 0, sizeof(peerInfo));
  memcpy(peerInfo.peer_addr, waistMacAddress, 6);
  peerInfo.channel = ESPNOW_CHANNEL;
  peerInfo.encrypt = false;

  if (esp_now_add_peer(&peerInfo) != ESP_OK) {
    Serial.println("❌ Failed to register WAIST!");
    Serial.println("⚠️  Check MAC address in code!");
    return;
  }
  
  Serial.println("✅ WAIST registered");
  Serial.print("   MAC: ");
  for (int i = 0; i < 6; i++) {
    Serial.printf("%02X", waistMacAddress[i]);
    if (i < 5) Serial.print(":");
  }
  Serial.println();

  // Set device ID
  strcpy(rightFootData.device_id, "RIGHT_FOOT");

  Serial.println("\n════════════════════════════════════════");
  Serial.println("  SYSTEM READY - SENDING TO WAIST");
  Serial.println("════════════════════════════════════════\n");
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN LOOP
// ═══════════════════════════════════════════════════════════════════════
void loop() {
  // ─────────────────────────────────────────────────────────────────────
  // Read RIGHT KNEE Sensor
  // ─────────────────────────────────────────────────────────────────────
  rightFootData.knee_ax = read16(MPU_KNEE, 0x3B) / 16384.0;
  rightFootData.knee_ay = read16(MPU_KNEE, 0x3D) / 16384.0;
  rightFootData.knee_az = read16(MPU_KNEE, 0x3F) / 16384.0;
  rightFootData.knee_gx = read16(MPU_KNEE, 0x43) / 131.0;
  rightFootData.knee_gy = read16(MPU_KNEE, 0x45) / 131.0;
  rightFootData.knee_gz = read16(MPU_KNEE, 0x47) / 131.0;

  // ─────────────────────────────────────────────────────────────────────
  // Read RIGHT ANKLE Sensor
  // ─────────────────────────────────────────────────────────────────────
  rightFootData.ankle_ax = read16(MPU_ANKLE, 0x3B) / 16384.0;
  rightFootData.ankle_ay = read16(MPU_ANKLE, 0x3D) / 16384.0;
  rightFootData.ankle_az = read16(MPU_ANKLE, 0x3F) / 16384.0;
  rightFootData.ankle_gx = read16(MPU_ANKLE, 0x43) / 131.0;
  rightFootData.ankle_gy = read16(MPU_ANKLE, 0x45) / 131.0;
  rightFootData.ankle_gz = read16(MPU_ANKLE, 0x47) / 131.0;

  // ─────────────────────────────────────────────────────────────────────
  // Read RIGHT FOOT FSR Sensors
  // ─────────────────────────────────────────────────────────────────────
  float heel = ads.readADC_SingleEnded(0) * 0.1875 / 1000.0;
  float mid  = ads.readADC_SingleEnded(1) * 0.1875 / 1000.0;
  float toe  = ads.readADC_SingleEnded(2) * 0.1875 / 1000.0;

  rightFootData.fsr[0] = toe;
  rightFootData.fsr[1] = mid;
  rightFootData.fsr[2] = heel;

  // ─────────────────────────────────────────────────────────────────────
  // Display Data
  // ─────────────────────────────────────────────────────────────────────
  Serial.println("════════════════════════════════════════");
  Serial.printf("📊 RIGHT Knee: (%.2f, %.2f, %.2f)\n",
                rightFootData.knee_ax,
                rightFootData.knee_ay,
                rightFootData.knee_az);
  Serial.printf("📊 RIGHT Ankle: (%.2f, %.2f, %.2f)\n",
                rightFootData.ankle_ax,
                rightFootData.ankle_ay,
                rightFootData.ankle_az);
  Serial.printf("📊 RIGHT FSR: Toe=%.2fV Mid=%.2fV Heel=%.2fV\n",
                toe, mid, heel);

  // ─────────────────────────────────────────────────────────────────────
  // Send to WAIST via ESP-NOW (with retries)
  // ─────────────────────────────────────────────────────────────────────
  esp_err_t result = ESP_FAIL;
  for (int attempt = 1; attempt <= ESPNOW_SEND_RETRIES; attempt++) {
    result = esp_now_send(waistMacAddress,
                          (uint8_t*)&rightFootData,
                          sizeof(rightFootData));
    if (result == ESP_OK) break;
    Serial.printf("Send attempt %d failed, retrying...\n", attempt);
    delay(ESPNOW_RETRY_DELAY_MS);
  }
  
  if (result != ESP_OK) {
    Serial.println("ESP-NOW Send Error after all retries!");
  }

  Serial.println("════════════════════════════════════════\n");

  delay(1000);  // Send every 1 second
}
