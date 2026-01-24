"""
Receptive Language Exercise CRUD Operations
Manages receptive language therapy exercises (3 levels: Vocabulary, Directions, Comprehension)
Receptive exercises use multiple choice format with 4 options
"""

from flask import Blueprint, request, jsonify
from functools import wraps
from bson import ObjectId
import datetime
import jwt
import os

# Create Blueprint
receptive_bp = Blueprint('receptive_crud', __name__)

# Database collections
db = None
users_collection = None
receptive_exercises_collection = None

def init_receptive_crud(database):
    """Initialize database collections"""
    global db, users_collection, receptive_exercises_collection
    db = database
    users_collection = db['users']
    receptive_exercises_collection = db['receptive_exercises']
    print("✅ Receptive Language CRUD initialized")

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


@receptive_bp.route('/api/receptive-exercises/seed', methods=['POST'])
@token_required
@therapist_required
def seed_default_exercises(current_user):
    """Seed database with default receptive language exercises"""
    try:
        existing = receptive_exercises_collection.count_documents({})
        if existing > 0:
            return jsonify({
                'success': False,
                'message': f'Database already has {existing} receptive exercises.',
                'existing_count': existing
            }), 400
        
        default_exercises = [
            # Level 1: Vocabulary
            {
                'mode': 'receptive', 'level': 1, 'level_name': 'Vocabulary', 'level_color': '#3b82f6',
                'exercise_id': 'vocab-1', 'type': 'vocabulary',
                'instruction': 'Which picture shows an apple?',
                'target': 'apple',
                'options': [
                    {'id': 1, 'text': 'Apple', 'image': '🍎', 'correct': True},
                    {'id': 2, 'text': 'Ball', 'image': '⚽', 'correct': False},
                    {'id': 3, 'text': 'Car', 'image': '🚗', 'correct': False},
                    {'id': 4, 'text': 'House', 'image': '🏠', 'correct': False}
                ],
                'order': 1, 'is_active': True,
                'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()
            },
            {
                'mode': 'receptive', 'level': 1, 'level_name': 'Vocabulary', 'level_color': '#3b82f6',
                'exercise_id': 'vocab-2', 'type': 'vocabulary',
                'instruction': 'Find the picture of a dog',
                'target': 'dog',
                'options': [
                    {'id': 1, 'text': 'Cat', 'image': '🐱', 'correct': False},
                    {'id': 2, 'text': 'Dog', 'image': '🐕', 'correct': True},
                    {'id': 3, 'text': 'Bird', 'image': '🐦', 'correct': False},
                    {'id': 4, 'text': 'Fish', 'image': '🐠', 'correct': False}
                ],
                'order': 2, 'is_active': True,
                'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()
            },
            {
                'mode': 'receptive', 'level': 1, 'level_name': 'Vocabulary', 'level_color': '#3b82f6',
                'exercise_id': 'vocab-3', 'type': 'vocabulary',
                'instruction': 'Which one is a book?',
                'target': 'book',
                'options': [
                    {'id': 1, 'text': 'Phone', 'image': '📱', 'correct': False},
                    {'id': 2, 'text': 'Book', 'image': '📚', 'correct': True},
                    {'id': 3, 'text': 'Pen', 'image': '✏️', 'correct': False},
                    {'id': 4, 'text': 'Cup', 'image': '☕', 'correct': False}
                ],
                'order': 3, 'is_active': True,
                'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()
            },
            # Level 2: Directions
            {
                'mode': 'receptive', 'level': 2, 'level_name': 'Directions', 'level_color': '#3b82f6',
                'exercise_id': 'dir-1', 'type': 'directions',
                'instruction': 'Point to the picture that shows: Turn right',
                'target': 'turn right',
                'options': [
                    {'id': 1, 'text': 'Turn Left', 'image': '⬅️', 'correct': False},
                    {'id': 2, 'text': 'Turn Right', 'image': '➡️', 'correct': True},
                    {'id': 3, 'text': 'Go Up', 'image': '⬆️', 'correct': False},
                    {'id': 4, 'text': 'Go Down', 'image': '⬇️', 'correct': False}
                ],
                'order': 1, 'is_active': True,
                'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()
            },
            {
                'mode': 'receptive', 'level': 2, 'level_name': 'Directions', 'level_color': '#3b82f6',
                'exercise_id': 'dir-2', 'type': 'directions',
                'instruction': 'Which picture shows: Put the cup on the table',
                'target': 'put cup on table',
                'options': [
                    {'id': 1, 'text': 'Cup on table', 'image': '☕📋', 'correct': True},
                    {'id': 2, 'text': 'Cup in hand', 'image': '☕✋', 'correct': False},
                    {'id': 3, 'text': 'Empty table', 'image': '📋', 'correct': False},
                    {'id': 4, 'text': 'Cup on floor', 'image': '☕⬇️', 'correct': False}
                ],
                'order': 2, 'is_active': True,
                'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()
            },
            {
                'mode': 'receptive', 'level': 2, 'level_name': 'Directions', 'level_color': '#3b82f6',
                'exercise_id': 'dir-3', 'type': 'directions',
                'instruction': 'Find: Open the door',
                'target': 'open door',
                'options': [
                    {'id': 1, 'text': 'Closed door', 'image': '🚪', 'correct': False},
                    {'id': 2, 'text': 'Open door', 'image': '🚪➡️', 'correct': True},
                    {'id': 3, 'text': 'Window', 'image': '🪟', 'correct': False},
                    {'id': 4, 'text': 'Lock', 'image': '🔒', 'correct': False}
                ],
                'order': 3, 'is_active': True,
                'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()
            },
            # Level 3: Comprehension
            {
                'mode': 'receptive', 'level': 3, 'level_name': 'Comprehension', 'level_color': '#3b82f6',
                'exercise_id': 'comp-1', 'type': 'comprehension',
                'instruction': 'The cat is sleeping. Where is the cat?',
                'target': 'cat sleeping',
                'options': [
                    {'id': 1, 'text': 'Running', 'image': '🐱💨', 'correct': False},
                    {'id': 2, 'text': 'Eating', 'image': '🐱🍽️', 'correct': False},
                    {'id': 3, 'text': 'Sleeping', 'image': '🐱💤', 'correct': True},
                    {'id': 4, 'text': 'Playing', 'image': '🐱⚽', 'correct': False}
                ],
                'order': 1, 'is_active': True,
                'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()
            },
            {
                'mode': 'receptive', 'level': 3, 'level_name': 'Comprehension', 'level_color': '#3b82f6',
                'exercise_id': 'comp-2', 'type': 'comprehension',
                'instruction': 'The boy is playing with a ball. What is the boy doing?',
                'target': 'boy playing ball',
                'options': [
                    {'id': 1, 'text': 'Reading', 'image': '👦📚', 'correct': False},
                    {'id': 2, 'text': 'Playing ball', 'image': '👦⚽', 'correct': True},
                    {'id': 3, 'text': 'Sleeping', 'image': '👦💤', 'correct': False},
                    {'id': 4, 'text': 'Eating', 'image': '👦🍽️', 'correct': False}
                ],
                'order': 2, 'is_active': True,
                'created_at': datetime.datetime.utcnow(), 'updated_at': datetime.datetime.utcnow()
            }
        ]
        
        result = receptive_exercises_collection.insert_many(default_exercises)
        
        return jsonify({
            'success': True,
            'message': f'Successfully seeded {len(result.inserted_ids)} receptive language exercises',
            'count': len(result.inserted_ids)
        }), 201
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@receptive_bp.route('/api/receptive-exercises', methods=['GET'])
@token_required
def get_all_exercises(current_user):
    """Get all receptive language exercises"""
    try:
        exercises = list(receptive_exercises_collection.find().sort([('level', 1), ('order', 1)]))
        
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


