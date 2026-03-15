/*
 * ═══════════════════════════════════════════════════════════════════════
 * CVACare - LEFT FOOT ESP32 (SLAVE)
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * ROLE: ESP-NOW Sender Only (NO WiFi)
 * - Reads LEFT KNEE & LEFT ANKLE sensors (MPU6050)
 * - Reads LEFT FOOT pressure sensors (FSR via ADS1115)
 * - SENDS all data to WAIST MASTER via ESP-NOW
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
#include <esp_wifi.h>
#include <WiFi.h>
#include <Wire.h>
#include <Adafruit_ADS1X15.h>
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

// ═══════════════════════════════════════════════════════════════════════
// WiFi SSID (for auto-detecting the channel - does NOT connect!)
// ═══════════════════════════════════════════════════════════════════════
// The slave scans for this SSID at boot to discover which WiFi channel
// the hotspot (and therefore the WAIST Master) is on. No hardcoded
// channel needed — just make sure this matches the hotspot SSID.
// ═══════════════════════════════════════════════════════════════════════
const char* TARGET_SSID = "hey";

#define CHANNEL_SCAN_RETRIES 5       // How many times to re-scan before giving up
#define CHANNEL_SCAN_DELAY_MS 2000   // Delay between scan retries
#define FALLBACK_CHANNEL 1           // Last-resort channel if scan fails

int espnowChannel = 0;  // Will be set dynamically

// ═══════════════════════════════════════════════════════════════════════
// WAIST ESP32 MAC Address
// ═══════════════════════════════════════════════════════════════════════
// ⚠️  IMPORTANT: Get this from WAIST Serial Monitor!
//     Upload WAIST code first, copy the MAC address shown,
//     then paste it here before uploading LEFT foot code.
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

struct_foot_message leftFootData;

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
  Serial.println("║     LEFT FOOT ESP32 (SLAVE)           ║");
  Serial.println("╚════════════════════════════════════════╝");

  // ─────────────────────────────────────────────────────────────────────
  // Auto-Detect WiFi Channel (scan only, NO connection)
  // ─────────────────────────────────────────────────────────────────────
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();

  Serial.println("\nMy MAC Address:");
  Serial.print("   ");
  Serial.println(WiFi.macAddress());

  Serial.printf("\nScanning for hotspot \"%s\" to auto-detect channel...\n", TARGET_SSID);

  for (int retry = 0; retry < CHANNEL_SCAN_RETRIES; retry++) {
    int n = WiFi.scanNetworks();
    for (int i = 0; i < n; i++) {
      if (strcmp(WiFi.SSID(i).c_str(), TARGET_SSID) == 0) {
        espnowChannel = WiFi.channel(i);
        Serial.printf("   Found \"%s\" on channel %d (RSSI: %d dBm)\n",
                      TARGET_SSID, espnowChannel, WiFi.RSSI(i));
        break;
      }
    }
    WiFi.scanDelete();
    if (espnowChannel > 0) break;
    Serial.printf("   Scan attempt %d/%d - not found, retrying...\n", retry + 1, CHANNEL_SCAN_RETRIES);
    delay(CHANNEL_SCAN_DELAY_MS);
  }

  if (espnowChannel == 0) {
    espnowChannel = FALLBACK_CHANNEL;
    Serial.printf("   SSID not found! Using fallback channel %d\n", FALLBACK_CHANNEL);
  }

  esp_wifi_set_channel(espnowChannel, WIFI_SECOND_CHAN_NONE);

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
  // Register WAIST as peer
  // ─────────────────────────────────────────────────────────────────────
  Serial.println("\n📡 Registering WAIST peer...");
  
  esp_now_peer_info_t peerInfo;
  memset(&peerInfo, 0, sizeof(peerInfo));
  memcpy(peerInfo.peer_addr, waistMacAddress, 6);
  peerInfo.channel = espnowChannel;
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
  strcpy(leftFootData.device_id, "LEFT_FOOT");

  Serial.println("\n════════════════════════════════════════");
  Serial.println("  SYSTEM READY - SENDING TO WAIST");
  Serial.println("════════════════════════════════════════\n");
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN LOOP
// ═══════════════════════════════════════════════════════════════════════
void loop() {
  // ─────────────────────────────────────────────────────────────────────
  // Read LEFT KNEE Sensor
  // ─────────────────────────────────────────────────────────────────────
  leftFootData.knee_ax = read16(MPU_KNEE, 0x3B) / 16384.0;
  leftFootData.knee_ay = read16(MPU_KNEE, 0x3D) / 16384.0;
  leftFootData.knee_az = read16(MPU_KNEE, 0x3F) / 16384.0;
  leftFootData.knee_gx = read16(MPU_KNEE, 0x43) / 131.0;
  leftFootData.knee_gy = read16(MPU_KNEE, 0x45) / 131.0;
  leftFootData.knee_gz = read16(MPU_KNEE, 0x47) / 131.0;

  // ─────────────────────────────────────────────────────────────────────
  // Read LEFT ANKLE Sensor
  // ─────────────────────────────────────────────────────────────────────
  leftFootData.ankle_ax = read16(MPU_ANKLE, 0x3B) / 16384.0;
  leftFootData.ankle_ay = read16(MPU_ANKLE, 0x3D) / 16384.0;
  leftFootData.ankle_az = read16(MPU_ANKLE, 0x3F) / 16384.0;
  leftFootData.ankle_gx = read16(MPU_ANKLE, 0x43) / 131.0;
  leftFootData.ankle_gy = read16(MPU_ANKLE, 0x45) / 131.0;
  leftFootData.ankle_gz = read16(MPU_ANKLE, 0x47) / 131.0;

  // ─────────────────────────────────────────────────────────────────────
  // Read LEFT FOOT FSR Sensors
  // ─────────────────────────────────────────────────────────────────────
  float heel = ads.readADC_SingleEnded(0) * 0.1875 / 1000.0;
  float mid  = ads.readADC_SingleEnded(1) * 0.1875 / 1000.0;
  float toe  = ads.readADC_SingleEnded(2) * 0.1875 / 1000.0;

  leftFootData.fsr[0] = toe;
  leftFootData.fsr[1] = mid;
  leftFootData.fsr[2] = heel;

  // ─────────────────────────────────────────────────────────────────────
  // Display Data
  // ─────────────────────────────────────────────────────────────────────
  Serial.println("════════════════════════════════════════");
  Serial.printf("📊 LEFT Knee: (%.2f, %.2f, %.2f)\n",
                leftFootData.knee_ax,
                leftFootData.knee_ay,
                leftFootData.knee_az);
  Serial.printf("📊 LEFT Ankle: (%.2f, %.2f, %.2f)\n",
                leftFootData.ankle_ax,
                leftFootData.ankle_ay,
                leftFootData.ankle_az);
  Serial.printf("📊 LEFT FSR: Toe=%.2fV Mid=%.2fV Heel=%.2fV\n",
                toe, mid, heel);

  // ─────────────────────────────────────────────────────────────────────
  // Send to WAIST via ESP-NOW (with retries)
  // ─────────────────────────────────────────────────────────────────────
  esp_err_t result = ESP_FAIL;
  for (int attempt = 1; attempt <= ESPNOW_SEND_RETRIES; attempt++) {
    result = esp_now_send(waistMacAddress,
                          (uint8_t*)&leftFootData,
                          sizeof(leftFootData));
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
