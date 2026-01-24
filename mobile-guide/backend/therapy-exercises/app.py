"""
Therapy Exercises API Server
Flask-based REST API for managing speech therapy exercises
Handles Fluency, Language (Receptive & Expressive), Articulation exercises
AND Stroke Rehabilitation Exercise Recommendations
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient
import os
from dotenv import load_dotenv
import traceback
from datetime import datetime

# Import CRUD blueprints (Speech Therapy)
from fluency_crud import fluency_bp, init_fluency_crud
from language_crud import language_bp, init_language_crud
from receptive_crud import receptive_bp, init_receptive_crud
from articulation_crud import articulation_bp, init_articulation_crud

# Import Stroke Exercise Recommendation (Physical Therapy)
from exercise_recommender import ExerciseRecommender
from stroke_exercise_library import StrokeExerciseLibrary

# Import Articulation Mastery Prediction (XGBoost ML)
from articulation_mastery_predictor import ArticulationMasteryPredictor
# Import Fluency Mastery Prediction (XGBoost ML)
from fluency_mastery_predictor import FluencyMasteryPredictor

# Import Language Mastery Prediction (XGBoost ML) 
from language_mastery_predictor import LanguageMasteryPredictor

# Import Overall Speech Improvement Prediction (XGBoost ML - Combines All Therapies)
from overall_speech_predictor import OverallSpeechPredictor

# Import Therapy Prioritization & Sequencing (Decision Rules + Graph-Based)
from therapy_prioritization import generate_therapy_prioritization

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# MongoDB connection
MONGO_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/')
DB_NAME = os.getenv('DB_NAME', 'CVACare')

try:
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    print(f"✅ Connected to MongoDB: {DB_NAME}")
except Exception as e:
    print(f"❌ MongoDB connection failed: {e}")
    db = None

# Initialize CRUD modules with database
if db is not None:
    init_fluency_crud(db)
    init_language_crud(db)
    init_receptive_crud(db)
    init_articulation_crud(db)

# Initialize Stroke Exercise Recommendation system
exercise_library = StrokeExerciseLibrary()
exercise_recommender = ExerciseRecommender()
print("✅ Stroke Exercise Recommender initialized")

# Initialize Articulation Mastery Predictor (XGBoost ML)
mastery_predictor = None
if db is not None:
    try:
        mastery_predictor = ArticulationMasteryPredictor(db)
        mastery_predictor.load_model()  # Try to load existing model
        print("✅ Articulation Mastery Predictor initialized")
    except Exception as e:
        print(f"⚠️  Articulation Mastery Predictor initialization failed: {e}")
        mastery_predictor = None

# Initialize Fluency Mastery Predictor (XGBoost ML)
fluency_predictor = None
if db is not None:
    try:
        fluency_predictor = FluencyMasteryPredictor(MONGO_URI, DB_NAME)
        fluency_predictor.load_model()  # Try to load existing model
        print("✅ Fluency Mastery Predictor initialized")
    except Exception as e:
        print(f"⚠️  Fluency Mastery Predictor initialization failed: {e}")
        fluency_predictor = None

# Register blueprints (Speech Therapy)
app.register_blueprint(fluency_bp)
app.register_blueprint(language_bp)
app.register_blueprint(receptive_bp)
app.register_blueprint(articulation_bp)

@app.route('/api/therapy/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'Therapy Exercises API',
        'database': 'connected' if db is not None else 'disconnected'
    }), 200

@app.route('/api/therapy/info', methods=['GET'])
def info():
    """API information endpoint"""
    return jsonify({
        'service': 'CVACare Therapy Exercises API',
        'version': '1.0.0',
        'endpoints': {
            'fluency': '/api/fluency-exercises',
            'language_expressive': '/api/language-exercises',
            'language_receptive': '/api/receptive-exercises',
            'articulation': '/api/articulation-exercises',
            'articulation_prediction': '/api/articulation/predict-mastery',
            'stroke_exercises': '/api/exercises/*'
        },
        'features': [
            'Fluency therapy exercise management',
            'Language therapy (expressive & receptive)',
            'Articulation therapy by sound',
            'Articulation mastery time prediction (XGBoost ML)',
            'Stroke rehabilitation exercise recommendations',
            'CRUD operations with role-based access',
            'Exercise seeding functionality',
            'Active/inactive toggle for exercises'
        ]
    }), 200

# ============================================================
# ARTICULATION MASTERY PREDICTION ENDPOINTS (XGBoost ML)
# ============================================================

@app.route('/api/articulation/predict-mastery', methods=['POST'])
def predict_mastery():
    """
    Predict days until articulation mastery using XGBoost
    
    Expected JSON body:
    {
        "user_id": "user_object_id",
        "sound_id": "r"  // One of: s, r, l, k, th
    }
    
    Returns:
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
    """
    try:
        if mastery_predictor is None:
            return jsonify({
                'success': False,
                'error': 'Mastery prediction service not available',
                'message': 'ML model not initialized'
            }), 503
        
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        user_id = data.get('user_id')
        sound_id = data.get('sound_id')
        
        if not user_id or not sound_id:
            return jsonify({
                'success': False,
                'error': 'Missing required fields',
                'message': 'user_id and sound_id are required'
            }), 400
        
        if sound_id not in ['s', 'r', 'l', 'k', 'th']:
            return jsonify({
                'success': False,
                'error': 'Invalid sound_id',
                'message': 'sound_id must be one of: s, r, l, k, th'
            }), 400
        
        print(f"\n{'='*60}")
        print(f"🔮 Mastery Prediction Request")
        print(f"{'='*60}")
        print(f"User: {user_id}")
        print(f"Sound: {sound_id}")
        print(f"{'='*60}\n")
        
        # Make prediction
        prediction = mastery_predictor.predict_days_to_mastery(user_id, sound_id)
        
        print(f"✅ Prediction complete: {prediction['predicted_days']} days")
        print(f"   Confidence: {prediction['confidence']:.0%}")
        print(f"   Message: {prediction['message']}\n")
        
        return jsonify({
            'success': True,
            'prediction': prediction
        }), 200
        
    except Exception as e:
        print(f"❌ Error predicting mastery: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': 'Failed to predict mastery',
            'details': str(e)
        }), 500

@app.route('/api/articulation/train-model', methods=['POST'])
def train_mastery_model():
    """
    Train/retrain the XGBoost model with latest data from database
    Should be called periodically by admins as more users complete therapy
    
    Returns training metrics and model performance
    """
    try:
        if mastery_predictor is None:
            return jsonify({
                'success': False,
                'error': 'Mastery prediction service not available'
            }), 503
        
        print(f"\n{'='*60}")
        print(f"🤖 Model Training Request")
        print(f"{'='*60}\n")
        
        # Retrain model
        result = mastery_predictor.retrain_model()
        
        if result.get('success'):
            print(f"✅ Model training complete")
            print(f"   Samples: {result.get('samples', 0)}")
            if 'metrics' in result:
                metrics = result['metrics']
                print(f"   MAE: {metrics.get('mae', 0):.2f} days")
                print(f"   RMSE: {metrics.get('rmse', 0):.2f} days")
                print(f"   R²: {metrics.get('r2', 0):.3f}\n")
        else:
            print(f"⚠️  Model training skipped: {result.get('message')}\n")
        
        return jsonify(result), 200 if result.get('success') else 400
        
    except Exception as e:
        print(f"❌ Error training model: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': 'Failed to train model',
            'details': str(e)
        }), 500

@app.route('/api/articulation/model-status', methods=['GET'])
def model_status():
    """
    Get status of the XGBoost mastery prediction model
    Returns whether model is trained and available for predictions
    """
    try:
        if mastery_predictor is None:
            return jsonify({
                'available': False,
                'message': 'Predictor not initialized'
            }), 200
        
        model_loaded = mastery_predictor.model is not None
        
        return jsonify({
            'available': True,
            'model_loaded': model_loaded,
            'model_type': 'XGBoost Gradient Boosted Regression Trees',
            'supported_sounds': ['s', 'r', 'l', 'k', 'th'],
            'message': 'Model ready for predictions' if model_loaded else 'Model not trained yet. Call /train-model endpoint.'
        }), 200
        
    except Exception as e:
        return jsonify({
            'available': False,
            'error': str(e)
        }), 500

# ============================================================
# FLUENCY MASTERY PREDICTION ENDPOINTS (XGBoost ML)
# ============================================================

@app.route('/api/fluency/predict-mastery', methods=['POST'])
def predict_fluency_mastery():
    """
    Predict days until fluency mastery using XGBoost
    
    Expected JSON body:
    {
        "user_id": "user_object_id"
    }
    
    Returns:
    {
        "success": true,
        "prediction": {
            "user_id": "...",
            "predicted_days": 45,
            "confidence": 0.82,
            "current_level": 2,
            "remaining_levels": 4,
            "total_trials_completed": 18,
            "current_performance": 0.68,
            "estimated_completion_date": "2026-01-19",
            "message": "Estimated time to master fluency therapy: 45 days."
        }
    }
    """
    try:
        if fluency_predictor is None:
            return jsonify({
                'success': False,
                'error': 'Fluency prediction service not available',
                'message': 'ML model not initialized'
            }), 503
        
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'Missing required field',
                'message': 'user_id is required'
            }), 400
        
        print(f"\n{'='*60}")
        print(f"🔮 Fluency Mastery Prediction Request")
        print(f"{'='*60}")
        print(f"User: {user_id}")
        print(f"{'='*60}\n")
        
        # Make prediction
        prediction = fluency_predictor.predict_days_to_mastery(user_id)
        
        print(f"✅ Prediction complete: {prediction['predicted_days']} days")
        print(f"   Confidence: {prediction['confidence']:.0%}")
        print(f"   Message: {prediction['message']}\n")
        
        return jsonify({
            'success': True,
            'prediction': prediction
        }), 200
        
    except Exception as e:
        print(f"❌ Error predicting fluency mastery: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': 'Failed to predict fluency mastery',
            'details': str(e)
        }), 500

@app.route('/api/fluency/train-model', methods=['POST'])
def train_fluency_model():
    """
    Train/retrain the fluency XGBoost model with latest data from database
    Should be called periodically by admins as more users complete therapy
    
    Returns training metrics and model performance
    """
    try:
        if fluency_predictor is None:
            return jsonify({
                'success': False,
                'error': 'Fluency prediction service not available'
            }), 503
        
        print(f"\n{'='*60}")
        print(f"🤖 Fluency Model Training Request")
        print(f"{'='*60}\n")
        
        # Train model
        result = fluency_predictor.train_model()
        
        if result.get('success'):
            print(f"✅ Fluency model training complete")
            if 'metrics' in result:
                metrics = result['metrics']
                print(f"   Samples: {metrics.get('training_samples', 0)}")
                print(f"   MAE: {metrics.get('mae', 0):.2f} days")
                print(f"   RMSE: {metrics.get('rmse', 0):.2f} days")
                print(f"   R²: {metrics.get('r2', 0):.3f}\n")
        else:
            print(f"⚠️  Fluency model training skipped: {result.get('message')}\n")
        
        return jsonify(result), 200 if result.get('success') else 400
        
    except Exception as e:
        print(f"❌ Error training fluency model: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': 'Failed to train fluency model',
            'details': str(e)
        }), 500

@app.route('/api/fluency/model-status', methods=['GET'])
def fluency_model_status():
    """
    Get status of the fluency XGBoost prediction model
    Returns whether model is trained and available for predictions
    """
    try:
        if fluency_predictor is None:
            return jsonify({
                'available': False,
                'message': 'Fluency predictor not initialized'
            }), 200
        
        model_loaded = fluency_predictor.model is not None
        
        return jsonify({
            'available': True,
            'model_loaded': model_loaded,
            'model_type': 'XGBoost Gradient Boosted Regression Trees',
            'message': 'Model ready for predictions' if model_loaded else 'Model not trained yet. Call /train-model endpoint.'
        }), 200
        
    except Exception as e:
        return jsonify({
            'available': False,
            'error': str(e)
        }), 500

# ============================================================
# STROKE EXERCISE RECOMMENDATION ENDPOINTS (Physical Therapy)
# ============================================================

@app.route('/api/exercises/health', methods=['GET'])
def exercise_health():
    """Health check for exercise recommendation service"""
    return jsonify({
        'status': 'healthy',
        'service': 'Stroke Exercise Recommendation',
        'exercise_library_loaded': exercise_library is not None,
        'recommender_ready': exercise_recommender is not None
    }), 200

@app.route('/api/exercises/recommend', methods=['POST'])
def recommend_exercises():
    """
    Generate exercise recommendations based on detected gait problems
    
    Expected JSON body:
    {
        "detected_problems": [
            {
                "problem": "slow_cadence",
                "severity": "severe",
                "current_value": 85.5,
                "percentile": 15.2,
                "normal_range": "100-120 steps/min",
                "recommendation": "..."
            }
        ],
        "user_profile": {
            "age": 65,
            "fitness_level": "beginner",
            "equipment_available": ["chair"],
            "time_available_per_day": 30,
            "stroke_side": "left",
            "months_post_stroke": 6
        }
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        detected_problems = data.get('detected_problems', [])
        user_profile = data.get('user_profile', {})
        
        if not detected_problems:
            return jsonify({
                'success': False,
                'error': 'No problems detected',
                'message': 'Detected problems array is empty'
            }), 400
        
        print(f"\n{'='*60}")
        print("🎯 Exercise Recommendation Request")
        print(f"{'='*60}")
        print(f"Problems detected: {len(detected_problems)}")
        for problem in detected_problems:
            print(f"  - {problem.get('problem')}: {problem.get('severity')}")
        print(f"User profile: Age {user_profile.get('age', 'N/A')}, "
              f"Fitness: {user_profile.get('fitness_level', 'N/A')}")
        print(f"{'='*60}\n")
        
        # Generate recommendations
        recommendations = exercise_recommender.recommend_exercises(
            detected_problems=detected_problems,
            user_profile=user_profile
        )
        
        print(f"✅ Recommendations generated:")
        print(f"   Total exercises: {recommendations['total_exercises']}")
        print(f"   Estimated timeline: {recommendations['estimated_timeline']['estimated_weeks']} weeks")
        print(f"   Daily time: {recommendations['daily_time_commitment']['average_minutes_per_day']} minutes\n")
        
        return jsonify({
            'success': True,
            'recommendations': recommendations
        }), 200
        
    except Exception as e:
        print(f"❌ Error generating recommendations: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': 'Failed to generate recommendations',
            'details': str(e)
        }), 500

