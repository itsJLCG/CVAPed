#!/usr/bin/env python3
"""
Overall Speech Therapy Improvement Predictor
Combines data from ALL speech therapies (articulation, fluency, receptive, expressive)
to predict weekly improvement rate and overall speech problem resolution timeline.
"""

import numpy as np
import pandas as pd
from pymongo import MongoClient
from datetime import datetime, timedelta
import os
import pickle
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

class OverallSpeechPredictor:
    """
    Predicts overall speech therapy improvement combining all therapy types
    """
    
    def __init__(self):
        # MongoDB connection - use Atlas URI
        mongodb_uri = "mongodb+srv://jhonludwiggayapa:XB3E9prtCVtGO8YT@cluster0.m9nos.mongodb.net/CVACare?retryWrites=true&w=majority&appName=Cluster0"
        self.client = MongoClient(mongodb_uri)
        self.db = self.client['CVACare']
        
        # Collections
        self.articulation_trials = self.db['articulation_trials']
        self.articulation_progress = self.db['articulation_progress']
        self.fluency_trials = self.db['fluency_trials']
        self.fluency_progress = self.db['fluency_progress']
        self.language_trials = self.db['language_trials']
        self.language_progress = self.db['language_progress']
        
        # Model
        self.model = None
        self.model_path = os.path.join(os.path.dirname(__file__), 'models', 'overall_speech_improvement_xgboost.pkl')
        
        # Load existing model if available
        if os.path.exists(self.model_path):
            try:
                with open(self.model_path, 'rb') as f:
                    self.model = pickle.load(f)
                print(f"✅ Loaded existing overall speech improvement model from {self.model_path}")
            except Exception as e:
                print(f"⚠️ Could not load model: {e}")
    
    def _get_user_data(self, user_id):
        """Get all therapy data for a user"""
        
        # Articulation data
        artic_trials = list(self.articulation_trials.find({'user_id': user_id}).sort('timestamp', 1))
        artic_progress_list = list(self.articulation_progress.find({'user_id': user_id}))
        
        # Fluency data
        fluency_trials_list = list(self.fluency_trials.find({'user_id': user_id}).sort('timestamp', 1))
        fluency_prog = self.fluency_progress.find_one({'user_id': user_id})
        
        # Language data (receptive + expressive)
        receptive_trials = list(self.language_trials.find({
            'user_id': user_id, 
            'mode': 'receptive'
        }).sort('timestamp', 1))
        receptive_prog = self.language_progress.find_one({
            'user_id': user_id,
            'mode': 'receptive'
        })
        
        expressive_trials = list(self.language_trials.find({
            'user_id': user_id,
            'mode': 'expressive'
        }).sort('timestamp', 1))
        expressive_prog = self.language_progress.find_one({
            'user_id': user_id,
            'mode': 'expressive'
        })
        
        return {
            'articulation': {'trials': artic_trials, 'progress': artic_progress_list},
            'fluency': {'trials': fluency_trials_list, 'progress': fluency_prog},
            'receptive': {'trials': receptive_trials, 'progress': receptive_prog},
            'expressive': {'trials': expressive_trials, 'progress': expressive_prog}
        }
    
    def _extract_features(self, user_data):
        """
        Extract comprehensive features from all therapy types
        Returns 35+ features combining all speech therapy data
        """
        features = {}
        
        # === ARTICULATION FEATURES ===
        artic_trials = user_data['articulation']['trials']
        artic_progress = user_data['articulation']['progress']
        
        features['artic_total_trials'] = len(artic_trials)
        features['artic_sounds_count'] = len(artic_progress)
        
        if artic_trials:
            artic_scores = [float(t.get('accuracy', 0)) for t in artic_trials]
            features['artic_avg_accuracy'] = np.mean(artic_scores) if artic_scores else 0
            features['artic_max_accuracy'] = np.max(artic_scores) if artic_scores else 0
            features['artic_recent_accuracy'] = np.mean(artic_scores[-5:]) if len(artic_scores) >= 5 else np.mean(artic_scores)
            features['artic_improvement'] = (features['artic_recent_accuracy'] - features['artic_avg_accuracy']) if features['artic_avg_accuracy'] > 0 else 0
            
            # Time-based features
            timestamps = [t['timestamp'] for t in artic_trials if 'timestamp' in t]
            if timestamps and len(timestamps) > 1:
                time_span = (timestamps[-1] - timestamps[0]).days
                features['artic_days_active'] = max(1, time_span)
                features['artic_trials_per_day'] = len(artic_trials) / features['artic_days_active']
            else:
                features['artic_days_active'] = 1
                features['artic_trials_per_day'] = len(artic_trials)
        else:
            features['artic_avg_accuracy'] = 0
            features['artic_max_accuracy'] = 0
            features['artic_recent_accuracy'] = 0
            features['artic_improvement'] = 0
            features['artic_days_active'] = 0
            features['artic_trials_per_day'] = 0
        
        # === FLUENCY FEATURES ===
        fluency_trials = user_data['fluency']['trials']
        fluency_prog = user_data['fluency']['progress']
        
        features['fluency_total_trials'] = len(fluency_trials)
        
        if fluency_prog:
            features['fluency_current_level'] = fluency_prog.get('current_level', 1)
            features['fluency_accuracy'] = fluency_prog.get('accuracy', 0)
            features['fluency_completed_exercises'] = fluency_prog.get('completed_exercises', 0)
        else:
            features['fluency_current_level'] = 1
            features['fluency_accuracy'] = 0
            features['fluency_completed_exercises'] = 0
        
        if fluency_trials:
            fluency_scores = [float(t.get('score', 0)) for t in fluency_trials]
            features['fluency_avg_score'] = np.mean(fluency_scores) if fluency_scores else 0
            features['fluency_score_std'] = np.std(fluency_scores) if len(fluency_scores) > 1 else 0
            features['fluency_recent_score'] = np.mean(fluency_scores[-5:]) if len(fluency_scores) >= 5 else np.mean(fluency_scores)
            
            timestamps = [t['timestamp'] for t in fluency_trials if 'timestamp' in t]
            if timestamps and len(timestamps) > 1:
                time_span = (timestamps[-1] - timestamps[0]).days
                features['fluency_days_active'] = max(1, time_span)
                features['fluency_trials_per_day'] = len(fluency_trials) / features['fluency_days_active']
            else:
                features['fluency_days_active'] = 1
                features['fluency_trials_per_day'] = len(fluency_trials)
        else:
            features['fluency_avg_score'] = 0
            features['fluency_score_std'] = 0
            features['fluency_recent_score'] = 0
            features['fluency_days_active'] = 0
            features['fluency_trials_per_day'] = 0
        
        # === RECEPTIVE LANGUAGE FEATURES ===
        receptive_trials = user_data['receptive']['trials']
        receptive_prog = user_data['receptive']['progress']
        
        features['receptive_total_trials'] = len(receptive_trials)
        
        if receptive_prog:
            features['receptive_accuracy'] = receptive_prog.get('accuracy', 0)
            features['receptive_completed'] = receptive_prog.get('completed_exercises', 0)
        else:
            features['receptive_accuracy'] = 0
            features['receptive_completed'] = 0
        
        if receptive_trials:
            receptive_scores = [float(t.get('score', 0)) for t in receptive_trials]
            features['receptive_avg_score'] = np.mean(receptive_scores) if receptive_scores else 0
            features['receptive_recent_score'] = np.mean(receptive_scores[-5:]) if len(receptive_scores) >= 5 else np.mean(receptive_scores)
        else:
            features['receptive_avg_score'] = 0
            features['receptive_recent_score'] = 0
        
        # === EXPRESSIVE LANGUAGE FEATURES ===
        expressive_trials = user_data['expressive']['trials']
        expressive_prog = user_data['expressive']['progress']
        
        features['expressive_total_trials'] = len(expressive_trials)
        
        if expressive_prog:
            features['expressive_accuracy'] = expressive_prog.get('accuracy', 0)
            features['expressive_completed'] = expressive_prog.get('completed_exercises', 0)
        else:
            features['expressive_accuracy'] = 0
            features['expressive_completed'] = 0
        
        if expressive_trials:
            expressive_scores = [float(t.get('score', 0)) for t in expressive_trials]
            features['expressive_avg_score'] = np.mean(expressive_scores) if expressive_scores else 0
            features['expressive_recent_score'] = np.mean(expressive_scores[-5:]) if len(expressive_scores) >= 5 else np.mean(expressive_scores)
        else:
            features['expressive_avg_score'] = 0
            features['expressive_recent_score'] = 0
        
        # === COMBINED/OVERALL FEATURES ===
        features['total_trials'] = (features['artic_total_trials'] + 
                                   features['fluency_total_trials'] + 
                                   features['receptive_total_trials'] + 
                                   features['expressive_total_trials'])
        
        # Overall average performance
        all_accuracies = []
        if features['artic_avg_accuracy'] > 0:
            all_accuracies.append(features['artic_avg_accuracy'])
        if features['fluency_accuracy'] > 0:
            all_accuracies.append(features['fluency_accuracy'])
        if features['receptive_accuracy'] > 0:
            all_accuracies.append(features['receptive_accuracy'])
        if features['expressive_accuracy'] > 0:
            all_accuracies.append(features['expressive_accuracy'])
        
        features['overall_avg_accuracy'] = np.mean(all_accuracies) if all_accuracies else 0
        features['therapy_types_active'] = len(all_accuracies)
        
        # Engagement metrics
        features['avg_trials_per_day'] = np.mean([
            features['artic_trials_per_day'],
            features['fluency_trials_per_day']
        ])
        
        # Consistency score (lower std = more consistent)
        features['consistency_score'] = 1 / (1 + features['fluency_score_std']) if features['fluency_score_std'] > 0 else 1
        
        # Recent performance trend
        recent_scores = []
        if features['artic_recent_accuracy'] > 0:
            recent_scores.append(features['artic_recent_accuracy'])
        if features['fluency_recent_score'] > 0:
            recent_scores.append(features['fluency_recent_score'])
        if features['receptive_recent_score'] > 0:
            recent_scores.append(features['receptive_recent_score'])
        if features['expressive_recent_score'] > 0:
            recent_scores.append(features['expressive_recent_score'])
        
        features['recent_overall_performance'] = np.mean(recent_scores) if recent_scores else 0
        
        return features
    
    def extract_training_data(self):
        """
        Extract training data from all users who have completed speech therapy
        Target: weeks_to_completion (how many weeks to reach 80%+ accuracy across all therapies)
        """
        print("\n📊 Extracting training data for overall speech improvement prediction...")
        
        # Get all unique user IDs from all collections
        user_ids = set()
        user_ids.update([t['user_id'] for t in self.articulation_trials.find({}, {'user_id': 1})])
        user_ids.update([t['user_id'] for t in self.fluency_trials.find({}, {'user_id': 1})])
        user_ids.update([t['user_id'] for t in self.language_trials.find({}, {'user_id': 1})])
        
        print(f"Found {len(user_ids)} unique users with therapy data")
        
        training_data = []
        
        for user_id in user_ids:
            user_data = self._get_user_data(user_id)
            
            # Calculate overall completion metrics
            total_trials = (len(user_data['articulation']['trials']) + 
                          len(user_data['fluency']['trials']) +
                          len(user_data['receptive']['trials']) +
                          len(user_data['expressive']['trials']))
            
            # Need minimum data to calculate target
            if total_trials < 10:
                continue
            
            # Extract features
            features = self._extract_features(user_data)
            
            # Calculate target: weeks to reach good performance (80%+ overall accuracy)
            # Use actual time span from first to when they reached 80%+
            all_trials = []
            all_trials.extend([(t['timestamp'], t.get('accuracy', t.get('score', 0))) 
                             for t in user_data['articulation']['trials'] if 'timestamp' in t])
            all_trials.extend([(t['timestamp'], t.get('score', 0)) 
                             for t in user_data['fluency']['trials'] if 'timestamp' in t])
            all_trials.extend([(t['timestamp'], t.get('score', 0)) 
                             for t in user_data['receptive']['trials'] if 'timestamp' in t])
            all_trials.extend([(t['timestamp'], t.get('score', 0)) 
                             for t in user_data['expressive']['trials'] if 'timestamp' in t])
            
            if not all_trials:
                continue
            
            all_trials.sort(key=lambda x: x[0])
            
            # Find when they reached 80%+ performance (moving average)
            window_size = min(10, len(all_trials) // 2)
            reached_mastery = False
            mastery_index = len(all_trials) - 1
            
            for i in range(window_size, len(all_trials)):
                window_scores = [score for _, score in all_trials[i-window_size:i]]
                if np.mean(window_scores) >= 0.8:
                    mastery_index = i
                    reached_mastery = True
                    break
            
            # Calculate weeks to completion
            first_timestamp = all_trials[0][0]
            mastery_timestamp = all_trials[mastery_index][0]
            days_to_mastery = (mastery_timestamp - first_timestamp).days
            weeks_to_completion = max(1, days_to_mastery / 7)
            
            # Add to training data
            training_data.append({
                'user_id': user_id,
                'features': features,
                'weeks_to_completion': weeks_to_completion,
                'reached_mastery': reached_mastery
            })
        
        print(f"✅ Extracted {len(training_data)} training samples")
        return training_data
    
    def train_model(self):
        """Train the overall speech improvement XGBoost model"""
        print("\n🤖 Training Overall Speech Improvement Predictor...")
        print("="*60)
        
        # Extract training data
        training_data = self.extract_training_data()
        
        if len(training_data) < 5:
            print("❌ Not enough training data (need at least 5 samples)")
            return
        
        # Prepare features and target
        feature_names = list(training_data[0]['features'].keys())
        X = np.array([[sample['features'][fname] for fname in feature_names] 
                     for sample in training_data])
        y = np.array([sample['weeks_to_completion'] for sample in training_data])
        
        print(f"📊 Training with {len(training_data)} samples, {len(feature_names)} features")
        
        # Split data
        if len(training_data) >= 10:
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        else:
            X_train, X_test, y_train, y_test = X, X, y, y
        
        # Train XGBoost model
        self.model = xgb.XGBRegressor(
            n_estimators=100,
            max_depth=6,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42
        )
        
        self.model.fit(X_train, y_train)
        
        # Evaluate
        y_pred = self.model.predict(X_test)
        mae = mean_absolute_error(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        r2 = r2_score(y_test, y_pred)
        
        print(f"\n📈 Model Performance:")
        print(f"   MAE:  {mae:.2f} weeks")
        print(f"   RMSE: {rmse:.2f} weeks")
        print(f"   R²:   {r2:.4f}")
        
        # Save model
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        with open(self.model_path, 'wb') as f:
            pickle.dump(self.model, f)
        
        print(f"\n✅ Model saved to {self.model_path}")
        print("="*60)
    
    def predict_improvement(self, user_id):
        """
        Predict overall speech therapy improvement metrics for a user
        Returns weekly improvement rate and estimated weeks to full recovery
        """
        print(f"\n🔮 Predicting overall speech improvement for user {user_id}")
        
        # Get user data
        user_data = self._get_user_data(user_id)
        
        # Calculate total trials
        total_trials = (len(user_data['articulation']['trials']) + 
                       len(user_data['fluency']['trials']) +
                       len(user_data['receptive']['trials']) +
                       len(user_data['expressive']['trials']))
        
        # If no data, return baseline
        if total_trials < 3:
            return {
                'weeks_to_completion': 24,  # 6 months baseline
                'improvement_rate_per_week': 4.17,  # ~4% per week to reach 100% in 24 weeks
                'current_overall_accuracy': 0,
                'confidence': 0.50,
                'total_trials': 0,
                'therapy_types_active': 0,
                'message': 'Baseline estimate: Continue regular practice across all speech therapies.'
            }
        
        # Extract features
        features = self._extract_features(user_data)
        
        # Predict using model
        if self.model is None:
            raise ValueError("Model not loaded. Please train the model first.")
        
        feature_names = [
            'artic_total_trials', 'artic_sounds_count', 'artic_avg_accuracy', 'artic_max_accuracy',
            'artic_recent_accuracy', 'artic_improvement', 'artic_days_active', 'artic_trials_per_day',
            'fluency_total_trials', 'fluency_current_level', 'fluency_accuracy', 'fluency_completed_exercises',
            'fluency_avg_score', 'fluency_score_std', 'fluency_recent_score', 'fluency_days_active',
            'fluency_trials_per_day', 'receptive_total_trials', 'receptive_accuracy', 'receptive_completed',
            'receptive_avg_score', 'receptive_recent_score', 'expressive_total_trials', 'expressive_accuracy',
            'expressive_completed', 'expressive_avg_score', 'expressive_recent_score', 'total_trials',
            'overall_avg_accuracy', 'therapy_types_active', 'avg_trials_per_day', 'consistency_score',
            'recent_overall_performance'
        ]
        
        features_array = np.array([[features[fname] for fname in feature_names]])
        weeks_to_completion = int(self.model.predict(features_array)[0])
        
        # Ensure reasonable bounds (1-52 weeks)
        weeks_to_completion = max(1, min(weeks_to_completion, 52))
        
        # Calculate improvement rate per week
        current_accuracy = features['overall_avg_accuracy']
        remaining_improvement = max(0, 1.0 - current_accuracy)
        improvement_rate_per_week = (remaining_improvement / weeks_to_completion) * 100 if weeks_to_completion > 0 else 0
        
        # Calculate confidence based on data quality
        confidence = 0.5
        if total_trials >= 20:
            confidence += 0.2
        elif total_trials >= 10:
            confidence += 0.1
        
        if features['therapy_types_active'] >= 3:
            confidence += 0.15
        elif features['therapy_types_active'] >= 2:
            confidence += 0.1
        
        if features['consistency_score'] > 0.7:
            confidence += 0.15
        
        confidence = min(1.0, confidence)
        
        print(f"✅ Weeks to completion: {weeks_to_completion}")
        print(f"   Improvement rate: {improvement_rate_per_week:.1f}% per week")
        print(f"   Confidence: {int(confidence * 100)}%")
        
        return {
            'weeks_to_completion': weeks_to_completion,
            'improvement_rate_per_week': round(improvement_rate_per_week, 2),
            'current_overall_accuracy': round(current_accuracy * 100, 1),
            'confidence': confidence,
            'total_trials': total_trials,
            'therapy_types_active': features['therapy_types_active'],
            'articulation_accuracy': round(features['artic_avg_accuracy'] * 100, 1),
            'fluency_accuracy': round(features['fluency_accuracy'] * 100, 1),
            'receptive_accuracy': round(features['receptive_accuracy'] * 100, 1),
            'expressive_accuracy': round(features['expressive_accuracy'] * 100, 1),
            'message': f'Estimated {weeks_to_completion} weeks to complete overall speech therapy with {improvement_rate_per_week:.1f}% improvement per week.'
        }


if __name__ == '__main__':
    predictor = OverallSpeechPredictor()
    predictor.train_model()
