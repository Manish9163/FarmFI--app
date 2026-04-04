from flask import Blueprint, request, jsonify, g
from services.auth_service import AuthService
from utils.auth_middleware import token_required

auth_bp = Blueprint('auth', __name__)
auth_service = AuthService()


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json(silent=True) or {}
    required = ('full_name', 'email', 'phone', 'password')
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({'error': f'Missing fields: {", ".join(missing)}'}), 400

    role = data.get('role', 'Farmer')
    if role not in ('Farmer', 'Worker', 'Buyer'):
        return jsonify({'error': 'Role must be Farmer, Worker, or Buyer'}), 400

    result = auth_service.register(
        full_name=data['full_name'].strip(),
        email=data['email'].strip().lower(),
        phone=data['phone'].strip(),
        password=data['password'],
        role_name=role
    )
    if not result['success']:
        return jsonify({'error': result['error']}), 409
    return jsonify({'message': 'Registration successful', 'user_id': result['user_id']}), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    if not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password required'}), 400

    result = auth_service.login(
        email=data['email'].strip().lower(),
        password=data['password']
    )
    if not result['success']:
        return jsonify({'error': result['error']}), 401
    return jsonify(result), 200

@auth_bp.route('/verify-otp', methods=['POST'])
def verify_otp():
    data = request.get_json(silent=True) or {}
    if not data.get('email') or not data.get('otp'):
        return jsonify({'error': 'Email and OTP required'}), 400
        
    result = auth_service.verify_otp(
        email=data['email'].strip().lower(),
        otp=data['otp'].strip()
    )
    if not result['success']:
        return jsonify({'error': result['error']}), 401
    return jsonify(result), 200

@auth_bp.route('/resend-otp', methods=['POST'])
def resend_otp():
    data = request.get_json(silent=True) or {}
    if not data.get('email'):
        return jsonify({'error': 'Email required'}), 400
        
    result = auth_service.resend_otp(
        email=data['email'].strip().lower()
    )
    if not result['success']:
        return jsonify({'error': result['error']}), 400
    return jsonify(result), 200


@auth_bp.route('/profile', methods=['GET'])
@token_required
def profile():
    user = auth_service.get_profile(g.current_user['id'])
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify(user), 200


@auth_bp.route('/me', methods=['GET'])
@token_required
def me():
    return jsonify(g.current_user), 200
