import logging
logger = logging.getLogger(__name__)
"""
Physical Therapy CRUD Operations
Manages Detection Problems and Exercise Recommendations collections.
"""

from flask import Blueprint, request, jsonify
from functools import wraps
from bson import ObjectId
import datetime
import jwt

physical_therapy_bp = Blueprint('physical_therapy_crud', __name__)

db = None
users_collection = None
detection_problems_collection = None
exercise_recommendations_collection = None
SECRET_KEY = None


def init_physical_therapy_crud(database, secret_key):
    """Initialize database collections"""
    global db, users_collection, detection_problems_collection, exercise_recommendations_collection, SECRET_KEY
    if not secret_key:
        raise RuntimeError('SECRET_KEY is required to initialize physical therapy CRUD')
    db = database
    users_collection = db['users']
    detection_problems_collection = db['detection_problems']
    exercise_recommendations_collection = db['exercise_recommendations']
    SECRET_KEY = secret_key


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        try:
            if token.startswith('Bearer '):
                token = token[7:]
            data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            current_user = users_collection.find_one({'_id': ObjectId(data['user_id'])})
            if not current_user:
                return jsonify({'message': 'User not found!'}), 401
        except Exception:
            return jsonify({'message': 'Token is invalid!'}), 401
        return f(current_user, *args, **kwargs)
    return decorated


def therapist_required(f):
    @wraps(f)
    def decorated(current_user, *args, **kwargs):
        if current_user.get('role') not in ['therapist', 'admin']:
            return jsonify({'message': 'Unauthorized. Therapist access required.'}), 403
        return f(current_user, *args, **kwargs)
    return decorated


def _serialize(doc):
    """Convert MongoDB doc to JSON-safe dict."""
    doc['_id'] = str(doc['_id'])
    if 'created_at' in doc:
        doc['created_at'] = doc['created_at'].isoformat()
    if 'updated_at' in doc:
        doc['updated_at'] = doc['updated_at'].isoformat()
    return doc


def _next_id(collection, prefix):
    """Generate next sequential ID like dp-001, er-001."""
    count = collection.count_documents({})
    return f"{prefix}-{str(count + 1).zfill(3)}"


# ─────────────────────────────────────────────────────────
#  DETECTION PROBLEMS
# ─────────────────────────────────────────────────────────

@physical_therapy_bp.route('/api/physical/detection-problems', methods=['GET'])
@token_required
def get_detection_problems(current_user):
    """Get all detection problems. Patients receive active-only."""
    try:
        query = {}
        if current_user.get('role') == 'patient':
            query['is_active'] = True
        problems = list(detection_problems_collection.find(query).sort('created_at', 1))
        problems = [_serialize(p) for p in problems]
        return jsonify({'success': True, 'problems': problems, 'total': len(problems)}), 200
    except Exception as e:
        logger.error(f'get_detection_problems failed: {e}')
        return jsonify({'error': 'Internal server error'}), 500


@physical_therapy_bp.route('/api/physical/detection-problems', methods=['POST'])
@token_required
@therapist_required
def create_detection_problem(current_user):
    """Create a new detection problem (therapist only)."""
    try:
        data = request.get_json()
        required = ['name', 'category', 'description', 'severity_level']
        for field in required:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400

        problem_id = _next_id(detection_problems_collection, 'dp')
        now = datetime.datetime.utcnow()
        doc = {
            'problem_id': problem_id,
            'name': data['name'],
            'category': data['category'],
            'description': data['description'],
            'severity_level': data['severity_level'],
            'indicators': data.get('indicators', []),
            'affected_area': data.get('affected_area', ''),
            'normal_range': data.get('normal_range', ''),
            'is_active': data.get('is_active', True),
            'created_at': now,
            'updated_at': now,
        }
        result = detection_problems_collection.insert_one(doc)
        doc['_id'] = str(result.inserted_id)
        doc['created_at'] = now.isoformat()
        doc['updated_at'] = now.isoformat()
        return jsonify({'success': True, 'message': 'Detection problem created successfully', 'problem': doc}), 201
    except Exception as e:
        logger.error(f'create_detection_problem failed: {e}')
        return jsonify({'error': 'Internal server error'}), 500


