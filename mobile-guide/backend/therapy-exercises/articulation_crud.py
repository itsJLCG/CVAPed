"""
Articulation Exercise CRUD Operations
Manages articulation therapy exercises by sound (s, r, l, k, th) and level (Sound, Syllable, Word, Phrase, Sentence)
"""

from flask import Blueprint, request, jsonify
from functools import wraps
from bson import ObjectId
import datetime
import jwt
import os

# Create Blueprint
articulation_bp = Blueprint('articulation_crud', __name__)

# Database collections
db = None
users_collection = None
articulation_exercises_collection = None

def init_articulation_crud(database):
    """Initialize database collections"""
    global db, users_collection, articulation_exercises_collection
    db = database
    users_collection = db['users']
    articulation_exercises_collection = db['articulation_exercises']
    print("✅ Articulation CRUD initialized")

# Token required decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        try:
            if token.startswith('Bearer '):
                token = token[7:]
            data = jwt.decode(token, os.getenv('SECRET_KEY', 'your-secret-key-here'), algorithms=["HS256"])
            # Node.js backend uses 'id' field, not 'user_id'
            user_id = data.get('id') or data.get('user_id')
            if not user_id:
                return jsonify({'message': 'Invalid token format!'}), 401
            current_user = users_collection.find_one({'_id': ObjectId(user_id)})
            if not current_user:
                return jsonify({'message': 'User not found!'}), 401
        except Exception as e:
            return jsonify({'message': 'Token is invalid!', 'error': str(e)}), 401
        return f(current_user, *args, **kwargs)
    return decorated

# Therapist-only decorator
def therapist_required(f):
    @wraps(f)
    def decorated(current_user, *args, **kwargs):
        if current_user.get('role') not in ['therapist', 'admin']:
            return jsonify({'message': 'Unauthorized. Therapist access required.'}), 403
        return f(current_user, *args, **kwargs)
    return decorated


