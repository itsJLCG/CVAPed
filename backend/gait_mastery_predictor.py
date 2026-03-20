"""
Gait Mastery Prediction using XGBoost
Predicts days until user achieves healthy gait parameters
Based on PhysioNet research baselines and clinical recovery patterns
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import pickle
import os
from bson import ObjectId


class GaitMasteryPredictor:
    """
    Predicts days until healthy gait using XGBoost Gradient Boosted Regression
    Uses historical gait session data from gaitprogresses collection
    """
    
    def __init__(self, db):
        self.db = db
        self.gait_collection = db['gaitprogresses']
        self.model = None
        self.feature_columns = []
        self.model_path = os.path.join(
            os.path.dirname(__file__), 
            'models', 
            'gait_mastery_xgboost.pkl'
        )
        
        # Healthy gait thresholds (from PhysioNet research)
        self.healthy_thresholds = {
            'cadence': 100,              # steps/min (healthy: 100-120)
            'velocity': 1.2,             # m/s (healthy: >1.0)
            'stride_length': 1.35,       # meters (healthy: >1.3)
            'stability_score': 0.85,     # 0-1 scale (healthy: >0.80)
            'gait_symmetry': 0.85,       # 0-1 scale (healthy: >0.80)
            'step_regularity': 0.85      # 0-1 scale (healthy: >0.80)
        }
        
        # Mapping from database fields to frontend display names
        self.metric_display_names = {
            'cadence': 'cadence',
            'velocity': 'velocity',
            'stride_length': 'stride_length',
            'stability_score': 'stability',
            'gait_symmetry': 'symmetry',
            'step_regularity': 'regularity'
        }

    def _to_numeric(self, value, default=0.0) -> float:
        """Convert metric values to float, supporting legacy nested dict payloads."""
        if isinstance(value, (int, float, np.number)):
            return float(value)

        if isinstance(value, dict):
            for key in ('value', 'current', 'score', 'avg', 'mean', 'raw'):
                nested = value.get(key)
                if isinstance(nested, (int, float, np.number)):
                    return float(nested)
            return float(default)

        try:
            return float(value)
        except (TypeError, ValueError):
            return float(default)

    def _metric(self, metrics: Dict, key: str, default=0.0) -> float:
        if not isinstance(metrics, dict):
            return float(default)
        return self._to_numeric(metrics.get(key, default), default)
    
    def extract_training_data(self) -> pd.DataFrame:
        """
        Extract training data from gaitprogresses collection
        Only includes users who achieved healthy gait (completed progression)
        """
        print("📊 Extracting gait training data from database...")
        
        training_data = []
        
        # Get all unique user IDs
        user_ids = self.gait_collection.distinct('user_id')
        print(f"   Found {len(user_ids)} unique users")
        
        for user_id in user_ids:
            # Get all sessions for this user, sorted chronologically
            sessions = list(
                self.gait_collection.find({'user_id': user_id})
                .sort('created_at', 1)
            )
            
            if len(sessions) < 3:
                continue  # Need minimum 3 sessions for meaningful features
            
            # Calculate days to mastery
            days_to_mastery = self._calculate_days_to_mastery(sessions)
            
            if days_to_mastery is None:
                continue  # User hasn't achieved healthy gait yet
            
            # Extract features from progression
            features = self._extract_features_from_sessions(sessions)
            
            if features is None:
                continue
            
            features['days_to_mastery'] = days_to_mastery
            features['user_id'] = user_id
            
            training_data.append(features)
        
        df = pd.DataFrame(training_data)
        print(f"✅ Extracted {len(df)} training samples from users who achieved healthy gait")
        
        if len(df) > 0:
            print(f"   Target range: {df['days_to_mastery'].min():.0f} - {df['days_to_mastery'].max():.0f} days")
            print(f"   Target mean: {df['days_to_mastery'].mean():.0f} ± {df['days_to_mastery'].std():.0f} days")
        
        return df
    
    def _calculate_days_to_mastery(self, sessions: List[Dict]) -> Optional[int]:
        """
        Calculate days from first session until healthy gait achieved
        Returns None if user hasn't reached healthy thresholds yet
        """
        first_date = sessions[0].get('created_at')
        
        for session in sessions:
            metrics = session.get('metrics', {})
            
            # Check if ALL metrics meet healthy thresholds
            is_healthy = all(
                self._metric(metrics, metric, 0) >= threshold
                for metric, threshold in self.healthy_thresholds.items()
            )
            
            if is_healthy:
                mastery_date = session.get('created_at')
                days = (mastery_date - first_date).days
                return max(1, days)  # Minimum 1 day
        
        return None  # Not yet achieved
    
    def _extract_features_from_sessions(self, sessions: List[Dict]) -> Optional[Dict]:
        """
        Extract predictive features from gait session history
        Returns dict of features for ML model input
        """
        if len(sessions) < 2:
            return None
        
        features = {}
        
        # ────────────────────────────────────────────────────────
        # 1. INITIAL PERFORMANCE (First Session)
        # ────────────────────────────────────────────────────────
        first_session = sessions[0]
        first_metrics = first_session.get('metrics', {})
        
        features.update({
            'first_cadence': self._metric(first_metrics, 'cadence', 0),
            'first_velocity': self._metric(first_metrics, 'velocity', 0),
            'first_stride_length': self._metric(first_metrics, 'stride_length', 0),
            'first_stability': self._metric(first_metrics, 'stability_score', 0),
            'first_symmetry': self._metric(first_metrics, 'gait_symmetry', 0),
            'first_regularity': self._metric(first_metrics, 'step_regularity', 0),
            'first_overall_score': self._to_numeric(first_session.get('gait_score', 0), 0) / 100,
            
            # Initial problem severity
            'initial_problem_count': len(first_session.get('detected_problems', [])),
            'initial_severe_problems': sum(
                1 for p in first_session.get('detected_problems', []) 
                if p.get('severity') == 'severe'
            ),
        })
        
        # ────────────────────────────────────────────────────────
        # 2. EARLY PERFORMANCE (First 3 Sessions)
        # ────────────────────────────────────────────────────────
        early_sessions = sessions[:min(3, len(sessions))]
        early_cadences = [self._metric(s.get('metrics', {}), 'cadence', 0) for s in early_sessions]
        early_velocities = [self._metric(s.get('metrics', {}), 'velocity', 0) for s in early_sessions]
        early_stabilities = [self._metric(s.get('metrics', {}), 'stability_score', 0) for s in early_sessions]
        early_overall = [self._to_numeric(s.get('gait_score', 0), 0) / 100 for s in early_sessions]
        
        features.update({
            'early_avg_cadence': np.mean(early_cadences),
            'early_avg_velocity': np.mean(early_velocities),
            'early_avg_stability': np.mean(early_stabilities),
            'early_avg_overall': np.mean(early_overall),
        })
        
        # ────────────────────────────────────────────────────────
        # 3. IMPROVEMENT TRENDS
        # ────────────────────────────────────────────────────────
        latest_session = sessions[-1]
        latest_metrics = latest_session.get('metrics', {})
        
        # Calculate improvement rates (per session)
        num_sessions = len(sessions)
        
        cadence_improvement = (
            self._metric(latest_metrics, 'cadence', 0) - self._metric(first_metrics, 'cadence', 0)
        ) / num_sessions if num_sessions > 0 else 0
        
        velocity_improvement = (
            self._metric(latest_metrics, 'velocity', 0) - self._metric(first_metrics, 'velocity', 0)
        ) / num_sessions if num_sessions > 0 else 0
        
        stability_improvement = (
            self._metric(latest_metrics, 'stability_score', 0) - self._metric(first_metrics, 'stability_score', 0)
        ) / num_sessions if num_sessions > 0 else 0
        
        overall_improvement = (
            (self._to_numeric(latest_session.get('gait_score', 0), 0) / 100) - 
            (self._to_numeric(first_session.get('gait_score', 0), 0) / 100)
        ) / num_sessions if num_sessions > 0 else 0
        
        features.update({
            'cadence_improvement_rate': cadence_improvement,
            'velocity_improvement_rate': velocity_improvement,
            'stability_improvement_rate': stability_improvement,
            'overall_improvement_rate': overall_improvement,
            
            # Total improvement magnitude
            'total_cadence_improvement': self._metric(latest_metrics, 'cadence', 0) - self._metric(first_metrics, 'cadence', 0),
            'total_velocity_improvement': self._metric(latest_metrics, 'velocity', 0) - self._metric(first_metrics, 'velocity', 0),
        })
        
        # ────────────────────────────────────────────────────────
        # 4. CONSISTENCY (Variance)
        # ────────────────────────────────────────────────────────
        all_cadences = [self._metric(s.get('metrics', {}), 'cadence', 0) for s in sessions]
        all_velocities = [self._metric(s.get('metrics', {}), 'velocity', 0) for s in sessions]
        all_overall = [self._to_numeric(s.get('gait_score', 0), 0) / 100 for s in sessions]
        
        features.update({
            'cadence_variance': np.var(all_cadences) if len(all_cadences) > 1 else 0,
            'velocity_variance': np.var(all_velocities) if len(all_velocities) > 1 else 0,
            'overall_variance': np.var(all_overall) if len(all_overall) > 1 else 0,
            'cadence_std': np.std(all_cadences) if len(all_cadences) > 1 else 0,
        })
        
        # ────────────────────────────────────────────────────────
        # 5. PROBLEM RESOLUTION TRACKING
        # ────────────────────────────────────────────────────────
        current_problems = latest_session.get('detected_problems', [])
        
        features.update({
            'current_problem_count': len(current_problems),
            'current_severe_problems': sum(
                1 for p in current_problems if p.get('severity') == 'severe'
            ),
            'problems_resolved_count': max(0, 
                features['initial_problem_count'] - len(current_problems)
            ),
        })
        
        # Problem-specific encoding (one-hot encoding for problem types)
        problem_types = ['asymmetric_gait', 'slow_cadence', 'short_stride', 
                         'slow_velocity', 'poor_stability', 'irregular_steps']
        
        for problem_type in problem_types:
            # Check if problem exists in current session
            has_problem = any(
                p.get('problem') == problem_type for p in current_problems
            )
            features[f'has_{problem_type}'] = 1 if has_problem else 0
        
        # ────────────────────────────────────────────────────────
        # 6. ENGAGEMENT & ADHERENCE METRICS
        # ────────────────────────────────────────────────────────
        first_date = first_session.get('created_at')
        latest_date = latest_session.get('created_at')
        days_since_start = (latest_date - first_date).days + 1
        
        features.update({
            'total_sessions': num_sessions,
            'days_since_start': days_since_start,
            'sessions_per_week': (num_sessions / days_since_start) * 7 if days_since_start > 0 else 0,
            
            # Average session metrics
            'avg_session_duration': np.mean([
                self._to_numeric(s.get('duration', 0), 0) for s in sessions
            ]),
            'avg_step_count': np.mean([
                self._metric(s.get('metrics', {}), 'step_count', 0) for s in sessions
            ]),
        })
        
        # ────────────────────────────────────────────────────────
        # 7. PATIENT-REPORTED OUTCOMES
        # ────────────────────────────────────────────────────────
        pain_levels = [s.get('pain_level') for s in sessions if s.get('pain_level') is not None]
        fatigue_levels = [s.get('fatigue_level') for s in sessions if s.get('fatigue_level') is not None]
        
        features.update({
            'avg_pain_level': np.mean(pain_levels) if pain_levels else 5,
            'avg_fatigue_level': np.mean(fatigue_levels) if fatigue_levels else 5,
            
            'pain_trend': (
                latest_session.get('pain_level', 5) - first_session.get('pain_level', 5)
            ) if latest_session.get('pain_level') is not None and first_session.get('pain_level') is not None else 0,
            
            'has_pain_data': 1 if pain_levels else 0,
        })
        
        # ────────────────────────────────────────────────────────
        # 8. CURRENT STATUS vs HEALTHY BASELINE
        # ────────────────────────────────────────────────────────
        # Calculate deficit from healthy thresholds
        for metric, threshold in self.healthy_thresholds.items():
            current_value = self._metric(latest_metrics, metric, 0)
            features[f'{metric}_deficit'] = max(0, threshold - current_value)
            features[f'{metric}_pct_of_target'] = (current_value / threshold) if threshold > 0 else 0
        
        return features
    
    def _get_default_features(self) -> Dict:
        """Return default feature values for users with no history"""
        defaults = {
            'first_cadence': 70,
            'first_velocity': 0.7,
            'first_stride_length': 1.0,
            'first_stability': 0.6,
            'first_symmetry': 0.6,
            'first_regularity': 0.6,
            'first_overall_score': 0.6,
            'initial_problem_count': 3,
            'initial_severe_problems': 1,
            'early_avg_cadence': 70,
            'early_avg_velocity': 0.7,
            'early_avg_stability': 0.6,
            'early_avg_overall': 0.6,
            'cadence_improvement_rate': 0,
            'velocity_improvement_rate': 0,
            'stability_improvement_rate': 0,
            'overall_improvement_rate': 0,
            'total_cadence_improvement': 0,
            'total_velocity_improvement': 0,
            'cadence_variance': 0,
            'velocity_variance': 0,
            'overall_variance': 0,
            'cadence_std': 0,
            'current_problem_count': 3,
            'current_severe_problems': 1,
            'problems_resolved_count': 0,
            'has_asymmetric_gait': 1,
            'has_slow_cadence': 1,
            'has_short_stride': 0,
            'has_slow_velocity': 1,
            'has_poor_stability': 0,
            'has_irregular_steps': 0,
            'total_sessions': 1,
            'days_since_start': 1,
            'sessions_per_week': 7,
            'avg_session_duration': 30,
            'avg_step_count': 40,
            'avg_pain_level': 5,
            'avg_fatigue_level': 5,
            'pain_trend': 0,
            'has_pain_data': 0,
        }
        
        # Add deficit features
        for metric, threshold in self.healthy_thresholds.items():
            defaults[f'{metric}_deficit'] = threshold * 0.3  # Assume 30% deficit
            defaults[f'{metric}_pct_of_target'] = 0.7  # 70% of target
        
        return defaults
    
    def train_model(self, test_size=0.2, random_state=42):
        """
        Train XGBoost Gradient Boosted Regression model
        Returns training metrics
        """
        print("\n🤖 Training Gait Mastery XGBoost Model...")
        
        # Extract training data
        df = self.extract_training_data()
        
        if len(df) < 10:
            raise ValueError(f"Insufficient training data: {len(df)} samples (minimum 10 required)")
        
        # Separate features and target
        X = df.drop(['days_to_mastery', 'user_id'], axis=1)
        y = df['days_to_mastery']
        
        self.feature_columns = list(X.columns)
        print(f"   Features: {len(self.feature_columns)}")
        
        # Train-test split
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=random_state
        )
        
        print(f"   Training samples: {len(X_train)}")
        print(f"   Testing samples: {len(X_test)}")
        
        # Configure XGBoost for regression
        self.model = xgb.XGBRegressor(
            objective='reg:squarederror',
            n_estimators=100,
            max_depth=6,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=random_state,
            n_jobs=-1
        )
        
        # Train model
        print("   Training...")
        self.model.fit(
            X_train, y_train,
            eval_set=[(X_test, y_test)],
            verbose=False
        )
        
        # Evaluate on test set
        y_pred = self.model.predict(X_test)
        
        mae = mean_absolute_error(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        r2 = r2_score(y_test, y_pred)
        mape = np.mean(np.abs((y_test - y_pred) / y_test)) * 100
        
        print(f"\n   ✅ Model Training Complete!")
        print(f"   ─────────────────────────────")
        print(f"   MAE:  {mae:.2f} days")
        print(f"   RMSE: {rmse:.2f} days")
        print(f"   R²:   {r2:.3f}")
        print(f"   MAPE: {mape:.1f}%")
        
        # Feature importance
        importance = self.model.feature_importances_
        top_features = sorted(zip(self.feature_columns, importance), key=lambda x: x[1], reverse=True)[:5]
        print(f"\n   Top 5 Important Features:")
        for feat, imp in top_features:
            print(f"      {feat}: {imp:.3f}")
        
        return {
            'mae': mae,
            'rmse': rmse,
            'r2': r2,
            'mape': mape,
            'samples': len(df),
            'train_size': len(X_train),
            'test_size': len(X_test)
        }
    
    def predict_days_to_mastery(self, user_id: str) -> Dict:
        """
        Predict days until user achieves healthy gait
        Returns prediction dict with confidence and breakdown
        """
        if self.model is None:
            raise ValueError("Model not loaded. Call load_model() first.")
        
        # Get user's gait sessions
        sessions = list(
            self.gait_collection.find({'user_id': user_id})
            .sort('created_at', 1)
        )
        
        if len(sessions) == 0:
            # No history - return estimate based on typical new user
            return {
                'predicted_days': 90,
                'confidence': 0.3,
                'current_overall_score': 0.6,
                'improvement_rate': 0.0,
                'has_data': False,
                'message': 'No gait sessions yet. Estimate based on typical recovery timeline.',
                'metric_progress': self._get_default_metric_progress()
            }
        
        # Extract features
        features_dict = self._extract_features_from_sessions(sessions)
        
        if features_dict is None:
            features_dict = self._get_default_features()
        
        # Create feature DataFrame with correct column order
        features_df = pd.DataFrame([features_dict])
        features_df = features_df[self.feature_columns]
        
        # Make prediction
        predicted_days = self.model.predict(features_df)[0]
        predicted_days = max(1, int(predicted_days))  # Ensure positive integer
        
        # Calculate confidence based on data quality and consistency
        confidence = self._calculate_confidence(sessions, features_dict)
        
        # Get current status
        latest_session = sessions[-1]
        latest_metrics = latest_session.get('metrics', {})
        current_overall_score = self._to_numeric(latest_session.get('gait_score', 0), 0) / 100
        
        # Calculate improvement rate
        if len(sessions) >= 2:
            first_score = self._to_numeric(sessions[0].get('gait_score', 0), 0) / 100
            days_elapsed = (latest_session.get('created_at') - sessions[0].get('created_at')).days + 1
            improvement_rate = (current_overall_score - first_score) / days_elapsed if days_elapsed > 0 else 0
        else:
            improvement_rate = 0
        
        # Calculate metric-specific progress
        metric_progress = {}
        for metric, threshold in self.healthy_thresholds.items():
            current_value = self._metric(latest_metrics, metric, 0)
            display_name = self.metric_display_names.get(metric, metric)
            metric_progress[display_name] = {
                'current': round(current_value, 2),
                'target': threshold,
                'percent_of_target': round((current_value / threshold) * 100, 1) if threshold > 0 else 0,
                'deficit': round(max(0, threshold - current_value), 2),
                'is_healthy': current_value >= threshold
            }
        
        return {
            'predicted_days': predicted_days,
            'confidence': round(confidence, 2),
            'current_overall_score': round(current_overall_score, 2),
            'improvement_rate': round(improvement_rate, 4),
            'total_sessions': len(sessions),
            'days_practicing': features_dict.get('days_since_start', 1),
            'has_data': True,
            'metric_progress': metric_progress,
            'current_problems': len(latest_session.get('detected_problems', [])),
            'message': self._generate_prediction_message(predicted_days, confidence, metric_progress)
        }
    
    def _calculate_confidence(self, sessions: List[Dict], features: Dict) -> float:
        """
        Calculate prediction confidence (0-1) based on data quality
        Higher confidence = more sessions, consistent improvement, good data quality
        """
        confidence = 1.0
        
        # Factor 1: Number of sessions (more = higher confidence)
        num_sessions = len(sessions)
        if num_sessions < 3:
            confidence *= 0.5
        elif num_sessions < 5:
            confidence *= 0.7
        elif num_sessions < 10:
            confidence *= 0.85
        
        # Factor 2: Data consistency (lower variance = higher confidence)
        variance = features.get('overall_variance', 0)
        if variance > 0.05:
            confidence *= 0.8
        
        # Factor 3: Improvement trend (consistent improvement = higher confidence)
        improvement_rate = features.get('overall_improvement_rate', 0)
        if improvement_rate <= 0:
            confidence *= 0.6  # No improvement yet
        
        # Factor 4: Time span (longer history = higher confidence)
        days_since_start = features.get('days_since_start', 1)
        if days_since_start < 7:
            confidence *= 0.7
        elif days_since_start > 30:
            confidence *= 1.1  # Bonus for long history
        
        return min(1.0, confidence)  # Cap at 1.0
    
    def _get_default_metric_progress(self) -> Dict:
        """Return default metric progress for new users"""
        progress = {}
        for metric, threshold in self.healthy_thresholds.items():
            display_name = self.metric_display_names.get(metric, metric)
            progress[display_name] = {
                'current': 70 if metric == 'cadence' else 0.7,
                'target': threshold,
                'percent_of_target': 70,
                'deficit': threshold * 0.3,
                'is_healthy': False
            }
        return progress
    
    def _generate_prediction_message(self, days: int, confidence: float, metric_progress: Dict) -> str:
        """Generate human-readable prediction message"""
        weeks = days // 7
        
        if confidence < 0.5:
            return f"Early estimate: ~{weeks} weeks. Confidence will improve with more sessions."
        elif confidence < 0.75:
            return f"Moderate confidence: {weeks} weeks to healthy gait with continued practice."
        else:
            # Check which metrics need most work
            weakest_metrics = sorted(
                metric_progress.items(),
                key=lambda x: x[1]['percent_of_target']
            )[:2]
            
            metrics_str = ", ".join([m[0].replace('_', ' ') for m in weakest_metrics])
            return f"High confidence: {weeks} weeks. Focus on improving {metrics_str}."
    
    def save_model(self):
        """Save trained model to disk"""
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        
        with open(self.model_path, 'wb') as f:
            pickle.dump({
                'model': self.model,
                'feature_columns': self.feature_columns,
                'healthy_thresholds': self.healthy_thresholds,
                'trained_at': datetime.now()
            }, f)
        
        print(f"✅ Model saved to {self.model_path}")
    
    def load_model(self):
        """Load trained model from disk"""
        if not os.path.exists(self.model_path):
            raise FileNotFoundError(
                f"Model not found: {self.model_path}\n"
                f"Train the model first using train_gait_model.py"
            )
        
        with open(self.model_path, 'rb') as f:
            data = pickle.load(f)
            self.model = data['model']
            self.feature_columns = data['feature_columns']
            self.healthy_thresholds = data.get('healthy_thresholds', self.healthy_thresholds)
        
        print(f"✅ Gait mastery model loaded from {self.model_path}")
        if 'trained_at' in data:
            print(f"   Trained at: {data['trained_at'].strftime('%Y-%m-%d %H:%M')}")
