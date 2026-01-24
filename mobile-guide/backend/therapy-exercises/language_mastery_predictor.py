"""
Language Therapy Mastery Predictor using XGBoost
Predicts days until mastery for both Receptive and Expressive language therapy

Data Structure:
- language_trials: user_id, mode (receptive/expressive), exercise_id, exercise_index, 
                  is_correct (bool), score (0-1), user_answer, timestamp
- language_progress: user_id, mode, accuracy, completed_exercises, correct_exercises,
                    exercises{}, total_exercises

Features:
- Current accuracy rate
- Exercise completion rate
- Correct answer rate
- Average scores
- Consistency metrics
- Time-based patterns
- Exercise difficulty progression
"""

import os
import sys
from datetime import datetime, timedelta
import numpy as np
from pymongo import MongoClient
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import xgboost as xgb
import pickle
from dotenv import load_dotenv

# Load environment
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

class LanguageMasteryPredictor:
    def __init__(self, mode='receptive'):
        """
        Initialize predictor for specific therapy mode
        mode: 'receptive' or 'expressive'
        """
        self.mode = mode
        self.model = None
        self.model_path = f'models/language_{mode}_mastery_xgboost.pkl'
        
        # MongoDB connection
        mongodb_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/CVACare')
        self.client = MongoClient(mongodb_uri)
        
        # Extract database name
        if 'mongodb+srv' in mongodb_uri or 'mongodb://' in mongodb_uri:
            db_name = mongodb_uri.split('/')[-1].split('?')[0]
            if not db_name or db_name == '':
                db_name = 'CVACare'
        else:
            db_name = 'CVACare'
        
        self.db = self.client[db_name]
        self.trials_collection = self.db['language_trials']
        self.progress_collection = self.db['language_progress']
        
        # Load model if exists
        if os.path.exists(self.model_path):
            try:
                with open(self.model_path, 'rb') as f:
                    self.model = pickle.load(f)
                print(f"✅ Loaded {mode} language mastery model from {self.model_path}")
            except Exception as e:
                print(f"⚠️  Could not load model: {e}")
    
    def extract_training_data(self):
        """
        Extract training data from MongoDB
        Returns: X (features), y (days_to_mastery), user_ids
        """
        print(f"\n📊 Extracting training data for {self.mode} language therapy...")
        
        # Get all progress records for this mode
        progress_records = list(self.progress_collection.find({'mode': self.mode}))
        print(f"Found {len(progress_records)} {self.mode} progress records")
        
        if len(progress_records) == 0:
            raise ValueError(f"No progress records found for {self.mode} mode")
        
        X = []
        y = []
        user_ids = []
        
        for progress in progress_records:
            user_id = progress['user_id']
            
            # Get all trials for this user and mode
            trials = list(self.trials_collection.find({
                'user_id': user_id,
                'mode': self.mode
            }).sort('timestamp', 1))
            
            if len(trials) < 3:
                continue
            
            # Calculate days to mastery (time from first to last trial)
            first_trial_date = trials[0].get('timestamp') or trials[0].get('created_at')
            last_trial_date = trials[-1].get('timestamp') or trials[-1].get('created_at')
            
            if isinstance(first_trial_date, str):
                first_trial_date = datetime.strptime(first_trial_date, '%Y-%m-%d %H:%M:%S.%f')
            if isinstance(last_trial_date, str):
                last_trial_date = datetime.strptime(last_trial_date, '%Y-%m-%d %H:%M:%S.%f')
            
            days_to_mastery = (last_trial_date - first_trial_date).days
            if days_to_mastery < 1:
                days_to_mastery = 1
            
            # Extract features from trials
            features = self._extract_features(trials, progress)
            
            X.append(features)
            y.append(days_to_mastery)
            user_ids.append(user_id)
        
        print(f"✅ Extracted {len(X)} training samples")
        return np.array(X), np.array(y), user_ids
    
    def _extract_features(self, trials, progress):
        """Extract features from trials and progress"""
        # Convert scores to floats
        scores = [float(t.get('score', 0)) for t in trials]
        is_correct = [bool(t.get('is_correct', False)) for t in trials]
        
        # Basic statistics
        total_trials = len(trials)
        avg_score = np.mean(scores) if scores else 0
        correct_count = sum(is_correct)
        accuracy = correct_count / total_trials if total_trials > 0 else 0
        
        # Score patterns
        score_std = np.std(scores) if len(scores) > 1 else 0
        first_5_avg = np.mean(scores[:5]) if len(scores) >= 5 else avg_score
        last_5_avg = np.mean(scores[-5:]) if len(scores) >= 5 else avg_score
        
        # Improvement rate
        if len(scores) > 1:
            improvement_rate = (last_5_avg - first_5_avg) / len(scores) * 100
        else:
            improvement_rate = 0
        
        # Consistency score (lower std = more consistent)
        consistency_score = 1 - min(score_std, 1)
        
        # Streak patterns
        current_streak = 0
        max_streak = 0
        temp_streak = 0
        for correct in is_correct:
            if correct:
                temp_streak += 1
                max_streak = max(max_streak, temp_streak)
            else:
                temp_streak = 0
        current_streak = temp_streak
        
        # Practice frequency (trials per day)
        if len(trials) > 1:
            first_date = trials[0].get('timestamp') or trials[0].get('created_at')
            last_date = trials[-1].get('timestamp') or trials[-1].get('created_at')
            
            if isinstance(first_date, str):
                first_date = datetime.strptime(first_date, '%Y-%m-%d %H:%M:%S.%f')
            if isinstance(last_date, str):
                last_date = datetime.strptime(last_date, '%Y-%m-%d %H:%M:%S.%f')
            
            days_span = (last_date - first_date).days
            if days_span > 0:
                trials_per_day = total_trials / days_span
            else:
                trials_per_day = total_trials
        else:
            trials_per_day = 1
        
        # Progress-based features
        completed_exercises = progress.get('completed_exercises', 0)
        total_exercises = progress.get('total_exercises', 15)
        completion_rate = completed_exercises / total_exercises if total_exercises > 0 else 0
        
        # Exercise diversity (unique exercises attempted)
        unique_exercises = len(set(t.get('exercise_id', '') for t in trials))
        exercise_diversity = unique_exercises / total_exercises if total_exercises > 0 else 0
        
        # Recent performance (last 3 trials)
        recent_scores = scores[-3:] if len(scores) >= 3 else scores
        recent_avg = np.mean(recent_scores) if recent_scores else 0
        
        # Feature vector (20 features)
        features = [
            total_trials,                # 0: Total number of trials
            avg_score,                   # 1: Average score (0-1)
            accuracy,                    # 2: Accuracy rate (0-1)
            score_std,                   # 3: Score standard deviation
            first_5_avg,                 # 4: Average of first 5 trials
            last_5_avg,                  # 5: Average of last 5 trials
            improvement_rate,            # 6: Improvement rate
            consistency_score,           # 7: Consistency (1 - std)
            current_streak,              # 8: Current correct streak
            max_streak,                  # 9: Maximum correct streak
            trials_per_day,              # 10: Practice frequency
            completed_exercises,         # 11: Number completed
            completion_rate,             # 12: Completion percentage
            unique_exercises,            # 13: Exercise diversity count
            exercise_diversity,          # 14: Exercise diversity rate
            recent_avg,                  # 15: Recent performance
            correct_count,               # 16: Total correct answers
            len(scores) - correct_count, # 17: Total incorrect answers
            min(scores) if scores else 0,# 18: Lowest score
            max(scores) if scores else 0 # 19: Highest score
        ]
        
        return features
    
    def train_model(self):
        """Train XGBoost model"""
        print(f"\n🤖 Training {self.mode} language mastery prediction model...")
        
        # Extract training data
        X, y, user_ids = self.extract_training_data()
        
        if len(X) < 5:
            raise ValueError(f"Not enough training data. Need at least 5 samples, got {len(X)}")
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Train XGBoost model
        self.model = xgb.XGBRegressor(
            n_estimators=100,
            max_depth=5,
            learning_rate=0.1,
            random_state=42,
            objective='reg:squarederror'
        )
        
        self.model.fit(X_train, y_train)
        
        # Evaluate
        y_pred = self.model.predict(X_test)
        mae = mean_absolute_error(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        r2 = r2_score(y_test, y_pred)
        
        print(f"\n📊 Model Performance ({self.mode}):")
        print(f"   MAE: {mae:.2f} days")
        print(f"   RMSE: {rmse:.2f} days")
        print(f"   R² Score: {r2:.4f}")
        print(f"   Training samples: {len(X_train)}")
        print(f"   Test samples: {len(X_test)}")
        
        # Save model
        os.makedirs('models', exist_ok=True)
        with open(self.model_path, 'wb') as f:
            pickle.dump(self.model, f)
        
        print(f"✅ Model saved to {self.model_path}")
        
        return {
            'mae': float(mae),
            'rmse': float(rmse),
            'r2': float(r2),
            'training_samples': len(X_train),
            'test_samples': len(X_test),
            'features_used': len(X[0])
        }
    
    def predict_days_to_mastery(self, user_id):
        """
        Predict days until mastery for a user
        Returns: (predicted_days, confidence, current_progress)
        """
        print(f"\n🔮 Predicting {self.mode} language mastery for user {user_id}")
        
        # Get user trials
        trials = list(self.trials_collection.find({
            'user_id': user_id,
            'mode': self.mode
        }).sort('timestamp', 1))
        
        # Get user progress
        progress = self.progress_collection.find_one({
            'user_id': user_id,
            'mode': self.mode
        })
        
        if not progress:
            progress = {
                'completed_exercises': 0,
                'total_exercises': 15,
                'accuracy': 0,
                'correct_exercises': 0
            }
        
        # If no trials, return baseline prediction
        if len(trials) < 3:
            baseline_days = 90  # 3 months baseline
            confidence = 0.50   # Low confidence for baseline
            
            return {
                'predicted_days': baseline_days,
                'confidence': confidence,
                'current_exercises_completed': progress.get('completed_exercises', 0),
                'total_exercises': progress.get('total_exercises', 15),
                'current_accuracy': progress.get('accuracy', 0),
                'message': f'Estimated time to master {self.mode} language therapy: {baseline_days} days (baseline estimate).'
            }
        
        # Extract features
        features = self._extract_features(trials, progress)
        features_array = np.array([features])
        
        # Predict
        if self.model is None:
            raise ValueError(f"Model not loaded. Please train the model first for {self.mode} mode.")
        
        predicted_days = int(self.model.predict(features_array)[0])
        
        # Ensure reasonable bounds
        predicted_days = max(7, min(predicted_days, 365))
        
        # Calculate confidence based on data quality
        confidence = self._calculate_confidence(trials, progress)
        
        print(f"✅ Prediction: {predicted_days} days")
        print(f"   Confidence: {int(confidence * 100)}%")
        
        return {
            'predicted_days': predicted_days,
            'confidence': confidence,
            'current_exercises_completed': progress.get('completed_exercises', 0),
            'total_exercises': progress.get('total_exercises', 15),
            'current_accuracy': progress.get('accuracy', 0),
            'message': f'Estimated time to master {self.mode} language therapy: {predicted_days} days.'
        }
    
    def _calculate_confidence(self, trials, progress):
        """Calculate prediction confidence based on data quality"""
        confidence = 0.5  # Base confidence
        
        # More trials = higher confidence
        if len(trials) >= 10:
            confidence += 0.2
        elif len(trials) >= 5:
            confidence += 0.1
        
        # Consistent performance = higher confidence
        scores = [float(t.get('score', 0)) for t in trials]
        if len(scores) > 1:
            score_std = np.std(scores)
            if score_std < 0.15:
                confidence += 0.15
            elif score_std < 0.3:
                confidence += 0.1
        
        # High accuracy = higher confidence
        accuracy = progress.get('accuracy', 0)
        if accuracy >= 0.8:
            confidence += 0.15
        elif accuracy >= 0.6:
            confidence += 0.1
        
        # Completion progress = higher confidence
        completion_rate = progress.get('completed_exercises', 0) / progress.get('total_exercises', 15)
        if completion_rate >= 0.5:
            confidence += 0.1
        
        return min(confidence, 0.99)

if __name__ == "__main__":
    # Test both modes
    for mode in ['receptive', 'expressive']:
        print(f"\n{'='*70}")
        print(f"Testing {mode.upper()} Language Mastery Predictor")
        print(f"{'='*70}")
        
        predictor = LanguageMasteryPredictor(mode=mode)
        
        try:
            metrics = predictor.train_model()
            print(f"\n✅ {mode.capitalize()} model training complete!")
        except Exception as e:
            print(f"\n❌ Error training {mode} model: {e}")
