"""
Gait Analysis Backend - Main Flask Application
Processes gyroscope and accelerometer data from mobile devices
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
from datetime import datetime
import os
from dotenv import load_dotenv

from gait_processor import GaitProcessor
from data_validator import validate_sensor_data
from problem_detector import GaitProblemDetector

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for React Native

# Initialize gait processor
gait_processor = GaitProcessor()

# Initialize problem detector (will be loaded after baselines are generated)
try:
    problem_detector = GaitProblemDetector()
    print("✓ Problem detector initialized with research baselines")
except FileNotFoundError as e:
    print(f"⚠️  Problem detector not available: {e}")
    print("   Run 'python generate_baselines.py' to generate baselines")
    problem_detector = None

# Configuration
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max request size


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'service': 'Gait Analysis API'
    }), 200


@app.route('/api/gait/analyze', methods=['POST'])
def analyze_gait():
    """
    Analyze gait data from multiple sensors
    
    Expected JSON payload:
    {
        "accelerometer": [{"x": float, "y": float, "z": float, "timestamp": float}, ...],
        "gyroscope": [{"x": float, "y": float, "z": float, "timestamp": float}, ...],
        "magnetometer": [{"x": float, "y": float, "z": float, "timestamp": float}, ...] (optional),
        "barometer": [{"pressure": float, "relativeAltitude": float, "timestamp": float}, ...] (optional),
        "deviceMotion": [{"acceleration": {}, "rotation": {}, "timestamp": float}, ...] (optional),
        "pedometer": {"steps": int, "startTime": float, "endTime": float} (optional),
        "user_id": string (optional),
        "session_id": string (optional)
    }
    """
    try:
        print("\n" + "="*50)
        print("GAIT ANALYSIS REQUEST RECEIVED")
        print("="*50)
        
        data = request.get_json()
        
        print(f"Request data keys: {list(data.keys())}")
        print(f"Accelerometer samples: {len(data.get('accelerometer', []))}")
        print(f"Gyroscope samples: {len(data.get('gyroscope', []))}")
        print(f"Magnetometer samples: {len(data.get('magnetometer', []))}")
        print(f"Barometer samples: {len(data.get('barometer', []))}")
        print(f"DeviceMotion samples: {len(data.get('deviceMotion', []))}")
        print(f"Pedometer steps: {data.get('pedometer', {}).get('steps', 'N/A')}")
        print(f"User ID: {data.get('user_id', 'not provided')}")
        print(f"Session ID: {data.get('session_id', 'not provided')}")
        
        # Show sample data
        if data.get('accelerometer') and len(data['accelerometer']) > 0:
            print(f"\nFirst accelerometer sample: {data['accelerometer'][0]}")
            print(f"Last accelerometer sample: {data['accelerometer'][-1]}")
        
        # Validate input data
        validation_result = validate_sensor_data(data)
        if not validation_result['valid']:
            print(f"VALIDATION FAILED: {validation_result['errors']}")
            return jsonify({
                'success': False,
                'error': 'Invalid data',
                'details': validation_result['errors']
            }), 400
        
        print("Data validation passed ✓")
        
        # Extract sensor data
        accel_data = data.get('accelerometer', [])
        gyro_data = data.get('gyroscope', [])
        mag_data = data.get('magnetometer', [])
        baro_data = data.get('barometer', [])
        motion_data = data.get('deviceMotion', [])
        pedometer_data = data.get('pedometer', {})
        user_id = data.get('user_id', 'anonymous')
        session_id = data.get('session_id', datetime.now().isoformat())
        
        print(f"\nProcessing gait analysis...")
        # Process gait data with all available sensors
        analysis_result = gait_processor.analyze(
            accelerometer=accel_data,
            gyroscope=gyro_data,
            magnetometer=mag_data if mag_data else None,
            barometer=baro_data if baro_data else None,
            deviceMotion=motion_data if motion_data else None,
            pedometer=pedometer_data if pedometer_data else None,
            user_id=user_id,
            session_id=session_id
        )
        
        print(f"\nAnalysis complete!")
        print(f"Results: {analysis_result}")
        print("="*50 + "\n")
        
        return jsonify({
            'success': True,
            'data': analysis_result,
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        print(f"\n{'!'*50}")
        print(f"ERROR IN GAIT ANALYSIS: {str(e)}")
        print(f"{'!'*50}\n")
        app.logger.error(f"Error analyzing gait data: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        }), 500


@app.route('/api/gait/realtime', methods=['POST'])
def realtime_analysis():
    """
    Real-time gait analysis for streaming data
    Processes smaller chunks of data for immediate feedback
    """
    try:
        data = request.get_json()
        
        # Extract sensor readings
        accel = data.get('accelerometer', {})
        gyro = data.get('gyroscope', {})
        
        # Process single reading
        result = gait_processor.process_realtime(
            accelerometer=accel,
            gyroscope=gyro
        )
        
        return jsonify({
            'success': True,
            'data': result
        }), 200
        
    except Exception as e:
        app.logger.error(f"Error in realtime analysis: {str(e)}")
        return jsonify({
            'error': 'Processing error',
            'message': str(e)
        }), 500


@app.route('/api/gait/history/<user_id>', methods=['GET'])
def get_user_history(user_id):
    """Get gait analysis history for a specific user"""
    try:
        limit = request.args.get('limit', default=10, type=int)
        
        history = gait_processor.get_user_history(user_id, limit=limit)
        
        return jsonify({
            'success': True,
            'user_id': user_id,
            'history': history
        }), 200
        
    except Exception as e:
        app.logger.error(f"Error fetching history: {str(e)}")
        return jsonify({
            'error': 'Failed to fetch history',
            'message': str(e)
        }), 500


@app.route('/api/gait/detect-problems', methods=['POST'])
def detect_problems():
    """
    Detect gait problems from analysis metrics
    
    Expected JSON payload:
    {
        "metrics": {
            "cadence": float,
            "stride_length": float,
            "velocity": float,
            "gait_symmetry": float,
            "stability_score": float,
            "step_regularity": float
        }
    }
    
    Returns:
    {
        "success": true,
        "problems": [...],
        "summary": {...}
    }
    """
    try:
        print("\n" + "="*50)
        print("PROBLEM DETECTION REQUEST RECEIVED")
        print("="*50)
        
        if not problem_detector:
            return jsonify({
                'success': False,
                'error': 'Problem detector not initialized',
                'message': 'Baselines file not found. Run dataset_downloader.py first.'
            }), 503
        
        data = request.get_json()
        
        if 'metrics' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing metrics in request'
            }), 400
        
        metrics = data['metrics']
        
        print(f"Analyzing metrics:")
        print(f"  Cadence: {metrics.get('cadence', 'N/A')}")
        print(f"  Stride Length: {metrics.get('stride_length', 'N/A')}")
        print(f"  Velocity: {metrics.get('velocity', 'N/A')}")
        print(f"  Symmetry: {metrics.get('gait_symmetry', 'N/A')}")
        print(f"  Stability: {metrics.get('stability_score', 'N/A')}")
        print(f"  Regularity: {metrics.get('step_regularity', 'N/A')}")
        
        # Detect problems
        problems = problem_detector.detect_problems(metrics)
        
        # Prioritize by severity
        prioritized = problem_detector.prioritize_problems(problems)
        
        # Generate summary
        summary = problem_detector.generate_summary(prioritized)
        
        print(f"\nProblems detected: {len(prioritized)}")
        if prioritized:
            print(f"Severity breakdown: {summary['severe_count']} severe, {summary['moderate_count']} moderate")
        print("="*50 + "\n")
        
        return jsonify({
            'success': True,
            'problems_detected': len(prioritized),
            'problems': prioritized,
            'summary': summary,
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        print(f"\n{'!'*50}")
        print(f"ERROR IN PROBLEM DETECTION: {str(e)}")
        print(f"{'!'*50}\n")
        app.logger.error(f"Error detecting problems: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        }), 500


@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    port = int(os.getenv('GAIT_ANALYSIS_PORT', 5001))
    debug = os.getenv('FLASK_ENV') == 'development'
    
    print(f"Starting Gait Analysis Server on port {port}...")
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug
    )