@articulation_bp.route('/api/articulation-exercises/seed', methods=['POST'])
@token_required
@therapist_required
def seed_default_exercises(current_user):
    """Seed database with default articulation exercises for all sounds"""
    try:
        existing = articulation_exercises_collection.count_documents({})
        if existing > 0:
            return jsonify({
                'success': False,
                'message': f'Database already has {existing} articulation exercises.',
                'existing_count': existing
            }), 400
        
        # Default exercises for all sounds (5 levels each) - using simple words for Level 1
        default_exercises = [
            # ==================== S SOUND ====================
            # S Sound - Level 1: Sound (using simple word instead of isolated sound)
            {'exercise_id': 's-sound-1', 'sound_id': 's', 'sound_name': 'S Sound', 'level': 1, 'level_name': 'Sound',
             'target': 'sea', 'order': 1, 'is_active': True,
             'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()},
            # S Sound - Level 2: Syllable
            {'exercise_id': 's-syllable-1', 'sound_id': 's', 'sound_name': 'S Sound', 'level': 2, 'level_name': 'Syllable',
             'target': 'sa', 'order': 1, 'is_active': True,
             'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()},
            {'exercise_id': 's-syllable-2', 'sound_id': 's', 'sound_name': 'S Sound', 'level': 2, 'level_name': 'Syllable',
             'target': 'so', 'order': 2, 'is_active': True,
             'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()},
            {'exercise_id': 's-syllable-3', 'sound_id': 's', 'sound_name': 'S Sound', 'level': 2, 'level_name': 'Syllable',
             'target': 'su', 'order': 3, 'is_active': True,
             'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()},
            # S Sound - Level 3: Word
            {'exercise_id': 's-word-1', 'sound_id': 's', 'sound_name': 'S Sound', 'level': 3, 'level_name': 'Word',
             'target': 'sun', 'order': 1, 'is_active': True,
             'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()},
            {'exercise_id': 's-word-2', 'sound_id': 's', 'sound_name': 'S Sound', 'level': 3, 'level_name': 'Word',
             'target': 'sat', 'order': 2, 'is_active': True,
             'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()},
            {'exercise_id': 's-word-3', 'sound_id': 's', 'sound_name': 'S Sound', 'level': 3, 'level_name': 'Word',
             'target': 'sip', 'order': 3, 'is_active': True,
             'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()},
            # S Sound - Level 4: Phrase
            {'exercise_id': 's-phrase-1', 'sound_id': 's', 'sound_name': 'S Sound', 'level': 4, 'level_name': 'Phrase',
             'target': 'See the sun.', 'order': 1, 'is_active': True,
             'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()},
            {'exercise_id': 's-phrase-2', 'sound_id': 's', 'sound_name': 'S Sound', 'level': 4, 'level_name': 'Phrase',
             'target': 'Sit down.', 'order': 2, 'is_active': True,
             'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()},
            # S Sound - Level 5: Sentence
            {'exercise_id': 's-sentence-1', 'sound_id': 's', 'sound_name': 'S Sound', 'level': 5, 'level_name': 'Sentence',
             'target': 'The sun is very hot.', 'order': 1, 'is_active': True,
             'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()},
            
            # ==================== R SOUND ====================
            # R Sound - Level 1: Sound (using simple word)
            {'exercise_id': 'r-sound-1', 'sound_id': 'r', 'sound_name': 'R Sound', 'level': 1, 'level_name': 'Sound',
             'target': 'ray', 'order': 1, 'is_active': True,
             'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()},
            # R Sound - Level 2: Syllable
            {'exercise_id': 'r-syllable-1', 'sound_id': 'r', 'sound_name': 'R Sound', 'level': 2, 'level_name': 'Syllable',
             'target': 'ra', 'order': 1, 'is_active': True,
             'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()},
            {'exercise_id': 'r-syllable-2', 'sound_id': 'r', 'sound_name': 'R Sound', 'level': 2, 'level_name': 'Syllable',
             'target': 'ro', 'order': 2, 'is_active': True,
             'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()},
            {'exercise_id': 'r-syllable-3', 'sound_id': 'r', 'sound_name': 'R Sound', 'level': 2, 'level_name': 'Syllable',
             'target': 'ru', 'order': 3, 'is_active': True,
             'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()},
            # R Sound - Level 3: Word
            {'exercise_id': 'r-word-1', 'sound_id': 'r', 'sound_name': 'R Sound', 'level': 3, 'level_name': 'Word',
             'target': 'red', 'order': 1, 'is_active': True,
             'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()},
            {'exercise_id': 'r-word-2', 'sound_id': 'r', 'sound_name': 'R Sound', 'level': 3, 'level_name': 'Word',
             'target': 'run', 'order': 2, 'is_active': True,
             'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()},
            {'exercise_id': 'r-word-3', 'sound_id': 'r', 'sound_name': 'R Sound', 'level': 3, 'level_name': 'Word',
             'target': 'rat', 'order': 3, 'is_active': True,
             'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()},
            # R Sound - Level 4: Phrase
            {'exercise_id': 'r-phrase-1', 'sound_id': 'r', 'sound_name': 'R Sound', 'level': 4, 'level_name': 'Phrase',
             'target': 'Run fast.', 'order': 1, 'is_active': True,
             'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()},
            {'exercise_id': 'r-phrase-2', 'sound_id': 'r', 'sound_name': 'R Sound', 'level': 4, 'level_name': 'Phrase',
             'target': 'Red rose.', 'order': 2, 'is_active': True,
             'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()},
            # R Sound - Level 5: Sentence
            {'exercise_id': 'r-sentence-1', 'sound_id': 'r', 'sound_name': 'R Sound', 'level': 5, 'level_name': 'Sentence',
             'target': 'The rabbit runs really fast.', 'order': 1, 'is_active': True,
             'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()},
            
            # ==================== L SOUND ====================
            # L Sound - Level 1: Sound (using simple word)
            {'exercise_id': 'l-sound-1', 'sound_id': 'l', 'sound_name': 'L Sound', 'level': 1, 'level_name': 'Sound',
             'target': 'lay', 'order': 1, 'is_active': True,
             'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()},
            # L Sound - Level 2: Syllable
            {'exercise_id': 'l-syllable-1', 'sound_id': 'l', 'sound_name': 'L Sound', 'level': 2, 'level_name': 'Syllable',
             'target': 'la', 'order': 1, 'is_active': True,
             'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()},
            {'exercise_id': 'l-syllable-2', 'sound_id': 'l', 'sound_name': 'L Sound', 'level': 2, 'level_name': 'Syllable',
             'target': 'lo', 'order': 2, 'is_active': True,
             'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()},
            {'exercise_id': 'l-syllable-3', 'sound_id': 'l', 'sound_name': 'L Sound', 'level': 2, 'level_name': 'Syllable',
             'target': 'lu', 'order': 3, 'is_active': True,
             'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()},
            # L Sound - Level 3: Word
            {'exercise_id': 'l-word-1', 'sound_id': 'l', 'sound_name': 'L Sound', 'level': 3, 'level_name': 'Word',
             'target': 'look', 'order': 1, 'is_active': True,
             'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()},
            {'exercise_id': 'l-word-2', 'sound_id': 'l', 'sound_name': 'L Sound', 'level': 3, 'level_name': 'Word',
             'target': 'like', 'order': 2, 'is_active': True,
             'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()},
            {'exercise_id': 'l-word-3', 'sound_id': 'l', 'sound_name': 'L Sound', 'level': 3, 'level_name': 'Word',
             'target': 'lamp', 'order': 3, 'is_active': True,
             'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()},
            # L Sound - Level 4: Phrase
            {'exercise_id': 'l-phrase-1', 'sound_id': 'l', 'sound_name': 'L Sound', 'level': 4, 'level_name': 'Phrase',
             'target': 'Look at me.', 'order': 1, 'is_active': True,
             'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()},
            {'exercise_id': 'l-phrase-2', 'sound_id': 'l', 'sound_name': 'L Sound', 'level': 4, 'level_name': 'Phrase',
             'target': 'Like this.', 'order': 2, 'is_active': True,
             'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()},
            # L Sound - Level 5: Sentence
            {'exercise_id': 'l-sentence-1', 'sound_id': 'l', 'sound_name': 'L Sound', 'level': 5, 'level_name': 'Sentence',
             'target': 'I like to play with my little lamb.', 'order': 1, 'is_active': True,
             'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()},
            
            # ==================== K SOUND ====================
            # K Sound - Level 1: Sound (using simple word)
            {'exercise_id': 'k-sound-1', 'sound_id': 'k', 'sound_name': 'K Sound', 'level': 1, 'level_name': 'Sound',
             'target': 'key', 'order': 1, 'is_active': True,
             'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()},
            # K Sound - Level 2: Syllable
            {'exercise_id': 'k-syllable-1', 'sound_id': 'k', 'sound_name': 'K Sound', 'level': 2, 'level_name': 'Syllable',
             'target': 'ka', 'order': 1, 'is_active': True,
             'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()},
            {'exercise_id': 'k-syllable-2', 'sound_id': 'k', 'sound_name': 'K Sound', 'level': 2, 'level_name': 'Syllable',
             'target': 'ko', 'order': 2, 'is_active': True,
             'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()},
            {'exercise_id': 'k-syllable-3', 'sound_id': 'k', 'sound_name': 'K Sound', 'level': 2, 'level_name': 'Syllable',
             'target': 'ku', 'order': 3, 'is_active': True,
             'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()},
            # K Sound - Level 3: Word
            {'exercise_id': 'k-word-1', 'sound_id': 'k', 'sound_name': 'K Sound', 'level': 3, 'level_name': 'Word',
             'target': 'cat', 'order': 1, 'is_active': True,
             'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()},
            {'exercise_id': 'k-word-2', 'sound_id': 'k', 'sound_name': 'K Sound', 'level': 3, 'level_name': 'Word',
             'target': 'come', 'order': 2, 'is_active': True,
             'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()},
            {'exercise_id': 'k-word-3', 'sound_id': 'k', 'sound_name': 'K Sound', 'level': 3, 'level_name': 'Word',
             'target': 'cup', 'order': 3, 'is_active': True,
             'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()},
            # K Sound - Level 4: Phrase
            {'exercise_id': 'k-phrase-1', 'sound_id': 'k', 'sound_name': 'K Sound', 'level': 4, 'level_name': 'Phrase',
             'target': 'Come here.', 'order': 1, 'is_active': True,
             'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()},
            {'exercise_id': 'k-phrase-2', 'sound_id': 'k', 'sound_name': 'K Sound', 'level': 4, 'level_name': 'Phrase',
             'target': 'Cute cat.', 'order': 2, 'is_active': True,
             'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()},
            # K Sound - Level 5: Sentence
            {'exercise_id': 'k-sentence-1', 'sound_id': 'k', 'sound_name': 'K Sound', 'level': 5, 'level_name': 'Sentence',
             'target': 'The cat can climb the tree.', 'order': 1, 'is_active': True,
             'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()},
            
            # ==================== TH SOUND ====================
            # TH Sound - Level 1: Sound (using simple word)
            {'exercise_id': 'th-sound-1', 'sound_id': 'th', 'sound_name': 'TH Sound', 'level': 1, 'level_name': 'Sound',
             'target': 'they', 'order': 1, 'is_active': True,
             'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()},
            # TH Sound - Level 2: Syllable
            {'exercise_id': 'th-syllable-1', 'sound_id': 'th', 'sound_name': 'TH Sound', 'level': 2, 'level_name': 'Syllable',
             'target': 'tha', 'order': 1, 'is_active': True,
             'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()},
            {'exercise_id': 'th-syllable-2', 'sound_id': 'th', 'sound_name': 'TH Sound', 'level': 2, 'level_name': 'Syllable',
             'target': 'tho', 'order': 2, 'is_active': True,
             'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()},
            {'exercise_id': 'th-syllable-3', 'sound_id': 'th', 'sound_name': 'TH Sound', 'level': 2, 'level_name': 'Syllable',
             'target': 'thu', 'order': 3, 'is_active': True,
             'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()},
            # TH Sound - Level 3: Word
            {'exercise_id': 'th-word-1', 'sound_id': 'th', 'sound_name': 'TH Sound', 'level': 3, 'level_name': 'Word',
             'target': 'think', 'order': 1, 'is_active': True,
             'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()},
            {'exercise_id': 'th-word-2', 'sound_id': 'th', 'sound_name': 'TH Sound', 'level': 3, 'level_name': 'Word',
             'target': 'thank', 'order': 2, 'is_active': True,
             'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()},
            {'exercise_id': 'th-word-3', 'sound_id': 'th', 'sound_name': 'TH Sound', 'level': 3, 'level_name': 'Word',
             'target': 'thin', 'order': 3, 'is_active': True,
             'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()},
            # TH Sound - Level 4: Phrase
            {'exercise_id': 'th-phrase-1', 'sound_id': 'th', 'sound_name': 'TH Sound', 'level': 4, 'level_name': 'Phrase',
             'target': 'Think about it.', 'order': 1, 'is_active': True,
             'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()},
            {'exercise_id': 'th-phrase-2', 'sound_id': 'th', 'sound_name': 'TH Sound', 'level': 4, 'level_name': 'Phrase',
             'target': 'Thank you.', 'order': 2, 'is_active': True,
             'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()},
            # TH Sound - Level 5: Sentence
            {'exercise_id': 'th-sentence-1', 'sound_id': 'th', 'sound_name': 'TH Sound', 'level': 5, 'level_name': 'Sentence',
             'target': 'I think the weather is nice.', 'order': 1, 'is_active': True,
             'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()}
        ]
        
        result = articulation_exercises_collection.insert_many(default_exercises)
        
        return jsonify({
            'success': True,
            'message': f'Successfully seeded {len(result.inserted_ids)} articulation exercises',
            'count': len(result.inserted_ids)
        }), 201
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@articulation_bp.route('/api/articulation-exercises', methods=['GET'])
@token_required
def get_all_exercises(current_user):
    """Get all articulation exercises grouped by sound and level"""
    try:
        exercises = list(articulation_exercises_collection.find().sort([('sound_id', 1), ('level', 1), ('order', 1)]))
        
        # Group exercises by sound and level
        exercises_by_sound = {}
        for ex in exercises:
            ex['_id'] = str(ex['_id'])
            # Handle datetime conversion safely
            if 'created_at' in ex:
                if isinstance(ex['created_at'], datetime.datetime):
                    ex['created_at'] = ex['created_at'].isoformat()
                # If it's already a string, keep it as is
            if 'updated_at' in ex:
                if isinstance(ex['updated_at'], datetime.datetime):
                    ex['updated_at'] = ex['updated_at'].isoformat()
                # If it's already a string, keep it as is
            
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
        
        return jsonify({
            'success': True,
            'exercises_by_sound': exercises_by_sound,
            'total_count': len(exercises)
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@articulation_bp.route('/api/articulation-exercises', methods=['POST'])
@token_required
@therapist_required
def create_exercise(current_user):
    """Create a new articulation exercise"""
    try:
        data = request.get_json()
        
        # Required fields (user input only)
        required_fields = ['sound_id', 'level', 'target', 'order']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'message': f'Missing required field: {field}'}), 400
        
        sound_id = data['sound_id']
        level = int(data['level'])
        order = int(data['order'])
        
        # Auto-generate sound_name based on sound_id
        sound_names = {
            's': 'S Sound',
            'r': 'R Sound',
            'l': 'L Sound',
            'k': 'K Sound',
            'th': 'TH Sound'
        }
        
        # Auto-generate level_name based on level number
        level_names = {
            1: 'Sound',
            2: 'Syllable',
            3: 'Word',
            4: 'Phrase',
            5: 'Sentence'
        }
        
        # Auto-generate exercise_id: {sound_id}-{level_name_lowercase}-{order}
        level_name = level_names.get(level, 'Unknown')
        exercise_id = f"{sound_id}-{level_name.lower()}-{order}"
        
        # Create exercise with auto-generated fields
        exercise = {
            'exercise_id': exercise_id,
            'sound_id': sound_id,
            'sound_name': sound_names.get(sound_id, f'{sound_id.upper()} Sound'),
            'level': level,
            'level_name': level_name,
            'target': data['target'],
            'order': order,
            'is_active': data.get('is_active', True),
            'created_at': datetime.datetime.utcnow(),
            'updated_at': datetime.datetime.utcnow()
        }
        
        result = articulation_exercises_collection.insert_one(exercise)
        exercise['_id'] = str(result.inserted_id)
        
        return jsonify({
            'success': True,
            'message': 'Exercise created successfully',
            'exercise': exercise
        }), 201
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@articulation_bp.route('/api/articulation-exercises/<exercise_id>', methods=['PUT'])
@token_required
@therapist_required
def update_exercise(current_user, exercise_id):
    """Update an existing articulation exercise"""
    try:
        data = request.get_json()
        if '_id' in data:
            del data['_id']
        
        # Regenerate auto-generated fields if sound_id or level changed
        if 'sound_id' in data or 'level' in data or 'order' in data:
            # Get current exercise to get missing fields
            current_exercise = articulation_exercises_collection.find_one({'_id': ObjectId(exercise_id)})
            if not current_exercise:
                return jsonify({'success': False, 'message': 'Exercise not found'}), 404
            
            sound_id = data.get('sound_id', current_exercise.get('sound_id'))
            level = int(data.get('level', current_exercise.get('level', 1)))
            order = int(data.get('order', current_exercise.get('order', 1)))
            
            # Auto-generate sound_name
            sound_names = {
                's': 'S Sound',
                'r': 'R Sound',
                'l': 'L Sound',
                'k': 'K Sound',
                'th': 'TH Sound'
            }
            data['sound_name'] = sound_names.get(sound_id, f'{sound_id.upper()} Sound')
            
            # Auto-generate level_name
            level_names = {
                1: 'Sound',
                2: 'Syllable',
                3: 'Word',
                4: 'Phrase',
                5: 'Sentence'
            }
            data['level_name'] = level_names.get(level, 'Unknown')
            
            # Auto-generate exercise_id
            data['exercise_id'] = f"{sound_id}-{data['level_name'].lower()}-{order}"
        
        data['updated_at'] = datetime.datetime.utcnow()
        
        result = articulation_exercises_collection.update_one(
            {'_id': ObjectId(exercise_id)},
            {'$set': data}
        )
        
        if result.matched_count == 0:
            return jsonify({'success': False, 'message': 'Exercise not found'}), 404
        
        return jsonify({'success': True, 'message': 'Exercise updated successfully'}), 200
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@articulation_bp.route('/api/articulation-exercises/<exercise_id>', methods=['DELETE'])
@token_required
@therapist_required
def delete_exercise(current_user, exercise_id):
    """Delete an articulation exercise"""
    try:
        result = articulation_exercises_collection.delete_one({'_id': ObjectId(exercise_id)})
        
        if result.deleted_count == 0:
            return jsonify({'success': False, 'message': 'Exercise not found'}), 404
        
        return jsonify({'success': True, 'message': 'Exercise deleted successfully'}), 200
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@articulation_bp.route('/api/articulation-exercises/<exercise_id>/toggle-active', methods=['PATCH'])
@token_required
@therapist_required
def toggle_active(current_user, exercise_id):
    """Toggle is_active status"""
    try:
        exercise = articulation_exercises_collection.find_one({'_id': ObjectId(exercise_id)})
        if not exercise:
            return jsonify({'success': False, 'message': 'Exercise not found'}), 404
        
        new_status = not exercise.get('is_active', False)
        
        articulation_exercises_collection.update_one(
            {'_id': ObjectId(exercise_id)},
            {'$set': {'is_active': new_status, 'updated_at': datetime.datetime.utcnow()}}
        )
        
        return jsonify({
            'success': True,
            'message': f'Exercise is now {"active" if new_status else "inactive"}',
            'is_active': new_status
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
