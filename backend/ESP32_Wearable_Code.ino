/*
 * CVACare Wearable Gait Analysis - ESP32 Code
 * 
 * This code reads from MPU6050 sensors and FSR sensors,
 * then sends the data to the CVACare backend via HTTP POST
 * 
 * Hardware Required:
 * - ESP32 Development Board
 * - 6x MPU6050 Sensors (I2C)
 * - 6x FSR Sensors (Analog)
 * - TCA9548A I2C Multiplexer (for multiple MPU6050s)
 * 
 * Connections:
 * - MPU6050 sensors connected via TCA9548A multiplexer
 * - FSR sensors connected to analog pins (ADC)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>

// ============ WiFi Configuration ============
// CHANGE THESE TO YOUR WIFI CREDENTIALS
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// CHANGE THIS TO YOUR COMPUTER'S IP ADDRESS
// To find your IP: Open Command Prompt and type: ipconfig
// Look for "IPv4 Address" under your WiFi adapter
const char* serverUrl = "http://192.168.1.100:5000/api/wearable/data";

// ============ Pin Configuration ============
// FSR Sensor Pins (Analog)
const int LEFT_FSR_TOE = 34;    // GPIO34 (ADC1_6)
const int LEFT_FSR_MID = 35;    // GPIO35 (ADC1_7)
const int LEFT_FSR_HEEL = 32;   // GPIO32 (ADC1_4)
const int RIGHT_FSR_TOE = 33;   // GPIO33 (ADC1_5)
const int RIGHT_FSR_MID = 25;   // GPIO25 (ADC2_8)
const int RIGHT_FSR_HEEL = 26;  // GPIO26 (ADC2_9)

// I2C Configuration for TCA9548A Multiplexer
#define TCA_ADDR 0x70
#define SDA_PIN 21
#define SCL_PIN 22

// MPU6050 Objects
Adafruit_MPU6050 mpu_left_waist;
Adafruit_MPU6050 mpu_right_waist;
Adafruit_MPU6050 mpu_left_knee;
Adafruit_MPU6050 mpu_right_knee;
Adafruit_MPU6050 mpu_left_toe;
Adafruit_MPU6050 mpu_right_toe;

// Timing
unsigned long lastSendTime = 0;
const unsigned long sendInterval = 1000; // Send data every 1 second

// ============ Functions ============

void tcaSelect(uint8_t channel) {
  /* Select I2C channel on TCA9548A multiplexer
   * Channels 0-7 correspond to different MPU6050 sensors
   */
  if (channel > 7) return;
  Wire.beginTransmission(TCA_ADDR);
  Wire.write(1 << channel);
  Wire.endTransmission();
}

float readFSR(int pin) {
  /* Read FSR sensor and convert to voltage
   * Returns voltage (0-3.3V)
   * Higher voltage = less pressure
   * Lower voltage = more pressure
   */
  int rawValue = analogRead(pin);
  float voltage = (rawValue / 4095.0) * 3.3;
  return voltage;
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\n====================================");
  Serial.println("CVACare Wearable Gait Analysis");
  Serial.println("====================================\n");
  
  // Initialize I2C
  Wire.begin(SDA_PIN, SCL_PIN);
  
  // Connect to WiFi
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✓ WiFi Connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n✗ WiFi Connection Failed!");
    Serial.println("Please check your WiFi credentials");
  }
  
  // Initialize MPU6050 sensors
  Serial.println("\nInitializing MPU6050 Sensors...");
  
  // Left Waist (Channel 0)
  tcaSelect(0);
  if (mpu_left_waist.begin()) {
    Serial.println("✓ LEFT_WAIST initialized");
    mpu_left_waist.setAccelerometerRange(MPU6050_RANGE_8_G);
    mpu_left_waist.setGyroRange(MPU6050_RANGE_500_DEG);
  } else {
    Serial.println("✗ LEFT_WAIST failed");
  }
  
  // Right Waist (Channel 1)
  tcaSelect(1);
  if (mpu_right_waist.begin()) {
    Serial.println("✓ RIGHT_WAIST initialized");
    mpu_right_waist.setAccelerometerRange(MPU6050_RANGE_8_G);
    mpu_right_waist.setGyroRange(MPU6050_RANGE_500_DEG);
  } else {
    Serial.println("✗ RIGHT_WAIST failed");
  }
  
  // Left Knee (Channel 2)
  tcaSelect(2);
  if (mpu_left_knee.begin()) {
    Serial.println("✓ LEFT_KNEE initialized");
    mpu_left_knee.setAccelerometerRange(MPU6050_RANGE_8_G);
    mpu_left_knee.setGyroRange(MPU6050_RANGE_500_DEG);
  } else {
    Serial.println("✗ LEFT_KNEE failed");
  }
  
  // Right Knee (Channel 3)
  tcaSelect(3);
  if (mpu_right_knee.begin()) {
    Serial.println("✓ RIGHT_KNEE initialized");
    mpu_right_knee.setAccelerometerRange(MPU6050_RANGE_8_G);
    mpu_right_knee.setGyroRange(MPU6050_RANGE_500_DEG);
  } else {
    Serial.println("✗ RIGHT_KNEE failed");
  }
  
  // Left Toe (Channel 4)
  tcaSelect(4);
  if (mpu_left_toe.begin()) {
    Serial.println("✓ LEFT_TOE initialized");
    mpu_left_toe.setAccelerometerRange(MPU6050_RANGE_8_G);
    mpu_left_toe.setGyroRange(MPU6050_RANGE_500_DEG);
  } else {
    Serial.println("✗ LEFT_TOE failed");
  }
  
  // Right Toe (Channel 5)
  tcaSelect(5);
  if (mpu_right_toe.begin()) {
    Serial.println("✓ RIGHT_TOE initialized");
    mpu_right_toe.setAccelerometerRange(MPU6050_RANGE_8_G);
    mpu_right_toe.setGyroRange(MPU6050_RANGE_500_DEG);
  } else {
    Serial.println("✗ RIGHT_TOE failed");
  }
  
  Serial.println("\n====================================");
  Serial.println("Starting Data Transmission...");
  Serial.println("====================================\n");
}

