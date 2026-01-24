"""
Fluency Mastery Predictor using XGBoost
Predicts days until fluency mastery based on user's trial history
"""

import os
import pickle
from datetime import datetime, timedelta
from typing import Dict, List
import numpy as np
import pandas as pd
from pymongo import MongoClient
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

class FluencyMasteryPredictor:
    def __init__(self, mongodb_uri: str, db_name: str = 'CVACare'):
        """Initialize predictor with MongoDB connection"""
        self.client = MongoClient(mongodb_uri)
        self.db = self.client[db_name]
        self.fluency_trials_collection = self.db['fluency_trials']
        self.fluency_progress_collection = self.db['fluency_progress']
        
        self.model = None
        self.feature_columns = []
        self.model_path = os.path.join(os.path.dirname(__file__), 'models', 'fluency_mastery_xgboost.pkl')
        self.is_baseline = False
        
        print("✅ Fluency Mastery Predictor initialized")
    
    def extract_training_data(self) -> pd.DataFrame:
        """
        Extract training data from users who have mastered fluency
        Mastery = completed all levels (1-5) with consistent high scores
        """
        print("\n📊 Extracting training data from fluency trials...")
        
        training_data = []
        
        # Get all users with progress
        progress_docs = list(self.fluency_progress_collection.find({}))
        
        for progress_doc in progress_docs:
            user_id = progress_doc['user_id']
            
            # Check if user has mastered fluency (all 5 levels complete)
            levels = progress_doc.get('levels', {})
            is_mastered = all(str(level) in levels for level in range(1, 6))
            
            if not is_mastered:
                continue  # Skip incomplete progressions
            
            # Get all trials for this user
            try:
                trials = list(self.fluency_trials_collection.find({
                    'user_id': user_id
                }).sort('timestamp', 1))
            except:
                trials = list(self.fluency_trials_collection.find({
                    'user_id': user_id
                }).sort('created_at', 1))
            
            if len(trials) < 3:
                continue  # Need minimum data points
            
            # Calculate days to mastery
            first_trial_date = trials[0].get('timestamp') or trials[0].get('created_at')
            last_trial_date = trials[-1].get('timestamp') or trials[-1].get('created_at')
            
            if not first_trial_date or not last_trial_date:
                continue
            
            days_to_mastery = (last_trial_date - first_trial_date).days
            
            if days_to_mastery <= 0:
                days_to_mastery = 1  # Minimum 1 day
            
            # Extract features from progression
            features = self._extract_features_from_trials(trials)
            features['days_to_mastery'] = days_to_mastery
            features['user_id'] = user_id
            
            training_data.append(features)
        
        df = pd.DataFrame(training_data)
        print(f"✅ Extracted {len(df)} training samples")
        
        return df
    
    def _extract_features_from_trials(self, trials: List[Dict]) -> Dict:
        """
        Extract predictive features from trial history
        Features include: fluency scores, speaking rate, disfluencies, consistency
        """
        if not trials:
            return self._get_default_features()
        
        # Extract scores - handle different formats
        fluency_scores = []
        speaking_rates = []
        disfluencies = []
        pause_counts = []
        
        for trial in trials:
            if 'fluency_score' in trial:
                fluency_scores.append(trial['fluency_score'] / 100.0)  # Normalize to 0-1
            if 'speaking_rate' in trial:
                speaking_rates.append(trial['speaking_rate'])
            if 'disfluencies' in trial:
                disfluencies.append(trial['disfluencies'])
            if 'pause_count' in trial:
                pause_counts.append(trial['pause_count'])
        
        if not fluency_scores:
            return self._get_default_features()
        
        # Early performance indicators (first 5 trials)
        early_trials = trials[:5]
        early_fluency = [t.get('fluency_score', 0) / 100.0 for t in early_trials if 'fluency_score' in t]
        
        # Performance trend (improvement rate)
        if len(fluency_scores) >= 2:
            score_improvement = fluency_scores[-1] - fluency_scores[0]
            avg_improvement_per_trial = score_improvement / len(fluency_scores)
        else:
            avg_improvement_per_trial = 0
        
        # Consistency (lower variance = more consistent)
        score_variance = np.var(fluency_scores) if len(fluency_scores) > 1 else 0
        score_std = np.std(fluency_scores) if len(fluency_scores) > 1 else 0
        
        # Speaking rate metrics
        avg_speaking_rate = np.mean(speaking_rates) if speaking_rates else 120
        speaking_rate_improvement = (speaking_rates[-1] - speaking_rates[0]) if len(speaking_rates) >= 2 else 0
        
        # Disfluency metrics
        avg_disfluencies = np.mean(disfluencies) if disfluencies else 0
        disfluency_reduction = (disfluencies[0] - disfluencies[-1]) if len(disfluencies) >= 2 else 0
        
        features = {
            # Initial performance
            'first_trial_fluency': fluency_scores[0],
            'avg_early_fluency': np.mean(early_fluency) if early_fluency else fluency_scores[0],
            'first_speaking_rate': speaking_rates[0] if speaking_rates else 120,
            'first_disfluencies': disfluencies[0] if disfluencies else 0,
            
            # Overall performance
            'overall_avg_fluency': np.mean(fluency_scores),
            'best_fluency': max(fluency_scores),
            'worst_fluency': min(fluency_scores),
            'avg_speaking_rate': avg_speaking_rate,
            'avg_disfluencies': avg_disfluencies,
            'avg_pause_count': np.mean(pause_counts) if pause_counts else 0,
            
            # Improvement metrics
            'fluency_improvement_rate': avg_improvement_per_trial,
            'speaking_rate_improvement': speaking_rate_improvement,
            'disfluency_reduction': disfluency_reduction,
            
            # Consistency metrics
            'fluency_score_variance': score_variance,
            'fluency_score_std': score_std,
            'consistency_score': 1 - score_std if score_std < 1 else 0,
            
            # Practice metrics
            'total_trials': len(trials),
            'trials_per_day': len(trials) / max((trials[-1].get('timestamp', datetime.now()) - trials[0].get('timestamp', datetime.now())).days, 1) if len(trials) > 1 else 1,
            
            # Pass rate
            'pass_rate': sum(1 for t in trials if t.get('passed', False)) / len(trials) if trials else 0,
        }
        
        return features
    
    def _get_default_features(self) -> Dict:
        """Return default features for users with no trial history"""
        return {
            'first_trial_fluency': 0.5,
            'avg_early_fluency': 0.5,
            'first_speaking_rate': 120,
            'first_disfluencies': 3,
            'overall_avg_fluency': 0.5,
            'best_fluency': 0.5,
            'worst_fluency': 0.5,
            'avg_speaking_rate': 120,
            'avg_disfluencies': 3,
            'avg_pause_count': 2,
            'fluency_improvement_rate': 0,
            'speaking_rate_improvement': 0,
            'disfluency_reduction': 0,
            'fluency_score_variance': 0,
            'fluency_score_std': 0,
            'consistency_score': 0.5,
            'total_trials': 0,
            'trials_per_day': 0,
            'pass_rate': 0.5,
        }
    
    def train_model(self) -> Dict:
        """
        Train XGBoost model on historical data
        Returns training metrics
        """
        print("\n🤖 Training Fluency Mastery XGBoost Model...")
        
        # Extract training data
        df = self.extract_training_data()
        
        if len(df) < 10:
            print(f"⚠️  Insufficient training data ({len(df)} samples). Need at least 10 completed users.")
            return {
                'success': False,
                'message': 'Insufficient training data. Need at least 10 users who completed all fluency levels.'
            }
        
        # Prepare features and target
        feature_cols = [col for col in df.columns if col not in ['days_to_mastery', 'user_id']]
        X = df[feature_cols]
        y = df['days_to_mastery']
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Train XGBoost model
        self.model = XGBRegressor(
            n_estimators=100,
            max_depth=6,
            learning_rate=0.1,
            random_state=42
        )
        
        self.model.fit(X_train, y_train)
        self.feature_columns = feature_cols
        
        # Evaluate
        y_pred = self.model.predict(X_test)
        mae = mean_absolute_error(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        r2 = r2_score(y_test, y_pred)
        
        print(f"✅ Model trained successfully!")
        print(f"   MAE: {mae:.2f} days")
        print(f"   RMSE: {rmse:.2f} days")
        print(f"   R² Score: {r2:.3f}")
        
        # Save model
        self._save_model()
        
        return {
            'success': True,
            'message': 'Model trained successfully',
            'metrics': {
                'mae': mae,
                'rmse': rmse,
                'r2': r2,
                'training_samples': len(df),
                'features_used': len(feature_cols)
            }
        }
    
    def _save_model(self):
        """Save trained model to disk"""
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        
        model_data = {
            'model': self.model,
            'feature_columns': self.feature_columns,
            'trained_at': datetime.now().isoformat()
        }
        
        with open(self.model_path, 'wb') as f:
            pickle.dump(model_data, f)
        
        print(f"💾 Model saved to {self.model_path}")
    
    def load_model(self) -> bool:
        """Load trained model from disk"""
        if not os.path.exists(self.model_path):
            print("⚠️  No saved fluency model found")
            return False
        
        try:
            with open(self.model_path, 'rb') as f:
                model_data = pickle.load(f)
            
            self.model = model_data['model']
            self.feature_columns = model_data['feature_columns']
            
            print(f"✅ Fluency model loaded from {self.model_path}")
            print(f"   Trained at: {model_data['trained_at']}")
            return True
        except Exception as e:
            print(f"❌ Error loading fluency model: {e}")
            return False
    
    def predict_days_to_mastery(self, user_id: str) -> Dict:
        """
        Predict days until fluency mastery for a specific user
        Returns prediction with confidence interval
        """
        print(f"🔮 Predicting fluency mastery time for user {user_id}")
        
        # Get user's trial history
        try:
            trials = list(self.fluency_trials_collection.find({
                'user_id': user_id
            }).sort('timestamp', 1))
        except:
            trials = list(self.fluency_trials_collection.find({
                'user_id': user_id
            }).sort('created_at', 1))
        
        # Extract features
        features = self._extract_features_from_trials(trials)
        
        # Check if model is loaded
        if self.model is None:
            if not self.load_model():
                # Use baseline prediction
                return self._baseline_prediction(features, len(trials))
        
        # Create feature DataFrame
        feature_df = pd.DataFrame([features])
        feature_df = feature_df[self.feature_columns]  # Ensure correct order
        
        # Make prediction
        predicted_days = self.model.predict(feature_df)[0]
        
        # Ensure reasonable bounds
        predicted_days = max(1, min(predicted_days, 180))  # Between 1 and 180 days
        
        # Calculate confidence based on data quality
        confidence = self._calculate_confidence(trials, features)
        
        # Get current progress
        progress_doc = self.fluency_progress_collection.find_one({'user_id': user_id})
        current_level = self._get_current_level(progress_doc)
        remaining_levels = 5 - current_level + 1
        
        # Adjust prediction for remaining work
        adjusted_prediction = predicted_days * (remaining_levels / 5)
        adjusted_prediction = max(1, adjusted_prediction)
        
        result = {
            'user_id': user_id,
            'predicted_days': round(adjusted_prediction),
            'confidence': confidence,
            'current_level': current_level,
            'remaining_levels': remaining_levels,
            'total_trials_completed': len(trials),
            'current_performance': features.get('overall_avg_fluency', 0.5),
            'estimated_completion_date': (datetime.now() + timedelta(days=adjusted_prediction)).strftime('%Y-%m-%d'),
            'message': f"Estimated time to master fluency therapy: {round(adjusted_prediction)} days."
        }
        
        print(f"✅ Prediction: {round(adjusted_prediction)} days")
        print(f"   Confidence: {confidence:.0%}")
        
        return result
    
    def _baseline_prediction(self, features: Dict, total_trials: int) -> Dict:
        """
        Baseline prediction when no trained model available
        Uses heuristics based on early performance and practice frequency
        """
        avg_fluency = features.get('overall_avg_fluency', 0.5)
        
        # Base days by performance level
        if avg_fluency > 0.75:
            predicted_days = 30  # Fast learner
        elif avg_fluency > 0.60:
            predicted_days = 60  # Average progress
        else:
            predicted_days = 90  # Needs more time
        
        # Adjust based on trials completed
        if total_trials > 20:
            predicted_days *= 0.8  # Already practicing consistently
        
        return {
            'user_id': 'unknown',
            'predicted_days': round(predicted_days),
            'confidence': 0.5,
            'current_level': 1,
            'remaining_levels': 5,
            'total_trials_completed': total_trials,
            'current_performance': avg_fluency,
            'estimated_completion_date': (datetime.now() + timedelta(days=predicted_days)).strftime('%Y-%m-%d'),
            'message': f"Estimated time to master fluency therapy: {round(predicted_days)} days.",
            'note': 'Using baseline prediction (model not trained yet)'
        }
    
    def _calculate_confidence(self, trials: List[Dict], features: Dict) -> float:
        """Calculate prediction confidence based on data quality"""
        confidence = 0.5  # Base confidence
        
        # More trials = higher confidence
        if len(trials) >= 20:
            confidence += 0.2
        elif len(trials) >= 10:
            confidence += 0.1
        
        # Consistent performance
        consistency = features.get('consistency_score', 0.5)
        confidence += consistency * 0.2
        
        # Clear improvement trend
        improvement = features.get('fluency_improvement_rate', 0)
        if improvement > 0:
            confidence += 0.1
        
        # Cap at 1.0
        return min(1.0, confidence)
    
    def _get_current_level(self, progress_doc: Dict) -> int:
        """Get user's current level from progress document"""
        if not progress_doc:
            return 1
        
        levels = progress_doc.get('levels', {})
        for level in range(5, 0, -1):
            if str(level) in levels:
                return level
        
        return 1
