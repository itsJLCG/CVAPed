# Gait Analysis Service

Python Flask service for processing gyroscope and accelerometer data for gait analysis.

## Setup

### 1. Install Python Dependencies

```powershell
cd backend\gait-analysis
pip install -r requirements.txt
```

### 2. Configure Environment

Add these variables to your main `backend\.env` file:

```env
# Gait Analysis Service
GAIT_ANALYSIS_PORT=5001
GAIT_ANALYSIS_URL=http://localhost:5001
```

### 3. Run the Service

```powershell
# From backend\gait-analysis directory
python app.py
```

The service will start on `http://localhost:5001`

## API Endpoints

### Health Check
```
GET http://localhost:5001/health
```

### Analyze Gait Data
```
POST http://localhost:5001/api/gait/analyze
Content-Type: application/json

{
  "accelerometer": [
    {"x": 0.1, "y": 9.8, "z": 0.2, "timestamp": 1234567890},
    ...
  ],
  "gyroscope": [
    {"x": 0.01, "y": 0.02, "z": 0.03, "timestamp": 1234567890},
    ...
  ],
  "user_id": "user123",
  "session_id": "session456"
}
```

### Real-time Analysis
```
POST http://localhost:5001/api/gait/realtime
Content-Type: application/json

{
  "accelerometer": {"x": 0.1, "y": 9.8, "z": 0.2},
  "gyroscope": {"x": 0.01, "y": 0.02, "z": 0.03}
}
```

### Get User History
```
GET http://localhost:5001/api/gait/history/<user_id>?limit=10
```

## Integration with Node.js Backend

The Node.js backend proxies requests to this service. See `routes/gaitRoutes.js` in the main backend.

## Metrics Returned

- **step_count**: Total steps detected
- **cadence**: Steps per minute
- **stride_length**: Distance per stride (meters)
- **velocity**: Walking speed (m/s)
- **gait_symmetry**: Balance score (0-1)
- **stability_score**: Stability metric (0-1)
- **step_regularity**: Step consistency (0-1)
- **vertical_oscillation**: Vertical bounce (meters)