@physical_therapy_bp.route('/api/physical/detection-problems/<problem_id>', methods=['PUT'])
@token_required
@therapist_required
def update_detection_problem(current_user, problem_id):
    """Update a detection problem (therapist only)."""
    try:
        data = request.get_json()
        allowed = ['name', 'category', 'description', 'severity_level', 'indicators', 'affected_area', 'normal_range', 'is_active']
        update_data = {k: data[k] for k in allowed if k in data}
        update_data['updated_at'] = datetime.datetime.utcnow()

        result = detection_problems_collection.update_one(
            {'problem_id': problem_id},
            {'$set': update_data}
        )
        if result.matched_count == 0:
            return jsonify({'error': 'Detection problem not found'}), 404
        return jsonify({'success': True, 'message': 'Detection problem updated successfully'}), 200
    except Exception as e:
        logger.error(f'update_detection_problem failed: {e}')
        return jsonify({'error': 'Internal server error'}), 500


@physical_therapy_bp.route('/api/physical/detection-problems/<problem_id>', methods=['DELETE'])
@token_required
@therapist_required
def delete_detection_problem(current_user, problem_id):
    """Delete a detection problem (therapist only)."""
    try:
        result = detection_problems_collection.delete_one({'problem_id': problem_id})
        if result.deleted_count == 0:
            return jsonify({'error': 'Detection problem not found'}), 404
        return jsonify({'success': True, 'message': 'Detection problem deleted successfully'}), 200
    except Exception as e:
        logger.error(f'delete_detection_problem failed: {e}')
        return jsonify({'error': 'Internal server error'}), 500


@physical_therapy_bp.route('/api/physical/detection-problems/<problem_id>/toggle', methods=['PATCH'])
@token_required
@therapist_required
def toggle_detection_problem(current_user, problem_id):
    """Toggle active status of a detection problem (therapist only)."""
    try:
        problem = detection_problems_collection.find_one({'problem_id': problem_id})
        if not problem:
            return jsonify({'error': 'Detection problem not found'}), 404
        new_status = not problem.get('is_active', True)
        detection_problems_collection.update_one(
            {'problem_id': problem_id},
            {'$set': {'is_active': new_status, 'updated_at': datetime.datetime.utcnow()}}
        )
        return jsonify({'success': True, 'message': f'Problem {"activated" if new_status else "deactivated"} successfully', 'is_active': new_status}), 200
    except Exception as e:
        logger.error(f'toggle_detection_problem failed: {e}')
        return jsonify({'error': 'Internal server error'}), 500


