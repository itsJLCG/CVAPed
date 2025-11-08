"""
Language Therapy CRUD Operations
Separate module for managing language therapy exercises (Receptive & Expressive)
to keep app.py clean and maintainable.
"""

from flask import Blueprint, request, jsonify
from functools import wraps
import jwt
import datetime
from bson import ObjectId

# Create Blueprint
language_bp = Blueprint('language', __name__)

# Global variables for database collection (will be initialized from app.py)
language_exercises_collection = None
JWT_SECRET = None

def init_language_crud(db, jwt_secret):
    """Initialize the language CRUD module with database connection"""
    global language_exercises_collection, JWT_SECRET
    language_exercises_collection = db['language_exercises']
    JWT_SECRET = jwt_secret
    print("✅ Language CRUD module initialized")


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

@language_bp.route('/api/language-exercises/seed', methods=['POST'])
@token_required
@therapist_required
def seed_default_exercises(current_user):
    """Seed database with default language exercises (therapist only)"""
    try:
        # Check if exercises already exist
        existing_count = language_exercises_collection.count_documents({})
        if existing_count > 0:
            return jsonify({
                'success': False,
                'message': f'Database already has {existing_count} exercises. Delete them first if you want to re-seed.'
            }), 400
        
        # Default expressive language exercises
        expressive_exercises = [
            # Level 1: Picture Description (5 exercises)
            {
                'mode': 'expressive',
                'level': 1,
                'level_name': 'Picture Description',
                'level_color': '#8b5cf6',
                'order': 1,
                'exercise_id': 'description-1',
                'type': 'description',
                'instruction': 'Look at the picture and describe what you see.',
                'prompt': '🏠🌳👨‍👩‍👧',
                'expected_keywords': ['house', 'tree', 'family', 'people', 'home'],
                'min_words': 5,
                'is_active': True
            },
            {
                'mode': 'expressive',
                'level': 1,
                'level_name': 'Picture Description',
                'level_color': '#8b5cf6',
                'order': 2,
                'exercise_id': 'description-2',
                'type': 'description',
                'instruction': 'Describe this scene in your own words.',
                'prompt': '☀️🌊🏖️',
                'expected_keywords': ['sun', 'beach', 'water', 'ocean', 'sand'],
                'min_words': 5,
                'is_active': True
            },
            {
                'mode': 'expressive',
                'level': 1,
                'level_name': 'Picture Description',
                'level_color': '#8b5cf6',
                'order': 3,
                'exercise_id': 'description-3',
                'type': 'description',
                'instruction': 'Tell me what you see in this picture.',
                'prompt': '🐶🎾🏃',
                'expected_keywords': ['dog', 'ball', 'running', 'playing', 'pet'],
                'min_words': 5,
                'is_active': True
            },
            {
                'mode': 'expressive',
                'level': 1,
                'level_name': 'Picture Description',
                'level_color': '#8b5cf6',
                'order': 4,
                'exercise_id': 'description-4',
                'type': 'description',
                'instruction': 'Describe what is happening here.',
                'prompt': '🍎🍌🍊',
                'expected_keywords': ['fruit', 'food', 'apple', 'banana', 'orange'],
                'min_words': 5,
                'is_active': True
            },
            {
                'mode': 'expressive',
                'level': 1,
                'level_name': 'Picture Description',
                'level_color': '#8b5cf6',
                'order': 5,
                'exercise_id': 'description-5',
                'type': 'description',
                'instruction': 'What do you see in this picture?',
                'prompt': '🚗🛣️🌆',
                'expected_keywords': ['car', 'road', 'buildings', 'driving', 'street'],
                'min_words': 5,
                'is_active': True
            },
            
            # Level 2: Sentence Formation (5 exercises)
            {
                'mode': 'expressive',
                'level': 2,
                'level_name': 'Sentence Formation',
                'level_color': '#8b5cf6',
                'order': 1,
                'exercise_id': 'sentence-1',
                'type': 'sentence',
                'instruction': 'Use these words to make a sentence: "boy, ball, playing"',
                'prompt': 'Words: boy, ball, playing',
                'expected_keywords': ['boy', 'ball', 'playing'],
                'min_words': 4,
                'is_active': True
            },
            {
                'mode': 'expressive',
                'level': 2,
                'level_name': 'Sentence Formation',
                'level_color': '#8b5cf6',
                'order': 2,
                'exercise_id': 'sentence-2',
                'type': 'sentence',
                'instruction': 'Make a sentence with: "cat, sleeping, couch"',
                'prompt': 'Words: cat, sleeping, couch',
                'expected_keywords': ['cat', 'sleeping', 'couch'],
                'min_words': 4,
                'is_active': True
            },
            {
                'mode': 'expressive',
                'level': 2,
                'level_name': 'Sentence Formation',
                'level_color': '#8b5cf6',
                'order': 3,
                'exercise_id': 'sentence-3',
                'type': 'sentence',
                'instruction': 'Create a sentence using: "girl, book, reading"',
                'prompt': 'Words: girl, book, reading',
                'expected_keywords': ['girl', 'book', 'reading'],
                'min_words': 4,
                'is_active': True
            },
            {
                'mode': 'expressive',
                'level': 2,
                'level_name': 'Sentence Formation',
                'level_color': '#8b5cf6',
                'order': 4,
                'exercise_id': 'sentence-4',
                'type': 'sentence',
                'instruction': 'Form a sentence with: "mom, cooking, kitchen"',
                'prompt': 'Words: mom, cooking, kitchen',
                'expected_keywords': ['mom', 'cooking', 'kitchen'],
                'min_words': 4,
                'is_active': True
            },
            {
                'mode': 'expressive',
                'level': 2,
                'level_name': 'Sentence Formation',
                'level_color': '#8b5cf6',
                'order': 5,
                'exercise_id': 'sentence-5',
                'type': 'sentence',
                'instruction': 'Make a sentence using: "children, park, running"',
                'prompt': 'Words: children, park, running',
                'expected_keywords': ['children', 'park', 'running'],
                'min_words': 4,
                'is_active': True
            },
            
            # Level 3: Story Retell (5 exercises)
            {
                'mode': 'expressive',
                'level': 3,
                'level_name': 'Story Retell',
                'level_color': '#8b5cf6',
                'order': 1,
                'exercise_id': 'retell-1',
                'type': 'retell',
                'instruction': 'Listen to the story and retell it in your own words.',
                'story': 'A little bird wanted to fly. It tried many times but failed. The bird did not give up. Finally, it flew high in the sky.',
                'prompt': 'Story: A little bird wanted to fly...',
                'expected_keywords': ['bird', 'fly', 'tried', 'sky'],
                'min_words': 10,
                'is_active': True
            },
            {
                'mode': 'expressive',
                'level': 3,
                'level_name': 'Story Retell',
                'level_color': '#8b5cf6',
                'order': 2,
                'exercise_id': 'retell-2',
                'type': 'retell',
                'instruction': 'Listen carefully and retell this story.',
                'story': 'Tim found a lost puppy in the park. The puppy was scared and hungry. Tim took the puppy home and gave it food. His family decided to keep the puppy.',
                'prompt': 'Story: Tim found a lost puppy...',
                'expected_keywords': ['puppy', 'park', 'food', 'home', 'family'],
                'min_words': 10,
                'is_active': True
            },
            {
                'mode': 'expressive',
                'level': 3,
                'level_name': 'Story Retell',
                'level_color': '#8b5cf6',
                'order': 3,
                'exercise_id': 'retell-3',
                'type': 'retell',
                'instruction': 'Retell this story in your own words.',
                'story': 'Sarah planted a small seed in her garden. She watered it every day. After many weeks, a beautiful flower grew. Sarah was very happy.',
                'prompt': 'Story: Sarah planted a small seed...',
                'expected_keywords': ['seed', 'garden', 'watered', 'flower', 'grew'],
                'min_words': 10,
                'is_active': True
            },
            {
                'mode': 'expressive',
                'level': 3,
                'level_name': 'Story Retell',
                'level_color': '#8b5cf6',
                'order': 4,
                'exercise_id': 'retell-4',
                'type': 'retell',
                'instruction': 'Listen and retell the story.',
                'story': 'Ben loved to draw. Every day after school, he would draw pictures of animals. His teacher saw his drawings and put them on the wall. Ben felt proud.',
                'prompt': 'Story: Ben loved to draw...',
                'expected_keywords': ['draw', 'animals', 'teacher', 'wall', 'proud'],
                'min_words': 10,
                'is_active': True
            },
            {
                'mode': 'expressive',
                'level': 3,
                'level_name': 'Story Retell',
                'level_color': '#8b5cf6',
                'order': 5,
                'exercise_id': 'retell-5',
                'type': 'retell',
                'instruction': 'Retell this story using your own words.',
                'story': 'The rabbit and the turtle had a race. The rabbit ran very fast and then took a nap. The turtle walked slowly but never stopped. The turtle won the race.',
                'prompt': 'Story: The rabbit and the turtle...',
                'expected_keywords': ['rabbit', 'turtle', 'race', 'slow', 'won'],
                'min_words': 10,
                'is_active': True
            }
        ]
        
        # Add timestamps to all exercises
        for exercise in expressive_exercises:
            exercise['created_at'] = datetime.datetime.utcnow()
            exercise['updated_at'] = datetime.datetime.utcnow()
        
        # Insert all exercises
        result = language_exercises_collection.insert_many(expressive_exercises)
        
        return jsonify({
            'success': True,
            'message': f'Successfully seeded {len(result.inserted_ids)} expressive language exercises',
            'count': len(result.inserted_ids)
        }), 201
        
    except Exception as e:
        import traceback
        print(f"Error seeding exercises: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': 'Failed to seed exercises', 'error': str(e)}), 500


# ============= GET ALL EXERCISES (THERAPIST) =============

@language_bp.route('/api/language-exercises', methods=['GET'])
@token_required
@therapist_required
def get_all_exercises(current_user):
    """Get all language exercises for a specific mode (therapist only - includes inactive)"""
    try:
        mode = request.args.get('mode', 'expressive')  # Default to expressive
        
        exercises = list(language_exercises_collection.find({'mode': mode}).sort([('level', 1), ('order', 1)]))
        
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
            'total': len(exercises),
            'mode': mode
        }), 200
        
    except Exception as e:
        import traceback
        print(f"Error fetching exercises: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': 'Failed to fetch exercises', 'error': str(e)}), 500


# ============= GET ACTIVE EXERCISES (PATIENT) =============

@language_bp.route('/api/language-exercises/active', methods=['GET'])
@token_required
def get_active_exercises(current_user):
    """Get only active language exercises for a specific mode (for patients)"""
    try:
        mode = request.args.get('mode', 'expressive')  # Default to expressive
        
        exercises = list(language_exercises_collection.find({'mode': mode, 'is_active': True}).sort([('level', 1), ('order', 1)]))
        
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
            
            # Build exercise object for frontend
            ex_data = {
                'id': exercise['exercise_id'],
                'type': exercise['type'],
                'instruction': exercise['instruction'],
                'prompt': exercise['prompt'],
                'expectedKeywords': exercise.get('expected_keywords', []),
                'minWords': exercise.get('min_words', 5)
            }
            
            # Add story field if it exists (for retell exercises)
            if 'story' in exercise:
                ex_data['story'] = exercise['story']
            
            exercises_by_level[level]['exercises'].append(ex_data)
        
        return jsonify({
            'success': True,
            'exercises_by_level': exercises_by_level,
            'total': len(exercises),
            'mode': mode
        }), 200
        
    except Exception as e:
        import traceback
        print(f"Error fetching active exercises: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': 'Failed to fetch exercises', 'error': str(e)}), 500


# ============= CREATE EXERCISE (THERAPIST) =============

@language_bp.route('/api/language-exercises', methods=['POST'])
@token_required
@therapist_required
def create_exercise(current_user):
    """Create a new language exercise (therapist only)"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['mode', 'level', 'level_name', 'level_color', 'exercise_id', 'type', 'instruction', 'prompt', 'expected_keywords', 'min_words']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'message': f'Missing required field: {field}'}), 400
        
        # Calculate next order number for this level and mode
        existing_exercises = list(language_exercises_collection.find({'mode': data['mode'], 'level': data['level']}).sort('order', -1).limit(1))
        next_order = existing_exercises[0]['order'] + 1 if existing_exercises else 1
        
        new_exercise = {
            'mode': data['mode'],
            'level': data['level'],
            'level_name': data['level_name'],
            'level_color': data['level_color'],
            'order': next_order,
            'exercise_id': data['exercise_id'],
            'type': data['type'],
            'instruction': data['instruction'],
            'prompt': data['prompt'],
            'expected_keywords': data['expected_keywords'],
            'min_words': data['min_words'],
            'is_active': data.get('is_active', False),  # Default to inactive
            'created_at': datetime.datetime.utcnow(),
            'updated_at': datetime.datetime.utcnow()
        }
        
        # Add optional story field (for retell exercises)
        if 'story' in data:
            new_exercise['story'] = data['story']
        
        result = language_exercises_collection.insert_one(new_exercise)
        new_exercise['_id'] = str(result.inserted_id)
        
        return jsonify({
            'success': True,
            'message': 'Exercise created successfully',
            'exercise': new_exercise
        }), 201
        
    except Exception as e:
        import traceback
        print(f"Error creating exercise: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': 'Failed to create exercise', 'error': str(e)}), 500


# ============= UPDATE EXERCISE (THERAPIST) =============

@language_bp.route('/api/language-exercises/<exercise_id>', methods=['PUT'])
@token_required
@therapist_required
def update_exercise(current_user, exercise_id):
    """Update a language exercise (therapist only)"""
    try:
        data = request.get_json()
        
        # Prepare update data
        update_data = {
            'updated_at': datetime.datetime.utcnow()
        }
        
        allowed_fields = ['level_name', 'level_color', 'type', 'instruction', 'prompt', 'expected_keywords', 'min_words', 'story', 'is_active', 'order']
        for field in allowed_fields:
            if field in data:
                update_data[field] = data[field]
        
        result = language_exercises_collection.update_one(
            {'_id': ObjectId(exercise_id)},
            {'$set': update_data}
        )
        
        if result.matched_count == 0:
            return jsonify({'success': False, 'message': 'Exercise not found'}), 404
        
        return jsonify({
            'success': True,
            'message': 'Exercise updated successfully'
        }), 200
        
    except Exception as e:
        import traceback
        print(f"Error updating exercise: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': 'Failed to update exercise', 'error': str(e)}), 500


# ============= DELETE EXERCISE (THERAPIST) =============

@language_bp.route('/api/language-exercises/<exercise_id>', methods=['DELETE'])
@token_required
@therapist_required
def delete_exercise(current_user, exercise_id):
    """Delete a language exercise (therapist only)"""
    try:
        result = language_exercises_collection.delete_one({'_id': ObjectId(exercise_id)})
        
        if result.deleted_count == 0:
            return jsonify({'success': False, 'message': 'Exercise not found'}), 404
        
        return jsonify({
            'success': True,
            'message': 'Exercise deleted successfully'
        }), 200
        
    except Exception as e:
        import traceback
        print(f"Error deleting exercise: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': 'Failed to delete exercise', 'error': str(e)}), 500


# ============= TOGGLE ACTIVE STATUS (THERAPIST) =============

@language_bp.route('/api/language-exercises/<exercise_id>/toggle-active', methods=['PATCH'])
@token_required
@therapist_required
def toggle_active(current_user, exercise_id):
    """Toggle is_active status of an exercise (therapist only)"""
    try:
        # Get current exercise
        exercise = language_exercises_collection.find_one({'_id': ObjectId(exercise_id)})
        if not exercise:
            return jsonify({'success': False, 'message': 'Exercise not found'}), 404
        
        # Toggle is_active
        new_status = not exercise.get('is_active', False)
        
        result = language_exercises_collection.update_one(
            {'_id': ObjectId(exercise_id)},
            {'$set': {'is_active': new_status, 'updated_at': datetime.datetime.utcnow()}}
        )
        
        return jsonify({
            'success': True,
            'message': f'Exercise {"activated" if new_status else "deactivated"}',
            'is_active': new_status
        }), 200
        
    except Exception as e:
        import traceback
        print(f"Error toggling active status: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': 'Failed to toggle status', 'error': str(e)}), 500
