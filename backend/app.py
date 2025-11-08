from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from pymongo import MongoClient
from bson import ObjectId
import jwt
import datetime
from functools import wraps
import os
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, auth

# Import fluency CRUD blueprint
from fluency_crud import fluency_bp, init_fluency_crud

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
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'fallback-secret-key')
CORS(app)
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
language_progress_collection = db['language_progress']
language_trials_collection = db['language_trials']

# Register fluency CRUD blueprint
app.register_blueprint(fluency_bp)
init_fluency_crud(db)

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
            return jsonify({'message': 'Token is invalid!', 'error': str(e)}), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated

@app.route('/api/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['email', 'password', 'firstName', 'lastName', 'therapyType', 'patientType']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'message': f'{field} is required'}), 400
        
        email = data['email'].lower()
        password = data['password']
        first_name = data['firstName']
        last_name = data['lastName']
        therapy_type = data['therapyType']  # 'speech' or 'physical'
        patient_type = data['patientType']  # 'myself', 'child', 'dependent'
        role = 'patient'  # Default role for all new registrations
        
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
                    return jsonify({'message': f'{field} is required for pediatric speech therapy'}), 400
            
            for field in parent_required:
                if field not in data or not data[field]:
                    return jsonify({'message': f'{field} is required for pediatric speech therapy'}), 400
            
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
                'role': role,
                'therapyType': therapy_type,
                'patientType': patient_type
            }
        }), 201
        
    except Exception as e:
        return jsonify({'message': 'Registration failed', 'error': str(e)}), 500

@app.route('/api/login', methods=['POST'])
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
                'role': user.get('role', 'user')
            }
        }), 200
        
    except Exception as e:
        return jsonify({'message': 'Login failed', 'error': str(e)}), 500

@app.route('/api/auth/firebase', methods=['POST'])
def firebase_auth():
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('firebaseToken'):
            return jsonify({'message': 'Firebase token is required'}), 400
        
        firebase_token = data['firebaseToken']
        
        # Verify Firebase token
        try:
            decoded_token = auth.verify_id_token(firebase_token)
            firebase_uid = decoded_token['uid']
            firebase_email = decoded_token.get('email', '').lower()
        except Exception as e:
            return jsonify({'message': 'Invalid Firebase token', 'error': str(e)}), 401
        
        # Check if user exists by Firebase UID
        user = users_collection.find_one({'providerId': firebase_uid})
        
        if user:
            # Existing user - return user data
            token = jwt.encode({
                'user_id': str(user['_id']),
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
                    'patientType': user.get('patientType')
                }
            }), 200
        
        # New user - create account with incomplete profile
        email = data.get('email', firebase_email)
        first_name = data.get('firstName', '')
        last_name = data.get('lastName', '')
        profile_picture = data.get('profilePicture', '')
        provider = data.get('provider', 'unknown')
        
        # Check if email already exists (from regular registration)
        if users_collection.find_one({'email': email}):
            return jsonify({'message': 'Email already registered. Please login with password.'}), 409
        
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
        return jsonify({'message': 'Firebase authentication failed', 'error': str(e)}), 500

@app.route('/api/auth/complete-profile', methods=['POST'])
@token_required
def complete_profile(current_user):
    try:
        data = request.get_json()
        
        # Check if profile is already complete
        if current_user.get('isProfileComplete', False):
            return jsonify({'message': 'Profile is already complete'}), 400
        
        # Validate required fields
        required_fields = ['therapyType', 'patientType']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'message': f'{field} is required'}), 400
        
        therapy_type = data['therapyType']
        patient_type = data['patientType']
        
        # Prepare update data
        update_data = {
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
                    return jsonify({'message': f'{field} is required for pediatric speech therapy'}), 400
            
            for field in parent_required:
                if field not in data or not data[field]:
                    return jsonify({'message': f'{field} is required for pediatric speech therapy'}), 400
            
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
                'role': updated_user.get('role', 'patient'),
                'isProfileComplete': True,
                'therapyType': updated_user['therapyType'],
                'patientType': updated_user['patientType']
            }
        }), 200
        
    except Exception as e:
        return jsonify({'message': 'Profile completion failed', 'error': str(e)}), 500

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
        return jsonify({'message': 'Failed to get user', 'error': str(e)}), 500

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
        return jsonify({'message': 'Failed to update profile', 'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'message': 'CVACare API is running'}), 200

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
        print(f"Azure assessment error: {str(e)}")
        return {
            'success': False,
            'error': str(e)
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
        return jsonify({'success': False, 'message': 'Failed to process recording', 'error': str(e)}), 500

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
        return jsonify({'success': False, 'message': 'Failed to get exercises', 'error': str(e)}), 500

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
        
        return jsonify({
            'success': True,
            'message': 'Progress saved successfully',
            'progress': progress_doc
        }), 200
        
    except Exception as e:
        import traceback
        print(f"Error saving progress: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': 'Failed to save progress', 'error': str(e)}), 500

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
        return jsonify({'success': False, 'message': 'Failed to get progress', 'error': str(e)}), 500

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
        return jsonify({'success': False, 'message': 'Failed to get all progress', 'error': str(e)}), 500

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
        return jsonify({'success': False, 'message': 'Assessment failed', 'error': str(e)}), 500

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
        return jsonify({'success': False, 'message': 'Failed to save progress', 'error': str(e)}), 500

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
        return jsonify({'success': False, 'message': 'Failed to get progress', 'error': str(e)}), 500

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
        return jsonify({'success': False, 'message': 'Failed to get all language progress', 'error': str(e)}), 500

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
        return jsonify({'success': False, 'message': 'Assessment failed', 'error': str(e)}), 500

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
        return jsonify({'success': False, 'message': 'Failed to save progress', 'error': str(e)}), 500

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
        return jsonify({'success': False, 'message': 'Failed to get progress', 'error': str(e)}), 500

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
        return jsonify({'success': False, 'message': 'Failed to get admin stats', 'error': str(e)}), 500

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
        return jsonify({'success': False, 'message': 'Failed to get users', 'error': str(e)}), 500

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
        return jsonify({'success': False, 'message': 'Failed to update user', 'error': str(e)}), 500

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
        return jsonify({'success': False, 'message': 'Failed to delete user', 'error': str(e)}), 500

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
        return jsonify({'success': False, 'message': 'Failed to fetch data', 'error': str(e)}), 500

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
        return jsonify({'success': False, 'message': 'Failed to fetch data', 'error': str(e)}), 500

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
        return jsonify({'success': False, 'message': 'Failed to fetch data', 'error': str(e)}), 500

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
        return jsonify({'success': False, 'message': 'Failed to fetch data', 'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    app.run(debug=debug, port=port)