@physical_therapy_bp.route('/api/physical/detection-problems/seed', methods=['POST'])
@token_required
@therapist_required
def seed_detection_problems(current_user):
    """Seed default detection problems (therapist only)."""
    try:
        existing = detection_problems_collection.count_documents({})
        if existing > 0:
            return jsonify({'success': False, 'message': f'Database already has {existing} problems. Clear them first.'}), 400

        now = datetime.datetime.utcnow()
        defaults = [
            {
                'problem_id': 'dp-001',
                'name': 'Reduced Gait Speed',
                'category': 'Gait Pattern',
                'description': 'Walking speed significantly below age-matched normative values, indicating compromised locomotor function.',
                'severity_level': 'moderate',
                'indicators': ['Cadence below 90 steps/min', 'Step length shortened', 'Prolonged double support phase'],
                'affected_area': 'Lower Extremity',
                'normal_range': '1.2 – 1.4 m/s (adults)',
                'is_active': True,
                'created_at': now,
                'updated_at': now,
            },
            {
                'problem_id': 'dp-002',
                'name': 'Balance Impairment',
                'category': 'Balance',
                'description': 'Decreased postural stability during static and dynamic balance tasks, increasing fall risk.',
                'severity_level': 'severe',
                'indicators': ['Sway during single-leg stance', 'Berg Balance Scale < 45', 'Unsteady tandem gait'],
                'affected_area': 'Core & Lower Extremity',
                'normal_range': 'Berg Balance Scale ≥ 45',
                'is_active': True,
                'created_at': now,
                'updated_at': now,
            },
            {
                'problem_id': 'dp-003',
                'name': 'Gait Asymmetry',
                'category': 'Gait Pattern',
                'description': 'Notable difference in step length or timing between affected and unaffected limbs.',
                'severity_level': 'moderate',
                'indicators': ['Step length ratio > 1.15', 'Stance time difference > 10%', 'Swing phase asymmetry'],
                'affected_area': 'Lower Extremity',
                'normal_range': 'Symmetry index < 5%',
                'is_active': True,
                'created_at': now,
                'updated_at': now,
            },
            {
                'problem_id': 'dp-004',
                'name': 'Muscle Weakness',
                'category': 'Strength',
                'description': 'Reduced strength in lower extremity muscle groups affecting ambulation and daily activities.',
                'severity_level': 'mild',
                'indicators': ['MRC Grade < 4', 'Reduced push-off power', 'Difficulty on stairs'],
                'affected_area': 'Lower Extremity',
                'normal_range': 'MRC Grade 5',
                'is_active': True,
                'created_at': now,
                'updated_at': now,
            },
            {
                'problem_id': 'dp-005',
                'name': 'Coordination Deficit',
                'category': 'Coordination',
                'description': 'Impaired motor coordination resulting in irregular limb movements during gait.',
                'severity_level': 'moderate',
                'indicators': ['Foot clearance inconsistency', 'Irregular cadence', 'Ataxic gait pattern'],
                'affected_area': 'Lower Extremity & Core',
                'normal_range': 'Smooth, rhythmic gait pattern',
                'is_active': True,
                'created_at': now,
                'updated_at': now,
            },
        ]
        result = detection_problems_collection.insert_many(defaults)
        return jsonify({'success': True, 'message': f'Seeded {len(result.inserted_ids)} detection problems', 'count': len(result.inserted_ids)}), 201
    except Exception as e:
        logger.error(f'seed_detection_problems failed: {e}')
        return jsonify({'error': 'Internal server error'}), 500


# ─────────────────────────────────────────────────────────
#  EXERCISE RECOMMENDATIONS
# ─────────────────────────────────────────────────────────

@physical_therapy_bp.route('/api/physical/exercise-recommendations', methods=['GET'])
@token_required
def get_exercise_recommendations(current_user):
    """Get all exercise recommendations. Patients receive active-only."""
    try:
        query = {}
        if current_user.get('role') == 'patient':
            query['is_active'] = True
        exercises = list(exercise_recommendations_collection.find(query).sort('created_at', 1))
        exercises = [_serialize(e) for e in exercises]
        return jsonify({'success': True, 'exercises': exercises, 'total': len(exercises)}), 200
    except Exception as e:
        logger.error(f'get_exercise_recommendations failed: {e}')
        return jsonify({'error': 'Internal server error'}), 500


@physical_therapy_bp.route('/api/physical/exercise-recommendations', methods=['POST'])
@token_required
@therapist_required
def create_exercise_recommendation(current_user):
    """Create a new exercise recommendation (therapist only)."""
    try:
        data = request.get_json()
        required = ['name', 'category', 'description', 'difficulty_level']
        for field in required:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400

        exercise_id = _next_id(exercise_recommendations_collection, 'er')
        now = datetime.datetime.utcnow()
        doc = {
            'exercise_id': exercise_id,
            'name': data['name'],
            'category': data['category'],
            'description': data['description'],
            'target_problems': data.get('target_problems', []),
            'difficulty_level': data['difficulty_level'],
            'duration_minutes': int(data.get('duration_minutes', 10)),
            'repetitions': int(data.get('repetitions', 10)),
            'sets': int(data.get('sets', 3)),
            'instructions': data.get('instructions', []),
            'precautions': data.get('precautions', ''),
            'equipment_needed': data.get('equipment_needed', []),
            'is_active': data.get('is_active', True),
            'created_at': now,
            'updated_at': now,
        }
        result = exercise_recommendations_collection.insert_one(doc)
        doc['_id'] = str(result.inserted_id)
        doc['created_at'] = now.isoformat()
        doc['updated_at'] = now.isoformat()
        return jsonify({'success': True, 'message': 'Exercise recommendation created successfully', 'exercise': doc}), 201
    except Exception as e:
        logger.error(f'create_exercise_recommendation failed: {e}')
        return jsonify({'error': 'Internal server error'}), 500


