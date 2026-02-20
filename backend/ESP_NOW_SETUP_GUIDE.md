# ESP-NOW Setup Guide for CVACare Gait Analysis

## 🎯 What Changed?

Your two ESP32 devices now communicate using **ESP-NOW** for perfect synchronization:
- **LEFT_FOOT** = SLAVE (sends data via ESP-NOW)
- **RIGHT_FOOT** = MASTER (receives ESP-NOW + sends to backend)

**Result:** Both feet send data as ONE synchronized packet!

---

## 📋 Setup Steps (IMPORTANT!)

### Step 1: Upload RIGHT_FOOT Code First

1. Open `ESP32_Wearable_Code_RIGHT_FOOT.ino` in Arduino IDE
2. Select your ESP32 board and COM port
3. Upload the code
4. **Open Serial Monitor (115200 baud)**
5. **COPY THE MAC ADDRESS** displayed like this:
   ```
   📍 My MAC Address: AA:BB:CC:DD:EE:FF
   ⚠️  COPY THIS MAC to LEFT_FOOT code!
   ```

### Step 2: Update LEFT_FOOT Code with MAC Address

1. Open `ESP32_Wearable_Code_LEDT.ino` 
2. Find this line near the top:
   ```cpp
   uint8_t masterMacAddress[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};  // CHANGE THIS!
   ```
3. Replace with YOUR RIGHT_FOOT MAC address (from Step 1):
   ```cpp
   // Example: If MAC was AA:BB:CC:DD:EE:FF
   uint8_t masterMacAddress[] = {0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0xFF};
   ```
   **Note:** Add `0x` before each hex pair!

### Step 3: Upload LEFT_FOOT Code

1. Upload the modified LEFT_FOOT code to the second ESP32
2. Open Serial Monitor (115200 baud)
3. Confirm it shows:
   ```
   ✅ ESP-NOW Initialized
   ✅ Master peer registered
   --- SYSTEM READY (SLAVE MODE) ---
   ```

### Step 4: Test Communication

1. Power ON both ESP32 devices
2. Watch RIGHT_FOOT Serial Monitor
3. You should see:
   ```
   📥 LEFT_FOOT data received via ESP-NOW
   📊 COMBINED DATA (sync: YES)
      RIGHT KNEE ax:0.12 ay:0.03 az:0.98
      LEFT KNEE ax:0.15 ay:0.02 az:0.99
   📤 HTTP Response: 200
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
           ▼
┌─────────────────────┐
│  RIGHT_FOOT ESP32   │ (MASTER)
│  - RIGHT_KNEE MPU   │
│  - RIGHT_ANKLE MPU  │
│  - RIGHT_FOOT_FSR   │
│  + LEFT data        │
└──────────┬──────────┘
           │
           │ WiFi HTTP POST
           ▼
┌─────────────────────┐
│   Backend Server    │
│  (Flask Python)     │
└─────────────────────┘
```

---

## ✅ Benefits

1. **Perfect Timing**: <10ms synchronization between feet
2. **One Packet**: Backend receives all 6 sensors in one request
3. **Less WiFi Traffic**: Only master sends to backend
4. **Hardware Reliability**: Not dependent on WiFi latency

---

## 🐛 Troubleshooting

### LEFT_FOOT shows "ESP-NOW Send Error"
- Check MAC address is correct
- Make sure RIGHT_FOOT is powered ON first
- Keep devices within 100m range

### RIGHT_FOOT shows "No LEFT_FOOT data received"
- LEFT_FOOT might not be powered on
- Check MAC address configuration
- Restart both devices

### Backend shows "no data"
- Check RIGHT_FOOT WiFi credentials
- Verify backend IP address in code
- Make sure backend server is running

---

## 📊 Expected Serial Output

**LEFT_FOOT (Slave):**
```
╔════════════════════════════════════════╗
║  LEFT FOOT ESP32 (ESP-NOW SLAVE)      ║
╚════════════════════════════════════════╝
✅ MPU LEFT KNEE detected
✅ MPU LEFT ANKLE detected
✅ ADS1115 detected
✅ ESP-NOW Initialized
✅ Master peer registered

LEFT KNEE ax:0.12 ay:0.03 az:0.98 | LEFT ANKLE ax:0.15 ay:0.02 az:0.99
FSR → Toe:0.12V Mid:0.45V Heel:0.89V
📤 ESP-NOW Send Status: ✅ Success
```

**RIGHT_FOOT (Master):**
```
╔════════════════════════════════════════╗
║  RIGHT FOOT ESP32 (ESP-NOW MASTER)    ║
╚════════════════════════════════════════╝
✅ MPU RIGHT KNEE detected
✅ MPU RIGHT ANKLE detected
✅ ADS1115 detected
✅ WiFi Connected
IP: 192.168.1.100
📍 My MAC Address: AA:BB:CC:DD:EE:FF
✅ ESP-NOW Initialized

📥 LEFT_FOOT data received via ESP-NOW
============================================================
📊 COMBINED DATA (sync: YES)
   RIGHT KNEE ax:0.10 ay:0.04 az:0.97
   RIGHT ANKLE ax:0.11 ay:0.03 az:0.98
   RIGHT FSR → Toe:0.15V Mid:0.50V Heel:0.85V
   LEFT KNEE ax:0.12 ay:0.03 az:0.98
   LEFT ANKLE ax:0.15 ay:0.02 az:0.99
   LEFT FSR → Toe:0.12V Mid:0.45V Heel:0.89V
📤 HTTP Response: 200
============================================================
```

---

## 🎓 Technical Details

- **ESP-NOW Protocol**: 2.4GHz peer-to-peer communication
- **Range**: Up to 100 meters line-of-sight
- **Latency**: 1-10ms typical
- **Data Rate**: Up to 1Mbps
- **Packet Size**: 250 bytes (we use ~52 bytes)
- **No WiFi Router Needed**: Direct device-to-device

---

**Ready to test? Upload both codes and watch them sync perfectly! 🚀**
