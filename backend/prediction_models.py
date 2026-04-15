"""
Speech Therapy Mastery Prediction using XGBoost (Gradient Boosted Trees)
Predicts days until mastery for Articulation, Fluency, Receptive, Expressive, and Overall Speech
Uses the same ML models from the mobile backend
"""

import os
import sys
import requests
from flask import jsonify
import logging

logger = logging.getLogger(__name__)

# Therapy service URL (Python Flask service running on port 5001)
THERAPY_SERVICE_URL = os.getenv('THERAPY_SERVICE_URL', 'http://localhost:5001')

class PredictionService:
    """Service to interact with XGBoost prediction models"""
    
    def __init__(self):
        self.therapy_url = THERAPY_SERVICE_URL
        
    def predict_articulation_mastery(self, user_id, sound_id):
        """
        Predict days until articulation mastery for a specific sound
        sound_id: one of 'r', 's', 'l', 'th', 'k'
        """
        try:
            response = requests.post(
                f'{self.therapy_url}/api/articulation/predict-mastery',
                json={
                    'user_id': user_id,
                    'sound_id': sound_id
                },
                timeout=30
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                return {
                    'success': False,
                    'error': f'Prediction failed: {response.status_code}'
                }
        except Exception as e:
            logger.error(f"Error predicting articulation mastery: {e}", exc_info=True)
            print(f"Error predicting articulation mastery: {e}")
            return {
                'success': False,
                'error': 'Prediction failed'
            }
    
    def predict_fluency_mastery(self, user_id):
        """Predict days until fluency mastery"""
        try:
            response = requests.post(
                f'{self.therapy_url}/api/fluency/predict-mastery',
                json={
                    'user_id': user_id
                },
                timeout=30
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                return {
                    'success': False,
                    'error': f'Prediction failed: {response.status_code}'
                }
        except Exception as e:
            logger.error(f"Error predicting fluency mastery: {e}", exc_info=True)
            print(f"Error predicting fluency mastery: {e}")
            return {
                'success': False,
                'error': 'Prediction failed'
            }
    
    def predict_language_mastery(self, user_id, mode='receptive'):
        """
        Predict days until language mastery
        mode: 'receptive' or 'expressive'
        """
        try:
            response = requests.post(
                f'{self.therapy_url}/api/language/predict-mastery',
                json={
                    'user_id': user_id,
                    'mode': mode
                },
                timeout=30
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                return {
                    'success': False,
                    'error': f'Prediction failed: {response.status_code}'
                }
        except Exception as e:
            logger.error(f"Error predicting language mastery: {e}", exc_info=True)
            print(f"Error predicting language mastery: {e}")
            return {
                'success': False,
                'error': 'Prediction failed'
            }
    
    def predict_overall_improvement(self, user_id):
        """Predict overall speech improvement across all therapies"""
        try:
            response = requests.post(
                f'{self.therapy_url}/api/speech/predict-overall-improvement',
                json={
                    'user_id': user_id
                },
                timeout=30
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                return {
                    'success': False,
                    'error': f'Prediction failed: {response.status_code}'
                }
        except Exception as e:
            logger.error(f"Error predicting overall improvement: {e}", exc_info=True)
            print(f"Error predicting overall improvement: {e}")
            return {
                'success': False,
                'error': 'Prediction failed'
            }
    
    def get_all_predictions(self, user_id):
        """Get all predictions for a user"""
        try:
            predictions = {}
            
            # Articulation predictions for all sounds
            articulation_predictions = {}
            sounds = ['r', 's', 'l', 'th', 'k']
            for sound in sounds:
                result = self.predict_articulation_mastery(user_id, sound)
                if result.get('success'):
                    articulation_predictions[sound] = result.get('prediction')
            
            if articulation_predictions:
                predictions['articulation'] = articulation_predictions
            
            # Fluency prediction
            fluency_result = self.predict_fluency_mastery(user_id)
            if fluency_result.get('success'):
                predictions['fluency'] = fluency_result.get('prediction')
            
            # Receptive language prediction
            receptive_result = self.predict_language_mastery(user_id, 'receptive')
            if receptive_result.get('success'):
                predictions['receptive'] = receptive_result.get('prediction')
            
            # Expressive language prediction
            expressive_result = self.predict_language_mastery(user_id, 'expressive')
            if expressive_result.get('success'):
                predictions['expressive'] = expressive_result.get('prediction')
            
            # Overall speech improvement
            overall_result = self.predict_overall_improvement(user_id)
            if overall_result.get('success'):
                predictions['overall'] = overall_result.get('prediction')
            
            return {
                'success': True,
                'predictions': predictions
            }
        except Exception as e:
            logger.error(f"Error getting all predictions: {e}", exc_info=True)
            print(f"Error getting all predictions: {e}")
            return {
                'success': False,
                'error': 'Failed to get predictions'
            }
