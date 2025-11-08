"""
Receptive Language Therapy CRUD Operations
Separate module for managing receptive language exercises (Vocabulary, Directions, Comprehension)
to keep app.py clean and maintainable.
"""

from flask import Blueprint, request, jsonify
from functools import wraps
import jwt
import datetime
from bson import ObjectId

# Create Blueprint
receptive_bp = Blueprint('receptive', __name__)

# Global variables for database collection (will be initialized from app.py)
receptive_exercises_collection = None
JWT_SECRET = None

def init_receptive_crud(db, jwt_secret):
    """Initialize the receptive CRUD module with database connection"""
    global receptive_exercises_collection, JWT_SECRET
    receptive_exercises_collection = db['receptive_exercises']
    JWT_SECRET = jwt_secret
    print("✅ Receptive CRUD module initialized")


# ============= DECORATORS =============

def token_required(f):
    """Decorator to verify JWT token"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({'success': False, 'message': 'Token is missing'}), 401
        
        try:
            if token.startswith('Bearer '):
                token = token[7:]
            data = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            current_user = data
        except jwt.ExpiredSignatureError:
            return jsonify({'success': False, 'message': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'success': False, 'message': 'Invalid token'}), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated


def therapist_required(f):
    """Decorator to verify user is a therapist"""
    @wraps(f)
    def decorated(current_user, *args, **kwargs):
        if current_user.get('role') != 'therapist':
            return jsonify({'success': False, 'message': 'Therapist access required'}), 403
        return f(current_user, *args, **kwargs)
    return decorated


# ============= SEED DEFAULT EXERCISES =============

@receptive_bp.route('/api/receptive-exercises/seed', methods=['POST'])
@token_required
@therapist_required
def seed_default_exercises(current_user):
    """Seed database with default receptive exercises (therapist only)"""
    try:
        # Check if exercises already exist
        existing_count = receptive_exercises_collection.count_documents({})
        if existing_count > 0:
            return jsonify({
                'success': False,
                'message': f'Database already has {existing_count} exercises. Delete them first if you want to re-seed.'
            }), 400
        
        # Default receptive language exercises
        receptive_exercises = [
            # Level 1: Vocabulary Matching (5 items)
            {
                'exercise_id': 'vocab-1',
                'type': 'vocabulary',
                'level': 1,
                'instruction': 'Listen to the word and select the correct picture.',
                'target': 'apple',
                'options': [
                    {'id': 1, 'text': 'Apple', 'image': '🍎', 'correct': True},
                    {'id': 2, 'text': 'Banana', 'image': '🍌', 'correct': False},
                    {'id': 3, 'text': 'Orange', 'image': '🍊', 'correct': False},
                    {'id': 4, 'text': 'Grape', 'image': '🍇', 'correct': False}
                ],
                'order': 1,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'exercise_id': 'vocab-2',
                'type': 'vocabulary',
                'level': 1,
                'instruction': 'Listen to the word and select the correct picture.',
                'target': 'dog',
                'options': [
                    {'id': 1, 'text': 'Cat', 'image': '🐱', 'correct': False},
                    {'id': 2, 'text': 'Dog', 'image': '🐶', 'correct': True},
                    {'id': 3, 'text': 'Bird', 'image': '🐦', 'correct': False},
                    {'id': 4, 'text': 'Fish', 'image': '🐟', 'correct': False}
                ],
                'order': 2,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'exercise_id': 'vocab-3',
                'type': 'vocabulary',
                'level': 1,
                'instruction': 'Listen to the word and select the correct picture.',
                'target': 'car',
                'options': [
                    {'id': 1, 'text': 'Bus', 'image': '🚌', 'correct': False},
                    {'id': 2, 'text': 'Bicycle', 'image': '🚲', 'correct': False},
                    {'id': 3, 'text': 'Car', 'image': '🚗', 'correct': True},
                    {'id': 4, 'text': 'Train', 'image': '🚂', 'correct': False}
                ],
                'order': 3,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'exercise_id': 'vocab-4',
                'type': 'vocabulary',
                'level': 1,
                'instruction': 'Listen to the word and select the correct picture.',
                'target': 'book',
                'options': [
                    {'id': 1, 'text': 'Book', 'image': '📖', 'correct': True},
                    {'id': 2, 'text': 'Pencil', 'image': '✏️', 'correct': False},
                    {'id': 3, 'text': 'Paper', 'image': '📄', 'correct': False},
                    {'id': 4, 'text': 'Bag', 'image': '🎒', 'correct': False}
                ],
                'order': 4,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'exercise_id': 'vocab-5',
                'type': 'vocabulary',
                'level': 1,
                'instruction': 'Listen to the word and select the correct picture.',
                'target': 'sun',
                'options': [
                    {'id': 1, 'text': 'Moon', 'image': '🌙', 'correct': False},
                    {'id': 2, 'text': 'Star', 'image': '⭐', 'correct': False},
                    {'id': 3, 'text': 'Sun', 'image': '☀️', 'correct': True},
                    {'id': 4, 'text': 'Cloud', 'image': '☁️', 'correct': False}
                ],
                'order': 5,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            
            # Level 2: Following Directions (5 items)
            {
                'exercise_id': 'directions-1',
                'type': 'directions',
                'level': 2,
                'instruction': 'Follow the direction: "Point to the blue circle."',
                'target': 'blue circle',
                'options': [
                    {'id': 1, 'text': 'Red Square', 'shape': '🟥', 'correct': False},
                    {'id': 2, 'text': 'Blue Circle', 'shape': '🔵', 'correct': True},
                    {'id': 3, 'text': 'Green Triangle', 'shape': '🟩', 'correct': False},
                    {'id': 4, 'text': 'Yellow Star', 'shape': '⭐', 'correct': False}
                ],
                'order': 1,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'exercise_id': 'directions-2',
                'type': 'directions',
                'level': 2,
                'instruction': 'Follow the direction: "Point to the red square."',
                'target': 'red square',
                'options': [
                    {'id': 1, 'text': 'Red Square', 'shape': '🟥', 'correct': True},
                    {'id': 2, 'text': 'Blue Circle', 'shape': '🔵', 'correct': False},
                    {'id': 3, 'text': 'Green Diamond', 'shape': '🔶', 'correct': False},
                    {'id': 4, 'text': 'Purple Heart', 'shape': '💜', 'correct': False}
                ],
                'order': 2,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'exercise_id': 'directions-3',
                'type': 'directions',
                'level': 2,
                'instruction': 'Follow the direction: "Point to the yellow star."',
                'target': 'yellow star',
                'options': [
                    {'id': 1, 'text': 'Blue Circle', 'shape': '🔵', 'correct': False},
                    {'id': 2, 'text': 'Yellow Star', 'shape': '⭐', 'correct': True},
                    {'id': 3, 'text': 'Red Heart', 'shape': '❤️', 'correct': False},
                    {'id': 4, 'text': 'Green Square', 'shape': '🟩', 'correct': False}
                ],
                'order': 3,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'exercise_id': 'directions-4',
                'type': 'directions',
                'level': 2,
                'instruction': 'Follow the direction: "Point to the green square."',
                'target': 'green square',
                'options': [
                    {'id': 1, 'text': 'Red Square', 'shape': '🟥', 'correct': False},
                    {'id': 2, 'text': 'Yellow Circle', 'shape': '🟡', 'correct': False},
                    {'id': 3, 'text': 'Green Square', 'shape': '🟩', 'correct': True},
                    {'id': 4, 'text': 'Blue Star', 'shape': '💙', 'correct': False}
                ],
                'order': 4,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'exercise_id': 'directions-5',
                'type': 'directions',
                'level': 2,
                'instruction': 'Follow the direction: "Point to the purple heart."',
                'target': 'purple heart',
                'options': [
                    {'id': 1, 'text': 'Red Heart', 'shape': '❤️', 'correct': False},
                    {'id': 2, 'text': 'Purple Heart', 'shape': '💜', 'correct': True},
                    {'id': 3, 'text': 'Yellow Star', 'shape': '⭐', 'correct': False},
                    {'id': 4, 'text': 'Blue Circle', 'shape': '🔵', 'correct': False}
                ],
                'order': 5,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            
            # Level 3: Sentence Comprehension (5 items)
            {
                'exercise_id': 'comprehension-1',
                'type': 'comprehension',
                'level': 3,
                'instruction': 'Listen: "The cat is sleeping under the table." What is the cat doing?',
                'target': 'sleeping',
                'options': [
                    {'id': 1, 'text': 'Eating', 'correct': False},
                    {'id': 2, 'text': 'Sleeping', 'correct': True},
                    {'id': 3, 'text': 'Running', 'correct': False},
                    {'id': 4, 'text': 'Playing', 'correct': False}
                ],
                'order': 1,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'exercise_id': 'comprehension-2',
                'type': 'comprehension',
                'level': 3,
                'instruction': 'Listen: "The boy is playing with a red ball." What color is the ball?',
                'target': 'red',
                'options': [
                    {'id': 1, 'text': 'Blue', 'correct': False},
                    {'id': 2, 'text': 'Red', 'correct': True},
                    {'id': 3, 'text': 'Green', 'correct': False},
                    {'id': 4, 'text': 'Yellow', 'correct': False}
                ],
                'order': 2,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'exercise_id': 'comprehension-3',
                'type': 'comprehension',
                'level': 3,
                'instruction': 'Listen: "Mom is cooking dinner in the kitchen." Where is Mom?',
                'target': 'kitchen',
                'options': [
                    {'id': 1, 'text': 'Bedroom', 'correct': False},
                    {'id': 2, 'text': 'Kitchen', 'correct': True},
                    {'id': 3, 'text': 'Garden', 'correct': False},
                    {'id': 4, 'text': 'Bathroom', 'correct': False}
                ],
                'order': 3,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'exercise_id': 'comprehension-4',
                'type': 'comprehension',
                'level': 3,
                'instruction': 'Listen: "The bird is flying high in the sky." Where is the bird?',
                'target': 'sky',
                'options': [
                    {'id': 1, 'text': 'Tree', 'correct': False},
                    {'id': 2, 'text': 'Sky', 'correct': True},
                    {'id': 3, 'text': 'Ground', 'correct': False},
                    {'id': 4, 'text': 'Water', 'correct': False}
                ],
                'order': 4,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            },
            {
                'exercise_id': 'comprehension-5',
                'type': 'comprehension',
                'level': 3,
                'instruction': 'Listen: "Dad is reading a book to the children." What is Dad doing?',
                'target': 'reading',
                'options': [
                    {'id': 1, 'text': 'Reading', 'correct': True},
                    {'id': 2, 'text': 'Writing', 'correct': False},
                    {'id': 3, 'text': 'Singing', 'correct': False},
                    {'id': 4, 'text': 'Dancing', 'correct': False}
                ],
                'order': 5,
                'is_active': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            }
        ]
        
        # Insert all exercises
        result = receptive_exercises_collection.insert_many(receptive_exercises)
        
        return jsonify({
            'success': True,
            'message': f'Successfully seeded {len(result.inserted_ids)} receptive exercises',
            'count': len(result.inserted_ids)
        }), 201
        
    except Exception as e:
        print(f"Error seeding receptive exercises: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to seed exercises',
            'error': str(e)
        }), 500


# ============= GET EXERCISES (Therapist - All exercises) =============

@receptive_bp.route('/api/receptive-exercises', methods=['GET'])
@token_required
@therapist_required
def get_all_exercises(current_user):
    """Get all receptive exercises (therapist only - includes inactive)"""
    try:
        # Get all exercises sorted by level and order
        exercises = list(receptive_exercises_collection.find().sort([('level', 1), ('order', 1)]))
        
        # Convert ObjectId to string and format dates
        for exercise in exercises:
            exercise['_id'] = str(exercise['_id'])
            if 'created_at' in exercise:
                exercise['created_at'] = exercise['created_at'].isoformat() if hasattr(exercise['created_at'], 'isoformat') else str(exercise['created_at'])
            if 'updated_at' in exercise:
                exercise['updated_at'] = exercise['updated_at'].isoformat() if hasattr(exercise['updated_at'], 'isoformat') else str(exercise['updated_at'])
        
        return jsonify({
            'success': True,
            'exercises': exercises,
            'total': len(exercises)
        }), 200
        
    except Exception as e:
        print(f"Error fetching receptive exercises: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to fetch exercises',
            'error': str(e)
        }), 500


# ============= GET ACTIVE EXERCISES (Patient - Only active exercises) =============

@receptive_bp.route('/api/receptive-exercises/active', methods=['GET'])
@token_required
def get_active_exercises(current_user):
    """Get only active receptive exercises grouped by level (for patients)"""
    try:
        # Get only active exercises sorted by level and order
        exercises = list(receptive_exercises_collection.find({'is_active': True}).sort([('level', 1), ('order', 1)]))
        
        # Group by level
        exercises_by_level = {}
        for exercise in exercises:
            level = exercise['level']
            if level not in exercises_by_level:
                # Determine level name
                if level == 1:
                    level_name = 'Vocabulary'
                elif level == 2:
                    level_name = 'Directions'
                elif level == 3:
                    level_name = 'Comprehension'
                else:
                    level_name = f'Level {level}'
                
                exercises_by_level[level] = {
                    'level': level,
                    'name': level_name,
                    'exercises': []
                }
            
            # Convert ObjectId to string
            exercise['_id'] = str(exercise['_id'])
            exercises_by_level[level]['exercises'].append(exercise)
        
        return jsonify({
            'success': True,
            'exercises_by_level': exercises_by_level
        }), 200
        
    except Exception as e:
        print(f"Error fetching active receptive exercises: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to fetch active exercises',
            'error': str(e)
        }), 500


# ============= CREATE EXERCISE =============

@receptive_bp.route('/api/receptive-exercises', methods=['POST'])
@token_required
@therapist_required
def create_exercise(current_user):
    """Create a new receptive exercise (therapist only)"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['exercise_id', 'type', 'level', 'instruction', 'target', 'options']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'message': f'Missing required field: {field}'
                }), 400
        
        # Check if exercise_id already exists
        existing = receptive_exercises_collection.find_one({'exercise_id': data['exercise_id']})
        if existing:
            return jsonify({
                'success': False,
                'message': f'Exercise with ID {data["exercise_id"]} already exists'
            }), 400
        
        # Auto-calculate order (next available for this level)
        max_order_doc = receptive_exercises_collection.find_one(
            {'level': data['level']},
            sort=[('order', -1)]
        )
        next_order = (max_order_doc['order'] + 1) if max_order_doc else 1
        
        # Create new exercise
        new_exercise = {
            'exercise_id': data['exercise_id'],
            'type': data['type'],
            'level': data['level'],
            'instruction': data['instruction'],
            'target': data['target'],
            'options': data['options'],
            'order': next_order,
            'is_active': data.get('is_active', False),  # Default to inactive
            'created_at': datetime.datetime.utcnow(),
            'updated_at': datetime.datetime.utcnow()
        }
        
        result = receptive_exercises_collection.insert_one(new_exercise)
        new_exercise['_id'] = str(result.inserted_id)
        
        return jsonify({
            'success': True,
            'message': 'Exercise created successfully',
            'exercise': new_exercise
        }), 201
        
    except Exception as e:
        print(f"Error creating receptive exercise: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to create exercise',
            'error': str(e)
        }), 500


