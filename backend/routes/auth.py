from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, 
    jwt_required, 
    get_jwt_identity, 
    get_jwt
)
import bcrypt
from models.user import User
from extensions import db
import uuid
from datetime import timedelta

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user"""
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    full_name = data.get('full_name', '')
    role = data.get('role', 'customer') # default role is customer

    if not email or not password:
        return {'error': 'Email and password are required'}, 400

    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return {'error': 'User with this email already exists'}, 400

    # Hash password
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

    user_id = str(uuid.uuid4())
    user = User(
        id=user_id,
        email=email,
        password_hash=hashed_password.decode('utf-8'),
        full_name=full_name,
        role=role
    )
    db.session.add(user)
    db.session.commit()

    # Create token with additional claims
    additional_claims = {"role": user.role}
    access_token = create_access_token(
        identity=user.id, 
        additional_claims=additional_claims,
        expires_delta=timedelta(hours=24)
    )

    return {
        'user': user.to_dict(),
        'token': access_token
    }, 201

@auth_bp.route('/login', methods=['POST'])
def login():
    """Login user"""
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return {'error': 'Email and password are required'}, 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return {'error': 'Invalid credentials'}, 401

    # Verify password
    if not bcrypt.checkpw(password.encode('utf-8'), user.password_hash.encode('utf-8')):
        return {'error': 'Invalid credentials'}, 401

    additional_claims = {"role": user.role}
    access_token = create_access_token(
        identity=user.id, 
        additional_claims=additional_claims,
        expires_delta=timedelta(hours=24)
    )

    return {
        'user': user.to_dict(),
        'token': access_token
    }, 200

@auth_bp.route('/verify', methods=['GET'])
@jwt_required()
def verify():
    """Verify JWT token"""
    current_user_id = get_jwt_identity()
    claims = get_jwt()
    return {'valid': True, 'user_id': current_user_id, 'role': claims.get('role')}, 200

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current authenticated user"""
    current_user_id = get_jwt_identity()
    user = db.session.get(User, current_user_id)
    if not user:
        return {'error': 'User not found'}, 404

    return user.to_dict(), 200

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Logout user (Client-side token deletion, but endpoint kept for API completeness/future blocklist)"""
    return jsonify({"message": "Successfully logged out"}), 200
