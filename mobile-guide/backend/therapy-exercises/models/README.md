# Articulation Mastery Prediction with XGBoost

This directory contains the trained XGBoost (Gradient Boosted Regression Trees) models for predicting days until articulation mastery.

## Model Files

- `articulation_mastery_xgboost.pkl` - Trained XGBoost model (generated after first training)

## Model Details

**Algorithm**: XGBoost Gradient Boosted Regression Trees  
**Task**: Regression (predicting days to mastery)  
**Target Variable**: Days until user masters a specific sound (s, r, l, k, th)

## Features Used

The model uses 30+ features extracted from user trial history:

### Initial Performance
- First trial score
- Early average/max/min scores (first 5 trials)

### Overall Performance
- Overall average/max/min/median scores
- Sub-scores (pronunciation, accuracy, fluency, completeness)

### Improvement Metrics
- Score improvement over time
- Average improvement per trial
- Improvement rate (percentage)

### Consistency Metrics
- Score variance and standard deviation
- Consistency score (inverse of variability)

### Trial Counts
- Total trials completed
- Trials per level
- Average trials per level
- Fastest/slowest level completion

### Sound-Specific Features
- Sound difficulty rating (R=5, L=4, TH=3, S/K=2)
- One-hot encoding for each sound type

## Model Training

The model is trained on historical data from users who have completed articulation therapy (mastered all 5 levels for a sound).

**Training Data Source**:
- `articulation_trials` collection - Individual trial records
- `articulation_progress` collection - Progress tracking

**Model Performance** (typical with sufficient data):
- MAE: 2-4 days
- RMSE: 3-6 days
- R²: 0.6-0.8

## Usage

### Predict Mastery Time

```javascript
// Node.js API call
POST /api/articulation/predict-mastery
{
  "sound_id": "r"
}

// Response
{
  "success": true,
  "prediction": {
    "user_id": "...",
    "sound_id": "r",
    "predicted_days": 13,
    "confidence": 0.85,
    "current_level": 2,
    "remaining_levels": 4,
    "total_trials_completed": 15,
    "current_performance": 0.72,
    "estimated_completion_date": "2025-12-17",
    "message": "Estimated time to master the R-sound: 13 days."
  }
}
```

### Train/Retrain Model

```javascript
// Admin/Therapist only
POST /api/articulation/train-model

// Response
{
  "success": true,
  "message": "Model retrained successfully",
  "metrics": {
    "mae": 3.2,
    "rmse": 4.5,
    "r2": 0.72,
    "train_samples": 80,
    "test_samples": 20
  },
  "samples": 100
}
```

### Check Model Status

```javascript
GET /api/articulation/model-status

// Response
{
  "available": true,
  "model_loaded": true,
  "model_type": "XGBoost Gradient Boosted Regression Trees",
  "supported_sounds": ["s", "r", "l", "k", "th"],
  "message": "Model ready for predictions"
}
```

## How It Works

1. **Data Collection**: As users complete articulation trials, data is saved to `articulation_trials` and `articulation_progress` collections

2. **Feature Extraction**: When predicting, the system extracts 30+ features from the user's trial history

3. **Prediction**: XGBoost model predicts total days to mastery based on learned patterns from completed users

4. **Adjustment**: Prediction is adjusted based on current progress (remaining levels)

5. **Confidence**: System calculates confidence based on data quality and consistency

## Model Retraining

The model should be retrained periodically as more users complete therapy:

- **Frequency**: Weekly or monthly (depending on user volume)
- **Trigger**: When 10+ new users complete a sound
- **Who**: Admins or therapists via `/train-model` endpoint

## Baseline Predictions

If insufficient training data (<10 completed users), the system uses a heuristic baseline:

- **R sound**: 25 days (hardest)
- **L sound**: 20 days  
- **TH sound**: 15 days  
- **S/K sounds**: 10 days (easiest)

Adjusted by:
- User's current performance (fast/slow learner)
- Trials already completed

## Notes

- Model requires at least 10 completed users for training
- Predictions are more accurate after user completes 10+ trials
- Confidence increases with more consistent performance
- System automatically loads saved model on startup
