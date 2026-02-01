"""
Success Story CRUD Operations
Handles creation, reading, updating, and deletion of success stories
"""

from flask import Blueprint, request, jsonify
from functools import wraps
import jwt
from datetime import datetime
from bson import ObjectId
import os
from werkzeug.utils import secure_filename

# Database will be initialized later
success_stories_collection = None

# Configuration
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads', 'success_stories')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

# Ensure upload folder exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

success_story_bp = Blueprint('success_stories', __name__)

# Initialize function to be called from app.py
def init_success_story_crud(database):
    """Initialize the success story CRUD with database connection"""
    global success_stories_collection
    success_stories_collection = database['success_stories']
    print("✅ Success Story CRUD initialized")


# Helper function to check file extension
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# JWT Token verification decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].replace('Bearer ', '')
        
        if not token:
            return jsonify({'success': False, 'message': 'Token is missing'}), 401
        
        try:
            # Decode token to get user info
            data = jwt.decode(token, options={"verify_signature": False})
            current_user = data
        except Exception as e:
            return jsonify({'success': False, 'message': 'Token is invalid'}), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated

# Therapist role verification
def therapist_required(f):
    @wraps(f)
    def decorated(current_user, *args, **kwargs):
        if current_user.get('role') not in ['therapist', 'admin']:
            return jsonify({'success': False, 'message': 'Therapist access required'}), 403
        return f(current_user, *args, **kwargs)
    return decorated

@success_story_bp.route('/success-stories', methods=['GET'])
def get_success_stories():
    """Get all success stories (Public endpoint)"""
    try:
        stories = list(success_stories_collection.find().sort('createdAt', -1))
        
        # Convert ObjectId to string
        for story in stories:
            story['_id'] = str(story['_id'])
            story['id'] = story['_id']
        
        return jsonify({
            'success': True,
            'data': stories,
            'count': len(stories)
        }), 200
    
    except Exception as e:
        print(f"Error fetching success stories: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to fetch success stories: {str(e)}'
        }), 500

@success_story_bp.route('/success-stories', methods=['POST'])
@token_required
@therapist_required
def create_success_story(current_user):
    """Create a new success story with multiple image uploads"""
    try:
        # Validation
        if 'patientName' not in request.form or not request.form['patientName'].strip():
            return jsonify({
                'success': False,
                'message': 'Patient name is required'
            }), 400
        
        if 'story' not in request.form or not request.form['story'].strip():
            return jsonify({
                'success': False,
                'message': 'Success story content is required'
            }), 400
        
        patient_name = request.form['patientName'].strip()
        story_content = request.form['story'].strip()
        
        # Handle multiple file uploads
        uploaded_images = []
        if 'images' in request.files:
            files = request.files.getlist('images')
            
            for file in files:
                if file and file.filename:
                    # Validate file
                    if not allowed_file(file.filename):
                        return jsonify({
                            'success': False,
                            'message': f'Invalid file type: {file.filename}. Allowed types: {", ".join(ALLOWED_EXTENSIONS)}'
                        }), 400
                    
                    # Check file size
                    file.seek(0, os.SEEK_END)
                    file_size = file.tell()
                    file.seek(0)
                    
                    if file_size > MAX_FILE_SIZE:
                        return jsonify({
                            'success': False,
                            'message': f'File {file.filename} exceeds maximum size of 5MB'
                        }), 400
                    
                    # Save file
                    filename = secure_filename(file.filename)
                    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                    unique_filename = f"{timestamp}_{filename}"
                    file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
                    file.save(file_path)
                    
                    # Store relative path
                    uploaded_images.append(f"uploads/success_stories/{unique_filename}")
        
        # Create success story document
        success_story = {
            'patientName': patient_name,
            'images': uploaded_images,
            'story': story_content,
            'createdBy': current_user.get('email'),
            'createdByName': f"{current_user.get('firstName', '')} {current_user.get('lastName', '')}".strip(),
            'createdAt': datetime.utcnow(),
            'updatedAt': datetime.utcnow()
        }
        
        result = success_stories_collection.insert_one(success_story)
        success_story['_id'] = str(result.inserted_id)
        success_story['id'] = success_story['_id']
        
        # Convert datetime to string for JSON serialization
        success_story['createdAt'] = success_story['createdAt'].isoformat()
        success_story['updatedAt'] = success_story['updatedAt'].isoformat()
        
        return jsonify({
            'success': True,
            'message': 'Success story created successfully',
            'data': success_story
        }), 201
    
    except Exception as e:
        print(f"Error creating success story: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to create success story: {str(e)}'
        }), 500

