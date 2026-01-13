from flask import Blueprint, request, jsonify
from functools import wraps
import jwt
import os
from bson import ObjectId
import datetime

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')

# This will be initialized from app.py
db = None
users_collection = None

def init_admin_management(database):
    """Initialize admin management with database connection"""
    global db, users_collection
    db = database
    users_collection = db['users']

def admin_required(f):
    """Decorator to require admin authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'success': False, 'message': 'Token is missing'}), 401
        
        try:
            if token.startswith('Bearer '):
                token = token.split(' ')[1]
            
            secret_key = os.getenv('SECRET_KEY', 'fallback-secret-key')
            data = jwt.decode(token, secret_key, algorithms=['HS256'])
            
            # Verify user is admin
            user = users_collection.find_one({'_id': ObjectId(data['user_id'])})
            if not user or user.get('role') != 'admin':
                return jsonify({'success': False, 'message': 'Admin access required'}), 403
                
            request.current_user = user
        except jwt.ExpiredSignatureError:
            return jsonify({'success': False, 'message': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'success': False, 'message': 'Invalid token'}), 401
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)}), 401
        
        return f(*args, **kwargs)
    return decorated_function

@admin_bp.route('/stats', methods=['GET'])
@admin_required
def get_stats():
    """Get overview statistics - counts of users by role"""
    try:
        # Count total users
        total_users = users_collection.count_documents({})
        
        # Count by role
        total_patients = users_collection.count_documents({'role': 'patient'})
        total_therapists = users_collection.count_documents({'role': 'therapist'})
        total_admins = users_collection.count_documents({'role': 'admin'})
        
        return jsonify({
            'success': True,
            'stats': {
                'total_users': total_users,
                'total_patients': total_patients,
                'total_therapists': total_therapists,
                'total_admins': total_admins
            }
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@admin_bp.route('/users', methods=['GET'])
@admin_required
def get_all_users():
    """Get all users with pagination"""
    try:
        # Get pagination parameters
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 10))
        search = request.args.get('search', '')
        
        # Build query
        query = {}
        if search:
            query['$or'] = [
                {'firstName': {'$regex': search, '$options': 'i'}},
                {'lastName': {'$regex': search, '$options': 'i'}},
                {'email': {'$regex': search, '$options': 'i'}}
            ]
        
        # Get total count
        total_users = users_collection.count_documents(query)
        
        # Calculate pagination
        skip = (page - 1) * per_page
        total_pages = (total_users + per_page - 1) // per_page
        
        # Get users
        users_cursor = users_collection.find(query).skip(skip).limit(per_page).sort('created_at', -1)
        
        users = []
        for user in users_cursor:
            users.append({
                'id': str(user['_id']),
                'firstName': user.get('firstName', ''),
                'lastName': user.get('lastName', ''),
                'email': user.get('email', ''),
                'role': user.get('role', 'patient'),
                'created_at': user.get('created_at', '').isoformat() if user.get('created_at') else ''
            })
        
        return jsonify({
            'success': True,
            'users': users,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total_users': total_users,
                'total_pages': total_pages
            }
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@admin_bp.route('/users/<user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    """Delete a user from the database"""
    try:
        # Validate user_id
        if not ObjectId.is_valid(user_id):
            return jsonify({'success': False, 'message': 'Invalid user ID'}), 400
        
        # Check if user exists
        user = users_collection.find_one({'_id': ObjectId(user_id)})
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        # Prevent admin from deleting themselves
        if str(user['_id']) == str(request.current_user['_id']):
            return jsonify({'success': False, 'message': 'Cannot delete your own account'}), 400
        
        # Delete the user
        result = users_collection.delete_one({'_id': ObjectId(user_id)})
        
        if result.deleted_count > 0:
            return jsonify({
                'success': True,
                'message': 'User deleted successfully'
            }), 200
        else:
            return jsonify({'success': False, 'message': 'Failed to delete user'}), 500
            
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@admin_bp.route('/users/<user_id>/role', methods=['PUT'])
@admin_required
def update_user_role(user_id):
    """Update a user's role"""
    try:
        # Validate user_id
        if not ObjectId.is_valid(user_id):
            return jsonify({'success': False, 'message': 'Invalid user ID'}), 400
        
        # Get request data
        data = request.get_json()
        new_role = data.get('role')
        
        # Validate role
        valid_roles = ['admin', 'therapist', 'patient']
        if not new_role or new_role not in valid_roles:
            return jsonify({
                'success': False, 
                'message': f'Invalid role. Must be one of: {", ".join(valid_roles)}'
            }), 400
        
        # Check if user exists
        user = users_collection.find_one({'_id': ObjectId(user_id)})
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        # Prevent admin from changing their own role
        if str(user['_id']) == str(request.current_user['_id']):
            return jsonify({'success': False, 'message': 'Cannot change your own role'}), 400
        
        # Update the user's role
        result = users_collection.update_one(
            {'_id': ObjectId(user_id)},
            {'$set': {'role': new_role, 'updated_at': datetime.datetime.utcnow()}}
        )
        
        if result.modified_count > 0:
            return jsonify({
                'success': True,
                'message': f'User role updated to {new_role} successfully'
            }), 200
        else:
            return jsonify({'success': False, 'message': 'No changes made'}), 200
            
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
