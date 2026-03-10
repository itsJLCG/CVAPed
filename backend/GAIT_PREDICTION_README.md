# Gait Mastery Prediction System - Complete Guide

## Overview

This system provides XGBoost-based machine learning predictions for physical therapy gait rehabilitation. It predicts the number of days until a patient achieves healthy gait parameters based on their historical session data and progress patterns.

## System Architecture

```
┌──────────────────┐
│  ESP32 Wearables │
│  (6 IMU + 6 FSR) │
└────────┬─────────┘
         │
         ▼
┌─────────────────────────┐
│ hardware_gait_processor │──┐
│ (Extract Metrics)       │  │
└─────────────────────────┘  │
         │                    │
         ▼                    │
┌──────────────────────────┐ │
│  gait_problem_detector   │ │
│  (Detect Issues)         │ │──► MongoDB
└──────────────────────────┘ │   (gaitprogresses)
         │                    │
         ▼                    │
┌──────────────────────────┐ │
│  Exercise Plan Generator │ │
│  (Recommendations)       │─┘
└──────────────────────────┘
         │
         ▼
┌──────────────────────────┐
│  Gait Mastery Predictor  │◄─── User clicks "Prediction" button
│  (XGBoost ML Model)      │
└──────────────────────────┘
         │
         ▼
┌──────────────────────────┐
│  Frontend Display        │
│  - Days to mastery       │
│  - Confidence score      │
│  - Metric progress       │
└──────────────────────────┘
```

## Files Created

### 1. **gait_mastery_predictor.py** (504 lines)
   - **Location**: `backend/gait_mastery_predictor.py`
   - **Purpose**: Core XGBoost predictor class
   - **Key Methods**:
     - `extract_training_data()`: Queries MongoDB for users who achieved healthy gait
     - `_extract_features_from_sessions()`: Creates 40+ ML features from session history
     - `train_model()`: Trains XGBoost regressor with 80/20 split
     - `predict_days_to_mastery(user_id)`: Returns prediction with confidence
     - `save_model()` / `load_model()`: Persistence management

### 2. **generate_gait_training_data.py** (331 lines)
   - **Location**: `backend/generate_gait_training_data.py`
   - **Purpose**: Create synthetic training data for initial model training
   - **Why Needed**: Real users haven't completed therapy yet
   - **Output**: 150 synthetic users with realistic recovery curves
   - **Severity Levels**:
     - Mild (30-60 days): 50 users
     - Moderate (60-120 days): 50 users
     - Severe (120-180 days): 50 users

### 3. **train_gait_model.py** (194 lines)
   - **Location**: `backend/train_gait_model.py`
   - **Purpose**: Training orchestration script
   - **Workflow**:
     1. Connect to MongoDB
     2. Check data availability (synthetic or real)
     3. Train model with evaluation
     4. Report metrics (MAE, RMSE, R², MAPE)
     5. Save to `models/gait_mastery_xgboost.pkl`
     6. Test prediction on sample user

### 4. **Backend API Endpoints** (Modified `app.py`)
   - **New Initialization** (line ~145):
     ```python
     from gait_mastery_predictor import GaitMasteryPredictor
     gait_predictor = GaitMasteryPredictor(db)
     gait_predictor.load_model()
     ```
   - **New Endpoint**: `GET /api/predictions/gait`
     - Protected by `@token_required`
     - Returns: `{predicted_days, confidence, total_sessions, metric_progress, improvement_rate}`
   - **Updated Endpoint**: `GET /api/predictions`
     - Now includes gait predictions for physical therapy users

### 5. **Frontend Prediction Page** (Modified `Prediction.jsx`)
   - **New Function**: `renderGaitCard()`
     - Displays main prediction (days to mastery)
     - Shows 6-metric progress grid
     - Real-time progress bars for each metric
   - **Updated Logic**:
     - Fetches predictions for both speech and physical therapy
     - Conditional rendering based on `selectedCategory`
     - Removed "Coming Soon" message

### 6. **CSS Styling** (Modified `Prediction.css`)
   - **New Styles**:
     - `.section-icon.gait`: Cyan gradient
     - `.metric-progress-grid`: Responsive 3-column grid
     - `.metric-card`: Individual metric display with icon
     - `.metric-progress-bar`: Animated fill bars
   - **Responsive**: Collapses to 1 column on mobile

## ML Model Details

### Target Variable
- **Regression**: Predicting `days_to_mastery` (continuous)
- **Definition**: Days until all 6 gait parameters reach healthy thresholds

### Healthy Thresholds (PhysioNet Standards)
```python
HEALTHY_THRESHOLDS = {
    'cadence': 100,          # steps/min
    'velocity': 1.2,         # m/s
    'stride_length': 1.35,   # m
    'stability': 0.85,       # 0-1 scale
    'symmetry': 0.85,        # 0-1 scale
    'regularity': 0.85       # 0-1 scale
}
```

### Feature Engineering (40+ Features)