# ============= UPDATE EXERCISE =============

@receptive_bp.route('/api/receptive-exercises/<exercise_id>', methods=['PUT'])
@token_required
@therapist_required
def update_exercise(current_user, exercise_id):
    """Update an existing receptive exercise (therapist only)"""
    try:
        data = request.get_json()
        
        # Find exercise by _id or exercise_id
        exercise = None
        if ObjectId.is_valid(exercise_id):
            exercise = receptive_exercises_collection.find_one({'_id': ObjectId(exercise_id)})
        if not exercise:
            exercise = receptive_exercises_collection.find_one({'exercise_id': exercise_id})
        
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
        allowed_fields = ['type', 'level', 'instruction', 'target', 'options', 'order', 'is_active']
        for field in allowed_fields:
            if field in data:
                update_data[field] = data[field]
        
        # Perform update
        receptive_exercises_collection.update_one(
            {'_id': exercise['_id']},
            {'$set': update_data}
        )
        
        # Get updated exercise
        updated_exercise = receptive_exercises_collection.find_one({'_id': exercise['_id']})
        updated_exercise['_id'] = str(updated_exercise['_id'])
        
        return jsonify({
            'success': True,
            'message': 'Exercise updated successfully',
            'exercise': updated_exercise
        }), 200
        
    except Exception as e:
        print(f"Error updating receptive exercise: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to update exercise',
            'error': str(e)
        }), 500


