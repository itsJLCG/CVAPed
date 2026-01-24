# Hardware Gait Analysis - Integration Guide

## Overview
This system processes data from **6 IMU sensors (MPU6050) + 6 FSR sensors** on ESP32 to generate the **exact same gait metrics** as your mobile app, saving to the same MongoDB collection.

---

## MongoDB Structure

Both mobile and hardware save to the **same collection**: `gait_progress`

### Document Schema:
```javascript
{
  _id: ObjectId("..."),
  user_id: "69248d858f8e9b6567d6db73",
  session_id: "hardware_session_1764085774105",
  metrics: {
    step_count: 32,
    cadence: 28.24,              // steps per minute
    stride_length: 0.64,         // meters
    velocity: 0.3,               // m/s
    gait_symmetry: 0.83,         // 0-1 score
    stability_score: 0.8,        // 0-1 score
    step_regularity: 0.52,       // 0-1 score
    vertical_oscillation: 0.02,  // meters
    heading_variation: 0,        // requires magnetometer
    elevation_change: 0,         // requires barometer
    pedometer_steps: 0           // hardware doesn't have this
  },
  sensors_used: {
    accelerometer: true,
    gyroscope: true,
    magnetometer: false,
    barometer: false,
    deviceMotion: false,
    pedometer: false
  },
  gait_phases: [
    {
      step_number: 1,
      start_index: 4,
      end_index: 20,
      duration: 16,
      phase: "stance"
    },
    {
      step_number: 1,
      start_index: 20,
      end_index: 35,
      duration: 15,
      phase: "swing"
    },
    // ... more phases
  ],
  analysis_duration: 68,         // seconds
  data_quality: "excellent",     // "excellent", "good", "fair", "poor"
  detected_problems: [],         // array of problem objects
  problem_summary: {},
  created_at: ISODate("2025-11-25T15:49:36.165Z"),
  updated_at: ISODate("2025-11-25T15:49:36.178Z")
}
```

---

## API Endpoints

### 1. Analyze Hardware Gait Data
**POST** `/api/hardware/gait/analyze`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "sensors": {
    "LEFT_WAIST": [
      {
        "timestamp": 1764085774105,
        "ax": 0.12,
        "ay": 0.05,
        "az": 9.85,
        "gx": 0.01,
        "gy": -0.02,
        "gz": 0.00
      },
      // ... more readings (collect 30-60 seconds)
    ],
    "RIGHT_WAIST": [ /* same format */ ],
    "LEFT_KNEE": [ /* same format */ ],
    "RIGHT_KNEE": [ /* same format */ ],
    "LEFT_TOE": [ /* same format */ ],
    "RIGHT_TOE": [ /* same format */ ]
  },
  "fsr": {
    "LEFT_HEEL": [450, 455, 460, ...],
    "LEFT_MID": [320, 325, 318, ...],
    "LEFT_TOE": [180, 185, 182, ...],
    "RIGHT_HEEL": [440, 445, 438, ...],
    "RIGHT_MID": [315, 320, 312, ...],
    "RIGHT_TOE": [175, 180, 178, ...]
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Hardware gait analysis completed",
  "data": {
    "session_id": "hardware_session_1764085774105",
    "user_id": "69248d858f8e9b6567d6db73",
    "metrics": {
      "step_count": 32,
      "cadence": 28.24,
      "stride_length": 0.64,
      "velocity": 0.3,
      "gait_symmetry": 0.83,
      "stability_score": 0.8,
      "step_regularity": 0.52,
      "vertical_oscillation": 0.02,
      "heading_variation": 0,
      "elevation_change": 0,
      "pedometer_steps": 0
    },
    "sensors_used": { /* ... */ },
    "gait_phases": [ /* ... */ ],
    "analysis_duration": 68,
    "data_quality": "excellent"
  },
  "gait_id": "6925d0104847dbcdafefbbf5"
}
```

### 2. Get Gait History
**GET** `/api/hardware/gait/history`

Returns all gait records (both mobile and hardware) for the authenticated user.

---

## Frontend Implementation

### ESP32 → Frontend → Backend Flow

```javascript
// 1. Collect sensor data from ESP32 (WebSocket or HTTP)
const sensorBuffer = {
  LEFT_WAIST: [],
  RIGHT_WAIST: [],
  LEFT_KNEE: [],
  RIGHT_KNEE: [],
  LEFT_TOE: [],
  RIGHT_TOE: []
};

const fsrBuffer = {
  LEFT_HEEL: [],
  LEFT_MID: [],
  LEFT_TOE: [],
  RIGHT_HEEL: [],
  RIGHT_MID: [],
  RIGHT_TOE: []
};

// 2. Buffer data for 30-60 seconds
function bufferSensorData(data) {
  const timestamp = Date.now();
  
  // Add IMU data
  Object.keys(data.sensors).forEach(sensor => {
    sensorBuffer[sensor].push({
      timestamp: timestamp,
      ax: data.sensors[sensor].ax,
      ay: data.sensors[sensor].ay,
      az: data.sensors[sensor].az,
      gx: data.sensors[sensor].gx,
      gy: data.sensors[sensor].gy,
      gz: data.sensors[sensor].gz
    });
  });
  
  // Add FSR data
  Object.keys(data.fsr).forEach(sensor => {
    fsrBuffer[sensor].push(data.fsr[sensor]);
  });
}