#### 1. Initial Performance (6 features)
```python
first_cadence, first_velocity, first_stride_length,
first_stability, first_symmetry, first_regularity
```

#### 2. Early Trends (6 features)
- Average metrics from first 3 sessions
- Establishes baseline patterns

#### 3. Improvement Rates (6 features)
```python
cadence_improvement_rate = (recent_avg - initial_avg) / days_elapsed
```

#### 4. Consistency (6 features)
- Variance in each metric across all sessions
- Lower variance = more consistent practice

#### 5. Problem Resolution (3 features)
```python
problems_detected = total unique problems across all sessions
problems_worsening = count of recurring problems
problem_resolution_rate = (total_problems - recent_problems) / days
```

#### 6. Engagement (3 features)
```python
sessions_per_week = total_sessions / (days_elapsed / 7)
avg_session_duration = mean(session_durations)
consistency_score = 1 - (std_dev(days_between_sessions) / mean(days_between_sessions))
```

#### 7. Patient Outcomes (4 features)
```python
avg_pain_level, avg_fatigue_level, 
avg_confidence_level, avg_motivation_level
```

#### 8. Deficit from Healthy (6 features)
```python
cadence_deficit = HEALTHY_THRESHOLDS['cadence'] - recent_cadence
```

### XGBoost Configuration
```python
xgb.XGBRegressor(
    n_estimators=100,
    max_depth=6,
    learning_rate=0.1,
    random_state=42,
    objective='reg:squarederror'
)
```

### Evaluation Metrics
- **MAE** (Mean Absolute Error): Average days off from actual
- **RMSE** (Root Mean Squared Error): Penalizes large errors
- **R²** (R-squared): Proportion of variance explained
- **MAPE** (Mean Absolute Percentage Error): % error

## Setup & Usage

### Step 1: Generate Synthetic Training Data
```bash
cd backend
python generate_gait_training_data.py
```
**Expected Output**:
```
🏥 Generating synthetic gait training data...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Generated 50 mild recovery users (30-60 days)
✅ Generated 50 moderate recovery users (60-120 days)
✅ Generated 50 severe recovery users (120-180 days)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Total users created: 150
✅ Total sessions created: 12,450
```

### Step 2: Train the Model
```bash
python train_gait_model.py
```
**Expected Output**:
```
🧠 Training Gait Mastery Prediction Model
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Data loaded: 150 users
📈 Features extracted: 120 training samples
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 Model Performance:
   MAE:  8.42 days
   RMSE: 12.35 days
   R²:   0.87
   MAPE: 9.3%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💾 Model saved: models/gait_mastery_xgboost.pkl
```

### Step 3: Restart Backend
```bash
python app.py
```
**Expected Console**:
```
🤖 Initializing XGBoost Prediction Models...
============================================================
✅ All 4 Speech XGBoost predictors loaded successfully!
   - Articulation Mastery Predictor
   - Fluency Mastery Predictor
   - Language Mastery Predictor (Receptive & Expressive)
   - Overall Speech Improvement Predictor
✅ Gait Mastery Predictor loaded successfully!
   - Physical Therapy Gait Prediction
============================================================
```

### Step 4: Test API
```bash
# Get auth token first
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'

# Get gait prediction
curl -X GET http://localhost:5000/api/predictions/gait \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response**:
```json
{
  "success": true,
  "prediction": {
    "predicted_days": 45,
    "confidence": 0.87,
    "total_sessions": 12,
    "improvement_rate": 0.025,
    "days_since_first_session": 30,
    "metric_progress": {
      "cadence": {
        "current": 95.3,
        "target": 100,
        "progress": 0.953
      },
      "velocity": {
        "current": 1.15,
        "target": 1.2,
        "progress": 0.958
      },
      "stride_length": {
        "current": 1.28,
        "target": 1.35,
        "progress": 0.948
      },
      "stability": {
        "current": 0.82,
        "target": 0.85,
        "progress": 0.965
      },
      "symmetry": {
        "current": 0.81,
        "target": 0.85,
        "progress": 0.953
      },
      "regularity": {
        "current": 0.79,
        "target": 0.85,
        "progress": 0.929
      }
    }
  }
}
```

### Step 5: Test Frontend
1. Navigate to `http://localhost:3000`
2. Login as a user with `therapyType: 'physical'` or `'both'`
3. Click "Prediction" in the navigation
4. Verify gait prediction card displays

## MongoDB Schema

### Collection: `gaitprogresses`
```javascript
{
  "_id": ObjectId("..."),
  "userId": ObjectId("..."),
  "recordedAt": ISODate("2024-01-15T10:30:00Z"),
  
  // Computed Metrics
  "cadence": 95.3,
  "velocity": 1.15,
  "stride_length": 1.28,
  "stability": 0.82,
  "symmetry": 0.81,
  "regularity": 0.79,
  "gait_score": 72.5,
  
  // Detected Issues
  "detected_problems": [
    "asymmetry",
    "low_cadence"
  ],
  
  // Patient Feedback
  "pain_level": 2,
  "fatigue_level": 3,
  "confidence_level": 4,
  "motivation_level": 5,
  
  // Session Duration
  "duration": 180  // seconds
}
```