# ============= DELETE EXERCISE =============

@receptive_bp.route('/api/receptive-exercises/<exercise_id>', methods=['DELETE'])
@token_required
@therapist_required
def delete_exercise(current_user, exercise_id):
    """Delete a receptive exercise (therapist only)"""
    try:
        # Find exercise by _id or exercise_id
        exercise = None
        if ObjectId.is_valid(exercise_id):
            exercise = receptive_exercises_collection.find_one({'_id': ObjectId(exercise_id)})
        if not exercise:
            exercise = receptive_exercises_collection.find_one({'exercise_id': exercise_id})
        
        if not exercise:
            return jsonify({
                'success': False,
                'message': 'Exercise not found'
            }), 404
        
        # Delete the exercise
        receptive_exercises_collection.delete_one({'_id': exercise['_id']})
        
        return jsonify({
            'success': True,
            'message': 'Exercise deleted successfully'
        }), 200
        
    except Exception as e:
        print(f"Error deleting receptive exercise: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to delete exercise',
            'error': str(e)
        }), 500


# ============= TOGGLE IS_ACTIVE =============

@receptive_bp.route('/api/receptive-exercises/<exercise_id>/toggle-active', methods=['PATCH'])
@token_required
@therapist_required
def toggle_active(current_user, exercise_id):
    """Toggle is_active status of a receptive exercise (therapist only)"""
    try:
        # Find exercise by _id or exercise_id
        exercise = None
        if ObjectId.is_valid(exercise_id):
            exercise = receptive_exercises_collection.find_one({'_id': ObjectId(exercise_id)})
        if not exercise:
            exercise = receptive_exercises_collection.find_one({'exercise_id': exercise_id})
        
        if not exercise:
            return jsonify({
                'success': False,
                'message': 'Exercise not found'
            }), 404
        
        # Toggle is_active
        new_status = not exercise.get('is_active', False)
        receptive_exercises_collection.update_one(
            {'_id': exercise['_id']},
            {'$set': {
                'is_active': new_status,
                'updated_at': datetime.datetime.utcnow()
            }}
        )
        
        return jsonify({
            'success': True,
            'message': f'Exercise {"activated" if new_status else "deactivated"} successfully',
            'is_active': new_status
        }), 200
        
    except Exception as e:
        print(f"Error toggling receptive exercise status: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to toggle exercise status',
            'error': str(e)
        }), 500


# ============= DELETE ALL EXERCISES =============

@receptive_bp.route('/api/receptive-exercises/delete-all', methods=['DELETE'])
@token_required
@therapist_required
def delete_all_exercises(current_user):
    """Delete all receptive exercises (therapist only) - useful for re-seeding"""
    try:
        result = receptive_exercises_collection.delete_many({})
        
        return jsonify({
            'success': True,
            'message': f'Successfully deleted {result.deleted_count} exercises'
        }), 200
        
    except Exception as e:
        print(f"Error deleting all receptive exercises: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to delete exercises',
            'error': str(e)
        }), 500
