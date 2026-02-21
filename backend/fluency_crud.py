import logging
logger = logging.getLogger(__name__)
"""
Fluency Exercise CRUD Operations
Separate module for managing fluency therapy exercises in the database
"""

from flask import Blueprint, request, jsonify
from functools import wraps
from bson import ObjectId
import datetime
import jwt
import os

# Create Blueprint
fluency_bp = Blueprint('fluency_crud', __name__)

# Database collections (will be set by app.py)
db = None
users_collection = None
fluency_exercises_collection = None

def init_fluency_crud(database):
    """Initialize database collections"""
    global db, users_collection, fluency_exercises_collection
    db = database
    users_collection = db['users']
    fluency_exercises_collection = db['fluency_exercises']

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
            current_user = users_collection.find_one({'_id': ObjectId(data['user_id'])})
            if not current_user:
                return jsonify({'message': 'User not found!'}), 401
        except Exception as e:
            return jsonify({'message': 'Token is invalid!'}), 401
        
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


# Helper function to generate exercise ID
def generate_exercise_id(level, order):
    """Generate exercise ID based on level and order"""
    level_prefixes = {
        1: 'breath',
        2: 'phrase',
        3: 'sentence',
        4: 'passage',
        5: 'speech'
    }
    prefix = level_prefixes.get(level, f'level{level}')
    return f"{prefix}-{order}"

# Helper function to get available orders for a level
def get_available_orders(level):
    """Get list of available order numbers for a level"""
    existing_exercises = fluency_exercises_collection.find({
        'level': level
    }).sort('order', 1)
    
    used_orders = set(ex['order'] for ex in existing_exercises)
    
    # Return next available order (1-indexed)
    next_order = 1
    while next_order in used_orders:
        next_order += 1
    
    # Return list of available orders (next 10 possible orders)
    available = []
    for i in range(next_order, next_order + 10):
        if i not in used_orders:
            available.append(i)
    
    return available

# Get available orders endpoint
@fluency_bp.route('/api/fluency-exercises/available-orders', methods=['GET'])
@token_required
@therapist_required
def get_available_orders_endpoint(current_user):
    """Get available order numbers for a level"""
    try:
        level = request.args.get('level')
        
        if not level:
            return jsonify({
                'success': False,
                'message': 'Missing level parameter'
            }), 400
        
        level = int(level)
        available_orders = get_available_orders(level)
        
        return jsonify({
            'success': True,
            'available_orders': available_orders
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get available orders'
        }), 500

