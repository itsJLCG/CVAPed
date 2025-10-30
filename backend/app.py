from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from pymongo import MongoClient
from bson import ObjectId
import jwt
import datetime
from functools import wraps
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'fallback-secret-key')
CORS(app)
bcrypt = Bcrypt(app)

# MongoDB connection
MONGO_URI = os.getenv('MONGO_URI')
if not MONGO_URI:
    raise ValueError("MONGO_URI environment variable is not set")

client = MongoClient(MONGO_URI)
db = client['CVACare']
users_collection = db['users']

# Token required decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        
        try:
            # Remove 'Bearer ' prefix if present
            if token.startswith('Bearer '):
                token = token[7:]
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = users_collection.find_one({'_id': ObjectId(data['user_id'])})
            if not current_user:
                return jsonify({'message': 'User not found!'}), 401
        except Exception as e:
            return jsonify({'message': 'Token is invalid!', 'error': str(e)}), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated

@app.route('/api/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['email', 'password', 'firstName', 'lastName']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'message': f'{field} is required'}), 400
        
        email = data['email'].lower()
        password = data['password']
        first_name = data['firstName']
        last_name = data['lastName']
        role = 'user'  # Default role for all new registrations
        
        # Check if user already exists
        if users_collection.find_one({'email': email}):
            return jsonify({'message': 'User already exists'}), 409
        
        # Hash password
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
        
        # Create user document
        user = {
            'email': email,
            'password': hashed_password,
            'firstName': first_name,
            'lastName': last_name,
            'role': role,
            'createdAt': datetime.datetime.utcnow(),
            'updatedAt': datetime.datetime.utcnow()
        }
        
        # Insert user into database
        result = users_collection.insert_one(user)
        
        # Generate token
        token = jwt.encode({
            'user_id': str(result.inserted_id),
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, app.config['SECRET_KEY'], algorithm="HS256")
        
        return jsonify({
            'message': 'User registered successfully',
            'token': token,
            'user': {
                'id': str(result.inserted_id),
                'email': email,
                'firstName': first_name,
                'lastName': last_name,
                'role': role
            }
        }), 201
        
    except Exception as e:
        return jsonify({'message': 'Registration failed', 'error': str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('email') or not data.get('password'):
            return jsonify({'message': 'Email and password are required'}), 400
        
        email = data['email'].lower()
        password = data['password']
        
        # Find user
        user = users_collection.find_one({'email': email})
        
        if not user:
            return jsonify({'message': 'Invalid email or password'}), 401
        
        # Check password
        if not bcrypt.check_password_hash(user['password'], password):
            return jsonify({'message': 'Invalid email or password'}), 401
        
        # Generate token
        token = jwt.encode({
            'user_id': str(user['_id']),
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, app.config['SECRET_KEY'], algorithm="HS256")
        
        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': {
                'id': str(user['_id']),
                'email': user['email'],
                'firstName': user['firstName'],
                'lastName': user['lastName'],
                'role': user.get('role', 'user')
            }
        }), 200
        
    except Exception as e:
        return jsonify({'message': 'Login failed', 'error': str(e)}), 500

@app.route('/api/user', methods=['GET'])
@token_required
def get_user(current_user):
    try:
        return jsonify({
            'user': {
                'id': str(current_user['_id']),
                'email': current_user['email'],
                'firstName': current_user['firstName'],
                'lastName': current_user['lastName'],
                'role': current_user.get('role', 'user')
            }
        }), 200
    except Exception as e:
        return jsonify({'message': 'Failed to get user', 'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'message': 'CVACare API is running'}), 200

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    app.run(debug=debug, port=port)
