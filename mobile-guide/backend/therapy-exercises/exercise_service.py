"""
Gait Exercise Recommendation Service
Flask API that interfaces with exercise_recommender.py
"""

import sys
import os

# Add parent directory to path so we can import exercise_recommender
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, request, jsonify
from flask_cors import CORS
from exercise_recommender import ExerciseRecommender
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# Initialize exercise recommender
recommender = ExerciseRecommender()

print("=" * 60)
print("🏃 Gait Exercise Recommendation Service")
print("=" * 60)
print("✓ Exercise recommender initialized")
print(f"✓ Exercise library loaded with {len(recommender.exercise_library.get_all_problem_types())} problem types")
print("=" * 60)

@app.route('/api/exercises/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'Gait Exercise Recommendation Service',
        'version': '1.0.0'
    })

@app.route('/api/exercises/recommend', methods=['POST'])
def recommend_exercises():
    """
    Generate exercise recommendations based on detected gait problems
    
    Expected input:
    {
        "detected_problems": [
            {
                "problem": "slow_cadence",
                "severity": "severe",
                "current_value": 32.0,
                "percentile": 3.2,
                "normal_range": "88-105 steps/min",
                "recommendation": "..."
            }
        ],
        "user_profile": {
            "age": 65,
            "fitness_level": "beginner",
            "equipment_available": ["chair", "resistance_band"],
            "time_available_per_day": 45,
            "stroke_side": "left",
            "months_post_stroke": 6
        }
    }
    """
    try:
        data = request.json
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        detected_problems = data.get('detected_problems', [])
        user_profile = data.get('user_profile', None)
        
        print("\n" + "=" * 60)
        print("EXERCISE RECOMMENDATION REQUEST")
        print("=" * 60)
        print(f"Problems detected: {len(detected_problems)}")
        
        if detected_problems:
            for p in detected_problems:
                print(f"  - {p['problem']}: {p['severity']} (percentile: {p.get('percentile', 'N/A')})")
        
        if user_profile:
            print(f"User profile: Age {user_profile.get('age')}, Level: {user_profile.get('fitness_level')}")
        
        # Generate recommendations
        recommendations = recommender.recommend_exercises(detected_problems, user_profile)
        
        print(f"\nResult: {recommendations['status']}")
        
        if recommendations['status'] == 'exercises_recommended':
            print(f"Total exercises: {recommendations['total_exercises']}")
            print(f"Daily time: {recommendations['daily_time_commitment']['average_minutes_per_day']} minutes")
            print(f"Timeline: {recommendations['estimated_timeline']['estimated_weeks']} weeks")
        
        print("=" * 60 + "\n")
        
        return jsonify(recommendations)
        
    except Exception as e:
        print(f"ERROR in recommend_exercises: {e}")
        import traceback
        traceback.print_exc()
        
        return jsonify({
            'success': False,
            'error': 'Failed to generate recommendations',
            'message': str(e)
        }), 500

@app.route('/api/exercises/library/problems', methods=['GET'])
def get_problem_types():
    """Get list of all problem types with available exercises"""
    try:
        problem_types = recommender.exercise_library.get_all_problem_types()
        
        return jsonify({
            'success': True,
            'problem_types': problem_types
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/exercises/library/<problem_type>/<severity>', methods=['GET'])
def get_exercises_for_problem(problem_type, severity):
    """Get exercises for a specific problem and severity level"""
    try:
        exercises = recommender.exercise_library.get_exercises_for_problem(
            problem_type,
            severity
        )
        
        return jsonify({
            'success': True,
            'problem_type': problem_type,
            'severity': severity,
            'exercises': exercises
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/exercises/library/exercise/<exercise_id>', methods=['GET'])
def get_exercise_by_id(exercise_id):
    """Get specific exercise details by ID"""
    try:
        exercise = recommender.exercise_library.get_exercise_by_id(exercise_id)
        
        if exercise:
            return jsonify({
                'success': True,
                'exercise': exercise
            })
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

if __name__ == '__main__':
    port = int(os.getenv('EXERCISE_SERVICE_PORT', 5002))
    debug = os.getenv('FLASK_ENV', 'development') == 'development'
    
    print(f"\n🚀 Starting server on port {port}...")
    print(f"🔧 Debug mode: {debug}")
    print("\nPress Ctrl+C to stop\n")
    
    app.run(host='0.0.0.0', port=port, debug=debug)