void loop() {
  // Check if it's time to send data
  if (millis() - lastSendTime >= sendInterval) {
    lastSendTime = millis();
    
    // Only send if WiFi is connected
    if (WiFi.status() == WL_CONNECTED) {
      sendSensorData();
    } else {
      Serial.println("WiFi Disconnected - Reconnecting...");
      WiFi.reconnect();
    }
  }
}

void sendSensorData() {
  // Create JSON document
  StaticJsonDocument<2048> doc;
  
  // Read MPU6050 sensors
  sensors_event_t a, g, temp;
  
  // LEFT WAIST
  tcaSelect(0);
  mpu_left_waist.getEvent(&a, &g, &temp);
  doc["LEFT_WAIST"]["ax"] = a.acceleration.x;
  doc["LEFT_WAIST"]["ay"] = a.acceleration.y;
  doc["LEFT_WAIST"]["az"] = a.acceleration.z;
  doc["LEFT_WAIST"]["gx"] = g.gyro.x;
  doc["LEFT_WAIST"]["gy"] = g.gyro.y;
  doc["LEFT_WAIST"]["gz"] = g.gyro.z;
  
  // RIGHT WAIST
  tcaSelect(1);
  mpu_right_waist.getEvent(&a, &g, &temp);
  doc["RIGHT_WAIST"]["ax"] = a.acceleration.x;
  doc["RIGHT_WAIST"]["ay"] = a.acceleration.y;
  doc["RIGHT_WAIST"]["az"] = a.acceleration.z;
  doc["RIGHT_WAIST"]["gx"] = g.gyro.x;
  doc["RIGHT_WAIST"]["gy"] = g.gyro.y;
  doc["RIGHT_WAIST"]["gz"] = g.gyro.z;
  
  // LEFT KNEE
  tcaSelect(2);
  mpu_left_knee.getEvent(&a, &g, &temp);
  doc["LEFT_KNEE"]["ax"] = a.acceleration.x;
  doc["LEFT_KNEE"]["ay"] = a.acceleration.y;
  doc["LEFT_KNEE"]["az"] = a.acceleration.z;
  doc["LEFT_KNEE"]["gx"] = g.gyro.x;
  doc["LEFT_KNEE"]["gy"] = g.gyro.y;
  doc["LEFT_KNEE"]["gz"] = g.gyro.z;
  
  // RIGHT KNEE
  tcaSelect(3);
  mpu_right_knee.getEvent(&a, &g, &temp);
  doc["RIGHT_KNEE"]["ax"] = a.acceleration.x;
  doc["RIGHT_KNEE"]["ay"] = a.acceleration.y;
  doc["RIGHT_KNEE"]["az"] = a.acceleration.z;
  doc["RIGHT_KNEE"]["gx"] = g.gyro.x;
  doc["RIGHT_KNEE"]["gy"] = g.gyro.y;
  doc["RIGHT_KNEE"]["gz"] = g.gyro.z;
  
  // LEFT TOE
  tcaSelect(4);
  mpu_left_toe.getEvent(&a, &g, &temp);
  doc["LEFT_TOE"]["ax"] = a.acceleration.x;
  doc["LEFT_TOE"]["ay"] = a.acceleration.y;
  doc["LEFT_TOE"]["az"] = a.acceleration.z;
  doc["LEFT_TOE"]["gx"] = g.gyro.x;
  doc["LEFT_TOE"]["gy"] = g.gyro.y;
  doc["LEFT_TOE"]["gz"] = g.gyro.z;
  
  // RIGHT TOE
  tcaSelect(5);
  mpu_right_toe.getEvent(&a, &g, &temp);
  doc["RIGHT_TOE"]["ax"] = a.acceleration.x;
  doc["RIGHT_TOE"]["ay"] = a.acceleration.y;
  doc["RIGHT_TOE"]["az"] = a.acceleration.z;
  doc["RIGHT_TOE"]["gx"] = g.gyro.x;
  doc["RIGHT_TOE"]["gy"] = g.gyro.y;
  doc["RIGHT_TOE"]["gz"] = g.gyro.z;
  
  // Read FSR sensors
  doc["LEFT_FOOT_FSR"][0] = readFSR(LEFT_FSR_TOE);
  doc["LEFT_FOOT_FSR"][1] = readFSR(LEFT_FSR_MID);
  doc["LEFT_FOOT_FSR"][2] = readFSR(LEFT_FSR_HEEL);
  
  doc["RIGHT_FOOT_FSR"][0] = readFSR(RIGHT_FSR_TOE);
  doc["RIGHT_FOOT_FSR"][1] = readFSR(RIGHT_FSR_MID);
  doc["RIGHT_FOOT_FSR"][2] = readFSR(RIGHT_FSR_HEEL);
  
  // Serialize JSON to string
  String jsonString;
  serializeJson(doc, jsonString);
  
  // Send HTTP POST request
  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  
  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode > 0) {
    Serial.print("✓ Data sent - Response: ");
    Serial.println(httpResponseCode);
  } else {
    Serial.print("✗ Error sending data: ");
    Serial.println(http.errorToString(httpResponseCode));
  }
  
  http.end();
}