@physical_therapy_bp.route('/api/physical/exercise-recommendations/<exercise_id>', methods=['PUT'])
@token_required
@therapist_required
def update_exercise_recommendation(current_user, exercise_id):
    """Update an exercise recommendation (therapist only)."""
    try:
        data = request.get_json()
        allowed = ['name', 'category', 'description', 'target_problems', 'difficulty_level',
                   'duration_minutes', 'repetitions', 'sets', 'instructions', 'precautions',
                   'equipment_needed', 'is_active']
        update_data = {}
        for k in allowed:
            if k in data:
                if k in ('duration_minutes', 'repetitions', 'sets'):
                    update_data[k] = int(data[k])
                else:
                    update_data[k] = data[k]
        update_data['updated_at'] = datetime.datetime.utcnow()

        result = exercise_recommendations_collection.update_one(
            {'exercise_id': exercise_id},
            {'$set': update_data}
        )
        if result.matched_count == 0:
            return jsonify({'error': 'Exercise recommendation not found'}), 404
        return jsonify({'success': True, 'message': 'Exercise recommendation updated successfully'}), 200
    except Exception as e:
        logger.error(f'update_exercise_recommendation failed: {e}')
        return jsonify({'error': 'Internal server error'}), 500


@physical_therapy_bp.route('/api/physical/exercise-recommendations/<exercise_id>', methods=['DELETE'])
@token_required
@therapist_required
def delete_exercise_recommendation(current_user, exercise_id):
    """Delete an exercise recommendation (therapist only)."""
    try:
        result = exercise_recommendations_collection.delete_one({'exercise_id': exercise_id})
        if result.deleted_count == 0:
            return jsonify({'error': 'Exercise recommendation not found'}), 404
        return jsonify({'success': True, 'message': 'Exercise recommendation deleted successfully'}), 200
    except Exception as e:
        logger.error(f'delete_exercise_recommendation failed: {e}')
        return jsonify({'error': 'Internal server error'}), 500


@physical_therapy_bp.route('/api/physical/exercise-recommendations/<exercise_id>/toggle', methods=['PATCH'])
@token_required
@therapist_required
def toggle_exercise_recommendation(current_user, exercise_id):
    """Toggle active status of an exercise recommendation (therapist only)."""
    try:
        exercise = exercise_recommendations_collection.find_one({'exercise_id': exercise_id})
        if not exercise:
            return jsonify({'error': 'Exercise recommendation not found'}), 404
        new_status = not exercise.get('is_active', True)
        exercise_recommendations_collection.update_one(
            {'exercise_id': exercise_id},
            {'$set': {'is_active': new_status, 'updated_at': datetime.datetime.utcnow()}}
        )
        return jsonify({'success': True, 'message': f'Exercise {"activated" if new_status else "deactivated"} successfully', 'is_active': new_status}), 200
    except Exception as e:
        logger.error(f'toggle_exercise_recommendation failed: {e}')
        return jsonify({'error': 'Internal server error'}), 500


