"""
Language Exercise CRUD Operations (Expressive)
Manages expressive language therapy exercises (3 levels: Description, Sentence, Retell)
"""

from flask import Blueprint, request, jsonify
from functools import wraps
from bson import ObjectId
import datetime
import jwt
import os

# Create Blueprint
language_bp = Blueprint('language_crud', __name__)

# Database collections
db = None
users_collection = None
language_exercises_collection = None

def init_language_crud(database):
    """Initialize database collections"""
    global db, users_collection, language_exercises_collection
    db = database
    users_collection = db['users']
    language_exercises_collection = db['language_exercises']
    print("✅ Language (Expressive) CRUD initialized")

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


@language_bp.route('/api/language-exercises/seed', methods=['POST'])
@token_required
@therapist_required
def seed_default_exercises(current_user):
    """Seed database with default expressive language exercises"""
    try:
        existing = language_exercises_collection.count_documents({'mode': 'expressive'})
        if existing > 0:
            return jsonify({
                'success': False,
                'message': f'Database already has {existing} expressive exercises.',
                'existing_count': existing
            }), 400
        
        default_exercises = [
            # Level 1: Picture Description
            {
                'mode': 'expressive', 'level': 1, 'level_name': 'Picture Description', 'level_color': '#8b5cf6',
                'exercise_id': 'desc-1', 'type': 'description',
                'instruction': 'Look at the emojis and describe what you see in 5-10 words',
                'prompt': '🏠🌳👨‍👩‍👧', 'expected_keywords': ['house', 'tree', 'family'],
                'min_words': 5, 'story': '', 'is_active': True,
                'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()
            },
            {
                'mode': 'expressive', 'level': 1, 'level_name': 'Picture Description', 'level_color': '#8b5cf6',
                'exercise_id': 'desc-2', 'type': 'description',
                'instruction': 'Describe this scene using complete sentences',
                'prompt': '☀️🏖️🌊', 'expected_keywords': ['sun', 'beach', 'ocean', 'water'],
                'min_words': 5, 'story': '', 'is_active': True,
                'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()
            },
            {
                'mode': 'expressive', 'level': 1, 'level_name': 'Picture Description', 'level_color': '#8b5cf6',
                'exercise_id': 'desc-3', 'type': 'description',
                'instruction': 'Tell me what you see in this picture',
                'prompt': '🐕⚽👦', 'expected_keywords': ['dog', 'ball', 'boy', 'playing'],
                'min_words': 5, 'story': '', 'is_active': True,
                'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()
            },
            # Level 2: Sentence Formation
            {
                'mode': 'expressive', 'level': 2, 'level_name': 'Sentence Formation', 'level_color': '#ec4899',
                'exercise_id': 'sent-1', 'type': 'sentence',
                'instruction': 'Make a sentence using these words: cat, sleeping, chair',
                'prompt': 'Words: cat, sleeping, chair', 'expected_keywords': ['cat', 'sleeping', 'chair'],
                'min_words': 5, 'story': '', 'is_active': True,
                'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()
            },
            {
                'mode': 'expressive', 'level': 2, 'level_name': 'Sentence Formation', 'level_color': '#ec4899',
                'exercise_id': 'sent-2', 'type': 'sentence',
                'instruction': 'Create a sentence with: bird, flying, sky',
                'prompt': 'Words: bird, flying, sky', 'expected_keywords': ['bird', 'flying', 'sky'],
                'min_words': 5, 'story': '', 'is_active': True,
                'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()
            },
            {
                'mode': 'expressive', 'level': 2, 'level_name': 'Sentence Formation', 'level_color': '#ec4899',
                'exercise_id': 'sent-3', 'type': 'sentence',
                'instruction': 'Form a sentence using: book, reading, library',
                'prompt': 'Words: book, reading, library', 'expected_keywords': ['book', 'reading', 'library'],
                'min_words': 5, 'story': '', 'is_active': True,
                'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()
            },
            # Level 3: Story Retell
            {
                'mode': 'expressive', 'level': 3, 'level_name': 'Story Retell', 'level_color': '#f59e0b',
                'exercise_id': 'retell-1', 'type': 'retell',
                'instruction': 'Listen to this story and retell it in your own words',
                'prompt': 'Story about a day at the park',
                'expected_keywords': ['park', 'children', 'playing', 'fun'],
                'min_words': 15,
                'story': 'One sunny day, children went to the park. They played on the swings and slides. Everyone had fun together.',
                'is_active': True,
                'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()
            },
            {
                'mode': 'expressive', 'level': 3, 'level_name': 'Story Retell', 'level_color': '#f59e0b',
                'exercise_id': 'retell-2', 'type': 'retell',
                'instruction': 'After reading, tell me the story again',
                'prompt': 'Story about a helpful dog',
                'expected_keywords': ['dog', 'helped', 'family', 'home'],
                'min_words': 15,
                'story': 'A friendly dog helped its family find their way home. The dog was very smart and knew the way. The family was happy and grateful.',
                'is_active': True,
                'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()
            }
        ]
        
        result = language_exercises_collection.insert_many(default_exercises)
        
        return jsonify({
            'success': True,
            'message': f'Successfully seeded {len(result.inserted_ids)} expressive language exercises',
            'count': len(result.inserted_ids)
        }), 201
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@language_bp.route('/api/language-exercises', methods=['GET'])
@token_required
def get_all_exercises(current_user):
    """Get all expressive language exercises"""
    try:
        exercises = list(language_exercises_collection.find({'mode': 'expressive'}).sort([('level', 1), ('order', 1)]))
        
        for ex in exercises:
            ex['_id'] = str(ex['_id'])
            if 'created_at' in ex and hasattr(ex['created_at'], 'isoformat'):
                ex['created_at'] = ex['created_at'].isoformat()
            if 'updated_at' in ex and hasattr(ex['updated_at'], 'isoformat'):
                ex['updated_at'] = ex['updated_at'].isoformat()
        
        return jsonify({
            'success': True,
            'exercises': exercises,
            'count': len(exercises)
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@language_bp.route('/api/language-exercises', methods=['POST'])
@token_required
@therapist_required
def create_exercise(current_user):
    """Create a new expressive language exercise"""
    try:
        data = request.get_json()
        
        # Define level metadata
        level_metadata = {
            1: {'name': 'Picture Description', 'color': '#8b5cf6'},
            2: {'name': 'Sentence Formation', 'color': '#a78bfa'},
            3: {'name': 'Story Retell', 'color': '#c4b5fd'}
        }
        
        # Validate required fields
        required_fields = ['level', 'type', 'instruction', 'prompt', 'min_words']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'message': f'Missing required field: {field}'}), 400
        
        level = int(data['level'])
        level_info = level_metadata.get(level, {'name': 'Unknown', 'color': '#6b7280'})
        
        # Get order from request
        order = int(data.get('order', 1))
        
        # Auto-generate exercise_id based on type and order
        exercise_type = data['type']
        exercise_id = f"{exercise_type}-{order}"
        
        exercise = {
            'mode': 'expressive',
            'level': level,
            'level_name': level_info['name'],
            'level_color': level_info['color'],
            'order': order,
            'exercise_id': exercise_id,
            'type': exercise_type,
            'instruction': data['instruction'],
            'prompt': data['prompt'],
            'expected_keywords': data.get('expected_keywords', []),
            'min_words': int(data['min_words']),
            'story': data.get('story', ''),
            'is_active': data.get('is_active', True),
            'created_at': datetime.datetime.utcnow(),
            'updated_at': datetime.datetime.utcnow()
        }
        
        result = language_exercises_collection.insert_one(exercise)
        exercise['_id'] = str(result.inserted_id)
        
        return jsonify({
            'success': True,
            'message': 'Exercise created successfully',
            'exercise': exercise
        }), 201
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@language_bp.route('/api/language-exercises/<exercise_id>', methods=['PUT'])
@token_required
@therapist_required
def update_exercise(current_user, exercise_id):
    """Update an existing expressive language exercise"""
    try:
        data = request.get_json()
        if '_id' in data:
            del data['_id']
        
        # Define level metadata
        level_metadata = {
            1: {'name': 'Picture Description', 'color': '#8b5cf6'},
            2: {'name': 'Sentence Formation', 'color': '#a78bfa'},
            3: {'name': 'Story Retell', 'color': '#c4b5fd'}
        }
        
        # If level is being updated, regenerate level_name and level_color
        if 'level' in data:
            level = int(data['level'])
            level_info = level_metadata.get(level, {'name': 'Unknown', 'color': '#6b7280'})
            data['level_name'] = level_info['name']
            data['level_color'] = level_info['color']
        
        # If type or order is being updated, regenerate exercise_id
        if 'type' in data or 'order' in data:
            # Get current exercise to access existing values
            current_exercise = language_exercises_collection.find_one({'_id': ObjectId(exercise_id)})
            if not current_exercise:
                return jsonify({'success': False, 'message': 'Exercise not found'}), 404
            
            exercise_type = data.get('type', current_exercise.get('type'))
            order = data.get('order', current_exercise.get('order', 1))
            data['exercise_id'] = f"{exercise_type}-{order}"
        
        data['updated_at'] = datetime.datetime.utcnow()
        
        result = language_exercises_collection.update_one(
            {'_id': ObjectId(exercise_id)},
            {'$set': data}
        )
        
        if result.matched_count == 0:
            return jsonify({'success': False, 'message': 'Exercise not found'}), 404
        
        return jsonify({'success': True, 'message': 'Exercise updated successfully'}), 200
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@language_bp.route('/api/language-exercises/<exercise_id>', methods=['DELETE'])
@token_required
@therapist_required
def delete_exercise(current_user, exercise_id):
    """Delete an expressive language exercise"""
    try:
        result = language_exercises_collection.delete_one({'_id': ObjectId(exercise_id)})
        
        if result.deleted_count == 0:
            return jsonify({'success': False, 'message': 'Exercise not found'}), 404
        
        return jsonify({'success': True, 'message': 'Exercise deleted successfully'}), 200
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@language_bp.route('/api/language-exercises/<exercise_id>/toggle-active', methods=['PATCH'])
@token_required
@therapist_required
def toggle_active(current_user, exercise_id):
    """Toggle is_active status"""
    try:
        exercise = language_exercises_collection.find_one({'_id': ObjectId(exercise_id)})
        if not exercise:
            return jsonify({'success': False, 'message': 'Exercise not found'}), 404
        
        new_status = not exercise.get('is_active', False)
        
        language_exercises_collection.update_one(
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
