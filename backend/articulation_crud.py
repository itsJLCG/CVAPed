"""
Articulation Exercise CRUD Operations
Handles Create, Read, Update, Delete operations for articulation exercises
"""

from flask import Blueprint, request, jsonify
from bson import ObjectId
import datetime
from functools import wraps
import jwt
import os

# Create Blueprint
articulation_bp = Blueprint('articulation_exercises', __name__)

# Database collections (will be set by app.py)
db = None
users_collection = None
articulation_exercises_collection = None
SECRET_KEY = None

def init_articulation_crud(database, secret_key=None):
    """Initialize the articulation exercises collection"""
    global db, users_collection, articulation_exercises_collection, SECRET_KEY
    db = database
    users_collection = db['users']
    articulation_exercises_collection = db['articulation_exercises']
    SECRET_KEY = secret_key or os.getenv('SECRET_KEY', 'your-secret-key-here')

# Token verification decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({'success': False, 'message': 'Token is missing'}), 401
        
        try:
            if token.startswith('Bearer '):
                token = token[7:]
            
            data = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            
            # Get user from database
            current_user = users_collection.find_one({'_id': ObjectId(data['user_id'])})
            
            if not current_user:
                return jsonify({'success': False, 'message': 'User not found'}), 401
            
        except jwt.ExpiredSignatureError:
            return jsonify({'success': False, 'message': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'success': False, 'message': 'Invalid token'}), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated

# Seed default articulation exercises
@articulation_bp.route('/seed', methods=['POST'])
@token_required
def seed_default_exercises(current_user):
    """Seed database with default articulation exercises for all sounds and levels"""
    try:
        # Check if exercises already exist
        existing_count = articulation_exercises_collection.count_documents({})
        if existing_count > 0:
            return jsonify({
                'success': False,
                'message': f'Database already has {existing_count} exercises. Delete them first if you want to re-seed.'
            }), 400
        
        # Default articulation exercises - 5 sounds, 5 levels each
        articulation_exercises = [
            # S SOUND EXERCISES
            # Level 1: Sound
            {
                'exercise_id': 's-sound-1',
                'sound_id': 's',
                'sound_name': 'S Sound',
                'level': 1,
                'level_name': 'Sound',
                'target': 's',
                'order': 1,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            # Level 2: Syllable
            {
                'exercise_id': 's-syllable-1',
                'sound_id': 's',
                'sound_name': 'S Sound',
                'level': 2,
                'level_name': 'Syllable',
                'target': 'sa',
                'order': 1,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'exercise_id': 's-syllable-2',
                'sound_id': 's',
                'sound_name': 'S Sound',
                'level': 2,
                'level_name': 'Syllable',
                'target': 'se',
                'order': 2,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'exercise_id': 's-syllable-3',
                'sound_id': 's',
                'sound_name': 'S Sound',
                'level': 2,
                'level_name': 'Syllable',
                'target': 'si',
                'order': 3,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            # Level 3: Word
            {
                'exercise_id': 's-word-1',
                'sound_id': 's',
                'sound_name': 'S Sound',
                'level': 3,
                'level_name': 'Word',
                'target': 'sun',
                'order': 1,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'exercise_id': 's-word-2',
                'sound_id': 's',
                'sound_name': 'S Sound',
                'level': 3,
                'level_name': 'Word',
                'target': 'sock',
                'order': 2,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            # Level 4: Phrase
            {
                'exercise_id': 's-phrase-1',
                'sound_id': 's',
                'sound_name': 'S Sound',
                'level': 4,
                'level_name': 'Phrase',
                'target': 'See the sun.',
                'order': 1,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'exercise_id': 's-phrase-2',
                'sound_id': 's',
                'sound_name': 'S Sound',
                'level': 4,
                'level_name': 'Phrase',
                'target': 'Sit down.',
                'order': 2,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            # Level 5: Sentence
            {
                'exercise_id': 's-sentence-1',
                'sound_id': 's',
                'sound_name': 'S Sound',
                'level': 5,
                'level_name': 'Sentence',
                'target': 'Sam saw seven shiny shells.',
                'order': 1,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'exercise_id': 's-sentence-2',
                'sound_id': 's',
                'sound_name': 'S Sound',
                'level': 5,
                'level_name': 'Sentence',
                'target': 'The sun is very hot.',
                'order': 2,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            
            # R SOUND EXERCISES
            # Level 1: Sound
            {
                'exercise_id': 'r-sound-1',
                'sound_id': 'r',
                'sound_name': 'R Sound',
                'level': 1,
                'level_name': 'Sound',
                'target': 'r',
                'order': 1,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            # Level 2: Syllable
            {
                'exercise_id': 'r-syllable-1',
                'sound_id': 'r',
                'sound_name': 'R Sound',
                'level': 2,
                'level_name': 'Syllable',
                'target': 'ra',
                'order': 1,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'exercise_id': 'r-syllable-2',
                'sound_id': 'r',
                'sound_name': 'R Sound',
                'level': 2,
                'level_name': 'Syllable',
                'target': 're',
                'order': 2,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'exercise_id': 'r-syllable-3',
                'sound_id': 'r',
                'sound_name': 'R Sound',
                'level': 2,
                'level_name': 'Syllable',
                'target': 'ri',
                'order': 3,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            # Level 3: Word
            {
                'exercise_id': 'r-word-1',
                'sound_id': 'r',
                'sound_name': 'R Sound',
                'level': 3,
                'level_name': 'Word',
                'target': 'rabbit',
                'order': 1,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'exercise_id': 'r-word-2',
                'sound_id': 'r',
                'sound_name': 'R Sound',
                'level': 3,
                'level_name': 'Word',
                'target': 'red',
                'order': 2,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            # Level 4: Phrase
            {
                'exercise_id': 'r-phrase-1',
                'sound_id': 'r',
                'sound_name': 'R Sound',
                'level': 4,
                'level_name': 'Phrase',
                'target': 'Run to the road.',
                'order': 1,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'exercise_id': 'r-phrase-2',
                'sound_id': 'r',
                'sound_name': 'R Sound',
                'level': 4,
                'level_name': 'Phrase',
                'target': 'Read the book.',
                'order': 2,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            # Level 5: Sentence
            {
                'exercise_id': 'r-sentence-1',
                'sound_id': 'r',
                'sound_name': 'R Sound',
                'level': 5,
                'level_name': 'Sentence',
                'target': 'Rita rides the red rocket.',
                'order': 1,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'exercise_id': 'r-sentence-2',
                'sound_id': 'r',
                'sound_name': 'R Sound',
                'level': 5,
                'level_name': 'Sentence',
                'target': 'The rabbit raced around the yard.',
                'order': 2,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            
            # L SOUND EXERCISES
            # Level 1: Sound
            {
                'exercise_id': 'l-sound-1',
                'sound_id': 'l',
                'sound_name': 'L Sound',
                'level': 1,
                'level_name': 'Sound',
                'target': 'l',
                'order': 1,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            # Level 2: Syllable
            {
                'exercise_id': 'l-syllable-1',
                'sound_id': 'l',
                'sound_name': 'L Sound',
                'level': 2,
                'level_name': 'Syllable',
                'target': 'la',
                'order': 1,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'exercise_id': 'l-syllable-2',
                'sound_id': 'l',
                'sound_name': 'L Sound',
                'level': 2,
                'level_name': 'Syllable',
                'target': 'le',
                'order': 2,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'exercise_id': 'l-syllable-3',
                'sound_id': 'l',
                'sound_name': 'L Sound',
                'level': 2,
                'level_name': 'Syllable',
                'target': 'li',
                'order': 3,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            # Level 3: Word
            {
                'exercise_id': 'l-word-1',
                'sound_id': 'l',
                'sound_name': 'L Sound',
                'level': 3,
                'level_name': 'Word',
                'target': 'lion',
                'order': 1,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'exercise_id': 'l-word-2',
                'sound_id': 'l',
                'sound_name': 'L Sound',
                'level': 3,
                'level_name': 'Word',
                'target': 'leaf',
                'order': 2,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            # Level 4: Phrase
            {
                'exercise_id': 'l-phrase-1',
                'sound_id': 'l',
                'sound_name': 'L Sound',
                'level': 4,
                'level_name': 'Phrase',
                'target': 'Look at the lion.',
                'order': 1,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'exercise_id': 'l-phrase-2',
                'sound_id': 'l',
                'sound_name': 'L Sound',
                'level': 4,
                'level_name': 'Phrase',
                'target': 'Lift the box.',
                'order': 2,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            # Level 5: Sentence
            {
                'exercise_id': 'l-sentence-1',
                'sound_id': 'l',
                'sound_name': 'L Sound',
                'level': 5,
                'level_name': 'Sentence',
                'target': 'Lily loves lemons.',
                'order': 1,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'exercise_id': 'l-sentence-2',
                'sound_id': 'l',
                'sound_name': 'L Sound',
                'level': 5,
                'level_name': 'Sentence',
                'target': 'The little lamb likes leaves.',
                'order': 2,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            
            # K SOUND EXERCISES
            # Level 1: Sound
            {
                'exercise_id': 'k-sound-1',
                'sound_id': 'k',
                'sound_name': 'K Sound',
                'level': 1,
                'level_name': 'Sound',
                'target': 'k',
                'order': 1,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            # Level 2: Syllable
            {
                'exercise_id': 'k-syllable-1',
                'sound_id': 'k',
                'sound_name': 'K Sound',
                'level': 2,
                'level_name': 'Syllable',
                'target': 'ka',
                'order': 1,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'exercise_id': 'k-syllable-2',
                'sound_id': 'k',
                'sound_name': 'K Sound',
                'level': 2,
                'level_name': 'Syllable',
                'target': 'ke',
                'order': 2,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'exercise_id': 'k-syllable-3',
                'sound_id': 'k',
                'sound_name': 'K Sound',
                'level': 2,
                'level_name': 'Syllable',
                'target': 'ki',
                'order': 3,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            # Level 3: Word
            {
                'exercise_id': 'k-word-1',
                'sound_id': 'k',
                'sound_name': 'K Sound',
                'level': 3,
                'level_name': 'Word',
                'target': 'kite',
                'order': 1,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'exercise_id': 'k-word-2',
                'sound_id': 'k',
                'sound_name': 'K Sound',
                'level': 3,
                'level_name': 'Word',
                'target': 'cat',
                'order': 2,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            # Level 4: Phrase
            {
                'exercise_id': 'k-phrase-1',
                'sound_id': 'k',
                'sound_name': 'K Sound',
                'level': 4,
                'level_name': 'Phrase',
                'target': 'Kick the ball.',
                'order': 1,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'exercise_id': 'k-phrase-2',
                'sound_id': 'k',
                'sound_name': 'K Sound',
                'level': 4,
                'level_name': 'Phrase',
                'target': 'Cook the rice.',
                'order': 2,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            # Level 5: Sentence
            {
                'exercise_id': 'k-sentence-1',
                'sound_id': 'k',
                'sound_name': 'K Sound',
                'level': 5,
                'level_name': 'Sentence',
                'target': 'Keep the kite flying high.',
                'order': 1,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'exercise_id': 'k-sentence-2',
                'sound_id': 'k',
                'sound_name': 'K Sound',
                'level': 5,
                'level_name': 'Sentence',
                'target': 'The cat climbed the kitchen counter.',
                'order': 2,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            
            # TH SOUND EXERCISES
            # Level 1: Sound
            {
                'exercise_id': 'th-sound-1',
                'sound_id': 'th',
                'sound_name': 'TH Sound',
                'level': 1,
                'level_name': 'Sound',
                'target': 'th',
                'order': 1,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            # Level 2: Syllable
            {
                'exercise_id': 'th-syllable-1',
                'sound_id': 'th',
                'sound_name': 'TH Sound',
                'level': 2,
                'level_name': 'Syllable',
                'target': 'tha',
                'order': 1,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'exercise_id': 'th-syllable-2',
                'sound_id': 'th',
                'sound_name': 'TH Sound',
                'level': 2,
                'level_name': 'Syllable',
                'target': 'the',
                'order': 2,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'exercise_id': 'th-syllable-3',
                'sound_id': 'th',
                'sound_name': 'TH Sound',
                'level': 2,
                'level_name': 'Syllable',
                'target': 'thi',
                'order': 3,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            # Level 3: Word
            {
                'exercise_id': 'th-word-1',
                'sound_id': 'th',
                'sound_name': 'TH Sound',
                'level': 3,
                'level_name': 'Word',
                'target': 'think',
                'order': 1,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'exercise_id': 'th-word-2',
                'sound_id': 'th',
                'sound_name': 'TH Sound',
                'level': 3,
                'level_name': 'Word',
                'target': 'this',
                'order': 2,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            # Level 4: Phrase
            {
                'exercise_id': 'th-phrase-1',
                'sound_id': 'th',
                'sound_name': 'TH Sound',
                'level': 4,
                'level_name': 'Phrase',
                'target': 'Think about that.',
                'order': 1,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'exercise_id': 'th-phrase-2',
                'sound_id': 'th',
                'sound_name': 'TH Sound',
                'level': 4,
                'level_name': 'Phrase',
                'target': 'This is the thumb.',
                'order': 2,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            # Level 5: Sentence
            {
                'exercise_id': 'th-sentence-1',
                'sound_id': 'th',
                'sound_name': 'TH Sound',
                'level': 5,
                'level_name': 'Sentence',
                'target': 'Those three thieves thought they were free.',
                'order': 1,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'exercise_id': 'th-sentence-2',
                'sound_id': 'th',
                'sound_name': 'TH Sound',
                'level': 5,
                'level_name': 'Sentence',
                'target': 'This is my thumb.',
                'order': 2,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            }
        ]
        
        # Insert all exercises
        result = articulation_exercises_collection.insert_many(articulation_exercises)
        
        return jsonify({
            'success': True,
            'message': 'Successfully seeded articulation exercises',
            'count': len(result.inserted_ids)
        }), 201
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to seed exercises',
            'error': str(e)
        }), 500

# Get all exercises (for therapist dashboard)
@articulation_bp.route('/', methods=['GET'])
@token_required
def get_all_exercises(current_user):
    """Get all articulation exercises grouped by sound and level"""
    try:
        # Get all exercises from database
        exercises = list(articulation_exercises_collection.find({}))
        
        # Convert ObjectId to string and format
        for ex in exercises:
            ex['_id'] = str(ex['_id'])
        
        # Group exercises by sound and level
        exercises_by_sound = {}
        for ex in exercises:
            sound_id = ex['sound_id']
            level = ex['level']
            
            if sound_id not in exercises_by_sound:
                exercises_by_sound[sound_id] = {
                    'sound_name': ex['sound_name'],
                    'levels': {}
                }
            
            if level not in exercises_by_sound[sound_id]['levels']:
                exercises_by_sound[sound_id]['levels'][level] = {
                    'level_name': ex['level_name'],
                    'exercises': []
                }
            
            exercises_by_sound[sound_id]['levels'][level]['exercises'].append(ex)
        
        # Sort exercises by order within each level
        for sound_data in exercises_by_sound.values():
            for level_data in sound_data['levels'].values():
                level_data['exercises'].sort(key=lambda x: x.get('order', 0))
        
        return jsonify({
            'success': True,
            'exercises_by_sound': exercises_by_sound,
            'total': len(exercises)
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get exercises',
            'error': str(e)
        }), 500

# Get active exercises for a specific sound (for patient side)
@articulation_bp.route('/active/<sound_id>', methods=['GET'])
@token_required
def get_active_exercises(current_user, sound_id):
    """Get only active exercises for a specific sound"""
    try:
        # Get active exercises for this sound
        exercises = list(articulation_exercises_collection.find({
            'sound_id': sound_id,
            'is_active': True
        }).sort([('level', 1), ('order', 1)]))
        
        # Convert ObjectId to string
        for ex in exercises:
            ex['_id'] = str(ex['_id'])
        
        # Group by level
        exercises_by_level = {}
        for ex in exercises:
            level = ex['level']
            if level not in exercises_by_level:
                exercises_by_level[level] = {
                    'level_name': ex['level_name'],
                    'exercises': []
                }
            exercises_by_level[level]['exercises'].append(ex)
        
        return jsonify({
            'success': True,
            'sound_id': sound_id,
            'exercises_by_level': exercises_by_level,
            'total': len(exercises)
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get active exercises',
            'error': str(e)
        }), 500

# Create new exercise
@articulation_bp.route('/', methods=['POST'])
@token_required
def create_exercise(current_user):
    """Create a new articulation exercise"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['exercise_id', 'sound_id', 'sound_name', 'level', 'level_name', 'target']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'message': f'Missing required field: {field}'
                }), 400
        
        # Check if exercise_id already exists
        existing = articulation_exercises_collection.find_one({'exercise_id': data['exercise_id']})
        if existing:
            return jsonify({
                'success': False,
                'message': 'Exercise ID already exists'
            }), 400
        
        # Create exercise document
        exercise = {
            'exercise_id': data['exercise_id'],
            'sound_id': data['sound_id'],
            'sound_name': data['sound_name'],
            'level': int(data['level']),
            'level_name': data['level_name'],
            'target': data['target'],
            'order': int(data.get('order', 1)),
            'is_active': data.get('is_active', True),
            'created_at': datetime.datetime.utcnow(),
            'updated_at': datetime.datetime.utcnow()
        }
        
        # Insert into database
        result = articulation_exercises_collection.insert_one(exercise)
        exercise['_id'] = str(result.inserted_id)
        
        return jsonify({
            'success': True,
            'message': 'Exercise created successfully',
            'exercise': exercise
        }), 201
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to create exercise',
            'error': str(e)
        }), 500

# Update exercise
@articulation_bp.route('/<exercise_id>', methods=['PUT'])
@token_required
def update_exercise(current_user, exercise_id):
    """Update an existing articulation exercise"""
    try:
        data = request.get_json()
        
        # Find exercise by MongoDB _id
        exercise = articulation_exercises_collection.find_one({'_id': ObjectId(exercise_id)})
        if not exercise:
            return jsonify({
                'success': False,
                'message': 'Exercise not found'
            }), 404
        
        # Update fields
        update_data = {
            'updated_at': datetime.datetime.utcnow()
        }
        
        # Update allowed fields
        allowed_fields = ['sound_id', 'sound_name', 'level', 'level_name', 'target', 'order', 'is_active']
        for field in allowed_fields:
            if field in data:
                if field in ['level', 'order']:
                    update_data[field] = int(data[field])
                else:
                    update_data[field] = data[field]
        
        # Update in database
        articulation_exercises_collection.update_one(
            {'_id': ObjectId(exercise_id)},
            {'$set': update_data}
        )
        
        # Get updated exercise
        updated_exercise = articulation_exercises_collection.find_one({'_id': ObjectId(exercise_id)})
        updated_exercise['_id'] = str(updated_exercise['_id'])
        
        return jsonify({
            'success': True,
            'message': 'Exercise updated successfully',
            'exercise': updated_exercise
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to update exercise',
            'error': str(e)
        }), 500

# Delete exercise
@articulation_bp.route('/<exercise_id>', methods=['DELETE'])
@token_required
def delete_exercise(current_user, exercise_id):
    """Delete an articulation exercise"""
    try:
        # Find and delete exercise
        result = articulation_exercises_collection.delete_one({'_id': ObjectId(exercise_id)})
        
        if result.deleted_count == 0:
            return jsonify({
                'success': False,
                'message': 'Exercise not found'
            }), 404
        
        return jsonify({
            'success': True,
            'message': 'Exercise deleted successfully'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to delete exercise',
            'error': str(e)
        }), 500

# Toggle exercise active status
@articulation_bp.route('/<exercise_id>/toggle', methods=['PUT'])
@token_required
def toggle_exercise_active(current_user, exercise_id):
    """Toggle exercise active/inactive status"""
    try:
        # Find exercise
        exercise = articulation_exercises_collection.find_one({'_id': ObjectId(exercise_id)})
        if not exercise:
            return jsonify({
                'success': False,
                'message': 'Exercise not found'
            }), 404
        
        # Toggle is_active
        new_status = not exercise.get('is_active', False)
        
        articulation_exercises_collection.update_one(
            {'_id': ObjectId(exercise_id)},
            {'$set': {
                'is_active': new_status,
                'updated_at': datetime.datetime.utcnow()
            }}
        )
        
        return jsonify({
            'success': True,
            'message': f'Exercise {"activated" if new_status else "deactivated"}',
            'is_active': new_status
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to toggle exercise status',
            'error': str(e)
        }), 500

# Delete all exercises (for re-seeding)
@articulation_bp.route('/all', methods=['DELETE'])
@token_required
def delete_all_exercises(current_user):
    """Delete all articulation exercises"""
    try:
        result = articulation_exercises_collection.delete_many({})
        
        return jsonify({
            'success': True,
            'message': f'Deleted {result.deleted_count} exercises'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to delete exercises',
            'error': str(e)
        }), 500
