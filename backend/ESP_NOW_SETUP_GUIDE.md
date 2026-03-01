# ESP-NOW Setup Guide for CVACare Gait Analysis

## 🎯 What Changed?

Your three ESP32 devices now communicate using **ESP-NOW** for perfect synchronization:
- **WAIST** = MASTER (receives ESP-NOW from both feet + sends to backend via WiFi)
- **LEFT_FOOT** = SLAVE (sends data via ESP-NOW to waist)
- **RIGHT_FOOT** = SLAVE (sends data via ESP-NOW to waist)

**Result:** All sensors (waist + both feet) send data as ONE synchronized packet!

---

## 📋 Setup Steps (IMPORTANT!)

### Step 1: Upload WAIST Code First

1. Open `ESP32_WAIST_MASTER.ino` in Arduino IDE
2. Select your ESP32 board and COM port
3. Upload the code
4. **Open Serial Monitor (115200 baud)**
5. **COPY THE MAC ADDRESS** displayed like this:
   ```
   📍 MY MAC ADDRESS (Copy to BOTH foot ESP32s):
      AA:BB:CC:DD:EE:FF
   ```

### Step 2: Update LEFT_FOOT Code with MAC Address

1. Open `ESP32_LEFT_FOOT_SLAVE.ino` 
2. Find this line near the top:
   ```cpp
   uint8_t waistMacAddress[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};  // CHANGE THIS!
   ```
3. Replace with YOUR WAIST MAC address (from Step 1):
   ```cpp
   // Example: If MAC was AA:BB:CC:DD:EE:FF
   uint8_t waistMacAddress[] = {0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0xFF};
   ```
   **Note:** Add `0x` before each hex pair!

### Step 3: Update RIGHT_FOOT Code with Same MAC Address

1. Open `ESP32_RIGHT_FOOT_SLAVE.ino`
2. Find the same line:
   ```cpp
   uint8_t waistMacAddress[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};  // CHANGE THIS!
   ```
3. Replace with YOUR WAIST MAC address (same as LEFT_FOOT):
   ```cpp
   uint8_t waistMacAddress[] = {0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0xFF};
   ```

### Step 4: Upload BOTH Foot Codes

1. Upload LEFT_FOOT code to the left foot ESP32
2. Upload RIGHT_FOOT code to the right foot ESP32
3. Open Serial Monitors (115200 baud) for both
4. Confirm each shows:
   ```
   ✅ ESP-NOW Ready
   ✅ WAIST registered
   SYSTEM READY - SENDING TO WAIST
   ```

### Step 5: Test Communication

1. Power ON all three ESP32 devices
2. Watch WAIST Serial Monitor
3. You should see:
   ```
   ✅ LEFT foot data received
   ✅ RIGHT foot data received
   📊 Data Sent (Sync: L=✓ R=✓)
      WAIST: L(0.12,0.03,0.98) R(0.10,0.04,0.97)
      LEFT:  Knee(0.15,0.02,0.99) FSR(0.12,0.45,0.89)
      RIGHT: Knee(0.11,0.03,0.98) FSR(0.15,0.50,0.85)
   📤 HTTP Response: 200 ✅ OK
   ```

---

## 🔧 How It Works

```
┌─────────────────────┐
│   LEFT_FOOT ESP32   │ (SLAVE)
│  - LEFT_KNEE MPU    │
│  - LEFT_ANKLE MPU   │
│  - LEFT_FOOT_FSR    │
└──────────┬──────────┘
           │
           │ ESP-NOW (~1-5ms)
           │
           ▼
┌─────────────────────┐      ┌─────────────────────┐
│    WAIST ESP32      │◄─────┤  RIGHT_FOOT ESP32   │ (SLAVE)
│  - LEFT_WAIST MPU   │      │  - RIGHT_KNEE MPU   │
│  - RIGHT_WAIST MPU  │      │  - RIGHT_ANKLE MPU  │
│  + LEFT data        │      │  - RIGHT_FOOT_FSR   │
│  + RIGHT data       │      └─────────────────────┘
└──────────┬──────────┘
           │
           │ WiFi HTTP POST
           ▼
┌─────────────────────┐
│   Backend Server    │
│  (Flask Python)     │
│  cvacare.local:5000 │
└─────────────────────┘
```

---

## ✅ Benefits

1. **Perfect Timing**: <10ms synchronization between all sensors
2. **One Packet**: Backend receives all 8 sensors (2 waist + 6 foot sensors) in one request
3. **Less WiFi Traffic**: Only master (waist) sends to backend
4. **Better Positioning**: Waist sensor is more stable/central than foot sensors
5. **Scalability**: Easy to add more slave devices if needed

---

## 🐛 Troubleshooting

### LEFT_FOOT shows "ESP-NOW Send Error"
- Check MAC address matches WAIST's MAC
- Make sure WAIST is powered ON first
- Keep devices within 100m range

### RIGHT_FOOT shows "ESP-NOW Send Error"
- Same as above - verify WAIST MAC address
- Restart WAIST device first, then foot devices

### WAIST shows "No LEFT/RIGHT foot data received"
- Foot devices might not be powered on
- Check MAC address configuration in foot codes
- Verify all three devices are using same WiFi channel (ESP-NOW uses WiFi radio)

### Backend shows "no data"
- Check WAIST WiFi credentials in code
- Verify backend server is running (`python app.py`)
- Check mDNS is working: `ping cvacare.local`
- If mDNS fails, use IP address instead

---

## 📊 Expected Serial Output