// 3. Send to backend for analysis
async function analyzeGait() {
  const token = localStorage.getItem('token');
  
  const response = await fetch('http://localhost:5000/api/hardware/gait/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      sensors: sensorBuffer,
      fsr: fsrBuffer
    })
  });
  
  const result = await response.json();
  console.log('Gait Analysis Result:', result);
  
  // Display metrics to user
  displayGaitMetrics(result.data.metrics);
}
```

---

## Key Algorithms Used

### 1. **Step Detection**
- Uses accelerometer magnitude with bandpass filter (0.5-3 Hz)
- Peak detection identifies heel strikes
- FSR sensors validate stance phase

### 2. **Bilateral Symmetry**
- Compares LEFT_WAIST vs RIGHT_WAIST acceleration patterns
- Calculates correlation coefficient
- Converts to 0-1 symmetry score

### 3. **Stride Length Estimation**
- Inverted pendulum model: `stride_length ≈ k * √(vertical_variance)`
- Empirical constant k ≈ 0.5 for normal walking

### 4. **Stability Score**
- Measures smoothness of acceleration (inverse of jerk)
- Lower jerk = higher stability

### 5. **Step Regularity**
- Calculates coefficient of variation of step durations
- Lower CV = more regular steps

---

## Data Quality Requirements

For analysis to succeed:
- **Minimum duration:** 10 seconds
- **Minimum steps:** 5 steps
- **Minimum data points:** 50 readings per sensor
- **Normal cadence:** 60-150 steps/minute

Quality ratings:
- **Excellent:** >30s duration, >20 steps
- **Good:** >15s duration, >10 steps
- **Fair:** >10s duration, >5 steps
- **Poor:** Below minimum thresholds

---

## Testing

### Test with Sample Data:

```python
# backend/test_hardware_gait.py
import requests
import numpy as np
import json

# Generate fake sensor data for testing
def generate_test_data(duration=30, frequency=50):
    """Generate 30 seconds of fake IMU data at 50 Hz"""
    num_samples = duration * frequency
    timestamps = [int(1764085774105 + i * (1000/frequency)) for i in range(num_samples)]
    
    # Simulate walking acceleration (sinusoidal with noise)
    t = np.linspace(0, duration, num_samples)
    walking_freq = 1.5  # 1.5 Hz = 90 steps/min
    
    sensors = {}
    for sensor in ['LEFT_WAIST', 'RIGHT_WAIST', 'LEFT_KNEE', 'RIGHT_KNEE', 'LEFT_TOE', 'RIGHT_TOE']:
        phase_offset = 0 if 'LEFT' in sensor else np.pi  # Left/right alternation
        
        sensors[sensor] = [
            {
                'timestamp': timestamps[i],
                'ax': 0.1 * np.sin(2*np.pi*walking_freq*t[i] + phase_offset) + np.random.normal(0, 0.05),
                'ay': 0.2 * np.sin(2*np.pi*walking_freq*t[i]) + np.random.normal(0, 0.05),
                'az': 9.8 + 0.5 * np.sin(2*np.pi*walking_freq*t[i]) + np.random.normal(0, 0.1),
                'gx': 0.01 * np.random.randn(),
                'gy': 0.01 * np.random.randn(),
                'gz': 0.01 * np.random.randn()
            }
            for i in range(num_samples)
        ]
    
    # Simulate FSR data (heel strikes)
    fsr = {
        f'{side}_{part}': [
            int(500 * max(0, np.sin(2*np.pi*walking_freq*t[i] + (0 if side == 'LEFT' else np.pi))))
            for i in range(num_samples)
        ]
        for side in ['LEFT', 'RIGHT']
        for part in ['HEEL', 'MID', 'TOE']
    }
    
    return {'sensors': sensors, 'fsr': fsr}

# Send test request
token = "YOUR_JWT_TOKEN_HERE"
data = generate_test_data(duration=30)

response = requests.post(
    'http://localhost:5000/api/hardware/gait/analyze',
    headers={
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    },
    json=data
)

print(json.dumps(response.json(), indent=2))
```

---

## Next Steps

1. **ESP32 Setup:** Configure ESP32 to send real-time data to frontend via WiFi
2. **Frontend Buffer:** Implement 30-60 second data collection before analysis
3. **Real-time Display:** Show live sensor status and step counter during recording
4. **Problem Detection:** Integrate mobile's `problem_detector.py` for clinical insights
5. **FSR Enhancement:** Improve stance/swing detection using FSR pressure thresholds

---

## Advantages Over Mobile

✅ **Bilateral Analysis:** Compare left vs right leg independently  
✅ **FSR Pressure Data:** Precise ground contact detection  
✅ **Multiple Body Points:** More accurate gait phase detection  
✅ **Clinical Grade:** Suitable for medical assessments  
✅ **Same Database:** Seamless integration with mobile data
