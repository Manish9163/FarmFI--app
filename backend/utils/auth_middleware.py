from functools import wraps
from flask import request, jsonify, g
import jwt
from config import Config
from utils.db import get_db

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ', 1)[1]

        if not token:
            return jsonify({'error': 'Authentication token missing'}), 401

        try:
            payload = jwt.decode(token, Config.SECRET_KEY, algorithms=['HS256'])
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired. Please log in again.'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401

        # Fetch user from DB
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute(
                "SELECT u.id, u.full_name, u.email, r.role_name "
                "FROM users u JOIN roles r ON u.role_id = r.id "
                "WHERE u.id = %s AND u.is_active = TRUE",
                (payload['user_id'],)
            )
            user = cursor.fetchone()
        finally:
            cursor.close()
            conn.close()

        if not user:
            return jsonify({'error': 'User not found or account deactivated'}), 401

        g.current_user = user
        return f(*args, **kwargs)
    return decorated


def role_required(*roles):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if g.current_user.get('role_name') not in roles:
                return jsonify({'error': 'Insufficient permissions'}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator
