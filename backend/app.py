from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from pymongo import MongoClient
from bson import ObjectId
import jwt
import datetime
from functools import wraps
import os
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, auth
import logging

logger = logging.getLogger(__name__)

# Import fluency CRUD blueprint
from fluency_crud import fluency_bp, init_fluency_crud
# Import language CRUD blueprint
from language_crud import language_bp, init_language_crud
# Import receptive CRUD blueprint
from receptive_crud import receptive_bp, init_receptive_crud
# Import articulation CRUD blueprint
from articulation_crud import articulation_bp, init_articulation_crud
# Import admin management blueprint
from admin.AdminManagement import admin_bp, init_admin_management
# Import success story CRUD blueprint
from success_story_crud import success_story_bp, init_success_story_crud

# Load environment variables from .env file
load_dotenv()

# Helper function for timezone-aware UTC datetime
def utc_now():
    """Returns current UTC time as timezone-aware datetime"""
    return datetime.datetime.now(datetime.timezone.utc)

# Initialize Firebase Admin SDK
cred = credentials.Certificate('cvaped-fa8b2-firebase-adminsdk-fbsvc-92b2666b41.json')
firebase_admin.initialize_app(cred)

app = Flask(__name__)
SECRET_KEY = os.getenv('SECRET_KEY')
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY environment variable is not set. Cannot start application.")

app.config['SECRET_KEY'] = SECRET_KEY
# Enable CORS
CORS(app, origins=["http://localhost:3000", "https://your-production-frontend.com"])

# Rate limiting
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)

# Print confirmation
print("✅ CORS initialized for allowed origins")

bcrypt = Bcrypt(app)

# MongoDB connection
MONGO_URI = os.getenv('MONGO_URI')
if not MONGO_URI:
    raise ValueError("MONGO_URI environment variable is not set")

client = MongoClient(MONGO_URI)
db = client['CVACare']
users_collection = db['users']
articulation_progress_collection = db['articulation_progress']
articulation_trials_collection = db['articulation_trials']
articulation_exercises_collection = db['articulation_exercises']
language_progress_collection = db['language_progress']
language_trials_collection = db['language_trials']
appointments_collection = db['appointments']
facility_diagnostics_collection = db['facility_diagnostics']

# Register fluency CRUD blueprint
app.register_blueprint(fluency_bp)
init_fluency_crud(db)

# Register language CRUD blueprint
app.register_blueprint(language_bp)
init_language_crud(db, app.config['SECRET_KEY'])

# Register receptive CRUD blueprint
app.register_blueprint(receptive_bp)
init_receptive_crud(db, app.config['SECRET_KEY'])

# Register articulation CRUD blueprint
app.register_blueprint(articulation_bp, url_prefix='/api/articulation/exercises')
init_articulation_crud(db, app.config['SECRET_KEY'])

# Register admin management blueprint
app.register_blueprint(admin_bp)
init_admin_management(db)

# Register success story CRUD blueprint
app.register_blueprint(success_story_bp, url_prefix='/api')
init_success_story_crud(db)

# Initialize XGBoost Prediction Service (Standalone - all 4 predictors)
print("\n🤖 Initializing XGBoost Prediction Models...")
print("="*60)
try:
    from articulation_mastery_predictor import ArticulationMasteryPredictor
    from fluency_mastery_predictor import FluencyMasteryPredictor
    from language_mastery_predictor import LanguageMasteryPredictor
    from overall_speech_predictor import OverallSpeechPredictor
    
    print("✅ All 4 XGBoost predictors loaded successfully!")
    print("   - Articulation Mastery Predictor")
    print("   - Fluency Mastery Predictor")
    print("   - Language Mastery Predictor (Receptive & Expressive)")
    print("   - Overall Speech Improvement Predictor")
    print("="*60)
except Exception as e:
    print(f"⚠️  Could not initialize all prediction models: {e}")
    print("   Predictions will use baseline estimates")
    print("="*60)

# Token required decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        
        try:
            # Remove 'Bearer ' prefix if present
            if token.startswith('Bearer '):
                token = token[7:]
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = users_collection.find_one({'_id': ObjectId(data['user_id'])})
            if not current_user:
                return jsonify({'message': 'User not found!'}), 401
        except Exception as e:
            logger.warning(f"Invalid token: {e}")
            return jsonify({'message': 'Token is invalid!'}), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated

# Therapist required decorator
def therapist_required(f):
    @wraps(f)
    def decorated(current_user, *args, **kwargs):
        if current_user.get('role') != 'therapist':
            return jsonify({
                'success': False,
                'message': 'Unauthorized. Only therapists can access this endpoint.'
            }), 403
        return f(current_user, *args, **kwargs)
    return decorated

@app.route('/api/register', methods=['POST'])
@limiter.limit("5 per minute")
def register():
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['email', 'password', 'firstName', 'lastName', 'age', 'gender', 'therapyType', 'patientType']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'message': f'{field} is required'}), 400
        
        email = data['email'].lower()
        password = data['password']
        first_name = data['firstName']
        last_name = data['lastName']
        age = data['age']
        gender = data['gender']
        therapy_type = data['therapyType']  # 'speech' or 'physical'
        patient_type = data['patientType']  # 'myself', 'child', 'dependent'
        role = 'patient'  # Default role for all new registrations
        
        # Validate age
        try:
            age_int = int(age)
            if age_int < 1 or age_int > 120:
                return jsonify({'message': 'Age must be between 1 and 120'}), 400
        except ValueError:
            return jsonify({'message': 'Age must be a valid number'}), 400
        
        # Validate gender
        valid_genders = ['male', 'female', 'other', 'prefer-not-to-say']
        if gender not in valid_genders:
            return jsonify({'message': 'Invalid gender value'}), 400
        
        # Check if user already exists
        if users_collection.find_one({'email': email}):
            return jsonify({'message': 'User already exists'}), 409
        
        # Hash password
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
        
        # Create base user document
        user = {
            'email': email,
            'password': hashed_password,
            'firstName': first_name,
            'lastName': last_name,
            'age': age_int,
            'gender': gender,
            'role': role,
            'therapyType': therapy_type,
            'patientType': patient_type,
            'createdAt': datetime.datetime.utcnow(),
            'updatedAt': datetime.datetime.utcnow()
        }
        
        # Add therapy-specific fields
        if therapy_type == 'speech' and patient_type == 'child':
            # Speech Therapy - Pediatric Patient
            child_required = ['childFirstName', 'childLastName', 'childDateOfBirth', 'childGender']
            parent_required = ['parentFirstName', 'parentLastName', 'parentEmail', 'parentPhone', 'relationshipWithChild']
            
            for field in child_required:
                if field not in data or not data[field]:
                    return jsonify({'message': f'{field} is required for pediatric speech/language therapy'}), 400
            
            for field in parent_required:
                if field not in data or not data[field]:
                    return jsonify({'message': f'{field} is required for pediatric speech/language therapy'}), 400
            
            user['childInfo'] = {
                'firstName': data['childFirstName'],
                'lastName': data['childLastName'],
                'dateOfBirth': data['childDateOfBirth'],
                'gender': data['childGender']
            }
            
            user['parentInfo'] = {
                'firstName': data['parentFirstName'],
                'lastName': data['parentLastName'],
                'email': data['parentEmail'],
                'phone': data['parentPhone'],
                'relationship': data['relationshipWithChild']
            }
        
        elif therapy_type == 'physical':
            # Physical Therapy - Stroke Patient
            patient_required = ['patientFirstName', 'patientLastName', 'patientGender']
            
            for field in patient_required:
                if field not in data or not data[field]:
                    return jsonify({'message': f'{field} is required for physical therapy'}), 400
            
            user['patientInfo'] = {
                'firstName': data['patientFirstName'],
                'lastName': data['patientLastName'],
                'gender': data['patientGender']
            }
        
        # Insert user into database
        result = users_collection.insert_one(user)
        
        # Generate token
        token = jwt.encode({
            'user_id': str(result.inserted_id),
            'role': role,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, app.config['SECRET_KEY'], algorithm="HS256")
        
        return jsonify({
            'message': 'User registered successfully',
            'token': token,
            'user': {
                'id': str(result.inserted_id),
                'email': email,
                'firstName': first_name,
                    'lastName': last_name,
                'age': age_int,
                'gender': gender,
                'role': role,
                'therapyType': therapy_type,
                'patientType': patient_type
            }
        }), 201
        
    except Exception as e:
        logger.error(f"Registration error: {e}", exc_info=True)
        return jsonify({'message': 'Registration failed'}), 500

@app.route('/api/login', methods=['POST'])
@limiter.limit("5 per minute")
def login():
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('email') or not data.get('password'):
            return jsonify({'message': 'Email and password are required'}), 400
        
        email = data['email'].lower()
        password = data['password']
        
        # Find user
        user = users_collection.find_one({'email': email})
        
        if not user:
            return jsonify({'message': 'Invalid email or password'}), 401
        
        # Check password
        if not bcrypt.check_password_hash(user['password'], password):
            return jsonify({'message': 'Invalid email or password'}), 401
        
        # Generate token
        token = jwt.encode({
            'user_id': str(user['_id']),
            'role': user.get('role', 'patient'),
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, app.config['SECRET_KEY'], algorithm="HS256")
        
        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': {
                'id': str(user['_id']),
                'email': user['email'],
                'firstName': user['firstName'],
                'lastName': user['lastName'],
                'role': user.get('role', 'user'),
                'hasInitialDiagnostic': user.get('hasInitialDiagnostic')
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Login error: {e}", exc_info=True)
        return jsonify({'message': 'Login failed'}), 500

@app.route('/api/auth/firebase', methods=['POST'])
@limiter.limit("10 per minute")
def firebase_auth():
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('firebaseToken'):
            return jsonify({'message': 'Firebase token is required'}), 400
        
        firebase_token = data['firebaseToken']
        
        # Verify Firebase token
        try:
            # Verify token and check if revoked
            decoded_token = auth.verify_id_token(firebase_token, check_revoked=True)
            firebase_uid = decoded_token['uid']
            firebase_email = decoded_token.get('email', '').lower()
        except auth.ExpiredIdTokenError:
            return jsonify({
                'message': 'Firebase token has expired. Please sign in again.',
                'error': 'TOKEN_EXPIRED',
                'code': 'auth/id-token-expired'
            }), 401
        except auth.RevokedIdTokenError:
            return jsonify({
                'message': 'Firebase token has been revoked. Please sign in again.',
                'error': 'TOKEN_REVOKED',
                'code': 'auth/id-token-revoked'
            }), 401
        except auth.InvalidIdTokenError:
            return jsonify({
                'message': 'Invalid Firebase token. Please sign in again.',
                'error': 'TOKEN_INVALID',
                'code': 'auth/invalid-id-token'
            }), 401
        except Exception as e:
            logger.error(f"Firebase token verification failed: {e}", exc_info=True)
            return jsonify({
                'message': 'Firebase token verification failed. Please sign in again.',
                'code': 'auth/token-verification-failed'
            }), 401
        
        # Check if user exists by Firebase UID
        user = users_collection.find_one({'providerId': firebase_uid})
        
        if user:
            # Existing user - return user data
            token = jwt.encode({
                'user_id': str(user['_id']),
                'role': user.get('role', 'patient'),
                'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
            }, app.config['SECRET_KEY'], algorithm="HS256")
            
            return jsonify({
                'message': 'Login successful',
                'token': token,
                'user': {
                    'id': str(user['_id']),
                    'email': user['email'],
                    'firstName': user['firstName'],
                    'lastName': user['lastName'],
                    'role': user.get('role', 'patient'),
                    'isProfileComplete': user.get('isProfileComplete', True),
                    'therapyType': user.get('therapyType'),
                    'patientType': user.get('patientType'),
                    'hasInitialDiagnostic': user.get('hasInitialDiagnostic')
                }
            }), 200
        
        # New user - create account with incomplete profile
        email = data.get('email', firebase_email)
        first_name = data.get('firstName', '')
        last_name = data.get('lastName', '')
        profile_picture = data.get('profilePicture', '')
        provider = data.get('provider', 'unknown')
        
        # Check if email already exists
        existing_user = users_collection.find_one({'email': email})
        if existing_user:
            # If user exists but doesn't have providerId, update it (link accounts)
            if not existing_user.get('providerId'):
                users_collection.update_one(
                    {'_id': existing_user['_id']},
                    {
                        '$set': {
                            'providerId': firebase_uid,
                            'provider': provider,
                            'profilePicture': profile_picture or existing_user.get('profilePicture', ''),
                            'updatedAt': datetime.datetime.utcnow()
                        }
                    }
                )
                # Return success with updated user
                token = jwt.encode({
                    'user_id': str(existing_user['_id']),
                    'role': existing_user.get('role', 'patient'),
                    'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
                }, app.config['SECRET_KEY'], algorithm="HS256")
                
                return jsonify({
                    'message': 'Account linked successfully',
                    'token': token,
                    'user': {
                        'id': str(existing_user['_id']),
                        'email': existing_user['email'],
                        'firstName': existing_user['firstName'],
                        'lastName': existing_user['lastName'],
                        'role': existing_user.get('role', 'patient'),
                        'isProfileComplete': existing_user.get('isProfileComplete', True),
                        'therapyType': existing_user.get('therapyType'),
                        'patientType': existing_user.get('patientType'),
                        'hasInitialDiagnostic': existing_user.get('hasInitialDiagnostic')
                    }
                }), 200
            else:
                # User exists with a different provider
                return jsonify({'message': 'Email already registered with a different method. Please login with password.'}), 409
        
        # Create new user with incomplete profile
        new_user = {
            'email': email,
            'firstName': first_name,
            'lastName': last_name,
            'role': 'patient',
            'provider': provider,
            'providerId': firebase_uid,
            'profilePicture': profile_picture,
            'isProfileComplete': False,
            'createdAt': datetime.datetime.utcnow(),
            'updatedAt': datetime.datetime.utcnow()
        }
        
        result = users_collection.insert_one(new_user)
        
        # Generate token
        token = jwt.encode({
            'user_id': str(result.inserted_id),
            'role': 'patient',
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, app.config['SECRET_KEY'], algorithm="HS256")
        
        return jsonify({
            'message': 'User created successfully',
            'token': token,
            'user': {
                'id': str(result.inserted_id),
                'email': email,
                'firstName': first_name,
                'lastName': last_name,
                'role': 'patient',
                'isProfileComplete': False
            }
        }), 201
        
    except Exception as e:
        logger.error(f"Firebase auth error: {e}", exc_info=True)
        return jsonify({'message': 'Firebase authentication failed'}), 500

@app.route('/api/auth/complete-profile', methods=['POST'])
@token_required
def complete_profile(current_user):
    try:
        data = request.get_json()
        
        # Check if profile is already complete
        if current_user.get('isProfileComplete', False):
            return jsonify({'message': 'Profile is already complete'}), 400
        
        # Validate required fields
        required_fields = ['age', 'gender', 'therapyType', 'patientType']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'message': f'{field} is required'}), 400
        
        age = data['age']
        gender = data['gender']
        therapy_type = data['therapyType']
        patient_type = data['patientType']
        
        # Validate age
        try:
            age_int = int(age)
            if age_int < 1 or age_int > 120:
                return jsonify({'message': 'Age must be between 1 and 120'}), 400
        except ValueError:
            return jsonify({'message': 'Age must be a valid number'}), 400
        
        # Validate gender
        valid_genders = ['male', 'female', 'other', 'prefer-not-to-say']
        if gender not in valid_genders:
            return jsonify({'message': 'Invalid gender value'}), 400
        
        # Prepare update data
        update_data = {
            'age': age_int,
            'gender': gender,
            'therapyType': therapy_type,
            'patientType': patient_type,
            'isProfileComplete': True,
            'updatedAt': datetime.datetime.utcnow()
        }
        
        # Add therapy-specific fields
        if therapy_type == 'speech' and patient_type == 'child':
            # Speech Therapy - Pediatric Patient
            child_required = ['childFirstName', 'childLastName', 'childDateOfBirth', 'childGender']
            parent_required = ['parentFirstName', 'parentLastName', 'parentEmail', 'parentPhone', 'relationshipWithChild']
            
            for field in child_required:
                if field not in data or not data[field]:
                    return jsonify({'message': f'{field} is required for pediatric speech/language therapy'}), 400
            
            for field in parent_required:
                if field not in data or not data[field]:
                    return jsonify({'message': f'{field} is required for pediatric speech/language therapy'}), 400
            
            update_data['childInfo'] = {
                'firstName': data['childFirstName'],
                'lastName': data['childLastName'],
                'dateOfBirth': data['childDateOfBirth'],
                'gender': data['childGender']
            }
            
            update_data['parentInfo'] = {
                'firstName': data['parentFirstName'],
                'lastName': data['parentLastName'],
                'email': data['parentEmail'],
                'phone': data['parentPhone'],
                'relationship': data['relationshipWithChild']
            }
        
        elif therapy_type == 'physical':
            # Physical Therapy - Stroke Patient
            patient_required = ['patientFirstName', 'patientLastName', 'patientGender']
            
            for field in patient_required:
                if field not in data or not data[field]:
                    return jsonify({'message': f'{field} is required for physical therapy'}), 400
            
            update_data['patientInfo'] = {
                'firstName': data['patientFirstName'],
                'lastName': data['patientLastName'],
                'gender': data['patientGender']
            }
        
        # Update user profile
        users_collection.update_one(
            {'_id': current_user['_id']},
            {'$set': update_data}
        )
        
        # Get updated user
        updated_user = users_collection.find_one({'_id': current_user['_id']})
        
        return jsonify({
            'message': 'Profile completed successfully',
            'user': {
                'id': str(updated_user['_id']),
                'email': updated_user['email'],
                'firstName': updated_user['firstName'],
                'lastName': updated_user['lastName'],
                'age': updated_user.get('age'),
                'gender': updated_user.get('gender'),
                'role': updated_user.get('role', 'patient'),
                'isProfileComplete': True,
                'therapyType': updated_user['therapyType'],
                'patientType': updated_user['patientType'],
                'hasInitialDiagnostic': updated_user.get('hasInitialDiagnostic')
            }
        }), 200
        
    except Exception as e:
        return jsonify({'message': 'Profile completion failed'}), 500

@app.route('/api/user', methods=['GET'])
@token_required
def get_user(current_user):
    try:
        return jsonify({
            'user': {
                'id': str(current_user['_id']),
                'email': current_user['email'],
                'firstName': current_user['firstName'],
                'lastName': current_user['lastName'],
                'role': current_user.get('role', 'user')
            }
        }), 200
    except Exception as e:
        return jsonify({'message': 'Failed to get user'}), 500

@app.route('/api/user/update', methods=['PUT'])
@token_required
def update_user(current_user):
    try:
        data = request.get_json()
        
        # Prepare update data
        update_data = {
            'updatedAt': datetime.datetime.utcnow()
        }
        
        # Allow updating specific fields
        allowed_fields = ['firstName', 'lastName', 'email']
        for field in allowed_fields:
            if field in data:
                update_data[field] = data[field]
        
        # If email is being updated, check if it's already taken
        if 'email' in update_data:
            existing_user = users_collection.find_one({
                'email': update_data['email'].lower(),
                '_id': {'$ne': current_user['_id']}
            })
            if existing_user:
                return jsonify({'message': 'Email already in use'}), 409
            update_data['email'] = update_data['email'].lower()
        
        # Update user
        users_collection.update_one(
            {'_id': current_user['_id']},
            {'$set': update_data}
        )
        
        # Get updated user
        updated_user = users_collection.find_one({'_id': current_user['_id']})
        
        return jsonify({
            'message': 'Profile updated successfully',
            'user': {
                'id': str(updated_user['_id']),
                'email': updated_user['email'],
                'firstName': updated_user['firstName'],
                'lastName': updated_user['lastName'],
                'role': updated_user.get('role', 'patient'),
                'therapyType': updated_user.get('therapyType'),
                'patientType': updated_user.get('patientType')
            }
        }), 200
        
    except Exception as e:
        return jsonify({'message': 'Failed to update profile'}), 500

@app.route('/api/user/diagnostic-status', methods=['PUT'])
@token_required
def update_diagnostic_status(current_user):
    try:
        data = request.get_json()
        
        if 'hasInitialDiagnostic' not in data:
            return jsonify({'message': 'hasInitialDiagnostic is required'}), 400
        
        has_initial_diagnostic = bool(data['hasInitialDiagnostic'])
        
        # Update user document
        users_collection.update_one(
            {'_id': current_user['_id']},
            {'$set': {
                'hasInitialDiagnostic': has_initial_diagnostic,
                'diagnosticStatusUpdatedAt': datetime.datetime.utcnow(),
                'updatedAt': datetime.datetime.utcnow()
            }}
        )
        
        # Get updated user
        updated_user = users_collection.find_one({'_id': current_user['_id']})
        
        return jsonify({
            'message': 'Diagnostic status updated successfully',
            'user': {
                'id': str(updated_user['_id']),
                'email': updated_user['email'],
                'firstName': updated_user['firstName'],
                'lastName': updated_user['lastName'],
                'role': updated_user.get('role', 'patient'),
                'therapyType': updated_user.get('therapyType'),
                'patientType': updated_user.get('patientType'),
                'hasInitialDiagnostic': updated_user.get('hasInitialDiagnostic', False),
                'diagnosticStatusUpdatedAt': str(updated_user.get('diagnosticStatusUpdatedAt', ''))
            }
        }), 200
        
    except Exception as e:
        return jsonify({'message': 'Failed to update diagnostic status'}), 500

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'message': 'CVACare API is running'}), 200

# Health Logs Endpoints
@app.route('/api/health/logs', methods=['GET'])
@token_required
def get_health_logs(current_user):
    """Get all therapy progress logs for authenticated user"""
    try:
        user_id = str(current_user['_id'])
        logs = []
        fetch_all = request.args.get('all') == 'true'
        limit = int(request.args.get('limit', 50))

        # Fetch Articulation Trials
        articulation_trials = list(articulation_trials_collection.find({'user_id': user_id}).sort('timestamp', -1))
        for trial in articulation_trials:
            # computed_score is stored as 0.0-1.0, convert to percentage
            computed_score = trial.get('scores', {}).get('computed_score', 0)
            score_percentage = int(computed_score * 100) if computed_score <= 1 else int(computed_score)
            
            logs.append({
                '_id': str(trial['_id']),
                'therapyType': 'articulation',
                'soundId': trial.get('sound_id', '').upper(),
                'level': trial.get('level', 1),
                'overallScore': score_percentage,
                'trials': 1,
                'correctCount': 1 if score_percentage >= 70 else 0,
                'createdAt': trial.get('timestamp', datetime.datetime.utcnow()).isoformat()
            })

        # Fetch Articulation Progress (nested trials)
        articulation_progress = list(articulation_progress_collection.find({'user_id': user_id}))
        for progress in articulation_progress:
            sound_id = progress.get('sound_id', '')
            levels = progress.get('levels', {})
            for level_key, level_data in levels.items():
                items = level_data.get('items', {})
                for item_key, item_data in items.items():
                    trial_details = item_data.get('trial_details', [])
                    for trial_index, trial in enumerate(trial_details):
                        # computed_score is stored as 0.0-1.0, convert to percentage
                        computed_score = trial.get('computed_score', 0)
                        score_percentage = int(computed_score * 100) if computed_score <= 1 else int(computed_score)
                        
                        logs.append({
                            '_id': f"art_nested_{progress['_id']}_{level_key}_{item_key}_{trial_index}",
                            'therapyType': 'articulation',
                            'soundId': sound_id.upper(),
                            'level': int(level_key),
                            'overallScore': score_percentage,
                            'trials': 1,
                            'correctCount': 1 if score_percentage >= 70 else 0,
                            'createdAt': item_data.get('last_attempt', progress.get('updated_at', datetime.datetime.utcnow())).isoformat()
                        })

        # Fetch Language Trials
        language_trials = list(language_trials_collection.find({'user_id': user_id}).sort('timestamp', -1))
        for trial in language_trials:
            mode = trial.get('mode', 'language')
            # Language saves score as 0.0/1.0, convert to 0/100
            # OR use is_correct boolean as fallback
            raw_score = trial.get('score', None)
            if raw_score is not None:
                # If score is 0.0-1.0, convert to percentage; if already 0-100, keep as-is
                score_percentage = int(raw_score * 100) if raw_score <= 1 else int(raw_score)
            else:
                score_percentage = 100 if trial.get('is_correct') else 0
            
            logs.append({
                '_id': str(trial['_id']),
                'therapyType': mode if mode in ['receptive', 'expressive'] else 'language',
                'level': trial.get('level', 1),
                'overallScore': score_percentage,
                'trials': 1,
                'correctCount': 1 if trial.get('is_correct') else 0,
                'createdAt': trial.get('timestamp', datetime.datetime.utcnow()).isoformat()
            })

        # Fetch Gait Analysis Records
        gait_progress_collection = db['gaitprogresses']
        gait_records = list(gait_progress_collection.find({'user_id': user_id}).sort('created_at', -1))
        for gait in gait_records:
            # Calculate overall gait score based on metrics (0-100 scale)
            metrics = gait.get('metrics', {})
            stability = metrics.get('stability_score', 0) * 100
            symmetry = metrics.get('gait_symmetry', 0) * 100
            regularity = metrics.get('step_regularity', 0) * 100
            overall_gait_score = int((stability + symmetry + regularity) / 3) if any([stability, symmetry, regularity]) else 0
            
            logs.append({
                '_id': str(gait['_id']),
                'therapyType': 'gait',
                'level': 1,
                'overallScore': overall_gait_score,
                'gaitMetrics': {
                    'step_count': metrics.get('step_count', 0),
                    'cadence': metrics.get('cadence', 0),
                    'velocity': metrics.get('velocity', 0),
                    'stability_score': stability,
                    'gait_symmetry': symmetry,
                    'step_regularity': regularity,
                    'stride_length': metrics.get('stride_length', 0),
                    'vertical_oscillation': metrics.get('vertical_oscillation', 0),
                },
                'detectedProblems': gait.get('detected_problems', []),
                'dataQuality': gait.get('data_quality', 'N/A'),
                'duration': gait.get('analysis_duration', 0),
                'createdAt': gait.get('created_at', datetime.datetime.utcnow()).isoformat()
            })

        # Sort logs chronologically (newest first)
        logs.sort(key=lambda x: x['createdAt'], reverse=True)

        # Return limited or all logs
        recent_logs = logs if fetch_all else logs[:limit]
        
        return jsonify({
            'success': True,
            'logs': recent_logs,
            'total': len(logs),
            'hasMore': len(logs) > limit
        }), 200

    except Exception as e:
        import traceback
        print(f"Error fetching health logs: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': 'Failed to fetch health logs'}), 500

@app.route('/api/health/summary', methods=['GET'])
@token_required
def get_health_summary(current_user):
    """Get health summary statistics for authenticated user"""
    try:
        user_id = str(current_user['_id'])

        # Count trials per therapy type
        articulation_count = articulation_trials_collection.count_documents({'user_id': user_id})
        
        # Get language trials by mode
        receptive_count = language_trials_collection.count_documents({'user_id': user_id, 'mode': 'receptive'})
        expressive_count = language_trials_collection.count_documents({'user_id': user_id, 'mode': 'expressive'})
        
        # Calculate average scores
        articulation_trials = list(articulation_trials_collection.find({'user_id': user_id}))
        # computed_score is 0.0-1.0, convert to percentage
        articulation_scores = [t.get('scores', {}).get('computed_score', 0) * 100 for t in articulation_trials]
        articulation_avg = sum(articulation_scores) / len(articulation_scores) if articulation_scores else 0

        receptive_trials = list(language_trials_collection.find({'user_id': user_id, 'mode': 'receptive'}))
        # Language stores score as 0.0/1.0, convert to percentage
        receptive_scores = []
        for t in receptive_trials:
            score = t.get('score', None)
            if score is not None:
                receptive_scores.append(score * 100 if score <= 1 else score)
            else:
                receptive_scores.append(100 if t.get('is_correct') else 0)
        receptive_avg = sum(receptive_scores) / len(receptive_scores) if receptive_scores else 0

        expressive_trials = list(language_trials_collection.find({'user_id': user_id, 'mode': 'expressive'}))
        # Language stores score as 0.0/1.0, convert to percentage
        expressive_scores = []
        for t in expressive_trials:
            score = t.get('score', None)
            if score is not None:
                expressive_scores.append(score * 100 if score <= 1 else score)
            else:
                expressive_scores.append(100 if t.get('is_correct') else 0)
        expressive_avg = sum(expressive_scores) / len(expressive_scores) if expressive_scores else 0

        # Get gait analysis records
        gait_progress_collection = db['gaitprogresses']
        gait_records = list(gait_progress_collection.find({'user_id': user_id}))
        gait_count = len(gait_records)
        
        # Calculate average gait score (based on stability, symmetry, regularity)
        gait_scores = []
        for gait in gait_records:
            metrics = gait.get('metrics', {})
            stability = metrics.get('stability_score', 0) * 100
            symmetry = metrics.get('gait_symmetry', 0) * 100
            regularity = metrics.get('step_regularity', 0) * 100
            if any([stability, symmetry, regularity]):
                avg_score = (stability + symmetry + regularity) / 3
                gait_scores.append(avg_score)
        gait_avg = sum(gait_scores) / len(gait_scores) if gait_scores else 0

        summary = {
            'articulation': {
                'sessions': articulation_count,
                'avgScore': round(articulation_avg, 1)
            },
            'receptive': {
                'sessions': receptive_count,
                'avgScore': round(receptive_avg, 1)
            },
            'expressive': {
                'sessions': expressive_count,
                'avgScore': round(expressive_avg, 1)
            },
            'language': {
                'sessions': receptive_count + expressive_count,
                'avgScore': round((receptive_avg + expressive_avg) / 2, 1) if (receptive_count + expressive_count) > 0 else 0
            },
            'gait': {
                'sessions': gait_count,
                'avgScore': round(gait_avg, 1)
            }
        }

        return jsonify({
            'success': True,
            'summary': summary
        }), 200

    except Exception as e:
        import traceback
        print(f"Error fetching health summary: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': 'Failed to fetch health summary'}), 500


# ======================
# PRESCRIPTIVE ANALYSIS ENDPOINTS
# ======================

@app.route('/api/prescriptive', methods=['GET'])
@token_required
def get_prescriptive_analysis(current_user):
    """Get intelligent therapy prioritization using Decision Rules + Graph-Based Recommendations"""
    try:
        from therapy_prioritization import generate_therapy_prioritization
        
        # Get user_id from authenticated user
        user_id = str(current_user['_id'])
        
        # Generate prescriptive analysis
        analysis = generate_therapy_prioritization(user_id)
        
        return jsonify({
            'success': True,
            'analysis': analysis
        }), 200
    
    except Exception as e:
        import traceback
        logger.error(f"Error generating prescriptive analysis: {e}", exc_info=True)
        print(f"Error generating prescriptive analysis: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'message': 'Failed to generate prescriptive analysis'
        }), 500

# ======================
# PREDICTION ENDPOINTS (XGBoost ML Models - STANDALONE)
# ======================

@app.route('/api/predictions', methods=['GET'])
@token_required
def get_all_predictions(current_user):
    """
    Get all therapy mastery predictions using XGBoost ML models
    Returns predictions for: Articulation (5 sounds), Fluency, Receptive, Expressive, Overall Speech
    STANDALONE - Uses local XGBoost models, no mobile backend required
    """
    try:
        user_id = str(current_user['_id'])
        
        print(f"\n{'='*60}")
        print(f"🔮 Fetching All Predictions for User: {user_id}")
        print(f"{'='*60}\n")
        
        predictions = {}
        
        # 1. Articulation predictions for all 5 sounds
        try:
            from articulation_mastery_predictor import ArticulationMasteryPredictor
            articulation_predictor = ArticulationMasteryPredictor(db)
            articulation_predictor.load_model()
            
            articulation_predictions = {}
            sounds = ['r', 's', 'l', 'th', 'k']
            for sound in sounds:
                try:
                    pred = articulation_predictor.predict_days_to_mastery(user_id, sound)
                    articulation_predictions[sound] = pred
                except Exception as e:
                    print(f"Could not predict {sound}: {e}")
            
            if articulation_predictions:
                predictions['articulation'] = articulation_predictions
        except Exception as e:
            print(f"Articulation predictor error: {e}")
        
        # 2. Fluency prediction
        try:
            from fluency_mastery_predictor import FluencyMasteryPredictor
            fluency_predictor = FluencyMasteryPredictor(db)
            fluency_predictor.load_model()
            fluency_pred = fluency_predictor.predict_days_to_mastery(user_id)
            predictions['fluency'] = fluency_pred
        except Exception as e:
            print(f"Fluency predictor error: {e}")
        
        # 3. Receptive language prediction
        try:
            from language_mastery_predictor import LanguageMasteryPredictor
            receptive_predictor = LanguageMasteryPredictor(db, mode='receptive')
            receptive_predictor.load_model()
            receptive_pred = receptive_predictor.predict_days_to_mastery(user_id)
            predictions['receptive'] = receptive_pred
        except Exception as e:
            print(f"Receptive predictor error: {e}")
        
        # 4. Expressive language prediction
        try:
            from language_mastery_predictor import LanguageMasteryPredictor
            expressive_predictor = LanguageMasteryPredictor(db, mode='expressive')
            expressive_predictor.load_model()
            expressive_pred = expressive_predictor.predict_days_to_mastery(user_id)
            predictions['expressive'] = expressive_pred
        except Exception as e:
            print(f"Expressive predictor error: {e}")
        
        # 5. Overall speech improvement prediction
        try:
            from overall_speech_predictor import OverallSpeechPredictor
            overall_predictor = OverallSpeechPredictor(db)
            overall_predictor.load_model()
            overall_pred = overall_predictor.predict_improvement(user_id)
            predictions['overall'] = overall_pred
        except Exception as e:
            print(f"Overall predictor error: {e}")
        
        print(f"✅ Predictions retrieved successfully")
        print(f"   Articulation sounds: {len(predictions.get('articulation', {}))}")
        print(f"   Fluency: {'✅' if 'fluency' in predictions else '❌'}")
        print(f"   Receptive: {'✅' if 'receptive' in predictions else '❌'}")
        print(f"   Expressive: {'✅' if 'expressive' in predictions else '❌'}")
        print(f"   Overall: {'✅' if 'overall' in predictions else '❌'}\n")
        
        return jsonify({
            'success': True,
            'predictions': predictions
        }), 200
    
    except Exception as e:
        import traceback
        logger.error(f"Error fetching predictions: {e}", exc_info=True)
        print(f"❌ Error fetching predictions: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'message': 'Failed to fetch predictions'
        }), 500

@app.route('/api/predictions/articulation/<sound_id>', methods=['GET'])
@token_required
def get_articulation_prediction(current_user, sound_id):
    """Get prediction for a specific articulation sound (r, s, l, th, k)"""
    try:
        user_id = str(current_user['_id'])
        
        if sound_id not in ['r', 's', 'l', 'th', 'k']:
            return jsonify({
                'success': False,
                'message': 'Invalid sound_id. Must be one of: r, s, l, th, k'
            }), 400
        
        from articulation_mastery_predictor import ArticulationMasteryPredictor
        predictor = ArticulationMasteryPredictor(db)
        predictor.load_model()
        
        prediction = predictor.predict_days_to_mastery(user_id, sound_id)
        
        return jsonify({
            'success': True,
            'prediction': prediction
        }), 200
    
    except Exception as e:
        logger.error(f"Error getting articulation prediction: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to get articulation prediction'
        }), 500

@app.route('/api/predictions/fluency', methods=['GET'])
@token_required
def get_fluency_prediction(current_user):
    """Get fluency mastery prediction"""
    try:
        user_id = str(current_user['_id'])
        
        from fluency_mastery_predictor import FluencyMasteryPredictor
        predictor = FluencyMasteryPredictor(db)
        predictor.load_model()
        
        prediction = predictor.predict_days_to_mastery(user_id)
        
        return jsonify({
            'success': True,
            'prediction': prediction
        }), 200
    
    except Exception as e:
        logger.error(f"Error getting fluency prediction: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to get fluency prediction'
        }), 500

@app.route('/api/predictions/language/<mode>', methods=['GET'])
@token_required
def get_language_prediction(current_user, mode):
    """Get language mastery prediction (receptive or expressive)"""
    try:
        user_id = str(current_user['_id'])
        
        if mode not in ['receptive', 'expressive']:
            return jsonify({
                'success': False,
                'message': 'Invalid mode. Must be "receptive" or "expressive"'
            }), 400
        
        from language_mastery_predictor import LanguageMasteryPredictor
        predictor = LanguageMasteryPredictor(db, mode=mode)
        predictor.load_model()
        
        prediction = predictor.predict_days_to_mastery(user_id)
        
        return jsonify({
            'success': True,
            'prediction': prediction
        }), 200
    
    except Exception as e:
        logger.error(f"Error getting language prediction: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to get language prediction'
        }), 500

@app.route('/api/predictions/overall', methods=['GET'])
@token_required
def get_overall_prediction(current_user):
    """Get overall speech improvement prediction"""
    try:
        user_id = str(current_user['_id'])
        
        from overall_speech_predictor import OverallSpeechPredictor
        predictor = OverallSpeechPredictor(db)
        predictor.load_model()
        
        prediction = predictor.predict_improvement(user_id)
        
        return jsonify({
            'success': True,
            'prediction': prediction
        }), 200
    
    except Exception as e:
        logger.error(f"Error getting overall prediction: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to get overall prediction'
        }), 500


# ======================
# THERAPIST DASHBOARD ENDPOINTS
# ======================

@app.route('/api/therapist/stats', methods=['GET'])
@token_required
def get_therapist_stats(current_user):
    """
    Get therapist dashboard statistics
    Returns statistics focused on therapy sessions and patient progress
    Query params: ?days=30|90|180|365|all (default: 30)
    """
    try:
        # Verify user is a therapist
        if current_user.get('role') != 'therapist':
            return jsonify({
                'success': False,
                'message': 'Unauthorized. Only therapists can access this endpoint.'
            }), 403
        
        # Get time range filter from query params
        days_param = request.args.get('days', '30')
        if days_param == 'all':
            time_filter = None
        else:
            try:
                days = int(days_param)
                time_filter = utc_now() - datetime.timedelta(days=days)
            except ValueError:
                # Default to 30 days if invalid
                time_filter = utc_now() - datetime.timedelta(days=30)
        
        stats = {}
        
        # Get all patients (users with role 'patient')
        total_patients = users_collection.count_documents({'role': 'patient'})
        stats['total_patients'] = total_patients
        
        # Get therapy session counts
        # 1 session = any number of trials per therapy type per user per day
        # Example: User does 5 fluency trials on Jan 1 = 1 fluency session
        # Example: User does 10 articulation trials on Jan 1 = 1 articulation session
        
        articulation_sessions_pipeline = []
        if time_filter:
            articulation_sessions_pipeline.append({
                '$match': {
                    'timestamp': {'$gte': time_filter}
                }
            })
        
        articulation_sessions_pipeline.extend([
            {
                '$addFields': {
                    'date': {
                        '$dateToString': {
                            'format': '%Y-%m-%d',
                            'date': '$timestamp'
                        }
                    }
                }
            },
            {
                '$group': {
                    '_id': {
                        'user_id': '$user_id',
                        'date': '$date'
                    }
                }
            },
            {
                '$count': 'total'
            }
        ])
        articulation_result = list(articulation_trials_collection.aggregate(articulation_sessions_pipeline))
        articulation_sessions = articulation_result[0]['total'] if articulation_result else 0
        
        language_sessions_pipeline = []
        if time_filter:
            language_sessions_pipeline.append({
                '$match': {
                    'timestamp': {'$gte': time_filter}
                }
            })
        
        language_sessions_pipeline.extend([
            {
                '$addFields': {
                    'date': {
                        '$dateToString': {
                            'format': '%Y-%m-%d',
                            'date': '$timestamp'
                        }
                    }
                }
            },
            {
                '$group': {
                    '_id': {
                        'user_id': '$user_id',
                        'date': '$date'
                    }
                }
            },
            {
                '$count': 'total'
            }
        ])
        language_result = list(language_trials_collection.aggregate(language_sessions_pipeline))
        language_sessions = language_result[0]['total'] if language_result else 0
        
        fluency_sessions_pipeline = []
        if time_filter:
            fluency_sessions_pipeline.append({
                '$match': {
                    'timestamp': {'$gte': time_filter}
                }
            })
        
        fluency_sessions_pipeline.extend([
            {
                '$addFields': {
                    'date': {
                        '$dateToString': {
                            'format': '%Y-%m-%d',
                            'date': '$timestamp'
                        }
                    }
                }
            },
            {
                '$group': {
                    '_id': {
                        'user_id': '$user_id',
                        'date': '$date'
                    }
                }
            },
            {
                '$count': 'total'
            }
        ])
        fluency_result = list(db['fluency_trials'].aggregate(fluency_sessions_pipeline))
        fluency_sessions = fluency_result[0]['total'] if fluency_result else 0
        
        stats['articulation_sessions'] = articulation_sessions
        stats['language_sessions'] = language_sessions
        stats['fluency_sessions'] = fluency_sessions
        
        # Total sessions = sum of all therapy type sessions
        stats['total_sessions'] = articulation_sessions + language_sessions + fluency_sessions
        
        # Debug logging
        print(f"\n=== Therapist Stats Debug (days={days_param}) ===")
        print(f"Time filter: {time_filter}")
        print(f"Articulation sessions: {articulation_sessions}")
        print(f"Language sessions: {language_sessions}")
        print(f"Fluency sessions: {fluency_sessions}")
        print(f"Total sessions: {stats['total_sessions']}")
        print("=" * 50)
        
        # Get active patients (patients with at least one trial in last 30 days)
        thirty_days_ago = utc_now() - datetime.timedelta(days=30)
        
        # Get unique patient IDs from recent trials
        recent_articulation_patients = articulation_trials_collection.distinct(
            'user_id',
            {'timestamp': {'$gte': thirty_days_ago}}
        )
        recent_language_patients = language_trials_collection.distinct(
            'user_id',
            {'timestamp': {'$gte': thirty_days_ago}}
        )
        recent_fluency_patients = db['fluency_trials'].distinct(
            'user_id',
            {'timestamp': {'$gte': thirty_days_ago}}
        )
        
        # Combine and get unique active patients
        active_patient_ids = set(recent_articulation_patients + recent_language_patients + recent_fluency_patients)
        stats['active_patients'] = len(active_patient_ids)
        
        # Get total exercises available
        articulation_exercises = articulation_exercises_collection.count_documents({})
        language_exercises = db['language_exercises'].count_documents({})
        fluency_exercises = db['fluency_exercises'].count_documents({})
        
        stats['total_exercises'] = articulation_exercises + language_exercises + fluency_exercises
        
        # Get recent activity (last 10 therapy sessions across all types)
        recent_activities = []
        
        # Helper function to safely find user by ID (handles both ObjectId and string IDs)
        def find_user_by_id(user_id):
            try:
                # Try as ObjectId first
                return users_collection.find_one({'_id': ObjectId(user_id)})
            except:
                # If that fails, try as string (for test users like 'testuser1')
                return users_collection.find_one({'_id': user_id})
        
        # Helper to get display name from user doc
        def get_user_display_name(user):
            if user.get('name'):
                return user['name']
            first = user.get('firstName', '')
            last = user.get('lastName', '')
            full = f"{first} {last}".strip()
            return full if full else 'Unknown'
        
        # Get recent articulation trials
        articulation_recent = list(articulation_trials_collection.find(
            {},
            {'user_id': 1, 'sound_id': 1, 'timestamp': 1, 'accuracy': 1}
        ).sort('timestamp', -1).limit(10))
        
        for trial in articulation_recent:
            user = find_user_by_id(trial['user_id'])
            if user:
                recent_activities.append({
                    'patient_name': get_user_display_name(user),
                    'therapy_type': 'Articulation',
                    'detail': f"/{trial.get('sound_id', '').upper()}/ sound",
                    'score': round(trial.get('accuracy', 0) * 100),
                    'timestamp': trial['timestamp'].isoformat() if isinstance(trial['timestamp'], datetime.datetime) else str(trial['timestamp'])
                })
        
        # Get recent language trials
        language_recent = list(language_trials_collection.find(
            {},
            {'user_id': 1, 'level': 1, 'timestamp': 1, 'accuracy': 1}
        ).sort('timestamp', -1).limit(10))
        
        for trial in language_recent:
            user = find_user_by_id(trial['user_id'])
            if user:
                recent_activities.append({
                    'patient_name': get_user_display_name(user),
                    'therapy_type': 'Language',
                    'detail': f"Level {trial.get('level', 1)}",
                    'score': round(trial.get('accuracy', 0) * 100),
                    'timestamp': trial['timestamp'].isoformat() if isinstance(trial['timestamp'], datetime.datetime) else str(trial['timestamp'])
                })
        
        # Get recent fluency trials
        fluency_recent = list(db['fluency_trials'].find(
            {},
            {'user_id': 1, 'level': 1, 'timestamp': 1, 'accuracy': 1}
        ).sort('timestamp', -1).limit(10))
        
        for trial in fluency_recent:
            user = find_user_by_id(trial['user_id'])
            if user:
                recent_activities.append({
                    'patient_name': get_user_display_name(user),
                    'therapy_type': 'Fluency',
                    'detail': f"Level {trial.get('level', 1)}",
                    'score': round(trial.get('accuracy', 0) * 100),
                    'timestamp': trial['timestamp'].isoformat() if isinstance(trial['timestamp'], datetime.datetime) else str(trial['timestamp'])
                })
        
        # Sort all activities by timestamp and get top 10
        recent_activities.sort(key=lambda x: x['timestamp'], reverse=True)
        stats['recent_activities'] = recent_activities[:10]
        
        # Calculate average scores
        articulation_avg = list(articulation_trials_collection.aggregate([
            {'$group': {'_id': None, 'avg_accuracy': {'$avg': '$accuracy'}}}
        ]))
        language_avg = list(language_trials_collection.aggregate([
            {'$group': {'_id': None, 'avg_accuracy': {'$avg': '$accuracy'}}}
        ]))
        fluency_avg = list(db['fluency_trials'].aggregate([
            {'$group': {'_id': None, 'avg_accuracy': {'$avg': '$accuracy'}}}
        ]))
        
        stats['average_scores'] = {
            'articulation': round(articulation_avg[0]['avg_accuracy'] * 100, 1) if (articulation_avg and articulation_avg[0].get('avg_accuracy') is not None) else 0,
            'language': round(language_avg[0]['avg_accuracy'] * 100, 1) if (language_avg and language_avg[0].get('avg_accuracy') is not None) else 0,
            'fluency': round(fluency_avg[0]['avg_accuracy'] * 100, 1) if (fluency_avg and fluency_avg[0].get('avg_accuracy') is not None) else 0
        }
        
        # Get appointment statistics
        from datetime import datetime as dt
        
        # Get appointment counts by status
        total_appointments = appointments_collection.count_documents({})
        upcoming_appointments = appointments_collection.count_documents({
            'appointment_date': {'$gte': utc_now()},
            'status': {'$in': ['scheduled', 'confirmed']}
        })
        today_appointments = appointments_collection.count_documents({
            'appointment_date': {
                '$gte': utc_now().replace(hour=0, minute=0, second=0, microsecond=0),
                '$lt': utc_now().replace(hour=23, minute=59, second=59, microsecond=999999)
            },
            'status': {'$in': ['scheduled', 'confirmed']}
        })
        completed_appointments = appointments_collection.count_documents({'status': 'completed'})
        cancelled_appointments = appointments_collection.count_documents({'status': 'cancelled'})
        
        stats['appointments'] = {
            'total': total_appointments,
            'upcoming': upcoming_appointments,
            'today': today_appointments,
            'completed': completed_appointments,
            'cancelled': cancelled_appointments,
            'completion_rate': round((completed_appointments / total_appointments * 100), 1) if total_appointments > 0 else 0
        }
        
        print(f"✅ Therapist stats retrieved successfully")
        print(f"   Total Patients: {total_patients}")
        print(f"   Active Patients: {stats['active_patients']}")
        print(f"   Total Sessions: {stats['total_sessions']}")
        print(f"   Total Appointments: {total_appointments}")
        
        return jsonify({
            'success': True,
            'stats': stats
        }), 200
    
    except Exception as e:
        import traceback
        logger.error(f"Error fetching therapist stats: {e}", exc_info=True)
        print(f"❌ Error fetching therapist stats: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'message': 'Failed to fetch therapist statistics'
        }), 500


@app.route('/api/therapist/reports', methods=['GET'])
@token_required
def get_therapist_reports(current_user):
    """
    Get therapist reports including age bracket analysis and gender distribution
    """
    try:
        # Verify user is a therapist
        if current_user.get('role') != 'therapist':
            return jsonify({
                'success': False,
                'message': 'Unauthorized. Only therapists can access this endpoint.'
            }), 403
        
        # Get all patients
        patients = list(users_collection.find({'role': 'patient'}))
        
        if not patients:
            return jsonify({
                'success': True,
                'data': {
                    'totalPatients': 0,
                    'ageBrackets': [],
                    'genderDistribution': [],
                    'highestAgeBracket': None
                }
            }), 200
        
        total_patients = len(patients)
        
        # Calculate age brackets
        age_brackets = {
            '0-12': 0,
            '13-17': 0,
            '18-25': 0,
            '26-35': 0,
            '36-45': 0,
            '46-55': 0,
            '56-65': 0,
            '66+': 0
        }
        
        # Calculate gender distribution
        gender_counts = {
            'male': 0,
            'female': 0,
            'other': 0,
            'prefer-not-to-say': 0
        }
        
        for patient in patients:
            # Age bracket calculation
            age = patient.get('age')
            if age is not None:
                if age <= 12:
                    age_brackets['0-12'] += 1
                elif age <= 17:
                    age_brackets['13-17'] += 1
                elif age <= 25:
                    age_brackets['18-25'] += 1
                elif age <= 35:
                    age_brackets['26-35'] += 1
                elif age <= 45:
                    age_brackets['36-45'] += 1
                elif age <= 55:
                    age_brackets['46-55'] += 1
                elif age <= 65:
                    age_brackets['56-65'] += 1
                else:
                    age_brackets['66+'] += 1
            
            # Gender distribution
            gender = patient.get('gender', 'prefer-not-to-say')
            if gender in gender_counts:
                gender_counts[gender] += 1
            else:
                gender_counts['other'] += 1
        
        # Format age brackets data
        age_brackets_list = []
        highest_bracket = None
        highest_count = 0
        
        for bracket_range, count in age_brackets.items():
            percentage = round((count / total_patients * 100), 1) if total_patients > 0 else 0
            bracket_data = {
                'range': bracket_range,
                'count': count,
                'percentage': percentage,
                'isHighest': False
            }
            age_brackets_list.append(bracket_data)
            
            if count > highest_count:
                highest_count = count
                highest_bracket = bracket_data
        
        # Mark the highest bracket
        if highest_bracket:
            highest_bracket['isHighest'] = True
            for bracket in age_brackets_list:
                if bracket['range'] == highest_bracket['range']:
                    bracket['isHighest'] = True
        
        # Format gender distribution data
        gender_distribution_list = []
        for gender, count in gender_counts.items():
            if count > 0:  # Only include genders with patients
                percentage = round((count / total_patients * 100), 1) if total_patients > 0 else 0
                gender_distribution_list.append({
                    'gender': gender,
                    'count': count,
                    'percentage': percentage
                })
        
        # Sort by count descending
        gender_distribution_list.sort(key=lambda x: x['count'], reverse=True)
        
        return jsonify({
            'success': True,
            'data': {
                'totalPatients': total_patients,
                'ageBrackets': age_brackets_list,
                'genderDistribution': gender_distribution_list,
                'highestAgeBracket': highest_bracket
            }
        }), 200
    
    except Exception as e:
        import traceback
        logger.error(f"Error fetching therapist reports: {e}", exc_info=True)
        print(f"❌ Error fetching therapist reports: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'message': 'Failed to fetch therapist reports'
        }), 500


# ========================================
# APPOINTMENT MANAGEMENT ENDPOINTS
# ========================================

@app.route('/api/therapist/appointments', methods=['GET'])
@token_required
@therapist_required
def get_therapist_appointments(current_user):
    """Get all appointments for the logged-in therapist"""
    try:
        from datetime import datetime, timedelta
        
        therapist_id = str(current_user['_id'])
        
        # Get query parameters for filtering
        date_filter = request.args.get('date')  # YYYY-MM-DD format
        status_filter = request.args.get('status')  # scheduled, confirmed, completed, cancelled
        therapy_type = request.args.get('therapy_type')  # articulation, language, fluency, physical
        
        # Build query
        query = {'therapist_id': therapist_id}
        
        if date_filter:
            # Filter by specific date
            start_date = datetime.strptime(date_filter, '%Y-%m-%d')
            end_date = start_date + timedelta(days=1)
            query['appointment_date'] = {'$gte': start_date, '$lt': end_date}
        
        if status_filter:
            query['status'] = status_filter
            
        if therapy_type:
            query['therapy_type'] = therapy_type
        
        # Fetch appointments
        appointments = list(appointments_collection.find(query).sort('appointment_date', 1))
        
        # Auto-update past appointments to 'no-show' if they are still 'scheduled' or 'confirmed'
        now = datetime.now()
        for appt in appointments:
            if appt.get('status') in ['scheduled', 'confirmed'] and appt.get('appointment_date') and appt['appointment_date'] < now:
                appt['status'] = 'no-show'
                appointments_collection.update_one(
                    {'_id': appt['_id']},
                    {'$set': {'status': 'no-show', 'updated_at': now}}
                )
        
        # Convert ObjectId to string and format dates
        for appt in appointments:
            appt['_id'] = str(appt['_id'])
            appt['patient_id'] = str(appt['patient_id'])
            appt['therapist_id'] = str(appt['therapist_id'])
            if isinstance(appt.get('appointment_date'), datetime):
                appt['appointment_date'] = appt['appointment_date'].isoformat()
            if isinstance(appt.get('created_at'), datetime):
                appt['created_at'] = appt['created_at'].isoformat()
            if isinstance(appt.get('updated_at'), datetime):
                appt['updated_at'] = appt['updated_at'].isoformat()
        
        return jsonify({
            'success': True,
            'appointments': appointments
        }), 200
    
    except Exception as e:
        import traceback
        logger.error(f"Error fetching therapist appointments: {e}", exc_info=True)
        print(f"❌ Error fetching therapist appointments: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'message': 'Failed to fetch appointments'
        }), 500


@app.route('/api/therapist/appointments/unassigned', methods=['GET'])
@token_required
@therapist_required
def get_unassigned_appointments(current_user):
    """Get all unassigned/pending appointments that need therapist assignment"""
    try:
        from datetime import datetime
        
        # Get query parameters for filtering
        therapy_type = request.args.get('therapy_type')  # articulation, language, fluency, physical
        
        # Build query for pending appointments without therapist
        query = {
            '$or': [
                {'therapist_id': None},
                {'therapist_id': {'$exists': False}},
                {'status': 'pending'}
            ]
        }
        
        if therapy_type:
            query['therapy_type'] = therapy_type
        
        # Fetch unassigned appointments
        appointments = list(appointments_collection.find(query).sort('created_at', -1))
        
        # Convert ObjectId to string and format dates
        for appt in appointments:
            appt['_id'] = str(appt['_id'])
            appt['patient_id'] = str(appt['patient_id'])
            if appt.get('therapist_id'):
                appt['therapist_id'] = str(appt['therapist_id'])
            if isinstance(appt.get('appointment_date'), datetime):
                appt['appointment_date'] = appt['appointment_date'].isoformat()
            if isinstance(appt.get('created_at'), datetime):
                appt['created_at'] = appt['created_at'].isoformat()
            if isinstance(appt.get('updated_at'), datetime):
                appt['updated_at'] = appt['updated_at'].isoformat()
        
        return jsonify({
            'success': True,
            'appointments': appointments,
            'count': len(appointments)
        }), 200
    
    except Exception as e:
        import traceback
        logger.error(f"Error fetching unassigned appointments: {e}", exc_info=True)
        print(f"❌ Error fetching unassigned appointments: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'message': 'Failed to fetch unassigned appointments'
        }), 500


@app.route('/api/therapist/appointments', methods=['POST'])
@token_required
@therapist_required
def create_therapist_appointment(current_user):
    """Create a new appointment (therapist side)"""
    try:
        from datetime import datetime
        
        data = request.get_json()
        therapist_id = str(current_user['_id'])
        
        # Validate required fields
        if not data.get('patient_id'):
            return jsonify({'success': False, 'message': 'Patient ID is required'}), 400
        if not data.get('appointment_date'):
            return jsonify({'success': False, 'message': 'Appointment date is required'}), 400
        if not data.get('therapy_type'):
            return jsonify({'success': False, 'message': 'Therapy type is required'}), 400
        
        # Validate therapy type
        valid_therapy_types = ['articulation', 'language', 'fluency', 'physical']
        if data['therapy_type'] not in valid_therapy_types:
            return jsonify({'success': False, 'message': 'Invalid therapy type'}), 400
        
        # Get patient info
        patient = users_collection.find_one({'_id': ObjectId(data['patient_id'])})
        if not patient:
            return jsonify({'success': False, 'message': 'Patient not found'}), 404
        
        # Parse appointment date
        try:
            appointment_date = datetime.fromisoformat(data['appointment_date'].replace('Z', '+00:00'))
        except ValueError:
            return jsonify({'success': False, 'message': 'Invalid date format. Use ISO 8601 format'}), 400
            
        # Validate allowed scheduling days (Monday, Wednesday, Friday)
        day_of_week = appointment_date.weekday() # 0 = Monday, 2 = Wednesday, 4 = Friday
        if day_of_week not in [0, 2, 4]:
            return jsonify({'success': False, 'message': 'Appointments can only be scheduled on Monday, Wednesday, or Friday.'}), 400
            
        # Validate allowed scheduling time (8:00 AM to 5:00 PM)
        hour = appointment_date.hour
        minute = appointment_date.minute
        if hour < 8 or hour > 17 or (hour == 17 and minute > 0):
            return jsonify({'success': False, 'message': 'Appointments can only be scheduled between 8:00 AM and 5:00 PM.'}), 400
        
        # Create appointment document
        appointment = {
            'patient_id': data['patient_id'],
            'therapist_id': therapist_id,
            'therapy_type': data['therapy_type'],
            'appointment_date': appointment_date,
            'duration': data.get('duration', 60),  # Default 60 minutes
            'status': 'confirmed',  # Therapist-created appointments are auto-approved
            'approved': True,
            'approved_at': datetime.utcnow(),
            'approved_by': therapist_id,
            'notes': data.get('notes', ''),
            'patient_name': f"{patient.get('firstName', '')} {patient.get('lastName', '')}".strip(),
            'patient_email': patient.get('email', ''),
            'therapist_name': f"{current_user.get('firstName', '')} {current_user.get('lastName', '')}".strip(),
            'therapist_email': current_user.get('email', ''),
            'reminder_sent': False,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        
        # Insert appointment
        result = appointments_collection.insert_one(appointment)
        appointment['_id'] = str(result.inserted_id)
        appointment['appointment_date'] = appointment['appointment_date'].isoformat()
        appointment['created_at'] = appointment['created_at'].isoformat()
        appointment['updated_at'] = appointment['updated_at'].isoformat()
        
        return jsonify({
            'success': True,
            'message': 'Appointment created successfully',
            'appointment': appointment
        }), 201
    
    except Exception as e:
        import traceback
        logger.error(f"Error creating appointment: {e}", exc_info=True)
        print(f"❌ Error creating appointment: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'message': 'Failed to create appointment'
        }), 500


@app.route('/api/therapist/appointments/<appointment_id>', methods=['PUT'])
@token_required
@therapist_required
def update_therapist_appointment(current_user, appointment_id):
    """Update an existing appointment"""
    try:
        from datetime import datetime
        
        data = request.get_json()
        therapist_id = str(current_user['_id'])
        
        # Find appointment
        appointment = appointments_collection.find_one({
            '_id': ObjectId(appointment_id),
            'therapist_id': therapist_id
        })
        
        if not appointment:
            return jsonify({'success': False, 'message': 'Appointment not found'}), 404
        
        # Build update document
        update_doc = {'updated_at': datetime.utcnow()}
        
        # Update allowed fields
        if 'appointment_date' in data:
            try:
                appointment_date = datetime.fromisoformat(data['appointment_date'].replace('Z', '+00:00'))
                
                # Validate allowed scheduling days (Monday, Wednesday, Friday)
                day_of_week = appointment_date.weekday() # 0 = Monday, 2 = Wednesday, 4 = Friday
                if day_of_week not in [0, 2, 4]:
                    return jsonify({'success': False, 'message': 'Appointments can only be scheduled on Monday, Wednesday, or Friday.'}), 400
                    
                # Validate allowed scheduling time (8:00 AM to 5:00 PM)
                hour = appointment_date.hour
                minute = appointment_date.minute
                if hour < 8 or hour > 17 or (hour == 17 and minute > 0):
                    return jsonify({'success': False, 'message': 'Appointments can only be scheduled between 8:00 AM and 5:00 PM.'}), 400
                    
                update_doc['appointment_date'] = appointment_date
            except ValueError:
                return jsonify({'success': False, 'message': 'Invalid date format'}), 400
        
        if 'duration' in data:
            update_doc['duration'] = int(data['duration'])
        
        if 'status' in data:
            valid_statuses = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no-show']
            if data['status'] not in valid_statuses:
                return jsonify({'success': False, 'message': 'Invalid status'}), 400
            update_doc['status'] = data['status']
        
        if 'notes' in data:
            update_doc['notes'] = data['notes']
        
        if 'session_summary' in data:
            update_doc['session_summary'] = data['session_summary']
        
        if 'cancellation_reason' in data:
            update_doc['cancellation_reason'] = data['cancellation_reason']
        
        # Update appointment
        appointments_collection.update_one(
            {'_id': ObjectId(appointment_id)},
            {'$set': update_doc}
        )
        
        # Fetch updated appointment
        updated_appointment = appointments_collection.find_one({'_id': ObjectId(appointment_id)})
        updated_appointment['_id'] = str(updated_appointment['_id'])
        updated_appointment['patient_id'] = str(updated_appointment['patient_id'])
        updated_appointment['therapist_id'] = str(updated_appointment['therapist_id'])
        if isinstance(updated_appointment.get('appointment_date'), datetime):
            updated_appointment['appointment_date'] = updated_appointment['appointment_date'].isoformat()
        if isinstance(updated_appointment.get('created_at'), datetime):
            updated_appointment['created_at'] = updated_appointment['created_at'].isoformat()
        if isinstance(updated_appointment.get('updated_at'), datetime):
            updated_appointment['updated_at'] = updated_appointment['updated_at'].isoformat()
        
        return jsonify({
            'success': True,
            'message': 'Appointment updated successfully',
            'appointment': updated_appointment
        }), 200
    
    except Exception as e:
        import traceback
        logger.error(f"Error updating appointment: {e}", exc_info=True)
        print(f"❌ Error updating appointment: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'message': 'Failed to update appointment'
        }), 500


@app.route('/api/therapist/appointments/<appointment_id>', methods=['DELETE'])
@token_required
@therapist_required
def delete_therapist_appointment(current_user, appointment_id):
    """Cancel/delete an appointment"""
    try:
        from datetime import datetime
        
        therapist_id = str(current_user['_id'])
        
        # Find and update appointment status to cancelled
        result = appointments_collection.update_one(
            {
                '_id': ObjectId(appointment_id),
                'therapist_id': therapist_id
            },
            {
                '$set': {
                    'status': 'cancelled',
                    'updated_at': datetime.utcnow()
                }
            }
        )
        
        if result.matched_count == 0:
            return jsonify({'success': False, 'message': 'Appointment not found'}), 404
        
        return jsonify({
            'success': True,
            'message': 'Appointment cancelled successfully'
        }), 200
    
    except Exception as e:
        import traceback
        logger.error(f"Error deleting appointment: {e}", exc_info=True)
        print(f"❌ Error deleting appointment: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'message': 'Failed to cancel appointment'
        }), 500


@app.route('/api/patient/appointments', methods=['GET'])
@token_required
def get_patient_appointments(current_user):
    """Get all appointments for the logged-in patient"""
    try:
        from datetime import datetime
        patient_id = str(current_user['_id'])
        
        # Get query parameters
        status_filter = request.args.get('status')
        
        # Build query
        query = {'patient_id': patient_id}
        if status_filter:
            query['status'] = status_filter
        
        # Fetch appointments
        appointments = list(appointments_collection.find(query).sort('appointment_date', 1))
        
        # Auto-update past appointments to 'no-show' if they are still 'scheduled' or 'confirmed'
        now = datetime.now()
        for appt in appointments:
            if appt.get('status') in ['scheduled', 'confirmed'] and appt.get('appointment_date') and appt['appointment_date'] < now:
                appt['status'] = 'no-show'
                appointments_collection.update_one(
                    {'_id': appt['_id']},
                    {'$set': {'status': 'no-show', 'updated_at': now}}
                )
        
        # Convert ObjectId to string and format dates
        for appt in appointments:
            appt['_id'] = str(appt['_id'])
            appt['patient_id'] = str(appt['patient_id'])
            appt['therapist_id'] = str(appt['therapist_id'])
            if isinstance(appt.get('appointment_date'), datetime):
                appt['appointment_date'] = appt['appointment_date'].isoformat()
            if isinstance(appt.get('created_at'), datetime):
                appt['created_at'] = appt['created_at'].isoformat()
            if isinstance(appt.get('updated_at'), datetime):
                appt['updated_at'] = appt['updated_at'].isoformat()
        
        return jsonify({
            'success': True,
            'appointments': appointments
        }), 200
    
    except Exception as e:
        import traceback
        logger.error(f"Error fetching patient appointments: {e}", exc_info=True)
        print(f"❌ Error fetching patient appointments: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'message': 'Failed to fetch appointments'
        }), 500


@app.route('/api/patient/appointments/book', methods=['POST'])
@token_required
def book_patient_appointment(current_user):
    """Book a new appointment (patient side)"""
    try:
        from datetime import datetime
        
        data = request.get_json()
        patient_id = str(current_user['_id'])
        
        # Validate required fields
        if not data.get('appointment_date'):
            return jsonify({'success': False, 'message': 'Appointment date is required'}), 400
        if not data.get('therapy_type'):
            return jsonify({'success': False, 'message': 'Therapy type is required'}), 400
        
        # Validate therapy type
        valid_therapy_types = ['articulation', 'language', 'fluency', 'physical']
        if data['therapy_type'] not in valid_therapy_types:
            return jsonify({'success': False, 'message': 'Invalid therapy type'}), 400
        
        # Parse appointment date
        try:
            appointment_date = datetime.fromisoformat(data['appointment_date'].replace('Z', '+00:00'))
        except ValueError:
            return jsonify({'success': False, 'message': 'Invalid date format. Use ISO 8601 format'}), 400
            
        # Validate allowed scheduling days (Monday, Wednesday, Friday)
        day_of_week = appointment_date.weekday() # 0 = Monday, 2 = Wednesday, 4 = Friday
        if day_of_week not in [0, 2, 4]:
            return jsonify({'success': False, 'message': 'Appointments can only be scheduled on Monday, Wednesday, or Friday.'}), 400
            
        # Validate allowed scheduling time (8:00 AM to 5:00 PM)
        hour = appointment_date.hour
        minute = appointment_date.minute
        if hour < 8 or hour > 17 or (hour == 17 and minute > 0):
            return jsonify({'success': False, 'message': 'Appointments can only be scheduled between 8:00 AM and 5:00 PM.'}), 400
        
        # Create appointment document (therapist assignment is optional)
        appointment = {
            'patient_id': patient_id,
            'therapist_id': data.get('therapist_id', None),  # Optional - can be assigned later
            'therapy_type': data['therapy_type'],
            'appointment_date': appointment_date,
            'duration': data.get('duration', 60),
            'status': 'pending' if not data.get('therapist_id') else 'scheduled',
            'notes': data.get('notes', ''),
            'patient_name': f"{current_user.get('firstName', '')} {current_user.get('lastName', '')}".strip(),
            'patient_email': current_user.get('email', ''),
            'therapist_name': None,
            'therapist_email': None,
            'reminder_sent': False,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        
        # If therapist is specified, get therapist info
        if data.get('therapist_id'):
            therapist = users_collection.find_one({'_id': ObjectId(data['therapist_id']), 'role': 'therapist'})
            if therapist:
                appointment['therapist_name'] = f"{therapist.get('firstName', '')} {therapist.get('lastName', '')}".strip()
                appointment['therapist_email'] = therapist.get('email', '')
        
        # Insert appointment
        result = appointments_collection.insert_one(appointment)
        appointment['_id'] = str(result.inserted_id)
        appointment['patient_id'] = str(appointment['patient_id'])
        if appointment.get('therapist_id'):
            appointment['therapist_id'] = str(appointment['therapist_id'])
        appointment['appointment_date'] = appointment['appointment_date'].isoformat()
        appointment['created_at'] = appointment['created_at'].isoformat()
        appointment['updated_at'] = appointment['updated_at'].isoformat()
        
        return jsonify({
            'success': True,
            'message': 'Appointment request submitted successfully' if not data.get('therapist_id') else 'Appointment booked successfully',
            'appointment': appointment
        }), 201
    
    except Exception as e:
        import traceback
        logger.error(f"Error booking appointment: {e}", exc_info=True)
        print(f"❌ Error booking appointment: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'message': 'Failed to book appointment'
        }), 500


@app.route('/api/patient/appointments/<appointment_id>/cancel', methods=['PUT'])
@token_required
def cancel_patient_appointment(current_user, appointment_id):
    """Cancel an appointment (patient side)"""
    try:
        from datetime import datetime
        
        patient_id = str(current_user['_id'])
        data = request.get_json()
        
        # Find and update appointment
        result = appointments_collection.update_one(
            {
                '_id': ObjectId(appointment_id),
                'patient_id': patient_id
            },
            {
                '$set': {
                    'status': 'cancelled',
                    'cancellation_reason': data.get('reason', 'Cancelled by patient'),
                    'updated_at': datetime.utcnow()
                }
            }
        )
        
        if result.matched_count == 0:
            return jsonify({'success': False, 'message': 'Appointment not found'}), 404
        
        return jsonify({
            'success': True,
            'message': 'Appointment cancelled successfully'
        }), 200
    
    except Exception as e:
        import traceback
        logger.error(f"Error cancelling appointment: {e}", exc_info=True)
        print(f"❌ Error cancelling appointment: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'message': 'Failed to cancel appointment'
        }), 500


@app.route('/api/therapist/appointments/<appointment_id>/assign', methods=['PUT'])
@token_required
@therapist_required
def assign_therapist_to_appointment(current_user, appointment_id):
    """Assign therapist to an appointment"""
    try:
        from datetime import datetime
        
        therapist_id = str(current_user['_id'])
        
        # Get the appointment
        appointment = appointments_collection.find_one({'_id': ObjectId(appointment_id)})
        if not appointment:
            return jsonify({'success': False, 'message': 'Appointment not found'}), 404
        
        # Check if appointment already has a therapist
        if appointment.get('therapist_id') and appointment.get('therapist_id') != therapist_id:
            return jsonify({
                'success': False, 
                'message': 'This appointment is already assigned to another therapist'
            }), 400
        
        # Update appointment with therapist info
        therapist_name = f"{current_user.get('firstName', '')} {current_user.get('lastName', '')}".strip()
        therapist_email = current_user.get('email', '')
        
        result = appointments_collection.update_one(
            {'_id': ObjectId(appointment_id)},
            {
                '$set': {
                    'therapist_id': therapist_id,
                    'therapist_name': therapist_name,
                    'therapist_email': therapist_email,
                    'status': 'confirmed',  # Approved and confirmed
                    'approved': True,
                    'approved_at': datetime.utcnow(),
                    'approved_by': therapist_id,
                    'updated_at': datetime.utcnow()
                }
            }
        )
        
        if result.matched_count == 0:
            return jsonify({'success': False, 'message': 'Failed to assign therapist'}), 400
        
        # Get updated appointment
        updated_appointment = appointments_collection.find_one({'_id': ObjectId(appointment_id)})
        updated_appointment['_id'] = str(updated_appointment['_id'])
        updated_appointment['patient_id'] = str(updated_appointment['patient_id'])
        updated_appointment['therapist_id'] = str(updated_appointment['therapist_id'])
        if isinstance(updated_appointment.get('appointment_date'), datetime):
            updated_appointment['appointment_date'] = updated_appointment['appointment_date'].isoformat()
        if isinstance(updated_appointment.get('created_at'), datetime):
            updated_appointment['created_at'] = updated_appointment['created_at'].isoformat()
        if isinstance(updated_appointment.get('updated_at'), datetime):
            updated_appointment['updated_at'] = updated_appointment['updated_at'].isoformat()
        
        return jsonify({
            'success': True,
            'message': 'Successfully assigned to appointment',
            'appointment': updated_appointment
        }), 200
    
    except Exception as e:
        import traceback
        logger.error(f"Error assigning therapist: {e}", exc_info=True)
        print(f"❌ Error assigning therapist: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'message': 'Failed to assign therapist'
        }), 500


@app.route('/api/therapists/available', methods=['GET'])
@token_required
def get_available_therapists(current_user):
    """Get list of available therapists"""
    try:
        therapy_type = request.args.get('therapy_type')
        
        # Build query
        query = {'role': 'therapist'}
        if therapy_type:
            query['therapyType'] = therapy_type
        
        # Fetch therapists
        therapists = list(users_collection.find(
            query,
            {'firstName': 1, 'lastName': 1, 'email': 1, 'therapyType': 1}
        ))
        
        # Convert ObjectId to string
        for therapist in therapists:
            therapist['_id'] = str(therapist['_id'])
        
        return jsonify({
            'success': True,
            'therapists': therapists
        }), 200
    
    except Exception as e:
        import traceback
        logger.error(f"Error fetching available therapists: {e}", exc_info=True)
        print(f"❌ Error fetching available therapists: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'message': 'Failed to fetch therapists'
        }), 500


@app.route('/api/therapist/patients/search', methods=['GET'])
@token_required
@therapist_required
def search_patients(current_user):
    """Search patients by name for autocomplete (therapist only)"""
    try:
        search_query = request.args.get('query', '').strip()
        limit = int(request.args.get('limit', 10))
        
        if not search_query:
            return jsonify({
                'success': True,
                'patients': []
            }), 200
        
        # Build regex search for first name or last name
        regex_pattern = {'$regex': search_query, '$options': 'i'}  # case-insensitive
        
        # Search for patients
        query = {
            'role': 'patient',
            '$or': [
                {'firstName': regex_pattern},
                {'lastName': regex_pattern},
                {'email': regex_pattern}
            ]
        }
        
        # Fetch matching patients
        patients = list(users_collection.find(
            query,
            {
                'firstName': 1,
                'lastName': 1,
                'email': 1,
                'age': 1,
                'gender': 1,
                'therapyType': 1,
                'patientType': 1
            }
        ).limit(limit))
        
        # Convert ObjectId to string and format full name
        for patient in patients:
            patient['_id'] = str(patient['_id'])
            patient['fullName'] = f"{patient.get('firstName', '')} {patient.get('lastName', '')}".strip()
        
        return jsonify({
            'success': True,
            'patients': patients
        }), 200
    
    except Exception as e:
        import traceback
        logger.error(f"Error searching patients: {e}", exc_info=True)
        print(f"❌ Error searching patients: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'message': 'Failed to search patients'
        }), 500


@app.route('/api/appointments/availability', methods=['GET'])
@token_required
def check_appointment_availability(current_user):
    """Check available time slots for a therapist on a specific date"""
    try:
        from datetime import datetime, timedelta
        
        therapist_id = request.args.get('therapist_id')
        date_str = request.args.get('date')  # YYYY-MM-DD
        
        if not therapist_id or not date_str:
            return jsonify({'success': False, 'message': 'Therapist ID and date are required'}), 400
        
        # Parse date
        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d')
        except ValueError:
            return jsonify({'success': False, 'message': 'Invalid date format. Use YYYY-MM-DD'}), 400
        
        # Get all appointments for this therapist on this date
        start_of_day = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = start_of_day + timedelta(days=1)
        
        appointments = list(appointments_collection.find({
            'therapist_id': therapist_id,
            'appointment_date': {'$gte': start_of_day, '$lt': end_of_day},
            'status': {'$in': ['scheduled', 'confirmed']}
        }))
        
        # Generate available time slots (9 AM to 5 PM, 30-minute increments)
        available_slots = []
        current_time = start_of_day.replace(hour=9, minute=0)
        end_time = start_of_day.replace(hour=17, minute=0)
        
        while current_time < end_time:
            # Check if this slot is available
            slot_available = True
            for appt in appointments:
                appt_start = appt['appointment_date']
                appt_end = appt_start + timedelta(minutes=appt.get('duration', 60))
                
                # Check for overlap
                if current_time >= appt_start and current_time < appt_end:
                    slot_available = False
                    break
            
            if slot_available:
                available_slots.append(current_time.isoformat())
            
            current_time += timedelta(minutes=30)
        
        return jsonify({
            'success': True,
            'availableSlots': available_slots
        }), 200
    
    except Exception as e:
        import traceback
        logger.error(f"Error checking availability: {e}", exc_info=True)
        print(f"❌ Error checking availability: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'message': 'Failed to check availability'
        }), 500


# Azure Speech Configuration
AZURE_SPEECH_KEY = os.getenv('AZURE_SPEECH_KEY')
AZURE_SPEECH_REGION = os.getenv('AZURE_SPEECH_REGION', 'eastus')

def assess_pronunciation_azure(audio_path, reference_text):
    """
    Use Azure Speech Services Pronunciation Assessment API
    This is specifically designed for speech therapy and language learning!
    """
    try:
        import azure.cognitiveservices.speech as speechsdk
        import json
        
        # Create speech config
        speech_config = speechsdk.SpeechConfig(
            subscription=AZURE_SPEECH_KEY,
            region=AZURE_SPEECH_REGION
        )
        
        # Create audio config from file
        audio_config = speechsdk.audio.AudioConfig(filename=audio_path)
        
        # Configure pronunciation assessment
        pronunciation_config = speechsdk.PronunciationAssessmentConfig(
            reference_text=reference_text,
            grading_system=speechsdk.PronunciationAssessmentGradingSystem.HundredMark,
            granularity=speechsdk.PronunciationAssessmentGranularity.Phoneme,
            enable_miscue=True
        )
        
        # Create speech recognizer
        speech_recognizer = speechsdk.SpeechRecognizer(
            speech_config=speech_config,
            audio_config=audio_config
        )
        
        # Apply pronunciation assessment config
        pronunciation_config.apply_to(speech_recognizer)
        
        # Recognize speech
        result = speech_recognizer.recognize_once()
        
        if result.reason == speechsdk.ResultReason.RecognizedSpeech:
            # Get pronunciation assessment results
            pronunciation_result = speechsdk.PronunciationAssessmentResult(result)
            
            return {
                'success': True,
                'transcription': result.text,
                'accuracy_score': pronunciation_result.accuracy_score / 100,  # 0-1 scale
                'pronunciation_score': pronunciation_result.pronunciation_score / 100,
                'completeness_score': pronunciation_result.completeness_score / 100,
                'fluency_score': pronunciation_result.fluency_score / 100,
                'phonemes': [
                    {
                        'phoneme': p.phoneme,
                        'score': p.accuracy_score / 100
                    }
                    for p in pronunciation_result.phonemes
                ] if hasattr(pronunciation_result, 'phonemes') else []
            }
        else:
            return {
                'success': False,
                'error': f'Recognition failed: {result.reason}'
            }
            
    except Exception as e:
        logger.error(f"Azure assessment error: {e}", exc_info=True)
        print(f"Azure assessment error: {str(e)}")
        return {
            'success': False,
            'error': 'Assessment failed'
        }

# Articulation Therapy Endpoints
@app.route('/api/articulation/record', methods=['POST'])
@token_required
def record_articulation(current_user):
    """Process articulation recordings with Azure Pronunciation Assessment"""
    try:
        import tempfile
        import uuid
        
        # Get form data
        if 'audio' not in request.files:
            return jsonify({'success': False, 'message': 'No audio file provided'}), 400
        
        audio_file = request.files['audio']
        target = request.form.get('target', '').strip()
        sound_id = request.form.get('sound_id', '').strip()
        level = int(request.form.get('level', 1))
        item_index = int(request.form.get('item_index', 0))
        trial = int(request.form.get('trial', 1))
        
        if not target:
            return jsonify({'success': False, 'message': 'Target text is required'}), 400
        
        # Save audio file temporarily and convert to WAV format for Azure
        import soundfile as sf
        import librosa
        
        temp_dir = tempfile.gettempdir()
        temp_webm = os.path.join(temp_dir, f'recording_{uuid.uuid4()}.webm')
        temp_wav = os.path.join(temp_dir, f'recording_{uuid.uuid4()}.wav')
        
        # Save uploaded file first
        audio_file.save(temp_webm)
        
        # Convert to WAV format using librosa (Azure requires WAV)
        try:
            audio_data, sample_rate = librosa.load(temp_webm, sr=16000)  # Azure expects 16kHz
            sf.write(temp_wav, audio_data, sample_rate, subtype='PCM_16')  # 16-bit PCM WAV
            temp_path = temp_wav
        except Exception as conv_error:
            print(f"Audio conversion error: {str(conv_error)}")
            # Cleanup
            if os.path.exists(temp_webm):
                os.unlink(temp_webm)
            raise
        
        try:
            print(f"Assessing pronunciation for target: '{target}'")
            
            # Check if Azure is configured
            if not AZURE_SPEECH_KEY or AZURE_SPEECH_KEY == 'YOUR_AZURE_SPEECH_KEY_HERE':
                print("Azure not configured, using fallback simple matching")
                # Simple fallback scoring
                computed_score = 0.75  # Default moderate score
                feedback = f"Azure Speech not configured. Please add AZURE_SPEECH_KEY to .env file."
                transcription = target  # Assume correct for now
                
                return jsonify({
                    'success': True,
                    'scores': {
                        'computed_score': computed_score
                    },
                    'feedback': feedback,
                    'transcription': transcription,
                    'target': target,
                    'note': 'Using fallback scoring. Configure Azure for accurate assessment.'
                }), 200
            
            # Use Azure Pronunciation Assessment
            result = assess_pronunciation_azure(temp_path, target)
            
            if not result['success']:
                return jsonify({
                    'success': False,
                    'message': 'Pronunciation assessment failed',
                    'error': result.get('error', 'Unknown error')
                }), 500
            
            # Azure gives us detailed scores!
            accuracy = result['accuracy_score']
            pronunciation = result['pronunciation_score']
            completeness = result['completeness_score']
            fluency = result['fluency_score']
            
            # Combine scores (emphasize pronunciation for articulation therapy)
            computed_score = (pronunciation * 0.5) + (accuracy * 0.3) + (completeness * 0.2)
            
            # Generate feedback based on Azure's detailed analysis
            transcription = result['transcription']
            
            if computed_score >= 0.90:
                feedback = f"🎉 Excellent pronunciation! Score: {int(computed_score*100)}%"
            elif computed_score >= 0.75:
                feedback = f"👍 Good job! You said '{transcription}'. Score: {int(computed_score*100)}%"
            elif computed_score >= 0.50:
                feedback = f"Keep practicing '{target}'. Score: {int(computed_score*100)}%"
            else:
                feedback = f"Try listening to the model again. Score: {int(computed_score*100)}%"
            
            print(f"Azure Assessment - Target: '{target}' | Said: '{transcription}' | Score: {computed_score:.2f}")
            print(f"Detailed: Accuracy={accuracy:.2f}, Pronunciation={pronunciation:.2f}, Completeness={completeness:.2f}, Fluency={fluency:.2f}")
            
            # Save trial data to database
            trial_data = {
                'user_id': str(current_user['_id']),
                'sound_id': sound_id,
                'level': level,
                'item_index': item_index,
                'target': target,
                'trial': trial,
                'scores': {
                    'accuracy_score': round(accuracy, 3),
                    'pronunciation_score': round(pronunciation, 3),
                    'completeness_score': round(completeness, 3),
                    'fluency_score': round(fluency, 3),
                    'computed_score': round(computed_score, 3)
                },
                'transcription': transcription,
                'feedback': feedback,
                'timestamp': datetime.datetime.utcnow()
            }
            articulation_trials_collection.insert_one(trial_data)
            
            return jsonify({
                'success': True,
                'scores': {
                    'accuracy_score': round(accuracy, 3),
                    'pronunciation_score': round(pronunciation, 3),
                    'completeness_score': round(completeness, 3),
                    'fluency_score': round(fluency, 3),
                    'computed_score': round(computed_score, 3)
                },
                'feedback': feedback,
                'transcription': transcription,
                'target': target,
                'phonemes': result.get('phonemes', [])
            }), 200
            
        finally:
            # Clean up temporary files
            try:
                if os.path.exists(temp_wav):
                    os.unlink(temp_wav)
            except:
                pass
            try:
                if os.path.exists(temp_webm):
                    os.unlink(temp_webm)
            except:
                pass
        
    except Exception as e:
        import traceback
        print(f"Error processing recording: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': 'Failed to process recording'}), 500

@app.route('/api/articulation/exercises/<sound_id>/<int:level>', methods=['GET'])
@token_required
def get_exercises(current_user, sound_id, level):
    """Mock endpoint for getting exercise items"""
    try:
        # Mock exercise data (replace with MongoDB queries)
        exercises_data = {
            's': {
                1: ['s', 'sss', 'hiss'],
                2: ['sa', 'se', 'si'],
                3: ['sun', 'sock', 'sip'],
                4: ['See the sun.', 'Sit down.', 'Pass the salt.'],
                5: ['Sam saw seven shiny shells.', 'The sun is very hot.', 'She sells sea shells.']
            },
            'r': {
                1: ['r', 'rrr', 'ra'],
                2: ['ra', 're', 'ri'],
                3: ['rabbit', 'red', 'run'],
                4: ['Run to the road.', 'Read the book.', 'Red balloon.'],
                5: ['Rita rides the red rocket.', 'The rabbit raced around the yard.', 'Robert ran really fast.']
            },
            'l': {
                1: ['l', 'la', 'lal'],
                2: ['la', 'le', 'li'],
                3: ['lion', 'leaf', 'lamp'],
                4: ['Look at the lion.', 'Lift the box.', 'Light the lamp.'],
                5: ['Lily loves lemons.', 'The little lamb likes leaves.', 'Lay the blanket down.']
            },
            'k': {
                1: ['k', 'ka', 'ku'],
                2: ['ka', 'ke', 'ki'],
                3: ['kite', 'cat', 'car'],
                4: ['Kick the ball.', 'Cook the rice.', 'Clean the cup.'],
                5: ['Keep the kite flying high.', 'The cat climbed the kitchen counter.', 'Kara kept a key in her pocket.']
            },
            'th': {
                1: ['th', 'thh', 'th-hold'],
                2: ['tha', 'the', 'thi'],
                3: ['think', 'this', 'thumb'],
                4: ['Think about that.', 'This is the thumb.', 'They thank her.'],
                5: ['Those three thieves thought they were free.', 'This is my thumb.', 'The therapist taught them slowly.']
            }
        }
        
        if sound_id not in exercises_data or level not in exercises_data[sound_id]:
            return jsonify({'success': False, 'message': 'Invalid sound or level'}), 404
        
        items = exercises_data[sound_id][level]
        
        return jsonify({
            'success': True,
            'sound_id': sound_id,
            'level': level,
            'items': items,
            'total_items': len(items)
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'message': 'Failed to get exercises'}), 500

@app.route('/api/articulation/progress', methods=['POST'])
@token_required
def save_progress(current_user):
    """Save user's articulation progress"""
    try:
        data = request.get_json()
        
        user_id = str(current_user['_id'])
        sound_id = data.get('sound_id')
        level = data.get('level')
        item_index = data.get('item_index')
        completed = data.get('completed', False)
        average_score = data.get('average_score', 0)
        trial_details = data.get('trial_details', [])
        
        # Find or create progress document
        progress_doc = articulation_progress_collection.find_one({
            'user_id': user_id,
            'sound_id': sound_id
        })
        
        if not progress_doc:
            # Create new progress document
            progress_doc = {
                'user_id': user_id,
                'sound_id': sound_id,
                'levels': {},
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            }
        
        # Update level progress
        level_key = str(level)
        if level_key not in progress_doc.get('levels', {}):
            progress_doc.setdefault('levels', {})[level_key] = {'items': {}}
        
        # Update item progress
        item_key = str(item_index)
        progress_doc['levels'][level_key]['items'][item_key] = {
            'completed': completed,
            'average_score': average_score,
            'trial_details': trial_details,
            'last_attempt': datetime.datetime.utcnow()
        }
        
        # Check if level is complete (all items completed)
        level_data = progress_doc['levels'][level_key]
        # Determine total items for this level (1 for level 1, 3 for level 2, 2 for others)
        if level == 1:
            total_items = 1
        elif level == 2:
            total_items = 3
        else:
            total_items = 2
            
        completed_items = sum(1 for item in level_data.get('items', {}).values() if item.get('completed', False))
        level_data['is_complete'] = completed_items >= total_items
        level_data['completed_items'] = completed_items
        level_data['total_items'] = total_items
        
        progress_doc['updated_at'] = datetime.datetime.utcnow()
        
        # Upsert progress document
        articulation_progress_collection.update_one(
            {'user_id': user_id, 'sound_id': sound_id},
            {'$set': progress_doc},
            upsert=True
        )
        
        # Convert ObjectId to string for JSON serialization
        if '_id' in progress_doc:
            progress_doc['_id'] = str(progress_doc['_id'])
        
        return jsonify({
            'success': True,
            'message': 'Progress saved successfully',
            'progress': progress_doc
        }), 200
        
    except Exception as e:
        import traceback
        print(f"Error saving progress: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': 'Failed to save progress'}), 500

@app.route('/api/articulation/progress/<sound_id>', methods=['GET'])
@token_required
def get_progress(current_user, sound_id):
    """Get user's articulation progress for a specific sound"""
    try:
        user_id = str(current_user['_id'])
        
        progress_doc = articulation_progress_collection.find_one({
            'user_id': user_id,
            'sound_id': sound_id
        })
        
        if not progress_doc:
            # Return empty progress
            return jsonify({
                'success': True,
                'sound_id': sound_id,
                'current_level': 1,
                'current_item': 0,
                'levels': {},
                'has_progress': False
            }), 200
        
        # Determine current level and item
        current_level = 1
        current_item = 0
        
        # Find the first incomplete level
        for level_num in range(1, 6):
            level_key = str(level_num)
            level_data = progress_doc.get('levels', {}).get(level_key, {})
            
            if not level_data.get('is_complete', False):
                current_level = level_num
                
                # Find first incomplete item in this level
                items = level_data.get('items', {})
                for item_idx in range(10):  # Max 10 items per level
                    item_key = str(item_idx)
                    if item_key not in items or not items[item_key].get('completed', False):
                        current_item = item_idx
                        break
                break
        
        # Remove MongoDB _id from response
        if '_id' in progress_doc:
            del progress_doc['_id']
        
        return jsonify({
            'success': True,
            'sound_id': sound_id,
            'current_level': current_level,
            'current_item': current_item,
            'levels': progress_doc.get('levels', {}),
            'has_progress': True
        }), 200
        
    except Exception as e:
        import traceback
        print(f"Error getting progress: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': 'Failed to get progress'}), 500

@app.route('/api/articulation/progress/all', methods=['GET'])
@token_required
def get_all_progress(current_user):
    """Get user's progress across all sounds"""
    try:
        user_id = str(current_user['_id'])
        
        all_progress = list(articulation_progress_collection.find({'user_id': user_id}))
        
        # Remove MongoDB _id from each document
        for progress in all_progress:
            if '_id' in progress:
                del progress['_id']
        
        return jsonify({
            'success': True,
            'progress': all_progress
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'message': 'Failed to get all progress'}), 500

@app.route('/api/language/assess-expressive', methods=['POST'])
@token_required
def assess_expressive_language(current_user):
    """Assess expressive language using Azure Speech-to-Text and Text Analytics"""
    try:
        import azure.cognitiveservices.speech as speechsdk
        import io
        import wave
        
        # Get audio file
        audio_file = request.files.get('audio')
        if not audio_file:
            return jsonify({'success': False, 'message': 'No audio file provided'}), 400
        
        # Get exercise parameters
        exercise_id = request.form.get('exercise_id')
        exercise_type = request.form.get('exercise_type')
        expected_keywords_str = request.form.get('expected_keywords', '[]')
        min_words = int(request.form.get('min_words', 5))
        
        import json
        expected_keywords = json.loads(expected_keywords_str)
        
        # Azure Speech Config
        speech_key = os.getenv('AZURE_SPEECH_KEY')
        service_region = os.getenv('AZURE_SPEECH_REGION')
        
        if not speech_key or not service_region:
            return jsonify({'success': False, 'message': 'Azure credentials not configured'}), 500
        
        speech_config = speechsdk.SpeechConfig(subscription=speech_key, region=service_region)
        speech_config.speech_recognition_language = "en-US"
        
        # Save audio to temporary file
        import tempfile
        audio_bytes = audio_file.read()
        
        # Create temporary file for WAV audio
        temp_wav = tempfile.NamedTemporaryFile(delete=False, suffix='.wav')
        temp_wav_path = temp_wav.name
        temp_wav.close()
        
        try:
            # Write the WAV audio directly (frontend now converts to WAV)
            with open(temp_wav_path, 'wb') as f:
                f.write(audio_bytes)
            
            print(f"Audio file saved: {temp_wav_path}, size: {len(audio_bytes)} bytes")
            
            # Create Azure audio config with the WAV file
            audio_config = speechsdk.audio.AudioConfig(filename=temp_wav_path)
            speech_recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config, audio_config=audio_config)
            
            # Perform speech recognition
            result = speech_recognizer.recognize_once()
            
            # Close/release the recognizer to free the file
            del speech_recognizer
            del audio_config
            
            import os as os_module
            import time
            
            if result.reason == speechsdk.ResultReason.RecognizedSpeech:
                transcription = result.text
                
                # Basic text analysis (word count, keyword matching)
                words = transcription.lower().split()
                word_count = len(words)
                
                # Check for expected keywords
                keywords_found = []
                for keyword in expected_keywords:
                    if keyword.lower() in transcription.lower():
                        keywords_found.append(keyword)
                
                # Calculate score
                keyword_score = len(keywords_found) / len(expected_keywords) if expected_keywords else 0
                word_count_score = min(word_count / min_words, 1.0)
                
                # Overall score (weighted average)
                overall_score = (keyword_score * 0.7) + (word_count_score * 0.3)
                
                # Generate feedback
                if overall_score >= 0.9:
                    feedback = "Excellent! Your response was complete and covered all expected points."
                elif overall_score >= 0.7:
                    feedback = "Good job! Your response was mostly complete."
                elif overall_score >= 0.5:
                    feedback = "Fair response. Try to include more details."
                else:
                    feedback = "Your response needs improvement. Try to include more relevant information."
                
                # Wait a bit for file handle to be released, then clean up
                time.sleep(0.1)
                try:
                    if os_module.path.exists(temp_wav_path):
                        os_module.unlink(temp_wav_path)
                except Exception as cleanup_error:
                    print(f"Warning: Could not delete temp file: {cleanup_error}")
                
                return jsonify({
                    'success': True,
                    'transcription': transcription,
                    'key_phrases': keywords_found,
                    'word_count': word_count,
                    'score': overall_score,
                    'feedback': feedback
                }), 200
            
            elif result.reason == speechsdk.ResultReason.NoMatch:
                # Wait a bit for file handle to be released, then clean up
                time.sleep(0.1)
                try:
                    if os_module.path.exists(temp_wav_path):
                        os_module.unlink(temp_wav_path)
                except Exception as cleanup_error:
                    print(f"Warning: Could not delete temp file: {cleanup_error}")
                    
                return jsonify({
                    'success': False,
                    'message': 'No speech could be recognized. Please try speaking more clearly.'
                }), 400
            
            else:
                # Wait a bit for file handle to be released, then clean up
                time.sleep(0.1)
                try:
                    if os_module.path.exists(temp_wav_path):
                        os_module.unlink(temp_wav_path)
                except Exception as cleanup_error:
                    print(f"Warning: Could not delete temp file: {cleanup_error}")
                    
                return jsonify({
                    'success': False,
                    'message': 'Speech recognition failed. Please try again.'
                }), 400
                
        except Exception as e:
            # Wait a bit for file handle to be released, then clean up
            import os as os_module
            import time
            time.sleep(0.1)
            try:
                if os_module.path.exists(temp_wav_path):
                    os_module.unlink(temp_wav_path)
            except Exception as cleanup_error:
                print(f"Warning: Could not delete temp file: {cleanup_error}")
            raise e
            
    except Exception as e:
        import traceback
        print(f"Error assessing expressive language: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': 'Assessment failed'}), 500

# Language Therapy Progress Endpoints
@app.route('/api/language/progress', methods=['POST'])
@token_required
def save_language_progress(current_user):
    """Save user's language therapy progress"""
    try:
        data = request.get_json()
        
        user_id = str(current_user['_id'])
        mode = data.get('mode')  # 'receptive' or 'expressive'
        exercise_index = data.get('exercise_index')
        exercise_id = data.get('exercise_id')
        is_correct = data.get('is_correct', False)
        score = data.get('score', 0)
        user_answer = data.get('user_answer')
        transcription = data.get('transcription')
        
        # Find or create progress document
        progress_doc = language_progress_collection.find_one({
            'user_id': user_id,
            'mode': mode
        })
        
        if not progress_doc:
            # Create new progress document
            progress_doc = {
                'user_id': user_id,
                'mode': mode,
                'exercises': {},
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            }
        
        # Update exercise progress
        exercise_key = str(exercise_index)
        progress_doc.setdefault('exercises', {})[exercise_key] = {
            'exercise_id': exercise_id,
            'completed': True,
            'is_correct': is_correct,
            'score': score,
            'user_answer': user_answer,
            'transcription': transcription,
            'last_attempt': datetime.datetime.utcnow()
        }
        
        # Calculate overall progress
        exercises = progress_doc.get('exercises', {})
        total_exercises = len(exercises)
        completed_exercises = sum(1 for ex in exercises.values() if ex.get('completed', False))
        correct_exercises = sum(1 for ex in exercises.values() if ex.get('is_correct', False))
        
        progress_doc['total_exercises'] = total_exercises
        progress_doc['completed_exercises'] = completed_exercises
        progress_doc['correct_exercises'] = correct_exercises
        progress_doc['accuracy'] = (correct_exercises / completed_exercises) if completed_exercises > 0 else 0
        progress_doc['updated_at'] = datetime.datetime.utcnow()
        
        # Save trial data
        trial_data = {
            'user_id': user_id,
            'mode': mode,
            'exercise_index': exercise_index,
            'exercise_id': exercise_id,
            'is_correct': is_correct,
            'score': score,
            'user_answer': user_answer,
            'transcription': transcription,
            'timestamp': datetime.datetime.utcnow()
        }
        language_trials_collection.insert_one(trial_data)
        
        # Upsert progress document
        language_progress_collection.update_one(
            {'user_id': user_id, 'mode': mode},
            {'$set': progress_doc},
            upsert=True
        )
        
        return jsonify({
            'success': True,
            'message': 'Progress saved successfully',
            'progress': {
                'completed_exercises': completed_exercises,
                'total_exercises': total_exercises,
                'accuracy': progress_doc['accuracy']
            }
        }), 200
        
    except Exception as e:
        import traceback
        print(f"Error saving language progress: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': 'Failed to save progress'}), 500

@app.route('/api/language/progress/<mode>', methods=['GET'])
@token_required
def get_language_progress(current_user, mode):
    """Get user's language therapy progress for a specific mode"""
    try:
        user_id = str(current_user['_id'])
        
        progress_doc = language_progress_collection.find_one({
            'user_id': user_id,
            'mode': mode
        })
        
        if not progress_doc:
            # Return empty progress
            return jsonify({
                'success': True,
                'mode': mode,
                'current_exercise': 0,
                'exercises': {},
                'has_progress': False,
                'completed_exercises': 0,
                'total_exercises': 0,
                'accuracy': 0
            }), 200
        
        # Determine current exercise (first incomplete)
        current_exercise = 0
        exercises = progress_doc.get('exercises', {})
        
        # Find the first incomplete exercise or continue from last completed
        max_index = -1
        for ex_key in exercises.keys():
            try:
                index = int(ex_key)
                if index > max_index:
                    max_index = index
            except:
                pass
        
        current_exercise = max_index + 1 if max_index >= 0 else 0
        
        # Remove MongoDB _id from response
        if '_id' in progress_doc:
            del progress_doc['_id']
        
        return jsonify({
            'success': True,
            'mode': mode,
            'current_exercise': current_exercise,
            'exercises': progress_doc.get('exercises', {}),
            'has_progress': True,
            'completed_exercises': progress_doc.get('completed_exercises', 0),
            'total_exercises': progress_doc.get('total_exercises', 0),
            'accuracy': progress_doc.get('accuracy', 0)
        }), 200
        
    except Exception as e:
        import traceback
        print(f"Error getting language progress: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': 'Failed to get progress'}), 500

@app.route('/api/language/progress/all', methods=['GET'])
@token_required
def get_all_language_progress(current_user):
    """Get user's progress across all language therapy modes"""
    try:
        user_id = str(current_user['_id'])
        
        all_progress = list(language_progress_collection.find({'user_id': user_id}))
        
        # Remove MongoDB _id from each document
        for progress in all_progress:
            if '_id' in progress:
                del progress['_id']
        
        return jsonify({
            'success': True,
            'progress': all_progress
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'message': 'Failed to get all language progress'}), 500

# Fluency Therapy Collections
fluency_progress_collection = db['fluency_progress']
fluency_trials_collection = db['fluency_trials']

@app.route('/api/fluency/assess', methods=['POST'])
@token_required
def assess_fluency(current_user):
    """Assess fluency using Azure Speech-to-Text with word-level timing"""
    try:
        import azure.cognitiveservices.speech as speechsdk
        import tempfile
        import os as os_module
        import time
        
        # Get audio file
        audio_file = request.files.get('audio')
        if not audio_file:
            return jsonify({'success': False, 'message': 'No audio file provided'}), 400
        
        # Get exercise parameters
        target_text = request.form.get('target_text', '')
        expected_duration = float(request.form.get('expected_duration', 10))
        exercise_type = request.form.get('exercise_type', '')
        
        # Azure Speech Config
        speech_key = os.getenv('AZURE_SPEECH_KEY')
        service_region = os.getenv('AZURE_SPEECH_REGION')
        
        if not speech_key or not service_region or speech_key == 'YOUR_AZURE_SPEECH_KEY_HERE':
            # Return mock data if Azure is not configured
            print("Warning: Azure not configured, returning mock fluency data")
            return jsonify({
                'success': True,
                'transcription': target_text,
                'speaking_rate': 120,
                'fluency_score': 85,
                'pause_count': 1,
                'disfluencies': 0,
                'duration': expected_duration,
                'word_count': len(target_text.split()),
                'feedback': 'Good job! (Note: Using mock data - configure Azure for real assessment)',
                'pauses': [],
                'words': []
            }), 200
        
        speech_config = speechsdk.SpeechConfig(subscription=speech_key, region=service_region)
        speech_config.speech_recognition_language = "en-US"
        speech_config.request_word_level_timestamps()  # Enable word timing
        
        # Save audio to temporary file (same simple approach as language therapy)
        audio_bytes = audio_file.read()
        
        # Create temporary file for WAV audio
        temp_wav = tempfile.NamedTemporaryFile(delete=False, suffix='.wav')
        temp_wav_path = temp_wav.name
        temp_wav.close()
        
        try:
            # Write the WAV audio directly (frontend already converts to WAV)
            with open(temp_wav_path, 'wb') as f:
                f.write(audio_bytes)
            
            print(f"Fluency assessment - Audio file: {temp_wav_path}, size: {len(audio_bytes)} bytes")
            
            # Create Azure audio config
            audio_config = speechsdk.audio.AudioConfig(filename=temp_wav_path)
            speech_recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config, audio_config=audio_config)
            
            # Perform speech recognition with detailed results
            result = speech_recognizer.recognize_once_async().get()
            
            # Release resources
            del speech_recognizer
            del audio_config
            
            if result.reason == speechsdk.ResultReason.RecognizedSpeech:
                transcription = result.text
                
                # Get detailed timing information
                import json
                words = []
                pauses = []
                disfluencies = 0
                
                try:
                    detailed_result = json.loads(result.json)
                    
                    # Extract word timings
                    if 'NBest' in detailed_result and len(detailed_result['NBest']) > 0:
                        nbest = detailed_result['NBest'][0]
                        if 'Words' in nbest:
                            word_list = nbest['Words']
                except Exception as json_error:
                    print(f"Warning: Could not parse detailed results: {json_error}")
                    # Fall back to simple word count from transcription
                    word_list = []
                
                if word_list:
                    prev_end_time = 0
                    prev_word = None
                    
                    for i, word_info in enumerate(word_list):
                        word = word_info.get('Word', '')
                        offset = word_info.get('Offset', 0) / 10000000  # Convert to seconds
                        duration = word_info.get('Duration', 0) / 10000000
                        
                        words.append({
                            'word': word,
                            'offset': offset,
                            'duration': duration
                        })
                        
                        # Detect pauses (silence > 300ms between words)
                        if i > 0:
                            pause_duration = offset - prev_end_time
                            if pause_duration > 0.3:  # 300ms threshold
                                pauses.append({
                                    'position': i,
                                    'duration': pause_duration
                                })
                        
                        # Detect repetitions (same word repeated consecutively)
                        if prev_word and word.lower() == prev_word.lower():
                            disfluencies += 1
                        
                        # Detect prolongations (word duration > 1.5x expected)
                        expected_word_duration = len(word) * 0.1  # Rough estimate
                        if duration > expected_word_duration * 1.5:
                            disfluencies += 1
                        
                        prev_end_time = offset + duration
                        prev_word = word
                
                # Calculate metrics
                total_words = len(words) if words else len(transcription.split())
                total_duration = words[-1]['offset'] + words[-1]['duration'] if words else expected_duration
                
                # Speaking rate (WPM)
                speaking_rate = int((total_words / total_duration) * 60) if total_duration > 0 else 0
                
                # Pause count
                pause_count = len(pauses)
                
                # Calculate fluency score (0-100)
                # Factors: speaking rate, pauses, disfluencies
                
                # Ideal speaking rate: 120-150 WPM
                rate_score = 100
                if speaking_rate < 80 or speaking_rate > 180:
                    rate_score = max(0, 100 - abs(speaking_rate - 120))
                
                # Pause penalty: -5 points per excessive pause
                pause_penalty = min(30, pause_count * 5)
                
                # Disfluency penalty: -10 points per disfluency
                disfluency_penalty = min(40, disfluencies * 10)
                
                fluency_score = max(0, min(100, rate_score - pause_penalty - disfluency_penalty))
                
                # Generate feedback
                if fluency_score >= 90:
                    feedback = "Excellent fluency! Your speech was smooth and natural."
                elif fluency_score >= 75:
                    feedback = "Good fluency! Keep practicing to improve smoothness."
                elif fluency_score >= 60:
                    feedback = "Fair fluency. Try to reduce pauses and speak more steadily."
                else:
                    feedback = "Keep practicing. Focus on breathing and speaking slowly."
                
                print(f"Fluency Assessment Results:")
                print(f"  Transcription: {transcription}")
                print(f"  Words: {total_words}, Duration: {total_duration:.2f}s")
                print(f"  Speaking Rate: {speaking_rate} WPM")
                print(f"  Pauses: {pause_count}, Disfluencies: {disfluencies}")
                print(f"  Fluency Score: {fluency_score}")
                
                # Clean up temp file
                try:
                    if os.path.exists(temp_wav_path):
                        os.unlink(temp_wav_path)
                except Exception as cleanup_error:
                    print(f"Warning: Could not delete temp file: {cleanup_error}")
                
                return jsonify({
                    'success': True,
                    'transcription': transcription,
                    'speaking_rate': speaking_rate,
                    'fluency_score': fluency_score,
                    'pause_count': pause_count,
                    'disfluencies': disfluencies,
                    'duration': round(total_duration, 1),
                    'word_count': total_words,
                    'feedback': feedback,
                    'pauses': pauses[:5],  # Return first 5 pauses for analysis
                    'words': words[:20]  # Return first 20 words for analysis
                }), 200
            
            elif result.reason == speechsdk.ResultReason.NoMatch:
                try:
                    if os.path.exists(temp_wav_path):
                        os.unlink(temp_wav_path)
                except Exception as cleanup_error:
                    print(f"Warning: Could not delete temp file: {cleanup_error}")
                    
                return jsonify({
                    'success': False,
                    'message': 'No speech could be recognized. Please try speaking more clearly.'
                }), 400
            
            else:
                try:
                    if os.path.exists(temp_wav_path):
                        os.unlink(temp_wav_path)
                except Exception as cleanup_error:
                    print(f"Warning: Could not delete temp file: {cleanup_error}")
                    
                return jsonify({
                    'success': False,
                    'message': 'Speech recognition failed. Please try again.'
                }), 400
                
        except Exception as e:
            try:
                if os.path.exists(temp_wav_path):
                    os.unlink(temp_wav_path)
            except Exception as cleanup_error:
                print(f"Warning: Could not delete temp file: {cleanup_error}")
            raise e
            
    except Exception as e:
        import traceback
        print(f"Error assessing fluency: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': 'Assessment failed'}), 500

@app.route('/api/fluency/progress', methods=['POST'])
@token_required
def save_fluency_progress(current_user):
    """Save user's fluency therapy progress"""
    try:
        data = request.get_json()
        
        user_id = str(current_user['_id'])
        level = data.get('level')
        exercise_index = data.get('exercise_index')
        exercise_id = data.get('exercise_id')
        speaking_rate = data.get('speaking_rate', 0)
        fluency_score = data.get('fluency_score', 0)
        pause_count = data.get('pause_count', 0)
        disfluencies = data.get('disfluencies', 0)
        passed = data.get('passed', False)
        
        # Find or create progress document
        progress_doc = fluency_progress_collection.find_one({'user_id': user_id})
        
        if not progress_doc:
            progress_doc = {
                'user_id': user_id,
                'levels': {},
                'created_at': utc_now(),
                'updated_at': utc_now()
            }
        
        # Update level progress
        level_key = str(level)
        if level_key not in progress_doc.get('levels', {}):
            progress_doc.setdefault('levels', {})[level_key] = {'exercises': {}}
        
        # Update exercise progress
        exercise_key = str(exercise_index)
        progress_doc['levels'][level_key]['exercises'][exercise_key] = {
            'exercise_id': exercise_id,
            'completed': True,
            'speaking_rate': speaking_rate,
            'fluency_score': fluency_score,
            'pause_count': pause_count,
            'disfluencies': disfluencies,
            'passed': passed,
            'last_attempt': utc_now()
        }
        
        progress_doc['updated_at'] = utc_now()
        
        # Save trial data
        trial_data = {
            'user_id': user_id,
            'level': level,
            'exercise_index': exercise_index,
            'exercise_id': exercise_id,
            'speaking_rate': speaking_rate,
            'fluency_score': fluency_score,
            'pause_count': pause_count,
            'disfluencies': disfluencies,
            'passed': passed,
            'timestamp': utc_now()
        }
        fluency_trials_collection.insert_one(trial_data)
        
        # Upsert progress document
        fluency_progress_collection.update_one(
            {'user_id': user_id},
            {'$set': progress_doc},
            upsert=True
        )
        
        return jsonify({
            'success': True,
            'message': 'Fluency progress saved successfully'
        }), 200
        
    except Exception as e:
        import traceback
        print(f"Error saving fluency progress: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': 'Failed to save progress'}), 500

@app.route('/api/fluency/progress', methods=['GET'])
@token_required
def get_fluency_progress(current_user):
    """Get user's fluency therapy progress"""
    try:
        user_id = str(current_user['_id'])
        
        progress_doc = fluency_progress_collection.find_one({'user_id': user_id})
        
        if not progress_doc:
            return jsonify({
                'success': True,
                'current_level': 1,
                'current_exercise': 0,
                'levels': {},
                'has_progress': False
            }), 200
        
        # Determine current level and exercise
        current_level = 1
        current_exercise = 0
        
        for level_num in range(1, 6):
            level_key = str(level_num)
            level_data = progress_doc.get('levels', {}).get(level_key, {})
            exercises = level_data.get('exercises', {})
            
            if not exercises:
                current_level = level_num
                current_exercise = 0
                break
            
            # Find incomplete exercise in this level
            level_complete = True
            for ex_idx in range(10):  # Max 10 exercises per level
                ex_key = str(ex_idx)
                if ex_key not in exercises:
                    current_level = level_num
                    current_exercise = ex_idx
                    level_complete = False
                    break
            
            if not level_complete:
                break
        
        # Remove MongoDB _id
        if '_id' in progress_doc:
            del progress_doc['_id']
        
        return jsonify({
            'success': True,
            'current_level': current_level,
            'current_exercise': current_exercise,
            'levels': progress_doc.get('levels', {}),
            'has_progress': True
        }), 200
        
    except Exception as e:
        import traceback
        print(f"Error getting fluency progress: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': 'Failed to get progress'}), 500

# ========== ADMIN ENDPOINTS ==========

@app.route('/api/admin/stats', methods=['GET'])
@token_required
def get_admin_stats(current_user):
    """Get admin dashboard statistics"""
    try:
        # Check if user is admin
        if current_user.get('role') != 'admin':
            return jsonify({'message': 'Unauthorized. Admin access required.'}), 403
        
        # Total users count
        total_users = users_collection.count_documents({})
        
        # Active users (users who have any progress)
        active_users = len(set(
            list(articulation_progress_collection.distinct('user_id')) +
            list(language_progress_collection.distinct('user_id')) +
            list(db['fluency_progress'].distinct('user_id'))
        ))
        
        # Total therapy sessions (all trials combined)
        articulation_sessions = articulation_trials_collection.count_documents({})
        language_sessions = language_trials_collection.count_documents({})
        fluency_sessions = db['fluency_trials'].count_documents({})
        total_sessions = articulation_sessions + language_sessions + fluency_sessions
        
        # Therapy completions (users who completed at least one therapy)
        articulation_completions = articulation_progress_collection.count_documents({'completed': True})
        language_completions = language_progress_collection.count_documents({'all_levels_completed': True})
        fluency_completions = db['fluency_progress'].count_documents({'levels.5.completed': True})
        total_completions = articulation_completions + language_completions + fluency_completions
        
        # Average scores
        articulation_avg = list(articulation_trials_collection.aggregate([
            {'$group': {'_id': None, 'avg_score': {'$avg': '$accuracy_score'}}}
        ]))
        language_avg = list(language_trials_collection.aggregate([
            {'$group': {'_id': None, 'avg_score': {'$avg': '$accuracy_score'}}}
        ]))
        fluency_avg = list(db['fluency_trials'].aggregate([
            {'$group': {'_id': None, 'avg_score': {'$avg': '$fluency_score'}}}
        ]))
        
        avg_score = 0
        score_count = 0
        if articulation_avg and articulation_avg[0].get('avg_score') is not None:
            avg_score += articulation_avg[0]['avg_score']
            score_count += 1
        if language_avg and language_avg[0].get('avg_score') is not None:
            avg_score += language_avg[0]['avg_score']
            score_count += 1
        if fluency_avg and fluency_avg[0].get('avg_score') is not None:
            avg_score += fluency_avg[0]['avg_score']
            score_count += 1
        
        average_score = round(avg_score / score_count, 1) if score_count > 0 else 0
        
        # Therapy type distribution
        speech_users = users_collection.count_documents({'therapyType': 'speech'})
        physical_users = users_collection.count_documents({'therapyType': 'physical'})
        
        # Recent activity (last 10 completions)
        recent_trials = list(db['fluency_trials'].find({}).sort('created_at', -1).limit(10))
        recent_activity = []
        for trial in recent_trials:
            try:
                user = users_collection.find_one({'_id': ObjectId(trial['user_id'])})
                if user:
                    timestamp = trial.get('created_at', utc_now())
                    # Ensure timestamp is datetime object
                    if isinstance(timestamp, str):
                        timestamp = datetime.datetime.fromisoformat(timestamp)
                    
                    recent_activity.append({
                        'user_name': f"{user.get('firstName', 'Unknown')} {user.get('lastName', 'User')}",
                        'therapy_type': 'Fluency Therapy',
                        'score': trial.get('fluency_score', 0),
                        'timestamp': timestamp.isoformat() if hasattr(timestamp, 'isoformat') else str(timestamp),
                        'status': 'completed' if trial.get('fluency_score', 0) >= 70 else 'practicing'
                    })
            except Exception as e:
                print(f"Error processing trial: {str(e)}")
                continue
        
        # Session trends (last 7 days)
        seven_days_ago = utc_now() - datetime.timedelta(days=7)
        daily_sessions = {}
        
        for i in range(7):
            day = seven_days_ago + datetime.timedelta(days=i)
            day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + datetime.timedelta(days=1)
            
            count = (
                articulation_trials_collection.count_documents({
                    'created_at': {'$gte': day_start, '$lt': day_end}
                }) +
                language_trials_collection.count_documents({
                    'created_at': {'$gte': day_start, '$lt': day_end}
                }) +
                db['fluency_trials'].count_documents({
                    'created_at': {'$gte': day_start, '$lt': day_end}
                })
            )
            
            daily_sessions[day.strftime('%Y-%m-%d')] = count
        
        return jsonify({
            'success': True,
            'stats': {
                'total_users': total_users,
                'active_users': active_users,
                'total_sessions': total_sessions,
                'total_completions': total_completions,
                'average_score': average_score,
                'speech_users': speech_users,
                'physical_users': physical_users,
                'articulation_sessions': articulation_sessions,
                'language_sessions': language_sessions,
                'fluency_sessions': fluency_sessions,
                'articulation_avg': round(articulation_avg[0]['avg_score'], 1) if articulation_avg and articulation_avg[0].get('avg_score') is not None else 0,
                'language_avg': round(language_avg[0]['avg_score'], 1) if language_avg and language_avg[0].get('avg_score') is not None else 0,
                'fluency_avg': round(fluency_avg[0]['avg_score'], 1) if fluency_avg and fluency_avg[0].get('avg_score') is not None else 0
            },
            'therapy_distribution': {
                'speech': speech_users,
                'physical': physical_users
            },
            'recent_activity': recent_activity,
            'session_trends': daily_sessions
        }), 200
        
    except Exception as e:
        import traceback
        print(f"Error getting admin stats: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': 'Failed to get admin stats'}), 500

@app.route('/api/admin/users', methods=['GET'])
@token_required
def get_all_users(current_user):
    """Get all users for admin management"""
    try:
        # Check if user is admin
        if current_user.get('role') != 'admin':
            return jsonify({'message': 'Unauthorized. Admin access required.'}), 403
        
        # Get all users
        users = list(users_collection.find({}))
        
        user_list = []
        for user in users:
            # Get user's progress across therapies
            articulation_prog = articulation_progress_collection.find_one({'user_id': str(user['_id'])})
            language_prog = language_progress_collection.find_one({'user_id': str(user['_id'])})
            fluency_prog = db['fluency_progress'].find_one({'user_id': str(user['_id'])})
            
            # Count sessions
            articulation_count = articulation_trials_collection.count_documents({'user_id': str(user['_id'])})
            language_count = language_trials_collection.count_documents({'user_id': str(user['_id'])})
            fluency_count = db['fluency_trials'].count_documents({'user_id': str(user['_id'])})
            total_sessions = articulation_count + language_count + fluency_count
            
            # Calculate overall progress
            progress_count = 0
            if articulation_prog:
                progress_count += 1
            if language_prog:
                progress_count += 1
            if fluency_prog:
                progress_count += 1
            
            user_list.append({
                'id': str(user['_id']),
                'email': user.get('email', ''),
                'firstName': user.get('firstName', ''),
                'lastName': user.get('lastName', ''),
                'role': user.get('role', 'patient'),
                'therapyType': user.get('therapyType', 'N/A'),
                'patientType': user.get('patientType', 'N/A'),
                'gender': user.get('gender', 'N/A'),
                'age': user.get('age', 'N/A'),
                'created_at': user.get('created_at', utc_now()).isoformat(),
                'total_sessions': total_sessions,
                'active_therapies': progress_count,
                'last_active': user.get('updated_at', user.get('created_at', utc_now())).isoformat()
            })
        
        return jsonify({
            'success': True,
            'users': user_list,
            'total_count': len(user_list)
        }), 200
        
    except Exception as e:
        import traceback
        print(f"Error getting users: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': 'Failed to get users'}), 500

@app.route('/api/admin/users/<user_id>', methods=['PUT'])
@token_required
def admin_update_user(current_user, user_id):
    """Update user details (admin only)"""
    try:
        # Check if user is admin
        if current_user.get('role') != 'admin':
            return jsonify({'message': 'Unauthorized. Admin access required.'}), 403
        
        data = request.get_json()
        
        # Prepare update fields
        update_fields = {}
        allowed_fields = ['firstName', 'lastName', 'email', 'role', 'therapyType', 'patientType', 'gender', 'age']
        
        for field in allowed_fields:
            if field in data:
                update_fields[field] = data[field]
        
        if not update_fields:
            return jsonify({'message': 'No valid fields to update'}), 400
        
        update_fields['updated_at'] = utc_now()
        
        # Update user
        result = users_collection.update_one(
            {'_id': ObjectId(user_id)},
            {'$set': update_fields}
        )
        
        if result.modified_count == 0:
            return jsonify({'message': 'User not found or no changes made'}), 404
        
        return jsonify({
            'success': True,
            'message': 'User updated successfully'
        }), 200
        
    except Exception as e:
        import traceback
        print(f"Error updating user: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': 'Failed to update user'}), 500

@app.route('/api/admin/users/<user_id>', methods=['DELETE'])
@token_required
def admin_delete_user(current_user, user_id):
    """Delete user (admin only)"""
    try:
        # Check if user is admin
        if current_user.get('role') != 'admin':
            return jsonify({'message': 'Unauthorized. Admin access required.'}), 403
        
        # Cannot delete self
        if str(current_user['_id']) == user_id:
            return jsonify({'message': 'Cannot delete your own account'}), 400
        
        # Delete user and all their data
        users_collection.delete_one({'_id': ObjectId(user_id)})
        articulation_progress_collection.delete_many({'user_id': user_id})
        articulation_trials_collection.delete_many({'user_id': user_id})
        language_progress_collection.delete_many({'user_id': user_id})
        language_trials_collection.delete_many({'user_id': user_id})
        db['fluency_progress'].delete_many({'user_id': user_id})
        db['fluency_trials'].delete_many({'user_id': user_id})
        
        return jsonify({
            'success': True,
            'message': 'User and all associated data deleted successfully'
        }), 200
        
    except Exception as e:
        import traceback
        print(f"Error deleting user: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': 'Failed to delete user'}), 500

@app.route('/api/admin/therapies/articulation', methods=['GET'])
@token_required
def get_articulation_therapy_data(current_user):
    """Get all articulation therapy data (admin only)"""
    try:
        # Check if user is admin
        if current_user.get('role') != 'admin':
            return jsonify({'message': 'Unauthorized. Admin access required.'}), 403
        
        # Get all articulation trials with user info
        trials = list(articulation_trials_collection.find({}).sort('created_at', -1))
        
        therapy_data = []
        for trial in trials:
            user = users_collection.find_one({'_id': ObjectId(trial['user_id'])})
            if user:
                therapy_data.append({
                    'id': str(trial['_id']),
                    'user_name': f"{user.get('firstName', 'Unknown')} {user.get('lastName', 'User')}",
                    'user_email': user.get('email', 'N/A'),
                    'sound': trial.get('sound', 'N/A'),
                    'word': trial.get('word', 'N/A'),
                    'score': trial.get('score', 0),
                    'is_correct': trial.get('is_correct', False),
                    'transcription': trial.get('transcription', ''),
                    'created_at': trial.get('created_at', datetime.datetime.utcnow()).isoformat() if trial.get('created_at') else datetime.datetime.utcnow().isoformat()
                })
        
        return jsonify({
            'success': True,
            'data': therapy_data,
            'total': len(therapy_data)
        }), 200
        
    except Exception as e:
        import traceback
        print(f"Error fetching articulation data: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': 'Failed to fetch data'}), 500

@app.route('/api/admin/therapies/language/<mode>', methods=['GET'])
@token_required
def get_language_therapy_data(current_user, mode):
    """Get all language therapy data for a specific mode (admin only)"""
    try:
        # Check if user is admin
        if current_user.get('role') != 'admin':
            return jsonify({'message': 'Unauthorized. Admin access required.'}), 403
        
        # Validate mode
        if mode not in ['receptive', 'expressive']:
            return jsonify({'message': 'Invalid mode. Must be receptive or expressive'}), 400
        
        # Get all language trials for this mode with user info
        trials = list(language_trials_collection.find({'mode': mode}).sort('timestamp', -1))
        
        therapy_data = []
        for trial in trials:
            user = users_collection.find_one({'_id': ObjectId(trial['user_id'])})
            if user:
                therapy_data.append({
                    'id': str(trial['_id']),
                    'user_name': f"{user.get('firstName', 'Unknown')} {user.get('lastName', 'User')}",
                    'user_email': user.get('email', 'N/A'),
                    'mode': trial.get('mode', mode),
                    'exercise_id': trial.get('exercise_id', 'N/A'),
                    'exercise_index': trial.get('exercise_index', 0),
                    'score': trial.get('score', 0),
                    'is_correct': trial.get('is_correct', False),
                    'user_answer': trial.get('user_answer', ''),
                    'transcription': trial.get('transcription', ''),
                    'created_at': trial.get('timestamp', datetime.datetime.utcnow()).isoformat() if trial.get('timestamp') else datetime.datetime.utcnow().isoformat()
                })
        
        return jsonify({
            'success': True,
            'mode': mode,
            'data': therapy_data,
            'total': len(therapy_data)
        }), 200
        
    except Exception as e:
        import traceback
        print(f"Error fetching language data: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': 'Failed to fetch data'}), 500

@app.route('/api/admin/therapies/fluency', methods=['GET'])
@token_required
def get_fluency_therapy_data(current_user):
    """Get all fluency therapy data (admin only)"""
    try:
        # Check if user is admin
        if current_user.get('role') != 'admin':
            return jsonify({'message': 'Unauthorized. Admin access required.'}), 403
        
        # Get all fluency trials with user info
        trials = list(db['fluency_trials'].find({}).sort('created_at', -1))
        
        therapy_data = []
        for trial in trials:
            user = users_collection.find_one({'_id': ObjectId(trial['user_id'])})
            if user:
                therapy_data.append({
                    'id': str(trial['_id']),
                    'user_name': f"{user.get('firstName', 'Unknown')} {user.get('lastName', 'User')}",
                    'user_email': user.get('email', 'N/A'),
                    'exercise_type': trial.get('exercise_type', 'N/A'),
                    'fluency_score': trial.get('fluency_score', 0),
                    'transcription': trial.get('transcription', ''),
                    'word_count': trial.get('word_count', 0),
                    'filler_count': trial.get('filler_count', 0),
                    'created_at': trial.get('created_at', datetime.datetime.utcnow()).isoformat() if trial.get('created_at') else datetime.datetime.utcnow().isoformat()
                })
        
        return jsonify({
            'success': True,
            'data': therapy_data,
            'total': len(therapy_data)
        }), 200
        
    except Exception as e:
        import traceback
        print(f"Error fetching fluency data: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': 'Failed to fetch data'}), 500

@app.route('/api/admin/therapies/physical', methods=['GET'])
@token_required
def get_physical_therapy_data(current_user):
    """Get all physical therapy data (admin only)"""
    try:
        # Check if user is admin
        if current_user.get('role') != 'admin':
            return jsonify({'message': 'Unauthorized. Admin access required.'}), 403
        
        # Check if physical therapy collection exists
        if 'physical_trials' in db.list_collection_names():
            trials = list(db['physical_trials'].find({}).sort('created_at', -1))
            
            therapy_data = []
            for trial in trials:
                user = users_collection.find_one({'_id': ObjectId(trial['user_id'])})
                if user:
                    therapy_data.append({
                        'id': str(trial['_id']),
                        'user_name': f"{user.get('firstName', 'Unknown')} {user.get('lastName', 'User')}",
                        'user_email': user.get('email', 'N/A'),
                        'exercise_type': trial.get('exercise_type', 'N/A'),
                        'score': trial.get('score', 0),
                        'duration': trial.get('duration', 0),
                        'created_at': trial.get('created_at', datetime.datetime.utcnow()).isoformat() if trial.get('created_at') else datetime.datetime.utcnow().isoformat()
                    })
            
            return jsonify({
                'success': True,
                'data': therapy_data,
                'total': len(therapy_data)
            }), 200
        else:
            # No physical therapy data yet
            return jsonify({
                'success': True,
                'data': [],
                'total': 0,
                'message': 'No physical therapy data available'
            }), 200
        
    except Exception as e:
        import traceback
        print(f"Error fetching physical therapy data: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': 'Failed to fetch data'}), 500

# ============================================================================
# WEARABLE GAIT ANALYSIS ENDPOINTS
# ============================================================================

# Global variable to store latest wearable sensor data
latest_wearable_data = {}

@app.route('/api/wearable/data', methods=['GET', 'POST'])
def wearable_data():
    """
    Endpoint for wearable gait analysis sensor data
    POST: Receive sensor data from hardware device (saves to DB)
    GET: Retrieve latest sensor data for web interface
    """
    global latest_wearable_data
    
    if request.method == 'POST':
        # Receive data from wearable sensors
        try:
            latest_wearable_data = request.json
            # Log received data for debugging
            print("\n" + "="*30)
            print(f"WEARABLE DATA RECEIVED AT: {datetime.datetime.now().strftime('%H:%M:%S')}")
            print(latest_wearable_data)
            print("="*30 + "\n")
            
            # NOTE: NOT saving to MongoDB to prevent database from filling up
            # Only analyzed gait sessions are saved (in gaitprogresses collection)
            # If you need raw sensor logs, uncomment below:
            # wearable_data_collection = db['wearable_sensor_data']
            # sensor_document = {'timestamp': utc_now(), 'data': latest_wearable_data}
            # wearable_data_collection.insert_one(sensor_document)
            
            return jsonify({"status": "ok"}), 200
        except Exception as e:
            print(f"Error processing wearable data: {str(e)}")
            return jsonify({"status": "error", "message": str(e)}), 400
    
    # GET request - return latest data to web interface
    return jsonify(latest_wearable_data), 200

# ============================================================
# HARDWARE GAIT ANALYSIS API
# ============================================================

@app.route('/api/hardware/gait/analyze', methods=['POST'])
@token_required
def hardware_gait_analyze(current_user):
    """
    Analyze gait data from 6 IMU hardware sensors + FSR sensors
    Returns same structure as mobile gait analysis for MongoDB compatibility
    """
    try:
        from hardware_gait_processor import HardwareGaitProcessor
        
        print("\n" + "🎯" + "="*60)
        print("GAIT ANALYSIS REQUEST RECEIVED")
        print("="*60)
        
        data = request.json
        sensor_data = data.get('sensors', {})
        fsr_data = data.get('fsr', {})
        
        # Log received data sizes
        for sensor, readings in sensor_data.items():
            print(f"  {sensor}: {len(readings)} data points")
        
        # Validate required sensors
        required_sensors = ['LEFT_WAIST', 'RIGHT_WAIST', 'LEFT_KNEE', 'RIGHT_KNEE', 'LEFT_TOE', 'RIGHT_TOE']
        missing_sensors = [s for s in required_sensors if s not in sensor_data or not sensor_data[s]]
        
        if len(missing_sensors) > 2:  # Allow some sensors to be missing
            print(f"❌ Too many sensors missing: {missing_sensors}")
            return jsonify({
                'success': False,
                'message': f'Too many sensors missing: {missing_sensors}'
            }), 400
        
        print(f"✅ Sensor validation passed. Processing gait analysis...")
        
        # Process gait data
        processor = HardwareGaitProcessor()
        result = processor.analyze(
            sensor_data=sensor_data,
            fsr_data=fsr_data,
            user_id=str(current_user['_id'])
        )
        
        if not result['success']:
            print(f"❌ Analysis failed: {result.get('error')}")
            return jsonify(result), 400
        
        print(f"✅ Analysis complete!")
        print(f"  Steps: {result['data']['metrics']['step_count']}")
        print(f"  Cadence: {result['data']['metrics']['cadence']} steps/min")
        print(f"  Quality: {result['data']['data_quality']}")
        
        # Save to MongoDB (same collection as mobile uses: gaitprogresses)
        gait_progress_collection = db['gaitprogresses']
        
        # Prepare document matching mobile's GaitProgress schema
        gait_document = {
            'user_id': str(current_user['_id']),
            'session_id': result['data']['session_id'],
            'metrics': result['data']['metrics'],
            'sensors_used': result['data']['sensors_used'],
            'gait_phases': result['data']['gait_phases'],
            'analysis_duration': result['data']['analysis_duration'],
            'data_quality': result['data']['data_quality'],
            'detected_problems': result['data']['detected_problems'],
            'problem_summary': result['data']['problem_summary'],
            'created_at': utc_now(),
            'updated_at': utc_now()
        }
        
        # Insert into database
        insert_result = gait_progress_collection.insert_one(gait_document)
        
        print(f"💾 Saved to MongoDB collection: gaitprogresses")
        print(f"   Document ID: {insert_result.inserted_id}")
        print("="*60 + "\n")
        
        # Return success with MongoDB ID
        return jsonify({
            'success': True,
            'message': 'Hardware gait analysis completed',
            'data': result['data'],
            'gait_id': str(insert_result.inserted_id)
        }), 200
        
    except Exception as e:
        logger.error(f"GAIT ANALYSIS ERROR: {e}", exc_info=True)
        print(f"❌ GAIT ANALYSIS ERROR: {str(e)}")
        print("="*60 + "\n")
        return jsonify({
            'success': False,
            'message': 'Hardware gait analysis failed'
        }), 500


@app.route('/api/hardware/gait/history', methods=['GET'])
@token_required
def hardware_gait_history(current_user):
    """Get gait analysis history for current user (includes both mobile and hardware)"""
    try:
        gait_progress_collection = db['gaitprogresses']
        
        # Get all gait records for this user
        history = list(gait_progress_collection.find(
            {'user_id': str(current_user['_id'])}
        ).sort('created_at', -1).limit(50))
        
        # Convert ObjectId to string
        for record in history:
            record['_id'] = str(record['_id'])
        
        return jsonify({
            'success': True,
            'data': history
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching gait history: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to fetch gait history'
        }), 500


@app.route('/api/therapist/physical/patients', methods=['GET'])
@token_required
def get_physical_therapy_patients(current_user):
    """Get all gait analyses from all physical therapy patients (therapist only)"""
    try:
        # Check if user is therapist
        if current_user.get('role') != 'therapist':
            return jsonify({
                'success': False,
                'message': 'Unauthorized. Therapist access required.'
            }), 403
        
        gait_progress_collection = db['gaitprogresses']
        
        # Get all gait analyses sorted by date (most recent first)
        all_gait_analyses = list(gait_progress_collection.find({}).sort('created_at', -1))
        
        analyses_data = []
        for analysis in all_gait_analyses:
            # Get user info for each analysis
            user = users_collection.find_one({'_id': ObjectId(analysis['user_id'])})
            
            if user:
                # Extract detected problems
                detected_problems = analysis.get('detected_problems', [])
                problem_names = [p.get('problem', 'Unknown') for p in detected_problems]
                
                # Extract metrics
                metrics = analysis.get('metrics', {})
                
                # Extract problem summary
                problem_summary = analysis.get('problem_summary', {})
                
                # Calculate overall score (100 - (number of problems * severity weight))
                overall_score = 100
                for problem in detected_problems:
                    severity = problem.get('severity', 'mild')
                    if severity == 'severe':
                        overall_score -= 15
                    elif severity == 'moderate':
                        overall_score -= 10
                    else:  # mild
                        overall_score -= 5
                overall_score = max(0, overall_score)  # Ensure not negative
                
                analysis_info = {
                    'id': str(analysis['_id']),
                    'user_id': str(user['_id']),
                    'user_name': f"{user.get('firstName', 'Unknown')} {user.get('lastName', 'User')}",
                    'user_email': user.get('email', 'N/A'),
                    'created_at': analysis.get('created_at', datetime.datetime.utcnow()).isoformat() if analysis.get('created_at') else datetime.datetime.utcnow().isoformat(),
                    'problems_count': len(detected_problems),
                    'problems': problem_names,
                    'gait_metrics': {
                        'step_count': metrics.get('step_count', 0),
                        'cadence': metrics.get('cadence', 0),
                        'stride_length': metrics.get('stride_length', 0),
                        'velocity': metrics.get('velocity', 0),
                        'gait_symmetry': metrics.get('gait_symmetry', 0) * 100,  # Convert to percentage
                        'stability_score': metrics.get('stability_score', 0) * 100,  # Convert to percentage
                        'step_regularity': metrics.get('step_regularity', 0) * 100  # Convert to percentage
                    },
                    'overall_score': overall_score,
                    'severity': problem_summary.get('risk_level', 'unknown').lower() if problem_summary else 'unknown',
                    'data_quality': analysis.get('data_quality', 'fair'),
                    'analysis_duration': analysis.get('analysis_duration', 0)
                }
                
                analyses_data.append(analysis_info)
        
        return jsonify({
            'success': True,
            'data': analyses_data,
            'total': len(analyses_data)
        }), 200
        
    except Exception as e:
        import traceback
        logger.error(f"Error fetching gait analyses: {e}", exc_info=True)
        print(f"Error fetching gait analyses: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'message': 'Failed to fetch gait analyses'
        }), 500

# Serve uploaded files
@app.route('/uploads/<path:filename>')
def serve_uploaded_file(filename):
    """Serve uploaded files (images, etc.)"""
    from flask import send_from_directory
    upload_dir = os.path.join(os.path.dirname(__file__), 'uploads')
    return send_from_directory(upload_dir, filename)

# ======================
# DIAGNOSTIC COMPARISON ENDPOINTS
# ======================

@app.route('/api/therapist/diagnostics', methods=['POST'])
@token_required
@therapist_required
def create_facility_diagnostic(current_user):
    """Create a new facility diagnostic assessment for a patient"""
    try:
        data = request.get_json()

        # Validate required fields
        if not data.get('user_id'):
            return jsonify({'success': False, 'message': 'user_id is required'}), 400
        if not data.get('assessment_date'):
            return jsonify({'success': False, 'message': 'assessment_date is required'}), 400

        # Validate score ranges (0-100)
        for field_name in ['fluency_score', 'receptive_score', 'expressive_score']:
            val = data.get(field_name)
            if val is not None and val != '':
                try:
                    num_val = float(val)
                    if num_val < 0 or num_val > 100:
                        return jsonify({'success': False, 'message': f'{field_name} must be between 0 and 100'}), 400
                except (ValueError, TypeError):
                    return jsonify({'success': False, 'message': f'{field_name} must be a number'}), 400

        for sound, val in data.get('articulation_scores', {}).items():
            if val is not None and val != '':
                try:
                    num_val = float(val)
                    if num_val < 0 or num_val > 100:
                        return jsonify({'success': False, 'message': f'Articulation score for {sound} must be between 0 and 100'}), 400
                except (ValueError, TypeError):
                    return jsonify({'success': False, 'message': f'Articulation score for {sound} must be a number'}), 400

        for gait_key, val in data.get('gait_scores', {}).items():
            if val is not None and val != '':
                try:
                    num_val = float(val)
                    if num_val < 0 or num_val > 100:
                        return jsonify({'success': False, 'message': f'Gait score {gait_key} must be between 0 and 100'}), 400
                except (ValueError, TypeError):
                    return jsonify({'success': False, 'message': f'Gait score {gait_key} must be a number'}), 400

        # Verify the patient exists
        try:
            patient = users_collection.find_one({'_id': ObjectId(data['user_id'])})
        except Exception:
            patient = None
        if not patient:
            return jsonify({'success': False, 'message': 'Patient not found'}), 404

        diagnostic = {
            'user_id': data['user_id'],
            'assessed_by': str(current_user['_id']),
            'assessment_date': datetime.datetime.fromisoformat(data['assessment_date'].replace('Z', '+00:00')) if isinstance(data['assessment_date'], str) else data['assessment_date'],
            'assessment_type': data.get('assessment_type', 'initial'),
            'articulation_scores': data.get('articulation_scores', {}),
            'fluency_score': data.get('fluency_score'),
            'receptive_score': data.get('receptive_score'),
            'expressive_score': data.get('expressive_score'),
            'gait_scores': data.get('gait_scores', {}),
            'notes': data.get('notes', ''),
            'severity_level': data.get('severity_level', ''),
            'recommended_focus': data.get('recommended_focus', []),
            'created_at': datetime.datetime.utcnow(),
            'updated_at': datetime.datetime.utcnow()
        }

        result = facility_diagnostics_collection.insert_one(diagnostic)

        # Also update the patient's hasInitialDiagnostic flag if this is an initial assessment
        if diagnostic['assessment_type'] == 'initial':
            users_collection.update_one(
                {'_id': ObjectId(data['user_id'])},
                {'$set': {
                    'hasInitialDiagnostic': True,
                    'diagnosticStatusUpdatedAt': datetime.datetime.utcnow(),
                    'updatedAt': datetime.datetime.utcnow()
                }}
            )

        print(f"✅ Facility diagnostic created for patient {data['user_id']} by therapist {current_user['_id']}")

        return jsonify({
            'success': True,
            'message': 'Facility diagnostic created successfully',
            'diagnostic_id': str(result.inserted_id)
        }), 201

    except Exception as e:
        import traceback
        print(f"❌ Error creating facility diagnostic: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': 'Failed to create facility diagnostic'}), 500


@app.route('/api/therapist/diagnostics/<user_id>', methods=['GET'])
@token_required
@therapist_required
def get_facility_diagnostics(current_user, user_id):
    """Get all facility diagnostic assessments for a patient"""
    try:
        # Verify the patient exists
        try:
            patient = users_collection.find_one({'_id': ObjectId(user_id)})
        except Exception:
            patient = None
        if not patient:
            return jsonify({'success': False, 'message': 'Patient not found'}), 404

        diagnostics = list(facility_diagnostics_collection.find({'user_id': user_id}).sort('assessment_date', -1))

        result = []
        for diag in diagnostics:
            # Look up the therapist who assessed
            try:
                assessor = users_collection.find_one({'_id': ObjectId(diag.get('assessed_by', ''))})
                assessor_name = f"{assessor['firstName']} {assessor['lastName']}" if assessor else 'Unknown'
            except Exception:
                assessor_name = 'Unknown'

            result.append({
                '_id': str(diag['_id']),
                'user_id': diag['user_id'],
                'assessed_by': diag.get('assessed_by', ''),
                'assessor_name': assessor_name,
                'assessment_date': diag['assessment_date'].isoformat() if isinstance(diag['assessment_date'], datetime.datetime) else str(diag['assessment_date']),
                'assessment_type': diag.get('assessment_type', 'initial'),
                'articulation_scores': diag.get('articulation_scores', {}),
                'fluency_score': diag.get('fluency_score'),
                'receptive_score': diag.get('receptive_score'),
                'expressive_score': diag.get('expressive_score'),
                'gait_scores': diag.get('gait_scores', {}),
                'notes': diag.get('notes', ''),
                'severity_level': diag.get('severity_level', ''),
                'recommended_focus': diag.get('recommended_focus', []),
                'created_at': diag['created_at'].isoformat() if isinstance(diag.get('created_at'), datetime.datetime) else str(diag.get('created_at', ''))
            })

        return jsonify({
            'success': True,
            'diagnostics': result,
            'patient_name': f"{patient['firstName']} {patient['lastName']}"
        }), 200

    except Exception as e:
        import traceback
        print(f"❌ Error fetching facility diagnostics: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': 'Failed to fetch facility diagnostics'}), 500


@app.route('/api/therapist/diagnostics/<diagnostic_id>', methods=['PUT'])
@token_required
@therapist_required
def update_facility_diagnostic(current_user, diagnostic_id):
    """Update a facility diagnostic assessment"""
    try:
        data = request.get_json()

        # Verify the diagnostic exists
        try:
            existing = facility_diagnostics_collection.find_one({'_id': ObjectId(diagnostic_id)})
        except Exception:
            existing = None
        if not existing:
            return jsonify({'success': False, 'message': 'Diagnostic not found'}), 404

        update_fields = {'updated_at': datetime.datetime.utcnow()}

        # Update only provided fields
        allowed_fields = [
            'assessment_date', 'assessment_type', 'articulation_scores',
            'fluency_score', 'receptive_score', 'expressive_score',
            'gait_scores', 'notes', 'severity_level', 'recommended_focus'
        ]
        for field in allowed_fields:
            if field in data:
                if field == 'assessment_date' and isinstance(data[field], str):
                    update_fields[field] = datetime.datetime.fromisoformat(data[field].replace('Z', '+00:00'))
                else:
                    update_fields[field] = data[field]

        facility_diagnostics_collection.update_one(
            {'_id': ObjectId(diagnostic_id)},
            {'$set': update_fields}
        )

        return jsonify({
            'success': True,
            'message': 'Diagnostic updated successfully'
        }), 200

    except Exception as e:
        import traceback
        print(f"❌ Error updating facility diagnostic: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': 'Failed to update diagnostic'}), 500


@app.route('/api/therapist/diagnostics/<diagnostic_id>', methods=['DELETE'])
@token_required
@therapist_required
def delete_facility_diagnostic(current_user, diagnostic_id):
    """Delete a facility diagnostic assessment"""
    try:
        try:
            result = facility_diagnostics_collection.delete_one({'_id': ObjectId(diagnostic_id)})
        except Exception:
            return jsonify({'success': False, 'message': 'Invalid diagnostic ID'}), 400

        if result.deleted_count == 0:
            return jsonify({'success': False, 'message': 'Diagnostic not found'}), 404

        return jsonify({
            'success': True,
            'message': 'Diagnostic deleted successfully'
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'message': 'Failed to delete diagnostic'}), 500


@app.route('/api/therapist/diagnostics/<user_id>/comparison', methods=['GET'])
@token_required
@therapist_required
def get_diagnostic_comparison(current_user, user_id):
    """Get computed comparison between facility diagnostic and current at-home performance"""
    try:
        # Verify the patient exists
        try:
            patient = users_collection.find_one({'_id': ObjectId(user_id)})
        except Exception:
            patient = None
        if not patient:
            return jsonify({'success': False, 'message': 'Patient not found'}), 404

        # Get the latest facility diagnostic (or specific one if diagnostic_id query param provided)
        diagnostic_id = request.args.get('diagnostic_id')
        if diagnostic_id:
            try:
                facility_diag = facility_diagnostics_collection.find_one({'_id': ObjectId(diagnostic_id)})
            except Exception:
                facility_diag = None
        else:
            facility_diag = facility_diagnostics_collection.find_one(
                {'user_id': user_id},
                sort=[('assessment_date', -1)]
            )

        if not facility_diag:
            return jsonify({
                'success': True,
                'has_facility_data': False,
                'message': 'No facility diagnostic found for this patient'
            }), 200

        # Build facility scores
        facility_scores = {
            'articulation': facility_diag.get('articulation_scores', {}),
            'fluency': facility_diag.get('fluency_score'),
            'receptive': facility_diag.get('receptive_score'),
            'expressive': facility_diag.get('expressive_score'),
            'gait': facility_diag.get('gait_scores', {})
        }

        # Aggregate current at-home scores from progress collections
        home_scores = {}

        # Articulation: get mastery per sound from articulation_progress
        articulation_progress = list(articulation_progress_collection.find({'user_id': user_id}))
        art_scores = {}
        for prog in articulation_progress:
            sound = prog.get('sound_id', '')
            mastery = prog.get('overall_mastery', 0)
            art_scores[sound] = round(mastery * 100, 1) if mastery <= 1 else round(mastery, 1)
        home_scores['articulation'] = art_scores

        # Fluency: get from fluency_progress
        fluency_progress = db['fluency_progress'].find_one({'user_id': user_id})
        if fluency_progress:
            fluency_mastery = fluency_progress.get('overall_mastery', 0)
            home_scores['fluency'] = round(fluency_mastery * 100, 1) if fluency_mastery <= 1 else round(fluency_mastery, 1)
        else:
            home_scores['fluency'] = None

        # Receptive: get from language_progress (mode=receptive)
        receptive_progress = language_progress_collection.find_one({'user_id': user_id, 'mode': 'receptive'})
        if receptive_progress:
            home_scores['receptive'] = round(receptive_progress.get('accuracy', 0) * 100, 1) if receptive_progress.get('accuracy', 0) <= 1 else round(receptive_progress.get('accuracy', 0), 1)
        else:
            home_scores['receptive'] = None

        # Expressive: get from language_progress (mode=expressive)
        expressive_progress = language_progress_collection.find_one({'user_id': user_id, 'mode': 'expressive'})
        if expressive_progress:
            home_scores['expressive'] = round(expressive_progress.get('accuracy', 0) * 100, 1) if expressive_progress.get('accuracy', 0) <= 1 else round(expressive_progress.get('accuracy', 0), 1)
        else:
            home_scores['expressive'] = None

        # Gait: get average from gaitprogresses
        gait_records = list(db['gaitprogresses'].find({'user_id': user_id}))
        if gait_records:
            gait_metrics_avg = {'stability_score': 0, 'gait_symmetry': 0, 'step_regularity': 0}
            for gait in gait_records:
                metrics = gait.get('metrics', {})
                gait_metrics_avg['stability_score'] += metrics.get('stability_score', 0)
                gait_metrics_avg['gait_symmetry'] += metrics.get('gait_symmetry', 0)
                gait_metrics_avg['step_regularity'] += metrics.get('step_regularity', 0)
            count = len(gait_records)
            home_scores['gait'] = {
                'stability_score': round((gait_metrics_avg['stability_score'] / count) * 100, 1),
                'gait_symmetry': round((gait_metrics_avg['gait_symmetry'] / count) * 100, 1),
                'step_regularity': round((gait_metrics_avg['step_regularity'] / count) * 100, 1),
                'overall_gait': round(((gait_metrics_avg['stability_score'] + gait_metrics_avg['gait_symmetry'] + gait_metrics_avg['step_regularity']) / (count * 3)) * 100, 1)
            }
        else:
            home_scores['gait'] = {}

        # Compute deltas
        deltas = {}

        # Articulation deltas per sound
        art_deltas = {}
        facility_art = facility_scores.get('articulation', {})
        home_art = home_scores.get('articulation', {})
        all_sounds = set(list(facility_art.keys()) + list(home_art.keys()))
        for sound in all_sounds:
            f_val = facility_art.get(sound)
            h_val = home_art.get(sound)
            if f_val is not None and h_val is not None:
                art_deltas[sound] = round(h_val - f_val, 1)
            else:
                art_deltas[sound] = None
        deltas['articulation'] = art_deltas

        # Simple deltas for fluency, receptive, expressive
        for key in ['fluency', 'receptive', 'expressive']:
            f_val = facility_scores.get(key)
            h_val = home_scores.get(key)
            if f_val is not None and h_val is not None:
                deltas[key] = round(h_val - f_val, 1)
            else:
                deltas[key] = None

        # Gait delta (overall)
        facility_gait = facility_scores.get('gait', {})
        home_gait = home_scores.get('gait', {})
        f_gait_overall = facility_gait.get('overall_gait')
        h_gait_overall = home_gait.get('overall_gait')
        if f_gait_overall is not None and h_gait_overall is not None:
            deltas['gait'] = round(h_gait_overall - f_gait_overall, 1)
        else:
            deltas['gait'] = None

        # Look up assessor name
        try:
            assessor = users_collection.find_one({'_id': ObjectId(facility_diag.get('assessed_by', ''))})
            assessor_name = f"{assessor['firstName']} {assessor['lastName']}" if assessor else 'Unknown'
        except Exception:
            assessor_name = 'Unknown'

        # Compute summary insights
        all_deltas = []
        art_deltas = deltas.get('articulation', {})
        for sound, d in art_deltas.items():
            if d is not None:
                all_deltas.append({'metric': f'/{sound.upper()}/ Sound', 'delta': d, 'category': 'articulation'})
        for key in ['fluency', 'receptive', 'expressive']:
            if deltas.get(key) is not None:
                all_deltas.append({'metric': key.capitalize(), 'delta': deltas[key], 'category': key})
        if deltas.get('gait') is not None:
            all_deltas.append({'metric': 'Gait', 'delta': deltas['gait'], 'category': 'gait'})

        summary_insights = {}
        if all_deltas:
            valid_deltas = [d['delta'] for d in all_deltas]
            summary_insights['overall_avg_delta'] = round(sum(valid_deltas) / len(valid_deltas), 1)
            best = max(all_deltas, key=lambda x: x['delta'])
            worst = min(all_deltas, key=lambda x: x['delta'])
            summary_insights['strongest_area'] = {'metric': best['metric'], 'delta': best['delta']}
            summary_insights['weakest_area'] = {'metric': worst['metric'], 'delta': worst['delta']}
            summary_insights['total_metrics'] = len(all_deltas)
            summary_insights['improving_count'] = len([d for d in valid_deltas if d > 0])
            summary_insights['declining_count'] = len([d for d in valid_deltas if d < 0])
            summary_insights['stable_count'] = len([d for d in valid_deltas if d == 0])

        return jsonify({
            'success': True,
            'has_facility_data': True,
            'patient_name': f"{patient['firstName']} {patient['lastName']}",
            'assessment_date': facility_diag['assessment_date'].isoformat() if isinstance(facility_diag['assessment_date'], datetime.datetime) else str(facility_diag['assessment_date']),
            'assessment_type': facility_diag.get('assessment_type', 'initial'),
            'assessor_name': assessor_name,
            'severity_level': facility_diag.get('severity_level', ''),
            'notes': facility_diag.get('notes', ''),
            'recommended_focus': facility_diag.get('recommended_focus', []),
            'facility_scores': facility_scores,
            'home_scores': home_scores,
            'deltas': deltas,
            'summary_insights': summary_insights
        }), 200

    except Exception as e:
        import traceback
        print(f"❌ Error computing diagnostic comparison: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': 'Failed to compute diagnostic comparison'}), 500


@app.route('/api/therapist/diagnostics/<user_id>/comparison-history', methods=['GET'])
@token_required
@therapist_required
def get_diagnostic_comparison_history(current_user, user_id):
    """Get all historical facility diagnostics with scores for trend visualization"""
    try:
        # Verify the patient exists
        try:
            patient = users_collection.find_one({'_id': ObjectId(user_id)})
        except Exception:
            patient = None
        if not patient:
            return jsonify({'success': False, 'message': 'Patient not found'}), 404

        diagnostics = list(facility_diagnostics_collection.find({'user_id': user_id}).sort('assessment_date', 1))

        history = []
        for diag in diagnostics:
            entry = {
                '_id': str(diag['_id']),
                'assessment_date': diag['assessment_date'].isoformat() if isinstance(diag['assessment_date'], datetime.datetime) else str(diag['assessment_date']),
                'assessment_type': diag.get('assessment_type', 'initial'),
                'severity_level': diag.get('severity_level', ''),
                'articulation_scores': diag.get('articulation_scores', {}),
                'fluency_score': diag.get('fluency_score'),
                'receptive_score': diag.get('receptive_score'),
                'expressive_score': diag.get('expressive_score'),
                'gait_scores': diag.get('gait_scores', {}),
            }
            history.append(entry)

        return jsonify({
            'success': True,
            'patient_name': f"{patient['firstName']} {patient['lastName']}",
            'history': history,
            'total': len(history)
        }), 200

    except Exception as e:
        import traceback
        print(f"❌ Error fetching diagnostic history: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': 'Failed to fetch diagnostic history'}), 500


@app.route('/api/diagnostic-comparison', methods=['GET'])
@token_required
def get_patient_diagnostic_comparison(current_user):
    """Get the patient's own facility vs home comparison (read-only) - with full data parity"""
    try:
        user_id = str(current_user['_id'])

        # Support selecting a specific diagnostic via query param
        diagnostic_id = request.args.get('diagnostic_id')
        if diagnostic_id:
            try:
                facility_diag = facility_diagnostics_collection.find_one({'_id': ObjectId(diagnostic_id), 'user_id': user_id})
            except Exception:
                facility_diag = None
        else:
            facility_diag = facility_diagnostics_collection.find_one(
                {'user_id': user_id},
                sort=[('assessment_date', -1)]
            )

        if not facility_diag:
            return jsonify({
                'success': True,
                'has_facility_data': False,
                'message': 'No facility diagnostic found'
            }), 200

        # Build facility scores (now includes gait)
        facility_scores = {
            'articulation': facility_diag.get('articulation_scores', {}),
            'fluency': facility_diag.get('fluency_score'),
            'receptive': facility_diag.get('receptive_score'),
            'expressive': facility_diag.get('expressive_score'),
            'gait': facility_diag.get('gait_scores', {})
        }

        # Aggregate at-home scores (same logic as therapist comparison)
        home_scores = {}

        # Articulation
        articulation_progress = list(articulation_progress_collection.find({'user_id': user_id}))
        art_scores = {}
        for prog in articulation_progress:
            sound = prog.get('sound_id', '')
            if not sound:
                continue
            mastery = prog.get('overall_mastery', 0)
            art_scores[sound] = round(mastery * 100, 1) if mastery <= 1 else round(mastery, 1)
        home_scores['articulation'] = art_scores

        # Fluency
        fluency_progress = db['fluency_progress'].find_one({'user_id': user_id})
        if fluency_progress:
            fluency_mastery = fluency_progress.get('overall_mastery', 0)
            home_scores['fluency'] = round(fluency_mastery * 100, 1) if fluency_mastery <= 1 else round(fluency_mastery, 1)
        else:
            home_scores['fluency'] = None

        # Receptive
        receptive_progress = language_progress_collection.find_one({'user_id': user_id, 'mode': 'receptive'})
        if receptive_progress:
            home_scores['receptive'] = round(receptive_progress.get('accuracy', 0) * 100, 1) if receptive_progress.get('accuracy', 0) <= 1 else round(receptive_progress.get('accuracy', 0), 1)
        else:
            home_scores['receptive'] = None

        # Expressive
        expressive_progress = language_progress_collection.find_one({'user_id': user_id, 'mode': 'expressive'})
        if expressive_progress:
            home_scores['expressive'] = round(expressive_progress.get('accuracy', 0) * 100, 1) if expressive_progress.get('accuracy', 0) <= 1 else round(expressive_progress.get('accuracy', 0), 1)
        else:
            home_scores['expressive'] = None

        # Gait: get average from gaitprogresses
        gait_records = list(db['gaitprogresses'].find({'user_id': user_id}))
        if gait_records:
            gait_metrics_avg = {'stability_score': 0, 'gait_symmetry': 0, 'step_regularity': 0}
            for gait in gait_records:
                metrics = gait.get('metrics', {})
                gait_metrics_avg['stability_score'] += metrics.get('stability_score', 0)
                gait_metrics_avg['gait_symmetry'] += metrics.get('gait_symmetry', 0)
                gait_metrics_avg['step_regularity'] += metrics.get('step_regularity', 0)
            count = len(gait_records)
            home_scores['gait'] = {
                'stability_score': round((gait_metrics_avg['stability_score'] / count) * 100, 1),
                'gait_symmetry': round((gait_metrics_avg['gait_symmetry'] / count) * 100, 1),
                'step_regularity': round((gait_metrics_avg['step_regularity'] / count) * 100, 1),
                'overall_gait': round(((gait_metrics_avg['stability_score'] + gait_metrics_avg['gait_symmetry'] + gait_metrics_avg['step_regularity']) / (count * 3)) * 100, 1)
            }
        else:
            home_scores['gait'] = {}

        # Compute deltas
        deltas = {}
        facility_art = facility_scores.get('articulation', {})
        home_art = home_scores.get('articulation', {})
        art_deltas = {}
        all_sounds = set([k for k in list(facility_art.keys()) + list(home_art.keys()) if k])
        for sound in all_sounds:
            f_val = facility_art.get(sound)
            h_val = home_art.get(sound)
            if f_val is not None and h_val is not None:
                art_deltas[sound] = round(h_val - f_val, 1)
            else:
                art_deltas[sound] = None
        deltas['articulation'] = art_deltas

        for key in ['fluency', 'receptive', 'expressive']:
            f_val = facility_scores.get(key)
            h_val = home_scores.get(key)
            if f_val is not None and h_val is not None:
                deltas[key] = round(h_val - f_val, 1)
            else:
                deltas[key] = None

        # Gait delta (overall)
        facility_gait = facility_scores.get('gait', {})
        home_gait = home_scores.get('gait', {})
        f_gait_overall = facility_gait.get('overall_gait')
        h_gait_overall = home_gait.get('overall_gait')
        if f_gait_overall is not None and h_gait_overall is not None:
            deltas['gait'] = round(h_gait_overall - f_gait_overall, 1)
        else:
            deltas['gait'] = None

        # Look up assessor name (data parity with therapist endpoint)
        try:
            assessor = users_collection.find_one({'_id': ObjectId(facility_diag.get('assessed_by', ''))})
            assessor_name = f"{assessor['firstName']} {assessor['lastName']}" if assessor else 'Unknown'
        except Exception:
            assessor_name = 'Unknown'

        # Compute summary insights
        all_deltas = []
        for sound, d in art_deltas.items():
            if d is not None:
                all_deltas.append({'metric': f'/{sound.upper()}/ Sound', 'delta': d, 'category': 'articulation'})
        for key in ['fluency', 'receptive', 'expressive']:
            if deltas.get(key) is not None:
                all_deltas.append({'metric': key.capitalize(), 'delta': deltas[key], 'category': key})
        if deltas.get('gait') is not None:
            all_deltas.append({'metric': 'Gait', 'delta': deltas['gait'], 'category': 'gait'})

        summary_insights = {}
        if all_deltas:
            valid_deltas = [d['delta'] for d in all_deltas]
            summary_insights['overall_avg_delta'] = round(sum(valid_deltas) / len(valid_deltas), 1)
            best = max(all_deltas, key=lambda x: x['delta'])
            worst = min(all_deltas, key=lambda x: x['delta'])
            summary_insights['strongest_area'] = {'metric': best['metric'], 'delta': best['delta']}
            summary_insights['weakest_area'] = {'metric': worst['metric'], 'delta': worst['delta']}
            summary_insights['total_metrics'] = len(all_deltas)
            summary_insights['improving_count'] = len([d for d in valid_deltas if d > 0])
            summary_insights['declining_count'] = len([d for d in valid_deltas if d < 0])
            summary_insights['stable_count'] = len([d for d in valid_deltas if d == 0])

        return jsonify({
            'success': True,
            'has_facility_data': True,
            'patient_name': f"{current_user['firstName']} {current_user['lastName']}",
            'assessment_date': facility_diag['assessment_date'].isoformat() if isinstance(facility_diag['assessment_date'], datetime.datetime) else str(facility_diag['assessment_date']),
            'assessment_type': facility_diag.get('assessment_type', 'initial'),
            'assessor_name': assessor_name,
            'severity_level': facility_diag.get('severity_level', ''),
            'notes': facility_diag.get('notes', ''),
            'recommended_focus': facility_diag.get('recommended_focus', []),
            'facility_scores': facility_scores,
            'home_scores': home_scores,
            'deltas': deltas,
            'summary_insights': summary_insights
        }), 200

    except Exception as e:
        import traceback
        print(f"❌ Error fetching patient diagnostic comparison: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': 'Failed to fetch diagnostic comparison'}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    app.run(host='0.0.0.0', debug=debug, port=port)
