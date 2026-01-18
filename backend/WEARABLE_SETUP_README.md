# Wearable Gait Analysis Integration Guide

## Overview
This guide helps you integrate wearable sensor data into the CVACare web application.

## System Architecture

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   ESP32/Arduino │  POST   │  Flask Backend  │   GET   │   React Web     │
│   Wearable      │────────>│  Port 5000      │<────────│   Port 5173     │
│   Sensors       │  JSON   │  /api/wearable  │  JSON   │   Gait Page     │
└─────────────────┘         └─────────────────┘         └─────────────────┘
```

## Quick Testing (Without Hardware)

### Step 1: Start Backend
```bash
cd backend
venv\Scripts\activate
python app.py
```

You should see: `Running on http://127.0.0.1:5000`

### Step 2: Start Frontend
Open a new terminal:
```bash
cd frontend
npm run dev
```

You should see: `Local: http://localhost:5173/`

### Step 3: Test with Mock Data
Open another terminal:
```bash
cd backend
venv\Scripts\activate
python test_wearable_data.py
```

Follow the prompts:
- It will send 5 test packets to the backend
- Check backend terminal for received data logs
- Open browser: http://localhost:5173
- Navigate to Gait Analysis page
- You should see sensors updating in real-time

---

## Hardware Integration

### Required Components
- **ESP32 Development Board** (or Arduino with WiFi module)
- **6x MPU6050 Sensors** (for motion tracking)
- **6x FSR Sensors** (for foot pressure)
- **1x TCA9548A I2C Multiplexer** (for multiple MPU6050s)
- **Power Supply** (3.7V LiPo battery or USB)

### Pin Connections

#### MPU6050 Sensors via TCA9548A Multiplexer
```
TCA9548A → ESP32
VCC → 3.3V
GND → GND
SDA → GPIO 21
SCL → GPIO 22

MPU6050 Sensors → TCA9548A Channels
Left Waist   → SD0/SC0 (Channel 0)
Right Waist  → SD1/SC1 (Channel 1)
Left Knee    → SD2/SC2 (Channel 2)
Right Knee   → SD3/SC3 (Channel 3)
Left Ankle   → SD4/SC4 (Channel 4)
Right Ankle  → SD5/SC5 (Channel 5)
```

#### FSR Sensors (Analog Pins)
```
Left Foot FSR:
- Toe   → GPIO 34 (ADC1_6)
- Mid   → GPIO 35 (ADC1_7)
- Heel  → GPIO 32 (ADC1_4)

Right Foot FSR:
- Toe   → GPIO 33 (ADC1_5)
- Mid   → GPIO 25 (ADC2_8)
- Heel  → GPIO 26 (ADC2_9)
```

### ESP32 Setup

#### 1. Install Arduino IDE
- Download from: https://www.arduino.cc/en/software
- Install ESP32 board support:
  - File → Preferences
  - Add to "Additional Board Manager URLs":
    ```
    https://dl.espressif.com/dl/package_esp32_index.json
    ```
  - Tools → Board Manager → Search "ESP32" → Install

#### 2. Install Required Libraries
Go to: Sketch → Include Library → Manage Libraries

Install these libraries:
- **WiFi** (built-in)
- **HTTPClient** (built-in)
- **ArduinoJson** by Benoit Blanchon
- **Adafruit MPU6050** by Adafruit
- **Adafruit Unified Sensor** by Adafruit

#### 3. Upload Code
1. Open `ESP32_Wearable_Code.ino` in Arduino IDE
2. **Configure WiFi:**
   ```cpp
   const char* ssid = "YOUR_WIFI_NAME";
   const char* password = "YOUR_WIFI_PASSWORD";
   ```
3. **Find Your Computer's IP Address:**
   - Windows: Open Command Prompt, type `ipconfig`
   - Look for "IPv4 Address" under WiFi adapter
   - Example: `192.168.1.100`
   
4. **Update Server URL:**
   ```cpp
   const char* serverUrl = "http://YOUR_IP:5000/api/wearable/data";
   ```
   Example: `"http://192.168.1.100:5000/api/wearable/data"`

5. Select your board:
   - Tools → Board → ESP32 Dev Module
6. Select your COM port:
   - Tools → Port → COM3 (or whichever port your ESP32 is on)
7. Click Upload ⬆️