@fluency_bp.route('/api/fluency-exercises/seed', methods=['POST'])
@token_required
@therapist_required
def seed_default_exercises(current_user):
    """Seed database with default fluency exercises (5 levels)"""
    try:
        # Check if exercises already exist
        existing = fluency_exercises_collection.count_documents({})
        if existing > 0:
            return jsonify({
                'success': False,
                'message': f'Database already has {existing} exercises. Clear them first if you want to reseed.',
                'existing_count': existing
            }), 400
        
        # Default exercises structure
        default_exercises = [
            # Level 1: Breathing & Single Words
            {
                'level': 1,
                'level_name': 'Breathing & Single Words',
                'level_color': '#e8b04e',
                'order': 1,
                'exercise_id': 'breath-1',
                'type': 'controlled-breathing',
                'instruction': 'Take a deep breath, hold for 2 seconds, then use this word in a sentence or phrase',
                'target': 'Hello',
                'expected_duration': 3,
                'breathing': True,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'level': 1,
                'level_name': 'Breathing & Single Words',
                'level_color': '#e8b04e',
                'order': 2,
                'exercise_id': 'breath-2',
                'type': 'controlled-breathing',
                'instruction': 'Breathe in deeply, pause, then use this word in a complete sentence',
                'target': 'Morning',
                'expected_duration': 3,
                'breathing': True,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'level': 1,
                'level_name': 'Breathing & Single Words',
                'level_color': '#e8b04e',
                'order': 3,
                'exercise_id': 'breath-3',
                'type': 'controlled-breathing',
                'instruction': 'Control your breath, then use this word in context',
                'target': 'Welcome',
                'expected_duration': 3,
                'breathing': True,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'level': 1,
                'level_name': 'Breathing & Single Words',
                'level_color': '#e8b04e',
                'order': 4,
                'exercise_id': 'breath-4',
                'type': 'controlled-breathing',
                'instruction': 'Take a breath, relax, and create a sentence with this word',
                'target': 'Sunshine',
                'expected_duration': 3,
                'breathing': True,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'level': 1,
                'level_name': 'Breathing & Single Words',
                'level_color': '#e8b04e',
                'order': 5,
                'exercise_id': 'breath-5',
                'type': 'controlled-breathing',
                'instruction': 'Breathe calmly, then use this word in a longer phrase or sentence',
                'target': 'Beautiful',
                'expected_duration': 4,
                'breathing': True,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            
            # Level 2: Short Phrases
            {
                'level': 2,
                'level_name': 'Short Phrases',
                'level_color': '#479ac3',
                'order': 1,
                'exercise_id': 'phrase-1',
                'type': 'short-phrase',
                'instruction': 'Use this phrase as a starting point - expand it into a longer sentence',
                'target': 'Good morning everyone',
                'expected_duration': 4,
                'breathing': True,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'level': 2,
                'level_name': 'Short Phrases',
                'level_color': '#479ac3',
                'order': 2,
                'exercise_id': 'phrase-2',
                'type': 'short-phrase',
                'instruction': 'Start with this phrase and keep talking naturally',
                'target': 'How are you today',
                'expected_duration': 4,
                'breathing': True,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'level': 2,
                'level_name': 'Short Phrases',
                'level_color': '#479ac3',
                'order': 3,
                'exercise_id': 'phrase-3',
                'type': 'short-phrase',
                'instruction': 'Use this phrase in a complete thought or conversation',
                'target': 'Thank you very much',
                'expected_duration': 4,
                'breathing': True,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'level': 2,
                'level_name': 'Short Phrases',
                'level_color': '#479ac3',
                'order': 4,
                'exercise_id': 'phrase-4',
                'type': 'short-phrase',
                'instruction': 'Begin with this phrase and continue with related ideas',
                'target': 'Have a nice day',
                'expected_duration': 4,
                'breathing': True,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'level': 2,
                'level_name': 'Short Phrases',
                'level_color': '#479ac3',
                'order': 5,
                'exercise_id': 'phrase-5',
                'type': 'short-phrase',
                'instruction': 'Use this phrase as inspiration to speak more',
                'target': 'See you later friend',
                'expected_duration': 4,
                'breathing': True,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            
            # Level 3: Complete Sentences
            {
                'level': 3,
                'level_name': 'Complete Sentences',
                'level_color': '#ce3630',
                'order': 1,
                'exercise_id': 'sentence-1',
                'type': 'sentence',
                'instruction': 'Read this sentence, then add your own thoughts to continue speaking',
                'target': 'The weather is very nice today and I feel happy',
                'expected_duration': 6,
                'breathing': True,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'level': 3,
                'level_name': 'Complete Sentences',
                'level_color': '#ce3630',
                'order': 2,
                'exercise_id': 'sentence-2',
                'type': 'sentence',
                'instruction': 'Say this sentence and continue with related ideas',
                'target': 'I enjoy reading books in the morning with coffee',
                'expected_duration': 6,
                'breathing': True,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'level': 3,
                'level_name': 'Complete Sentences',
                'level_color': '#ce3630',
                'order': 3,
                'exercise_id': 'sentence-3',
                'type': 'sentence',
                'instruction': 'Read this sentence and expand on the topic',
                'target': 'My family and I like to go hiking on weekends',
                'expected_duration': 6,
                'breathing': True,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'level': 3,
                'level_name': 'Complete Sentences',
                'level_color': '#ce3630',
                'order': 4,
                'exercise_id': 'sentence-4',
                'type': 'sentence',
                'instruction': 'Speak this sentence then elaborate naturally',
                'target': 'Learning new things helps me grow and become better',
                'expected_duration': 6,
                'breathing': True,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'level': 3,
                'level_name': 'Complete Sentences',
                'level_color': '#ce3630',
                'order': 5,
                'exercise_id': 'sentence-5',
                'type': 'sentence',
                'instruction': 'Read this sentence and share more about your practice',
                'target': 'I practice speaking every day to improve my fluency',
                'expected_duration': 6,
                'breathing': True,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            
            # Level 4: Reading Passages
            {
                'level': 4,
                'level_name': 'Reading Passages',
                'level_color': '#8e44ad',
                'order': 1,
                'exercise_id': 'passage-1',
                'type': 'passage',
                'instruction': 'Read this passage, then add your own observations or feelings about mornings',
                'target': 'The sun rises early in the morning. Birds start singing their beautiful songs. It is a peaceful time of day.',
                'expected_duration': 10,
                'breathing': True,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'level': 4,
                'level_name': 'Reading Passages',
                'level_color': '#8e44ad',
                'order': 2,
                'exercise_id': 'passage-2',
                'type': 'passage',
                'instruction': 'Read this passage and share your own reading experiences',
                'target': 'Reading helps improve vocabulary and comprehension. Take your time with each word. There is no need to rush.',
                'expected_duration': 10,
                'breathing': True,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'level': 4,
                'level_name': 'Reading Passages',
                'level_color': '#8e44ad',
                'order': 3,
                'exercise_id': 'passage-3',
                'type': 'passage',
                'instruction': 'Read this passage then talk about your practice routine',
                'target': 'Practice makes perfect in everything we do. Daily exercises help build confidence. Remember to breathe and stay calm.',
                'expected_duration': 10,
                'breathing': True,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            
            # Level 5: Spontaneous Speech
            {
                'level': 5,
                'level_name': 'Spontaneous Speech',
                'level_color': '#27ae60',
                'order': 1,
                'exercise_id': 'spontaneous-1',
                'type': 'spontaneous',
                'instruction': 'Answer this question fully - speak for at least 10-15 seconds continuously',
                'target': 'What is your favorite hobby and why do you enjoy it?',
                'expected_duration': 10,
                'breathing': True,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'level': 5,
                'level_name': 'Spontaneous Speech',
                'level_color': '#27ae60',
                'order': 2,
                'exercise_id': 'spontaneous-2',
                'type': 'spontaneous',
                'instruction': 'Describe your routine in detail - keep talking for 10-15 seconds',
                'target': 'Tell me about your daily morning routine',
                'expected_duration': 10,
                'breathing': True,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'level': 5,
                'level_name': 'Spontaneous Speech',
                'level_color': '#27ae60',
                'order': 3,
                'exercise_id': 'spontaneous-3',
                'type': 'spontaneous',
                'instruction': 'Share your thoughts with examples - aim for 10-15 seconds of speech',
                'target': 'What makes you happy and why?',
                'expected_duration': 10,
                'breathing': True,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            }
        ]
        
        # Insert all exercises
        result = fluency_exercises_collection.insert_many(default_exercises)
        
        return jsonify({
            'success': True,
            'message': f'Successfully seeded {len(result.inserted_ids)} fluency exercises',
            'count': len(result.inserted_ids)
        }), 201
        
    except Exception as e:
        import traceback
        logger.error(f"Error seeding exercises: {{e}}", exc_info=True)
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': 'Failed to seed exercises'}), 500


@fluency_bp.route('/api/fluency-exercises', methods=['GET'])
@token_required
def get_all_exercises(current_user):
    """Get all fluency exercises (for therapists - includes inactive)"""
    try:
        exercises = list(fluency_exercises_collection.find({}).sort([('level', 1), ('order', 1)]))
        
        # Convert ObjectId to string
        for exercise in exercises:
            exercise['_id'] = str(exercise['_id'])
            if 'created_at' in exercise:
                exercise['created_at'] = exercise['created_at'].isoformat()
            if 'updated_at' in exercise:
                exercise['updated_at'] = exercise['updated_at'].isoformat()
        
        return jsonify({
            'success': True,
            'exercises': exercises,
            'total': len(exercises)
        }), 200
        
    except Exception as e:
        import traceback
        logger.error(f"Error fetching exercises: {{e}}", exc_info=True)
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': 'Failed to fetch exercises'}), 500


@fluency_bp.route('/api/fluency-exercises/active', methods=['GET'])
@token_required
def get_active_exercises(current_user):
    """Get only active fluency exercises (for patients)"""
    try:
        exercises = list(fluency_exercises_collection.find({'is_active': True}).sort([('level', 1), ('order', 1)]))
        
        # Convert ObjectId to string
        for exercise in exercises:
            exercise['_id'] = str(exercise['_id'])
            if 'created_at' in exercise:
                exercise['created_at'] = exercise['created_at'].isoformat()
            if 'updated_at' in exercise:
                exercise['updated_at'] = exercise['updated_at'].isoformat()
        
        # Group by level
        exercises_by_level = {}
        for exercise in exercises:
            level = exercise['level']
            if level not in exercises_by_level:
                exercises_by_level[level] = {
                    'name': exercise['level_name'],
                    'color': exercise['level_color'],
                    'exercises': []
                }
            exercises_by_level[level]['exercises'].append({
                'id': exercise['exercise_id'],
                'type': exercise['type'],
                'instruction': exercise['instruction'],
                'target': exercise['target'],
                'expectedDuration': exercise['expected_duration'],
                'breathing': exercise.get('breathing', True)
            })
        
        return jsonify({
            'success': True,
            'exercises_by_level': exercises_by_level,
            'total': len(exercises)
        }), 200
        
    except Exception as e:
        import traceback
        logger.error(f"Error fetching active exercises: {{e}}", exc_info=True)
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': 'Failed to fetch exercises'}), 500


@fluency_bp.route('/api/fluency-exercises', methods=['POST'])
@token_required
@therapist_required
def create_exercise(current_user):
    """Create a new fluency exercise (therapist only)"""
    try:
        data = request.get_json()
        
        # Validate required fields (exercise_id is now auto-generated)
        required_fields = ['level', 'level_name', 'level_color', 'type', 'instruction', 'target', 'expected_duration', 'order']
        for field in required_fields:
            if field not in data:
                return jsonify({'message': f'{field} is required'}), 400
        
        level = int(data['level'])
        order = int(data['order'])
        
        # Check if order is already taken for this level
        existing = fluency_exercises_collection.find_one({
            'level': level,
            'order': order
        })
        if existing:
            return jsonify({
                'success': False,
                'message': f'Order {order} is already taken for Level {level}. Please choose a different order.'
            }), 400
        
        # Auto-generate exercise_id
        exercise_id = generate_exercise_id(level, order)
        
        new_exercise = {
            'level': level,
            'level_name': data['level_name'],
            'level_color': data['level_color'],
            'order': order,
            'exercise_id': exercise_id,
            'type': data['type'],
            'instruction': data['instruction'],
            'target': data['target'],
            'expected_duration': int(data['expected_duration']),
            'breathing': data.get('breathing', True),
            'is_active': data.get('is_active', False),  # Default to inactive
            'created_at': datetime.datetime.utcnow(),
            'updated_at': datetime.datetime.utcnow()
        }
        
        result = fluency_exercises_collection.insert_one(new_exercise)
        new_exercise['_id'] = str(result.inserted_id)
        
        return jsonify({
            'success': True,
            'message': 'Exercise created successfully',
            'exercise': new_exercise
        }), 201
        
    except Exception as e:
        import traceback
        logger.error(f"Error creating exercise: {{e}}", exc_info=True)
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': 'Failed to create exercise'}), 500


@fluency_bp.route('/api/fluency-exercises/<exercise_id>', methods=['PUT'])
@token_required
@therapist_required
def update_exercise(current_user, exercise_id):
    """Update a fluency exercise (therapist only)"""
    try:
        data = request.get_json()
        
        # Prepare update data
        update_data = {
            'updated_at': datetime.datetime.utcnow()
        }
        
        # Only allow editing specific fields (not exercise_id, level, order)
        # This maintains data integrity
        allowed_fields = ['type', 'instruction', 'target', 'expected_duration', 'breathing', 'is_active']
        for field in allowed_fields:
            if field in data:
                if field == 'expected_duration':
                    update_data[field] = int(data[field])
                else:
                    update_data[field] = data[field]
        
        result = fluency_exercises_collection.update_one(
            {'_id': ObjectId(exercise_id)},
            {'$set': update_data}
        )
        
        if result.matched_count == 0:
            return jsonify({'message': 'Exercise not found'}), 404
        
        return jsonify({
            'success': True,
            'message': 'Exercise updated successfully'
        }), 200
        
    except Exception as e:
        import traceback
        logger.error(f"Error updating exercise: {{e}}", exc_info=True)
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': 'Failed to update exercise'}), 500


@fluency_bp.route('/api/fluency-exercises/<exercise_id>', methods=['DELETE'])
@token_required
@therapist_required
def delete_exercise(current_user, exercise_id):
    """Delete a fluency exercise (therapist only)"""
    try:
        result = fluency_exercises_collection.delete_one({'_id': ObjectId(exercise_id)})
        
        if result.deleted_count == 0:
            return jsonify({'message': 'Exercise not found'}), 404
        
        return jsonify({
            'success': True,
            'message': 'Exercise deleted successfully'
        }), 200
        
    except Exception as e:
        import traceback
        logger.error(f"Error deleting exercise: {{e}}", exc_info=True)
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': 'Failed to delete exercise'}), 500


@fluency_bp.route('/api/fluency-exercises/<exercise_id>/toggle-active', methods=['PATCH'])
@token_required
@therapist_required
def toggle_active(current_user, exercise_id):
    """Toggle is_active status of an exercise (therapist only)"""
    try:
        exercise = fluency_exercises_collection.find_one({'_id': ObjectId(exercise_id)})
        
        if not exercise:
            return jsonify({'message': 'Exercise not found'}), 404
        
        new_status = not exercise.get('is_active', False)
        
        fluency_exercises_collection.update_one(
            {'_id': ObjectId(exercise_id)},
            {
                '$set': {
                    'is_active': new_status,
                    'updated_at': datetime.datetime.utcnow()
                }
            }
        )
        
        return jsonify({
            'success': True,
            'message': f'Exercise {"activated" if new_status else "deactivated"} successfully',
            'is_active': new_status
        }), 200
        
    except Exception as e:
        import traceback
        logger.error(f"Error toggling exercise: {{e}}", exc_info=True)
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': 'Failed to toggle exercise'}), 500