@physical_therapy_bp.route('/api/physical/exercise-recommendations/seed', methods=['POST'])
@token_required
@therapist_required
def seed_exercise_recommendations(current_user):
    """Seed default exercise recommendations (therapist only)."""
    try:
        existing = exercise_recommendations_collection.count_documents({})
        if existing > 0:
            return jsonify({'success': False, 'message': f'Database already has {existing} exercises. Clear them first.'}), 400

        now = datetime.datetime.utcnow()
        defaults = [
            {
                'exercise_id': 'er-001',
                'name': 'Single-Leg Stance',
                'category': 'Balance Training',
                'description': 'Static balance exercise to improve unilateral postural stability.',
                'target_problems': ['Balance Impairment'],
                'difficulty_level': 'beginner',
                'duration_minutes': 5,
                'repetitions': 5,
                'sets': 3,
                'instructions': [
                    'Stand near a wall or sturdy chair for support.',
                    'Shift weight onto one foot and lift the other foot slightly.',
                    'Hold for 10 seconds while maintaining upright posture.',
                    'Lower the foot and repeat on the other side.',
                ],
                'precautions': 'Perform near a wall. Stop if dizziness occurs.',
                'equipment_needed': ['Chair or wall for support'],
                'is_active': True,
                'created_at': now,
                'updated_at': now,
            },
            {
                'exercise_id': 'er-002',
                'name': 'Treadmill Walking with Perturbation',
                'category': 'Gait Training',
                'description': 'Structured treadmill walking to improve gait symmetry and speed.',
                'target_problems': ['Reduced Gait Speed', 'Gait Asymmetry'],
                'difficulty_level': 'intermediate',
                'duration_minutes': 20,
                'repetitions': 1,
                'sets': 1,
                'instructions': [
                    'Set treadmill to a comfortable starting speed.',
                    'Walk at steady pace for 5 minutes, focusing on even step length.',
                    'Gradually increase speed over 10 minutes.',
                    'Cool down at starting speed for 5 minutes.',
                ],
                'precautions': 'Attach safety clip. Therapist must be present.',
                'equipment_needed': ['Treadmill', 'Safety harness'],
                'is_active': True,
                'created_at': now,
                'updated_at': now,
            },
            {
                'exercise_id': 'er-003',
                'name': 'Seated Leg Press',
                'category': 'Strength',
                'description': 'Lower-limb strengthening exercise targeting quadriceps and hip extensors.',
                'target_problems': ['Muscle Weakness'],
                'difficulty_level': 'beginner',
                'duration_minutes': 10,
                'repetitions': 12,
                'sets': 3,
                'instructions': [
                    'Sit in the leg press machine with feet shoulder-width apart.',
                    'Push the platform away by extending the knees.',
                    'Slowly return to starting position.',
                    'Breathe out on exertion, in on return.',
                ],
                'precautions': 'Avoid locking knees at full extension.',
                'equipment_needed': ['Leg press machine'],
                'is_active': True,
                'created_at': now,
                'updated_at': now,
            },
            {
                'exercise_id': 'er-004',
                'name': 'Heel-to-Toe Walk',
                'category': 'Coordination',
                'description': 'Tandem walking exercise to enhance dynamic balance and coordination.',
                'target_problems': ['Coordination Deficit', 'Balance Impairment'],
                'difficulty_level': 'intermediate',
                'duration_minutes': 10,
                'repetitions': 10,
                'sets': 3,
                'instructions': [
                    'Find a straight line on the floor or use tape.',
                    'Place the heel of one foot directly in front of the toes of the other.',
                    'Walk forward for 10 steps.',
                    'Turn carefully and return.',
                ],
                'precautions': 'Perform near a wall. Avoid if vertigo is present.',
                'equipment_needed': ['Floor tape or line'],
                'is_active': True,
                'created_at': now,
                'updated_at': now,
            },
            {
                'exercise_id': 'er-005',
                'name': 'Step-Up Exercise',
                'category': 'Strength',
                'description': 'Functional step-up to strengthen hip flexors and improve stair-climbing ability.',
                'target_problems': ['Muscle Weakness', 'Reduced Gait Speed'],
                'difficulty_level': 'intermediate',
                'duration_minutes': 10,
                'repetitions': 10,
                'sets': 3,
                'instructions': [
                    'Stand facing a step or low platform.',
                    'Step up with the stronger leg, then bring the weaker leg up.',
                    'Step down with the weaker leg first.',
                    'Use a railing for support if needed.',
                ],
                'precautions': 'Ensure step is stable. Use handrail.',
                'equipment_needed': ['Step platform', 'Handrail'],
                'is_active': True,
                'created_at': now,
                'updated_at': now,
            },
        ]
        result = exercise_recommendations_collection.insert_many(defaults)
        return jsonify({'success': True, 'message': f'Seeded {len(result.inserted_ids)} exercise recommendations', 'count': len(result.inserted_ids)}), 201
    except Exception as e:
        logger.error(f'seed_exercise_recommendations failed: {e}')
        return jsonify({'error': 'Internal server error'}), 500