#### 4. Monitor Serial Output
- Open Serial Monitor (Ctrl+Shift+M)
- Set baud rate to 115200
- You should see:
  ```
  ====================================
  CVACare Wearable Gait Analysis
  ====================================
  
  Connecting to WiFi: YourWiFiName
  ✓ WiFi Connected!
  IP Address: 192.168.1.101
  
  Initializing MPU6050 Sensors...
  ✓ LEFT_WAIST initialized
  ✓ RIGHT_WAIST initialized
  ...
  
  ====================================
  Starting Data Transmission...
  ====================================
  
  ✓ Data sent - Response: 200
  ```

---

## Troubleshooting

### Problem: Backend Not Receiving Data

**Check 1: Is the backend running?**
```bash
curl http://localhost:5000/api/wearable/data
```
Should return: `{}`

**Check 2: Is ESP32 on same network?**
- ESP32 and your computer must be on the same WiFi network
- Check ESP32 IP in Serial Monitor
- Try to ping ESP32: `ping 192.168.1.101`

**Check 3: Firewall blocking connection?**
- Windows: Allow Python through firewall
- Control Panel → Windows Defender Firewall → Allow an app

**Check 4: Wrong IP address in ESP32 code?**
- Run `ipconfig` again
- Make sure the IP matches exactly
- Don't use `localhost` or `127.0.0.1` in ESP32 code!

### Problem: Frontend Not Showing Data

**Check 1: Is frontend fetching from correct URL?**
- Open browser console (F12)
- Should see fetch requests to: `http://localhost:5000/api/wearable/data`

**Check 2: CORS error?**
- Check backend has `CORS(app)` enabled (already done in app.py)

**Check 3: Data format correct?**
- Backend should show received data in terminal
- Compare with expected format:
```json
{
  "LEFT_WAIST": {"ax": 1.2, "ay": -0.5, "az": 9.8, "gx": 2.3, "gy": -1.1, "gz": 0.5},
  "LEFT_FOOT_FSR": [2.1, 1.8, 2.5]
}
```

### Problem: Sensors Not Initializing

**MPU6050 not detected:**
- Check I2C connections (SDA, SCL)
- Check power supply (3.3V, GND)
- Try I2C scanner code to find addresses
- TCA9548A address should be 0x70
- MPU6050 address should be 0x68

**FSR reading 0.00V:**
- Check analog pin connections
- Check FSR is getting power
- Use multimeter to test FSR resistance

---

## Data Format Reference

### POST Data (ESP32 → Backend)
```json
{
  "LEFT_WAIST": {
    "ax": 1.23,   // Accelerometer X (m/s²)
    "ay": -0.45,  // Accelerometer Y
    "az": 9.81,   // Accelerometer Z
    "gx": 2.34,   // Gyroscope X (rad/s)
    "gy": -1.12,  // Gyroscope Y
    "gz": 0.56    // Gyroscope Z
  },
  "RIGHT_WAIST": { /* same format */ },
  "LEFT_KNEE": { /* same format */ },
  "RIGHT_KNEE": { /* same format */ },
  "LEFT_TOE": { /* same format */ },
  "RIGHT_TOE": { /* same format */ },
  "LEFT_FOOT_FSR": [2.1, 1.8, 2.5],   // [Toe, Mid, Heel] voltages
  "RIGHT_FOOT_FSR": [2.3, 1.9, 2.7]   // [Toe, Mid, Heel] voltages
}
```

### GET Data (Backend → Frontend)
Same format as POST. Returns the most recent data received from wearable.

---

## Testing Checklist

- [ ] Backend running on port 5000
- [ ] Frontend running on port 5173
- [ ] Test script sends data successfully
- [ ] Backend logs show received data
- [ ] Frontend displays sensor updates
- [ ] ESP32 connects to WiFi
- [ ] ESP32 sends data (check Serial Monitor)
- [ ] All MPU6050 sensors initialize
- [ ] All FSR sensors reading correctly
- [ ] Web page updates every second
- [ ] Toast notifications working

---

## Support

For issues:
1. Check backend terminal for error messages
2. Check frontend browser console (F12)
3. Check ESP32 Serial Monitor
4. Run test script to isolate hardware vs software issues

---

## Next Steps

After successful integration:
1. Calibrate sensors for accurate readings
2. Add data logging/storage to MongoDB
3. Implement gait analysis algorithms
4. Add real-time alerts for abnormal patterns
5. Create patient reports with gait metrics
