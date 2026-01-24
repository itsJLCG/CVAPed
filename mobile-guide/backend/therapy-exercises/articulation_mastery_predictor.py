"""
Articulation Mastery Prediction using XGBoost (Gradient Boosted Regression Trees)
Predicts days until mastery for specific articulation sounds (s, r, l, k, th)
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import pickle
import os
from bson import ObjectId

class ArticulationMasteryPredictor:
    """
    Predicts days until articulation mastery using XGBoost Gradient Boosted Regression Trees
    Uses historical trial data from articulation_trials and articulation_progress collections
    """
    
    def __init__(self, db):
        self.db = db
        self.articulation_trials_collection = db['articulation_trials']
        self.articulation_progress_collection = db['articulation_progress']
        self.model = None
        self.feature_columns = []
        self.model_path = os.path.join(os.path.dirname(__file__), 'models', 'articulation_mastery_xgboost.pkl')
        
    def extract_training_data(self) -> pd.DataFrame:
        """
        Extract training data from MongoDB collections
        Creates dataset with user progression history
        """
        print("📊 Extracting training data from database...")
        
        training_data = []
        
        # Get all users with completed sounds (mastery achieved)
        progress_docs = list(self.articulation_progress_collection.find({}))
        
        for progress_doc in progress_docs:
            user_id = progress_doc['user_id']
            sound_id = progress_doc['sound_id']
            
            # Check if user has mastered this sound (all 5 levels complete)
            levels = progress_doc.get('levels', {})
            is_mastered = all(
                levels.get(str(level), {}).get('is_complete', False) 
                for level in range(1, 6)
            )
            
            if not is_mastered:
                continue  # Skip incomplete progressions
            
            # Get all trials for this user and sound (handle both timestamp and created_at)
            try:
                trials = list(self.articulation_trials_collection.find({
                    'user_id': user_id,
                    'sound_id': sound_id
                }).sort('timestamp', 1))
            except:
                trials = list(self.articulation_trials_collection.find({
                    'user_id': user_id,
                    'sound_id': sound_id
                }).sort('created_at', 1))
            
            if len(trials) < 3:
                continue  # Need minimum data points
            
            # Calculate days to mastery (handle both timestamp and created_at)
            first_trial_date = trials[0].get('timestamp') or trials[0].get('created_at')
            last_trial_date = trials[-1].get('timestamp') or trials[-1].get('created_at')
            
            if not first_trial_date or not last_trial_date:
                continue  # Skip if no date fields
            
            days_to_mastery = (last_trial_date - first_trial_date).days
            
            if days_to_mastery <= 0:
                days_to_mastery = 1  # Minimum 1 day
            
            # Extract features from progression
            features = self._extract_features_from_trials(trials, sound_id)
            features['days_to_mastery'] = days_to_mastery
            features['user_id'] = user_id
            features['sound_id'] = sound_id
            
            training_data.append(features)
        
        df = pd.DataFrame(training_data)
        print(f"✅ Extracted {len(df)} training samples")
        
        return df
    
    def _extract_features_from_trials(self, trials: List[Dict], sound_id: str) -> Dict:
        """
        Extract predictive features from trial history
        These features help predict how quickly a user will master the sound
        Handles both formats: Azure trials (pronunciation_score) and generated trials (scores.computed_score)
        """
        if not trials:
            return self._get_default_features(sound_id)
        
        # Extract scores - handle both formats
        scores = []
        for trial in trials:
            if 'scores' in trial and 'computed_score' in trial['scores']:
                # Generated trial format
                scores.append(trial['scores']['computed_score'])
            elif 'pronunciation_score' in trial:
                # Azure/real trial format
                scores.append(trial['pronunciation_score'])
            elif 'accuracy_score' in trial:
                # Fallback to accuracy_score
                scores.append(trial['accuracy_score'])
        
        if not scores:
            return self._get_default_features(sound_id)
        
        # Early performance indicators (first 5 trials)
        early_trials = trials[:5]
        early_scores = []
        for t in early_trials:
            if 'scores' in t and 'computed_score' in t['scores']:
                early_scores.append(t['scores']['computed_score'])
            elif 'pronunciation_score' in t:
                early_scores.append(t['pronunciation_score'])
            elif 'accuracy_score' in t:
                early_scores.append(t['accuracy_score'])
        
        # Performance trend (improvement rate)
        if len(scores) >= 2:
            score_improvement = scores[-1] - scores[0]
            avg_improvement_per_trial = score_improvement / len(scores)
        else:
            avg_improvement_per_trial = 0
        
        # Consistency (lower variance = more consistent)
        score_variance = np.var(scores) if len(scores) > 1 else 0
        score_std = np.std(scores) if len(scores) > 1 else 0
        
        # Calculate level-specific metrics
        level_progression = self._calculate_level_progression(trials)
        
        features = {
            # Initial performance
            'first_trial_score': scores[0],
            'early_avg_score': np.mean(early_scores) if early_scores else scores[0],
            'early_max_score': np.max(early_scores) if early_scores else scores[0],
            'early_min_score': np.min(early_scores) if early_scores else scores[0],
            
            # Overall performance
            'overall_avg_score': np.mean(scores),
            'overall_max_score': np.max(scores),
            'overall_min_score': np.min(scores),
            'median_score': np.median(scores),
            
            # Improvement metrics
            'score_improvement': score_improvement if len(scores) >= 2 else 0,
            'avg_improvement_per_trial': avg_improvement_per_trial,
            'improvement_rate': avg_improvement_per_trial / max(scores[0], 0.01),  # Percentage improvement
            
            # Consistency metrics
            'score_variance': score_variance,
            'score_std': score_std,
            'consistency_score': 1 - min(score_std, 1),  # Higher = more consistent
            
            # Trial counts
            'total_trials': len(trials),
            'trials_per_level': len(trials) / 5,
            
            # Level progression
            'avg_trials_per_level': level_progression['avg_trials_per_level'],
            'fastest_level_completion': level_progression['fastest_level'],
            'slowest_level_completion': level_progression['slowest_level'],
            
            # Sub-scores (pronunciation, accuracy, fluency, completeness)
            'avg_pronunciation': np.mean([t['scores'].get('pronunciation_score', 0) for t in trials if 'scores' in t]),
            'avg_accuracy': np.mean([t['scores'].get('accuracy_score', 0) for t in trials if 'scores' in t]),
            'avg_fluency': np.mean([t['scores'].get('fluency_score', 0) for t in trials if 'scores' in t]),
            'avg_completeness': np.mean([t['scores'].get('completeness_score', 0) for t in trials if 'scores' in t]),
            
            # Sound-specific difficulty encoding
            'sound_difficulty': self._get_sound_difficulty(sound_id),
            'is_sound_s': 1 if sound_id == 's' else 0,
            'is_sound_r': 1 if sound_id == 'r' else 0,
            'is_sound_l': 1 if sound_id == 'l' else 0,
            'is_sound_k': 1 if sound_id == 'k' else 0,
            'is_sound_th': 1 if sound_id == 'th' else 0,
        }
        
        return features
    
    def _calculate_level_progression(self, trials: List[Dict]) -> Dict:
        """Calculate how quickly user progresses through levels"""
        level_trials = {}
        for trial in trials:
            level = trial.get('level', 1)
            if level not in level_trials:
                level_trials[level] = []
            level_trials[level].append(trial)
        
        trials_per_level = [len(level_trials.get(i, [])) for i in range(1, 6)]
        
        return {
            'avg_trials_per_level': np.mean(trials_per_level) if trials_per_level else 5,
            'fastest_level': min(trials_per_level) if trials_per_level else 3,
            'slowest_level': max(trials_per_level) if trials_per_level else 10
        }
    
    def _get_sound_difficulty(self, sound_id: str) -> int:
        """
        Assign difficulty rating based on speech therapy literature
        R and L are typically hardest, TH moderate, S and K easier
        """
        difficulty_map = {
            's': 2,
            'k': 2,
            'l': 4,
            'th': 3,
            'r': 5  # R is typically the hardest
        }
        return difficulty_map.get(sound_id, 3)
    
    def _get_default_features(self, sound_id: str) -> Dict:
        """Default features for users with no history"""
        return {
            'first_trial_score': 0.5,
            'early_avg_score': 0.5,
            'early_max_score': 0.5,
            'early_min_score': 0.5,
            'overall_avg_score': 0.5,
            'overall_max_score': 0.5,
            'overall_min_score': 0.5,
            'median_score': 0.5,
            'score_improvement': 0,
            'avg_improvement_per_trial': 0,
            'improvement_rate': 0,
            'score_variance': 0,
            'score_std': 0,
            'consistency_score': 0.5,
            'total_trials': 0,
            'trials_per_level': 0,
            'avg_trials_per_level': 5,
            'fastest_level_completion': 3,
            'slowest_level_completion': 10,
            'avg_pronunciation': 0.5,
            'avg_accuracy': 0.5,
            'avg_fluency': 0.5,
            'avg_completeness': 0.5,
            'sound_difficulty': self._get_sound_difficulty(sound_id),
            'is_sound_s': 1 if sound_id == 's' else 0,
            'is_sound_r': 1 if sound_id == 'r' else 0,
            'is_sound_l': 1 if sound_id == 'l' else 0,
            'is_sound_k': 1 if sound_id == 'k' else 0,
            'is_sound_th': 1 if sound_id == 'th' else 0,
        }
    
    def train_model(self, df: pd.DataFrame) -> Dict:
        """
        Train XGBoost Gradient Boosted Regression Trees model
        Returns training metrics
        """
        print("🤖 Training XGBoost model...")
        
        if len(df) < 10:
            print("⚠️  Not enough training data. Using default model parameters.")
            # Create a simple baseline model
            self._create_baseline_model()
            return {
                'status': 'baseline',
                'message': 'Insufficient data for training. Using baseline model.',
                'samples': len(df)
            }
        
        # Prepare features and target
        feature_columns = [col for col in df.columns if col not in ['days_to_mastery', 'user_id', 'sound_id']]
        self.feature_columns = feature_columns
        
        X = df[feature_columns]
        y = df['days_to_mastery']
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Configure XGBoost for regression
        self.model = xgb.XGBRegressor(
            objective='reg:squarederror',
            n_estimators=100,
            max_depth=5,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            n_jobs=-1
        )
        
        # Train model
        self.model.fit(
            X_train, y_train,
            eval_set=[(X_test, y_test)],
            verbose=False
        )
        
        # Evaluate
        y_pred = self.model.predict(X_test)
        
        metrics = {
            'mae': mean_absolute_error(y_test, y_pred),
            'rmse': np.sqrt(mean_squared_error(y_test, y_pred)),
            'r2': r2_score(y_test, y_pred),
            'train_samples': len(X_train),
            'test_samples': len(X_test)
        }
        
        print(f"✅ Model trained successfully")
        print(f"   MAE: {metrics['mae']:.2f} days")
        print(f"   RMSE: {metrics['rmse']:.2f} days")
        print(f"   R²: {metrics['r2']:.3f}")
        
        # Save model
        self._save_model()
        
        return metrics
    
    def _create_baseline_model(self):
        """Create a simple baseline model when insufficient data"""
        # Use average days based on sound difficulty
        self.model = None
        self.is_baseline = True
    
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
            print("⚠️  No saved model found")
            return False
        
        try:
            with open(self.model_path, 'rb') as f:
                model_data = pickle.load(f)
            
            self.model = model_data['model']
            self.feature_columns = model_data['feature_columns']
            
            print(f"✅ Model loaded from {self.model_path}")
            print(f"   Trained at: {model_data['trained_at']}")
            return True
        except Exception as e:
            print(f"❌ Error loading model: {e}")
            return False
    
    def predict_days_to_mastery(self, user_id: str, sound_id: str) -> Dict:
        """
        Predict days until mastery for a specific user and sound
        Returns prediction with confidence interval
        """
        print(f"🔮 Predicting mastery time for user {user_id}, sound '{sound_id}'")
        
        # Get user's trial history for this sound
        # Try to sort by timestamp first, fall back to created_at
        try:
            trials = list(self.articulation_trials_collection.find({
                'user_id': user_id,
                'sound_id': sound_id
            }).sort('timestamp', 1))
        except:
            trials = list(self.articulation_trials_collection.find({
                'user_id': user_id,
                'sound_id': sound_id
            }).sort('created_at', 1))
        
        # Extract features
        features = self._extract_features_from_trials(trials, sound_id)
        
        # Check if model is loaded
        if self.model is None:
            if not self.load_model():
                # Use baseline prediction
                return self._baseline_prediction(features, sound_id, len(trials))
        
        # Create feature DataFrame
        feature_df = pd.DataFrame([features])
        feature_df = feature_df[self.feature_columns]  # Ensure correct order
        
        # Make prediction
        predicted_days = self.model.predict(feature_df)[0]
        
        # Ensure reasonable bounds
        predicted_days = max(1, min(predicted_days, 90))  # Between 1 and 90 days
        
        # Calculate confidence based on data quality
        confidence = self._calculate_confidence(trials, features)
        
        # Adjust prediction based on current progress
        progress_doc = self.articulation_progress_collection.find_one({
            'user_id': user_id,
            'sound_id': sound_id
        })
        
        current_level = self._get_current_level(progress_doc)
        remaining_levels = 5 - current_level + 1
        
        # Adjust prediction for remaining work
        adjusted_prediction = predicted_days * (remaining_levels / 5)
        adjusted_prediction = max(1, adjusted_prediction)
        
        result = {
            'user_id': user_id,
            'sound_id': sound_id,
            'predicted_days': round(adjusted_prediction),
            'confidence': confidence,
            'current_level': current_level,
            'remaining_levels': remaining_levels,
            'total_trials_completed': len(trials),
            'current_performance': features.get('overall_avg_score', 0.5),
            'estimated_completion_date': (datetime.now() + timedelta(days=adjusted_prediction)).strftime('%Y-%m-%d'),
            'message': f"Estimated time to master the {self._get_sound_name(sound_id)}-sound: {round(adjusted_prediction)} days."
        }
        
        print(f"✅ Prediction: {round(adjusted_prediction)} days")
        print(f"   Confidence: {confidence:.0%}")
        
        return result
    
    def _baseline_prediction(self, features: Dict, sound_id: str, total_trials: int) -> Dict:
        """
        Baseline prediction when no trained model available
        Uses heuristics based on sound difficulty and early performance
        """
        sound_difficulty = self._get_sound_difficulty(sound_id)
        avg_score = features.get('overall_avg_score', 0.5)
        
        # Base days by difficulty
        base_days = {
            2: 10,  # S, K (easier)
            3: 15,  # TH (moderate)
            4: 20,  # L (harder)
            5: 25   # R (hardest)
        }
        
        predicted_days = base_days.get(sound_difficulty, 15)
        
        # Adjust based on performance
        if avg_score > 0.75:
            predicted_days *= 0.7  # Fast learner
        elif avg_score < 0.5:
            predicted_days *= 1.3  # Needs more time
        
        # Adjust based on trials completed
        if total_trials > 20:
            predicted_days *= 0.8  # Already practicing
        
        return {
            'user_id': 'unknown',
            'sound_id': sound_id,
            'predicted_days': round(predicted_days),
            'confidence': 0.5,
            'current_level': 1,
            'remaining_levels': 5,
            'total_trials_completed': total_trials,
            'current_performance': avg_score,
            'estimated_completion_date': (datetime.now() + timedelta(days=predicted_days)).strftime('%Y-%m-%d'),
            'message': f"Estimated time to master the {self._get_sound_name(sound_id)}-sound: {round(predicted_days)} days.",
            'note': 'Using baseline prediction (model not trained yet)'
        }
    
    def _calculate_confidence(self, trials: List[Dict], features: Dict) -> float:
        """
        Calculate prediction confidence based on data quality
        Returns value between 0 and 1
        """
        confidence = 0.5  # Base confidence
        
        # More trials = higher confidence
        if len(trials) >= 20:
            confidence += 0.2
        elif len(trials) >= 10:
            confidence += 0.1
        
        # Consistent performance = higher confidence
        consistency = features.get('consistency_score', 0.5)
        confidence += consistency * 0.2
        
        # Good improvement trend = higher confidence
        improvement_rate = features.get('improvement_rate', 0)
        if improvement_rate > 0:
            confidence += 0.1
        
        return min(1.0, confidence)
    
    def _get_current_level(self, progress_doc: Optional[Dict]) -> int:
        """Determine current level from progress document"""
        if not progress_doc:
            return 1
        
        levels = progress_doc.get('levels', {})
        for level in range(1, 6):
            if not levels.get(str(level), {}).get('is_complete', False):
                return level
        
        return 5  # Already at final level
    
    def _get_sound_name(self, sound_id: str) -> str:
        """Get display name for sound"""
        names = {
            's': 'S',
            'r': 'R',
            'l': 'L',
            'k': 'K',
            'th': 'TH'
        }
        return names.get(sound_id, sound_id.upper())
    
    def retrain_model(self) -> Dict:
        """
        Retrain model with latest data from database
        Should be called periodically as more users complete therapy
        """
        print("🔄 Retraining model with latest data...")
        
        # Extract fresh data
        df = self.extract_training_data()
        
        if len(df) < 10:
            return {
                'success': False,
                'message': 'Insufficient training data',
                'samples': len(df)
            }
        
        # Train model
        metrics = self.train_model(df)
        
        return {
            'success': True,
            'message': 'Model retrained successfully',
            'metrics': metrics,
            'samples': len(df)
        }