## Frontend Features

### Prediction Page for Physical Therapy

#### Header Section
```
Physical Therapy Predictions
AI-powered gait recovery timeline based on your progress
```

#### Main Prediction Card
- **Large Number**: Days to mastery
- **Confidence Badge**: % confidence
- **Session Count**: Total sessions completed

#### Metrics Progress Grid (6 Cards)
Each card shows:
- **Icon**: Visual representation
- **Metric Name**: Cadence, Stride Length, Velocity, etc.
- **Current Value**: Real-time measurement
- **Progress Bar**: Visual fill representing % to target
- **Target Value**: Healthy threshold

#### Example Card
```
┌─────────────────────────────────────┐
│ [🏃] Cadence                        │
│                                     │
│ 95.3 steps/min                      │
│ ████████████████░░░░  95.3%         │
│ Target: 100 steps/min               │
└─────────────────────────────────────┘
```

## Error Handling

### Model Not Found
```json
{
  "success": false,
  "message": "Gait predictor not available. Model may not be trained yet."
}
```
**Solution**: Run `train_gait_model.py`

### No Sessions
```python
raise ValueError("No gait sessions found for user")
```
**Solution**: User must complete at least 1 gait analysis session

### Insufficient Data
```python
if total_sessions < 3:
    print("⚠️  Warning: Less than 3 sessions, prediction may be less accurate")
```
**Note**: Model still returns prediction but with lower confidence

## Comparison to Speech Therapy

| Aspect | Speech Therapy | Physical Therapy (Gait) |
|--------|----------------|------------------------|
| **Predictors** | 4 models (articulation, fluency, receptive, expressive, overall) | 1 model (gait_mastery_predictor) |
| **Target Variable** | `days_to_fluency`, `accuracy_improvement` | `days_to_mastery` |
| **Data Source** | `trialprogresses`, `sessions` collections | `gaitprogresses` collection |
| **Features** | 35+ (sound-specific, session patterns) | 40+ (metric trends, consistency) |
| **Thresholds** | Level 5/5, 90% accuracy | 6 healthy gait parameters |
| **Frontend** | Articulation table, fluency/language cards | Gait card + metric grid |

## Model Retraining

### When to Retrain
- Every 50 new users complete therapy
- Monthly with real data
- When MAE increases above 15 days
- When new gait metrics are added

### Retraining Script
```bash
python train_gait_model.py --use-real-data
```

### Monitoring
```python
# Check model performance
from gait_mastery_predictor import GaitMasteryPredictor
predictor = GaitMasteryPredictor(db)
predictor.load_model()
predictor.evaluate_on_recent_data(last_n_days=30)
```

## Troubleshooting

### Issue: Frontend shows "No Gait Predictions Yet"
**Causes**:
1. User has no gait sessions in database
2. Model not trained
3. Backend not restarted after training

**Solutions**:
```bash
# Check user sessions
db.gaitprogresses.count({userId: ObjectId("USER_ID")})

# Check model file exists
ls -l backend/models/gait_mastery_xgboost.pkl

# Restart backend
cd backend && python app.py
```

### Issue: Low Confidence Scores (<50%)
**Causes**:
- User has very few sessions (<5)
- Inconsistent practice patterns
- Metrics are highly variable

**Expected Behavior**: Normal for new users, confidence increases with more data

### Issue: Prediction very different from reality
**Causes**:
- User changed practice frequency
- External factors (injury, illness)
- Model trained only on synthetic data

**Solutions**:
- Retrain with real user data
- Add more features (e.g., age, injury type)
- Implement periodic recalibration

## Next Steps

### Short Term
- [ ] Add model versioning
- [ ] Implement prediction history tracking
- [ ] Add "Why this prediction?" explanation feature

### Medium Term
- [ ] Train with real user data (replace synthetic)
- [ ] Add severity classification (mild/moderate/severe)
- [ ] Implement A/B testing for model improvements

### Long Term
- [ ] Multi-model ensemble (XGBoost + Random Forest + Neural Network)
- [ ] Real-time prediction updates during sessions
- [ ] Personalized exercise recommendations based on predictions

## Related Files

- **Gait Processing**: `hardware_gait_processor.py`
- **Problem Detection**: `gait_problem_detector.py`
- **Data Generation**: `datasets/physionet_gait/gait_baselines.json`
- **Exercise Plans**: `datasets/physionet_gait/gait_exercises.json`
- **Implementation Plan**: `PHYSICAL_THERAPY_XGBOOST_IMPLEMENTATION_PLAN.md`

## Support

For issues or questions:
1. Check logs: `backend/logs/`
2. Verify MongoDB connection
3. Ensure ESP32 sensors are working
4. Review gait session data quality

---

**Last Updated**: January 2024  
**Version**: 1.0.0  
**Author**: CVAPed Development Team
