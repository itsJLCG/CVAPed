# 🚀 ESP32 Wearable Setup - Quick Guide

## 📁 Files You Need

✅ **ESP32_RIGHT_FOOT_MASTER.ino** - Upload to RIGHT foot ESP32
✅ **ESP32_LEFT_FOOT_SLAVE.ino** - Upload to LEFT foot ESP32

---

## ⚡ Quick Setup (3 Steps)

### **Step 1: Start Backend (mDNS auto-starts)**
```bash
cd backend
venv\Scripts\activate
python app.py
```
You should see:
```
🌐 mDNS Service Starting...
📍 Local IP: 10.251.202.145
🔗 Hostname: cvacare.local
📡 ESP32 can connect using: http://cvacare.local:5000
```

### **Step 2: Upload RIGHT Foot Code**
1. Open `ESP32_RIGHT_FOOT_MASTER.ino` in Arduino IDE
2. **Update WiFi credentials (lines 27-28):**
   ```cpp
   const char* ssid = "YOUR_WIFI_NAME";
   const char* password = "YOUR_WIFI_PASSWORD";
   ```
3. Select board: **ESP32 Dev Module**
4. Click **Upload**
5. Open **Serial Monitor (115200 baud)**
6. **Copy the MAC address** shown (e.g., `38:18:2B:84:F8:E4`)

### **Step 3: Upload LEFT Foot Code**
1. Open `ESP32_LEFT_FOOT_SLAVE.ino` in Arduino IDE
2. **Paste RIGHT foot MAC address (line 35):**
   ```cpp
   uint8_t rightFootMacAddress[] = {0x38, 0x18, 0x2B, 0x84, 0xF8, 0xE4};
   ```
3. Select board: **ESP32 Dev Module**
4. Click **Upload**
5. Open **Serial Monitor (115200 baud)**

---

## ✅ Verify It Works

### RIGHT Foot Serial Monitor Should Show:
```
✅ WiFi Connected!
   IP Address: 10.251.202.145
   Backend: http://cvacare.local:5000
✅ ESP-NOW Ready
📍 MY MAC ADDRESS: 38:18:2B:84:F8:E4

✅ LEFT foot data received via ESP-NOW
📊 Data Sent (Sync: YES)
📤 HTTP Response: 200 ✅ OK
```

### LEFT Foot Serial Monitor Should Show:
```
✅ ESP-NOW Ready
✅ RIGHT foot registered
   MAC: 38:18:2B:84:F8:E4

📊 LEFT Knee: (0.05, 0.98, -0.02)
📊 LEFT FSR: Toe=0.15V Mid=2.34V Heel=1.89V
📤 Send Status: ✅ SUCCESS
```

---

## 🔧 Hardware Wiring

### Both ESP32s (Same Connections):
```
MPU6050 #1 (KNEE):           MPU6050 #2 (ANKLE):
  VCC → 3.3V                   VCC → 3.3V
  GND → GND                    GND → GND
  SDA → GPIO 21                SDA → GPIO 21
  SCL → GPIO 22                SCL → GPIO 22
  AD0 → GND (I2C: 0x68)        AD0 → 3.3V (I2C: 0x69)

ADS1115 (FSR Sensors):
  VDD → 3.3V
  GND → GND
  SDA → GPIO 21
  SCL → GPIO 22
  A0 → Heel FSR
  A1 → Mid FSR
  A2 → Toe FSR
```

---

## 🎯 How It Works

```
┌─────────────┐              ┌─────────────┐              ┌─────────────┐
│ LEFT FOOT   │  ESP-NOW     │ RIGHT FOOT  │   WiFi       │  Backend    │
│  (Slave)    │─────────────>│  (Master)   │─────────────>│  (mDNS)     │
└─────────────┘              └─────────────┘              └─────────────┘
  • Reads sensors              • Reads sensors              • Flask server
  • Sends via                  • Receives LEFT data         • cvacare.local
    ESP-NOW only               • Combines both              • Port 5000
  • NO WiFi needed             • Sends to backend           • Auto hostname
```

**No more IP address changes!** mDNS handles everything automatically.

---

## 🐛 Troubleshooting

### Problem: LEFT foot shows "Send Status: ❌ FAILED"
**Solution:** MAC address mismatch
1. Check RIGHT foot Serial Monitor for correct MAC
2. Update LEFT foot code with correct MAC address
3. Re-upload LEFT foot code

### Problem: RIGHT foot shows "❌ WiFi Connection FAILED!"
**Solution:** Wrong WiFi credentials
1. Check ssid and password in RIGHT foot code
2. Make sure WiFi is 2.4GHz (ESP32 doesn't support 5GHz)
3. Re-upload RIGHT foot code

### Problem: HTTP Response: 404 or connection timeout
**Solution:** Backend not running or mDNS not working
1. Make sure `python app.py` is running
2. Check you see "mDNS Service Starting..." message
3. Both ESP32 and computer on same WiFi network
4. If still fails, restart the ESP32

### Problem: Sensors not detected
**Solution:** I2C wiring issue
1. Check all connections (SDA, SCL, VCC, GND)
2. For MPU6050 #2 (ankle), make sure AD0 → 3.3V
3. Use I2C scanner sketch to verify addresses

---

## 📝 Important Notes

✅ **Always upload RIGHT foot first** - need MAC address for LEFT foot
✅ **Keep backend running** - mDNS needs to stay active
✅ **Same WiFi network** - ESP32 and computer must be on same network
✅ **2.4GHz WiFi only** - ESP32 doesn't support 5GHz networks
✅ **No code changes needed** when IP changes - mDNS handles it!

---

**🎉 That's it! Your wearable gait analysis system is ready!**