@app.route('/api/exercises/library/problems', methods=['GET'])
def get_problem_types():
    """Get all available problem types and their exercises"""
    try:
        problem_types = exercise_library.get_all_problem_types()
        return jsonify({
            'success': True,
            'problem_types': problem_types
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/exercises/library/<problem_type>/<severity>', methods=['GET'])
def get_exercises_for_problem(problem_type, severity):
    """Get exercises for a specific problem type and severity"""
    try:
        exercises = exercise_library.get_exercises_for_problem(problem_type, severity)
        return jsonify({
            'success': True,
            'problem_type': problem_type,
            'severity': severity,
            'exercises': exercises
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/exercises/library/exercise/<exercise_id>', methods=['GET'])
def get_exercise_by_id(exercise_id):
    """Get a specific exercise by ID"""
    try:
        exercise = exercise_library.get_exercise_by_id(exercise_id)
        if exercise:
            return jsonify({
                'success': True,
                'exercise': exercise
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'Exercise not found'
            }), 404
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ============================================================================
# LANGUAGE MASTERY PREDICTION ENDPOINTS (Receptive & Expressive)
# ============================================================================

# Initialize language predictors
language_receptive_predictor = None
language_expressive_predictor = None

try:
    language_receptive_predictor = LanguageMasteryPredictor(mode='receptive')
    language_expressive_predictor = LanguageMasteryPredictor(mode='expressive')
    print("✅ Language mastery predictors initialized")
except Exception as e:
    print(f"⚠️  Could not initialize language predictors: {e}")

# Initialize overall speech improvement predictor
overall_speech_predictor = None

try:
    overall_speech_predictor = OverallSpeechPredictor()
    print("✅ Overall speech improvement predictor initialized")
except Exception as e:
    print(f"⚠️  Could not initialize overall speech predictor: {e}")

@app.route('/api/language/predict-mastery', methods=['POST'])
def predict_language_mastery():
    """
    Predict days until language therapy mastery
    Request body: { user_id, mode } where mode is 'receptive' or 'expressive'
    """
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        mode = data.get('mode', 'receptive')  # Default to receptive
        
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'user_id is required'
            }), 400
        
        if mode not in ['receptive', 'expressive']:
            return jsonify({
                'success': False,
                'error': 'mode must be either "receptive" or "expressive"'
            }), 400
        
        # Select appropriate predictor
        predictor = language_receptive_predictor if mode == 'receptive' else language_expressive_predictor
        
        if predictor is None or predictor.model is None:
            return jsonify({
                'success': False,
                'error': f'{mode.capitalize()} language prediction model is not available. Please train the model first.',
                'available': False
            }), 503
        
        print(f"\n{'='*60}")
        print(f"🔮 {mode.capitalize()} Language Mastery Prediction Request")
        print(f"{'='*60}")
        print(f"User: {user_id}")
        print(f"Mode: {mode}")
        print(f"{'='*60}\n")
        
        # Get prediction
        prediction = predictor.predict_days_to_mastery(user_id)
        
        return jsonify({
            'success': True,
            'prediction': prediction,
            'mode': mode
        }), 200
        
    except Exception as e:
        print(f"❌ Error in language prediction: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/language/train-model', methods=['POST'])
def train_language_model():
    """
    Train/retrain both receptive and expressive language mastery prediction models
    """
    try:
        data = request.get_json() or {}
        mode = data.get('mode', 'both')  # 'receptive', 'expressive', or 'both'
        
        print(f"\n{'='*60}")
        print(f"🤖 Language Model Training Request")
        print(f"{'='*60}")
        print(f"Mode: {mode}")
        print(f"{'='*60}\n")
        
        results = {}
        
        # Train receptive model
        if mode in ['receptive', 'both']:
            global language_receptive_predictor
            language_receptive_predictor = LanguageMasteryPredictor(mode='receptive')
            receptive_metrics = language_receptive_predictor.train_model()
            results['receptive'] = receptive_metrics
        
        # Train expressive model  
        if mode in ['expressive', 'both']:
            global language_expressive_predictor
            language_expressive_predictor = LanguageMasteryPredictor(mode='expressive')
            expressive_metrics = language_expressive_predictor.train_model()
            results['expressive'] = expressive_metrics
        
        return jsonify({
            'success': True,
            'message': f'{mode.capitalize()} language model(s) trained successfully',
            'metrics': results
        }), 200
        
    except Exception as e:
        print(f"❌ Error training language model: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/language/model-status', methods=['GET'])
def language_model_status():
    """Get status of language mastery prediction models"""
    try:
        receptive_available = language_receptive_predictor is not None and language_receptive_predictor.model is not None
        expressive_available = language_expressive_predictor is not None and language_expressive_predictor.model is not None
        
        return jsonify({
            'receptive': {
                'available': receptive_available,
                'model_loaded': receptive_available,
                'message': 'Receptive language model ready' if receptive_available else 'Model not trained',
                'model_type': 'XGBoost Gradient Boosted Regression Trees' if receptive_available else None
            },
            'expressive': {
                'available': expressive_available,
                'model_loaded': expressive_available,
                'message': 'Expressive language model ready' if expressive_available else 'Model not trained',
                'model_type': 'XGBoost Gradient Boosted Regression Trees' if expressive_available else None
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'receptive': {'available': False, 'error': str(e)},
            'expressive': {'available': False, 'error': str(e)}
        }), 500

# ============================================================================
# OVERALL SPEECH IMPROVEMENT PREDICTION ENDPOINTS (Combines All Therapies)
# ============================================================================

@app.route('/api/speech/predict-overall-improvement', methods=['POST'])
def predict_overall_improvement():
    """
    Predict overall speech therapy improvement combining ALL therapies
    (articulation, fluency, receptive, expressive)
    Returns weekly improvement rate and weeks to full recovery
    """
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'user_id is required'
            }), 400
        
        if overall_speech_predictor is None or overall_speech_predictor.model is None:
            return jsonify({
                'success': False,
                'error': 'Overall speech prediction model is not available. Please train the model first.',
                'available': False
            }), 503
        
        print(f"\n{'='*60}")
        print(f"🎯 Overall Speech Improvement Prediction Request")
        print(f"{'='*60}")
        print(f"User: {user_id}")
        print(f"{'='*60}\n")
        
        # Get prediction
        prediction = overall_speech_predictor.predict_improvement(user_id)
        
        return jsonify({
            'success': True,
            'prediction': prediction
        }), 200
        
    except Exception as e:
        print(f"❌ Error in overall speech prediction: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/speech/train-overall-model', methods=['POST'])
def train_overall_model():
    """
    Train/retrain the overall speech improvement prediction model
    (Admin only)
    """
    try:
        print(f"\n{'='*60}")
        print(f"🤖 Overall Speech Model Training Request")
        print(f"{'='*60}\n")
        
        if overall_speech_predictor is None:
            return jsonify({
                'success': False,
                'error': 'Overall speech predictor not initialized'
            }), 500
        
        # Train model
        overall_speech_predictor.train_model()
        
        return jsonify({
            'success': True,
            'message': 'Overall speech improvement model trained successfully',
            'model_path': overall_speech_predictor.model_path
        }), 200
        
    except Exception as e:
        print(f"❌ Error training overall speech model: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/speech/overall-model-status', methods=['GET'])
def overall_model_status():
    """Get status of the overall speech improvement prediction model"""
    try:
        available = overall_speech_predictor is not None and overall_speech_predictor.model is not None
        
        return jsonify({
            'available': available,
            'message': 'Overall speech model ready' if available else 'Model not trained',
            'model_type': 'XGBoost Gradient Boosted Regression Trees' if available else None,
            'features': 'Combines articulation, fluency, receptive & expressive language data',
            'prediction': 'Weekly improvement rate and weeks to completion'
        }), 200
        
    except Exception as e:
        return jsonify({
            'available': False,
            'error': str(e)
        }), 500


# ============================================================================
# PRESCRIPTIVE ANALYSIS ENDPOINTS
# Intelligent Therapy Prioritization & Sequencing (Decision Rules + Graph-Based)
# ============================================================================

@app.route('/api/therapy/prescriptive/<user_id>', methods=['GET'])
def get_therapy_prioritization(user_id):
    """
    Get intelligent therapy prioritization and sequencing recommendations
    Uses Decision Rules + Graph-Based Recommendations
    
    Returns:
    - Therapy priorities (HIGH/MEDIUM/LOW) with reasoning
    - Weekly practice schedule
    - Actionable recommendations
    - Cross-therapy insights
    - Bottleneck analysis
    - Optimal therapy sequence
    """
    try:
        print(f"\n{'='*60}")
        print(f"🎯 Prescriptive Analysis Request Received")
        print(f"{'='*60}")
        print(f"User ID: {user_id}")
        print(f"Timestamp: {datetime.now()}")
        print(f"{'='*60}\n")
        
        # Generate prescriptive analysis
        print("📊 Generating therapy prioritization...")
        result = generate_therapy_prioritization(user_id)
        print("✅ Prescriptive analysis generated successfully\n")
        
        return jsonify({
            'success': True,
            'user_id': user_id,
            'data': result
        }), 200
        
    except Exception as e:
        print(f"\n{'='*60}")
        print(f"❌ Error in prescriptive analysis: {e}")
        print(f"{'='*60}")
        traceback.print_exc()
        print(f"{'='*60}\n")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Failed to generate therapy prioritization'
        }), 500


@app.route('/api/therapy/prescriptive/priorities/<user_id>', methods=['GET'])
def get_priorities_only(user_id):
    """Get just the priority list without full analysis"""
    try:
        result = generate_therapy_prioritization(user_id)
        
        return jsonify({
            'success': True,
            'priorities': result['priorities'],
            'generated_at': result['generated_at']
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/therapy/prescriptive/schedule/<user_id>', methods=['GET'])
def get_weekly_schedule(user_id):
    """Get just the weekly practice schedule"""
    try:
        result = generate_therapy_prioritization(user_id)
        
        return jsonify({
            'success': True,
            'schedule': result['weekly_schedule'],
            'generated_at': result['generated_at']
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/therapy/prescriptive/insights/<user_id>', methods=['GET'])
def get_therapy_insights(user_id):
    """Get recommendations and insights only"""
    try:
        result = generate_therapy_prioritization(user_id)
        
        return jsonify({
            'success': True,
            'recommendations': result['recommendations'],
            'insights': result['insights'],
            'cross_therapy_insights': result['cross_therapy_insights'],
            'generated_at': result['generated_at']
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/therapy/prescriptive/bottlenecks/<user_id>', methods=['GET'])
def get_therapy_bottlenecks(user_id):
    """Get bottleneck analysis (which therapy is blocking others)"""
    try:
        result = generate_therapy_prioritization(user_id)
        
        return jsonify({
            'success': True,
            'bottleneck_analysis': result['bottleneck_analysis'],
            'optimal_sequence': result['optimal_sequence'],
            'generated_at': result['generated_at']
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


if __name__ == '__main__':
    port = int(os.getenv('THERAPY_PORT', 5002))
    debug = os.getenv('FLASK_ENV', 'development') == 'development'
    
    print("=" * 60)
    print("🎯 Therapy Exercises API Server")
    print("=" * 60)
    print("📍 Running on: http://localhost:" + str(port))
    print("🔧 Debug mode: " + str(debug))
    print("💾 Database: " + DB_NAME)
    print("=" * 60)
    print("📦 Services Available:")
    print("   ├─ Speech Therapy (Fluency, Language, Articulation)")
    print("   ├─ Predictive Analysis (XGBoost ML Models)")
    print("   ├─ Prescriptive Analysis (Decision Rules + Graph-Based)")
    print("   └─ Stroke Exercise Recommendations (Physical Therapy)")
    print("=" * 60)
    
    app.run(host='0.0.0.0', port=port, debug=debug)