@receptive_bp.route('/api/receptive-exercises', methods=['POST'])
@token_required
@therapist_required
def create_exercise(current_user):
    """Create a new receptive language exercise"""
    try:
        data = request.get_json()
        
        # Required fields (user input only)
        required_fields = ['level', 'type', 'instruction', 'target', 'options', 'correct_answer', 'order']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'message': f'Missing required field: {field}'}), 400
        
        level = int(data['level'])
        exercise_type = data['type']
        order = int(data['order'])
        
        # Validate options (must have 4 options)
        if len(data['options']) != 4:
            return jsonify({'success': False, 'message': 'Must provide exactly 4 options'}), 400
        
        # Validate correct_answer (0-3 index)
        if not (0 <= data['correct_answer'] <= 3):
            return jsonify({'success': False, 'message': 'correct_answer must be between 0 and 3'}), 400
        
        # Auto-generate exercise_id: {type}-{order}
        exercise_id = f"{exercise_type}-{order}"
        
        # Get options_emojis if provided
        options_emojis = data.get('options_emojis', ['', '', '', ''])
        
        # Auto-generate level_name and level_color based on level
        level_metadata = {
            1: {'name': 'Vocabulary', 'color': '#e8b04e'},
            2: {'name': 'Directions', 'color': '#479ac3'},
            3: {'name': 'Comprehension', 'color': '#3b82f6'}
        }
        
        level_name = level_metadata.get(level, {}).get('name', 'Unknown Level')
        level_color = level_metadata.get(level, {}).get('color', '#999999')
        
        # Transform options from array of strings to array of option objects
        # For vocabulary: use 'image' field
        # For directions: use 'shape' field  
        # For comprehension: no icon field
        options = []
        emoji_field = 'image' if exercise_type in ['vocabulary', 'comprehension'] else 'shape'
        
        for i, option_text in enumerate(data['options']):
            option_obj = {
                'id': i + 1,
                'text': option_text,
                'correct': i == data['correct_answer']
            }
            # Add emoji/shape/image field if provided
            if options_emojis[i]:
                option_obj[emoji_field] = options_emojis[i]
            else:
                option_obj[emoji_field] = ''
            
            options.append(option_obj)
        
        exercise = {
            'mode': 'receptive',
            'level': level,
            'level_name': level_name,
            'level_color': level_color,
            'exercise_id': exercise_id,
            'type': exercise_type,
            'instruction': data['instruction'],
            'target': data['target'],
            'options': options,
            'order': order,
            'is_active': data.get('is_active', True),
            'created_at': datetime.datetime.utcnow(),
            'updated_at': datetime.datetime.utcnow()
        }
        
        result = receptive_exercises_collection.insert_one(exercise)
        exercise['_id'] = str(result.inserted_id)
        
        return jsonify({
            'success': True,
            'message': 'Exercise created successfully',
            'exercise': exercise
        }), 201
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@receptive_bp.route('/api/receptive-exercises/<exercise_id>', methods=['PUT'])
@token_required
@therapist_required
def update_exercise(current_user, exercise_id):
    """Update an existing receptive language exercise"""
    try:
        data = request.get_json()
        if '_id' in data:
            del data['_id']
        
        # Regenerate level_name and level_color if level changed
        if 'level' in data:
            level = int(data['level'])
            level_metadata = {
                1: {'name': 'Vocabulary', 'color': '#e8b04e'},
                2: {'name': 'Directions', 'color': '#479ac3'},
                3: {'name': 'Comprehension', 'color': '#3b82f6'}
            }
            data['level_name'] = level_metadata.get(level, {}).get('name', 'Unknown Level')
            data['level_color'] = level_metadata.get(level, {}).get('color', '#999999')
        
        # Regenerate exercise_id if type or order changed
        if 'type' in data or 'order' in data:
            current_exercise = receptive_exercises_collection.find_one({'_id': ObjectId(exercise_id)})
            if not current_exercise:
                return jsonify({'success': False, 'message': 'Exercise not found'}), 404
            
            exercise_type = data.get('type', current_exercise.get('type'))
            order = int(data.get('order', current_exercise.get('order', 1)))
            data['exercise_id'] = f"{exercise_type}-{order}"
        
        # Validate and transform options if present
        if 'options' in data and 'correct_answer' in data:
            if len(data['options']) != 4:
                return jsonify({'success': False, 'message': 'Must provide exactly 4 options'}), 400
            
            # Get current exercise type
            if 'type' not in data:
                current_exercise = receptive_exercises_collection.find_one({'_id': ObjectId(exercise_id)})
                if current_exercise:
                    exercise_type = current_exercise.get('type', 'vocabulary')
                else:
                    exercise_type = 'vocabulary'
            else:
                exercise_type = data['type']
            
            # Get options_emojis if provided
            options_emojis = data.get('options_emojis', ['', '', '', ''])
            
            # Determine emoji field name based on type
            emoji_field = 'image' if exercise_type in ['vocabulary', 'comprehension'] else 'shape'
            
            # Transform options from array of strings to array of option objects
            options = []
            for i, option_text in enumerate(data['options']):
                option_obj = {
                    'id': i + 1,
                    'text': option_text,
                    'correct': i == data['correct_answer']
                }
                # Add emoji/shape/image field if provided
                if options_emojis[i]:
                    option_obj[emoji_field] = options_emojis[i]
                else:
                    option_obj[emoji_field] = ''
                options.append(option_obj)
            
            data['options'] = options
            del data['correct_answer']  # Remove this as it's now embedded in options
            if 'options_emojis' in data:
                del data['options_emojis']  # Remove this as it's now in options
        
        data['updated_at'] = datetime.datetime.utcnow()
        
        result = receptive_exercises_collection.update_one(
            {'_id': ObjectId(exercise_id)},
            {'$set': data}
        )
        
        if result.matched_count == 0:
            return jsonify({'success': False, 'message': 'Exercise not found'}), 404
        
        return jsonify({'success': True, 'message': 'Exercise updated successfully'}), 200
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@receptive_bp.route('/api/receptive-exercises/<exercise_id>', methods=['DELETE'])
@token_required
@therapist_required
def delete_exercise(current_user, exercise_id):
    """Delete a receptive language exercise"""
    try:
        result = receptive_exercises_collection.delete_one({'_id': ObjectId(exercise_id)})
        
        if result.deleted_count == 0:
            return jsonify({'success': False, 'message': 'Exercise not found'}), 404
        
        return jsonify({'success': True, 'message': 'Exercise deleted successfully'}), 200
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@receptive_bp.route('/api/receptive-exercises/<exercise_id>/toggle-active', methods=['PATCH'])
@token_required
@therapist_required
def toggle_active(current_user, exercise_id):
    """Toggle is_active status"""
    try:
        exercise = receptive_exercises_collection.find_one({'_id': ObjectId(exercise_id)})
        if not exercise:
            return jsonify({'success': False, 'message': 'Exercise not found'}), 404
        
        new_status = not exercise.get('is_active', False)
        
        receptive_exercises_collection.update_one(
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