**LEFT_FOOT (Slave):**
```
╔════════════════════════════════════════╗
║    LEFT FOOT ESP32 (SLAVE)            ║
╚════════════════════════════════════════╝

📍 My MAC Address:
   12:34:56:78:9A:BC

🔍 Detecting Sensors...
  ✅ LEFT KNEE (MPU6050)
  ✅ LEFT ANKLE (MPU6050)
  ✅ LEFT FOOT FSR (ADS1115)

🔗 Initializing ESP-NOW...
✅ ESP-NOW Ready

📡 Registering WAIST peer...
✅ WAIST registered
   MAC: AA:BB:CC:DD:EE:FF

════════════════════════════════════════
  SYSTEM READY - SENDING TO WAIST
════════════════════════════════════════

════════════════════════════════════════
📊 LEFT Knee: (0.12, 0.03, 0.98)
📊 LEFT Ankle: (0.15, 0.02, 0.99)
📊 LEFT FSR: Toe=0.12V Mid=0.45V Heel=0.89V
📤 Send Status: ✅ SUCCESS
════════════════════════════════════════
```

**RIGHT_FOOT (Slave):**
```
╔════════════════════════════════════════╗
║   RIGHT FOOT ESP32 (SLAVE)            ║
╚════════════════════════════════════════╝

📍 My MAC Address:
   AB:CD:EF:12:34:56

🔍 Detecting Sensors...
  ✅ RIGHT KNEE (MPU6050)
  ✅ RIGHT ANKLE (MPU6050)
  ✅ RIGHT FOOT FSR (ADS1115)

🔗 Initializing ESP-NOW...
✅ ESP-NOW Ready

📡 Registering WAIST peer...
✅ WAIST registered
   MAC: AA:BB:CC:DD:EE:FF

════════════════════════════════════════
  SYSTEM READY - SENDING TO WAIST
════════════════════════════════════════

════════════════════════════════════════
📊 RIGHT Knee: (0.10, 0.04, 0.97)
📊 RIGHT Ankle: (0.11, 0.03, 0.98)
📊 RIGHT FSR: Toe=0.15V Mid=0.50V Heel=0.85V
📤 Send Status: ✅ SUCCESS
════════════════════════════════════════
```

**WAIST (Master):**
```
╔════════════════════════════════════════╗
║     WAIST ESP32 (MASTER)              ║
╚════════════════════════════════════════╝

🔍 Detecting Sensors...
  ✅ LEFT_WAIST (MPU6050)
  ✅ RIGHT_WAIST (MPU6050)

📡 Connecting to WiFi...
..........
✅ WiFi Connected!
   IP Address: 192.168.1.100
   Gateway: 192.168.1.1
   Backend: http://cvacare.local:5000

🔗 Initializing ESP-NOW...
✅ ESP-NOW Ready

📍 MY MAC ADDRESS (Copy to BOTH foot ESP32s):
   AA:BB:CC:DD:EE:FF

════════════════════════════════════════
  SYSTEM READY - WAITING FOR DATA
════════════════════════════════════════

✅ LEFT foot data received
✅ RIGHT foot data received
════════════════════════════════════════
📊 Data Sent (Sync: L=✓ R=✓)
   WAIST: L(0.12,0.03,0.98) R(0.10,0.04,0.97)
   LEFT:  Knee(0.12,0.03,0.98) FSR(0.12,0.45,0.89)
   RIGHT: Knee(0.10,0.04,0.97) FSR(0.15,0.50,0.85)
📤 HTTP Response: 200 ✅ OK
════════════════════════════════════════
```

---

## 🎓 Technical Details

- **ESP-NOW Protocol**: 2.4GHz peer-to-peer communication
- **Range**: Up to 100 meters line-of-sight
- **Latency**: 1-10ms typical
- **Data Rate**: Up to 1Mbps
- **Packet Size**: 250 bytes max (LEFT uses ~60 bytes, RIGHT uses ~60 bytes)
- **No WiFi Router Needed**: Direct device-to-device communication
- **Architecture**: Hub-and-spoke (WAIST is hub, feet are spokes)
- **Backend Protocol**: HTTP POST with JSON over mDNS (cvacare.local)

### Data Structure Sent to Backend

```json
{
  "device_id": "WAIST_MASTER",
  "timestamp": 12345678,
  "synchronized": true,
  "LEFT_WAIST": {
    "ax": 0.12, "ay": 0.03, "az": 0.98,
    "gx": 1.5, "gy": -0.2, "gz": 0.1
  },
  "RIGHT_WAIST": {
    "ax": 0.10, "ay": 0.04, "az": 0.97,
    "gx": 1.4, "gy": -0.3, "gz": 0.2
  },
  "LEFT_KNEE": {
    "ax": 0.15, "ay": 0.02, "az": 0.99,
    "gx": 2.1, "gy": 0.1, "gz": -0.5
  },
  "LEFT_ANKLE": {
    "ax": 0.13, "ay": 0.01, "az": 1.00,
    "gx": 3.2, "gy": 0.5, "gz": -1.0
  },
  "LEFT_FOOT_FSR": [0.12, 0.45, 0.89],
  "RIGHT_KNEE": {
    "ax": 0.11, "ay": 0.03, "az": 0.98,
    "gx": 2.0, "gy": 0.2, "gz": -0.4
  },
  "RIGHT_ANKLE": {
    "ax": 0.14, "ay": 0.02, "az": 0.99,
    "gx": 3.1, "gy": 0.4, "gz": -0.9
  },
  "RIGHT_FOOT_FSR": [0.15, 0.50, 0.85]
}
```

**Note:** FSR arrays are `[toe, mid, heel]` in volts

---

**Ready to test? Upload all three codes and watch them sync perfectly! 🚀**