@success_story_bp.route('/success-stories/<story_id>', methods=['PUT'])
@token_required
@therapist_required
def update_success_story(current_user, story_id):
    """Update an existing success story"""
    try:
        # Validate ObjectId
        try:
            obj_id = ObjectId(story_id)
        except:
            return jsonify({
                'success': False,
                'message': 'Invalid story ID'
            }), 400
        
        # Check if story exists
        existing_story = success_stories_collection.find_one({'_id': obj_id})
        if not existing_story:
            return jsonify({
                'success': False,
                'message': 'Success story not found'
            }), 404
        
        # Validation
        if 'patientName' not in request.form or not request.form['patientName'].strip():
            return jsonify({
                'success': False,
                'message': 'Patient name is required'
            }), 400
        
        if 'story' not in request.form or not request.form['story'].strip():
            return jsonify({
                'success': False,
                'message': 'Success story content is required'
            }), 400
        
        patient_name = request.form['patientName'].strip()
        story_content = request.form['story'].strip()
        
        # Handle new image uploads
        uploaded_images = existing_story.get('images', [])
        if 'images' in request.files:
            files = request.files.getlist('images')
            
            for file in files:
                if file and file.filename:
                    # Validate file
                    if not allowed_file(file.filename):
                        return jsonify({
                            'success': False,
                            'message': f'Invalid file type: {file.filename}. Allowed types: {", ".join(ALLOWED_EXTENSIONS)}'
                        }), 400
                    
                    # Check file size
                    file.seek(0, os.SEEK_END)
                    file_size = file.tell()
                    file.seek(0)
                    
                    if file_size > MAX_FILE_SIZE:
                        return jsonify({
                            'success': False,
                            'message': f'File {file.filename} exceeds maximum size of 5MB'
                        }), 400
                    
                    # Save file
                    filename = secure_filename(file.filename)
                    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                    unique_filename = f"{timestamp}_{filename}"
                    file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
                    file.save(file_path)
                    
                    # Add to images list
                    uploaded_images.append(f"uploads/success_stories/{unique_filename}")
        
        # Update document
        update_data = {
            'patientName': patient_name,
            'images': uploaded_images,
            'story': story_content,
            'updatedAt': datetime.utcnow(),
            'updatedBy': current_user.get('email'),
            'updatedByName': f"{current_user.get('firstName', '')} {current_user.get('lastName', '')}".strip()
        }
        
        success_stories_collection.update_one(
            {'_id': obj_id},
            {'$set': update_data}
        )
        
        # Get updated story
        updated_story = success_stories_collection.find_one({'_id': obj_id})
        updated_story['_id'] = str(updated_story['_id'])
        updated_story['id'] = updated_story['_id']
        updated_story['createdAt'] = updated_story['createdAt'].isoformat()
        updated_story['updatedAt'] = updated_story['updatedAt'].isoformat()
        
        return jsonify({
            'success': True,
            'message': 'Success story updated successfully',
            'data': updated_story
        }), 200
    
    except Exception as e:
        print(f"Error updating success story: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to update success story: {str(e)}'
        }), 500

@success_story_bp.route('/success-stories/<story_id>', methods=['DELETE'])
@token_required
@therapist_required
def delete_success_story(current_user, story_id):
    """Delete a success story"""
    try:
        # Validate ObjectId
        try:
            obj_id = ObjectId(story_id)
        except:
            return jsonify({
                'success': False,
                'message': 'Invalid story ID'
            }), 400
        
        # Check if story exists
        story = success_stories_collection.find_one({'_id': obj_id})
        if not story:
            return jsonify({
                'success': False,
                'message': 'Success story not found'
            }), 404
        
        # Delete associated images
        for image_path in story.get('images', []):
            try:
                full_path = os.path.join(os.path.dirname(__file__), image_path)
                if os.path.exists(full_path):
                    os.remove(full_path)
            except Exception as e:
                print(f"Warning: Could not delete image {image_path}: {str(e)}")
        
        # Delete story from database
        success_stories_collection.delete_one({'_id': obj_id})
        
        return jsonify({
            'success': True,
            'message': 'Success story deleted successfully'
        }), 200
    
    except Exception as e:
        print(f"Error deleting success story: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to delete success story: {str(e)}'
        }), 500

@success_story_bp.route('/success-stories/<story_id>/remove-image', methods=['POST'])
@token_required
@therapist_required
def remove_image_from_story(current_user, story_id):
    """Remove a specific image from a success story"""
    try:
        # Validate ObjectId
        try:
            obj_id = ObjectId(story_id)
        except:
            return jsonify({
                'success': False,
                'message': 'Invalid story ID'
            }), 400
        
        data = request.get_json()
        image_path = data.get('imagePath')
        
        if not image_path:
            return jsonify({
                'success': False,
                'message': 'Image path is required'
            }), 400
        
        # Check if story exists
        story = success_stories_collection.find_one({'_id': obj_id})
        if not story:
            return jsonify({
                'success': False,
                'message': 'Success story not found'
            }), 404
        
        # Remove image from array
        if image_path in story.get('images', []):
            # Delete physical file
            try:
                full_path = os.path.join(os.path.dirname(__file__), image_path)
                if os.path.exists(full_path):
                    os.remove(full_path)
            except Exception as e:
                print(f"Warning: Could not delete image {image_path}: {str(e)}")
            
            # Update database
            success_stories_collection.update_one(
                {'_id': obj_id},
                {'$pull': {'images': image_path}}
            )
            
            return jsonify({
                'success': True,
                'message': 'Image removed successfully'
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': 'Image not found in story'
            }), 404
    
    except Exception as e:
        print(f"Error removing image: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to remove image: {str(e)}'
        }), 500
