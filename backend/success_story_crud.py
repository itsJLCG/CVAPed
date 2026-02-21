import logging
logger = logging.getLogger(__name__)
"""
Success Story CRUD Operations
Handles creation, reading, updating, and deletion of success stories
Images are uploaded to Cloudinary cloud storage.
"""
from flask import Blueprint, request, jsonify, current_app
from functools import wraps
import jwt
from jwt import ExpiredSignatureError, InvalidTokenError
from datetime import datetime
from bson import ObjectId
import os
import cloudinary
import cloudinary.uploader
# Database will be initialized later
success_stories_collection = None

# Configuration
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
ALLOWED_MIMETYPES = {'image/png', 'image/jpg', 'image/jpeg', 'image/gif', 'image/webp'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

# Configure Cloudinary with environment variables
cloudinary.config(
    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
    api_key=os.getenv('CLOUDINARY_API_KEY'),
    api_secret=os.getenv('CLOUDINARY_API_SECRET')
)

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


# Helper function to upload image to Cloudinary
def upload_to_cloudinary(file_storage):
    """Upload a file to Cloudinary and return the secure URL"""
    try:
        result = cloudinary.uploader.upload(
            file_storage,
            folder='success_stories',
            resource_type='image'
        )
        return result.get('secure_url')
    except Exception as e:
        logger.error(f"❌ Cloudinary upload error: {{e}}", exc_info=True)
        raise


# Helper function to delete image from Cloudinary
def delete_from_cloudinary(image_url):
    """Delete an image from Cloudinary by its URL"""
    try:
        # Extract public_id from Cloudinary URL
        # URL format: https://res.cloudinary.com/<cloud>/image/upload/v123/success_stories/filename.ext
        parts = image_url.split('/upload/')
        if len(parts) == 2:
            # Remove the version prefix (v123456/) and file extension
            path_after_upload = parts[1]
            # Strip version prefix if present (e.g., "v1234567890/")
            if path_after_upload.startswith('v') and '/' in path_after_upload:
                path_after_upload = path_after_upload.split('/', 1)[1]
            # Remove file extension to get public_id
            public_id = path_after_upload.rsplit('.', 1)[0]
            cloudinary.uploader.destroy(public_id)
            print(f"✅ Deleted from Cloudinary: {public_id}")
            return True
        else:
            print(f"⚠️ Could not parse Cloudinary public_id from URL: {image_url}")
            return False
    except Exception as e:
        logger.error(f"⚠️ Error deleting from Cloudinary: {{e}}", exc_info=True)
        return False

# JWT Token verification decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'success': False, 'message': 'Token is missing'}), 401
        
        token = auth_header.replace('Bearer ', '')
        
        try:
            data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = data
        except ExpiredSignatureError:
            return jsonify({'success': False, 'message': 'Token has expired'}), 401
        except InvalidTokenError:
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
        logger.error(f"Error fetching success stories: {{e}}", exc_info=True)
        return jsonify({
            'success': False,
            'message': f'Failed to fetch success stories: {{e}}'
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
        
        # Handle multiple file uploads to Cloudinary
        uploaded_images = []
        failed_uploads = []
        if 'images' in request.files:
            files = request.files.getlist('images')
            
            for file in files:
                if file and file.filename:
                    # Validate file type
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
                    
                    # Upload to Cloudinary
                    try:
                        print(f"📤 Uploading {file.filename} to Cloudinary...")
                        image_url = upload_to_cloudinary(file)
                        print(f"✅ Uploaded successfully: {image_url}")
                        uploaded_images.append(image_url)
                    except Exception as upload_error:
                        print(f"❌ Error uploading image {file.filename}: {str(upload_error)}")
                        failed_uploads.append(file.filename)
        
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
        
        print(f"📊 Total images uploaded: {len(uploaded_images)}, Failed: {len(failed_uploads)}")

        response_message = (
            f'Success story created. {len(uploaded_images)} images uploaded, {len(failed_uploads)} failed.'
            if failed_uploads
            else 'Success story created successfully'
        )

        return jsonify({
            'success': True,
            'message': response_message,
            'data': success_story,
            'warnings': f'Failed to upload: {", ".join(failed_uploads)}' if failed_uploads else None
        }), 201
    
    except Exception as e:
        logger.error(f"Error creating success story: {{e}}", exc_info=True)
        return jsonify({
            'success': False,
            'message': f'Failed to create success story: {{e}}'
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
        
        # Handle new image uploads to Cloudinary
        uploaded_images = existing_story.get('images', [])
        if 'images' in request.files:
            files = request.files.getlist('images')
            
            for file in files:
                if file and file.filename:
                    # Validate file type
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
                    
                    # Upload to Cloudinary
                    try:
                        image_url = upload_to_cloudinary(file)
                        uploaded_images.append(image_url)
                    except Exception as upload_error:
                        print(f"❌ Error uploading image to Cloudinary: {str(upload_error)}")
        
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
        logger.error(f"Error updating success story: {{e}}", exc_info=True)
        return jsonify({
            'success': False,
            'message': f'Failed to update success story: {{e}}'
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
        
        # Delete associated images from Cloudinary
        if story.get('images'):
            for image_url in story['images']:
                delete_from_cloudinary(image_url)
        
        # Delete story from database
        success_stories_collection.delete_one({'_id': obj_id})
        
        return jsonify({
            'success': True,
            'message': 'Success story deleted successfully'
        }), 200
    
    except Exception as e:
        logger.error(f"Error deleting success story: {{e}}", exc_info=True)
        return jsonify({
            'success': False,
            'message': f'Failed to delete success story: {{e}}'
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
            # Delete image from Cloudinary
            delete_from_cloudinary(image_path)
            
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
        logger.error(f"Error removing image: {{e}}", exc_info=True)
        return jsonify({
            'success': False,
            'message': f'Failed to remove image: {{e}}'
        }), 500
