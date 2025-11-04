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

# Load environment variables from .env file
load_dotenv()

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

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    app.run(debug=debug, port=port)
