from flask import Blueprint, request, jsonify, g
from services.credit_service import CreditService
from utils.auth_middleware import token_required, role_required
from utils.db import get_db

credit_bp = Blueprint('credit', __name__)
credit_service = CreditService()


@credit_bp.route('/account', methods=['GET'])
@token_required
@role_required('Farmer')
def get_account():
    acc = credit_service.get_account(g.current_user['id'])
    if not acc:
        return jsonify({'error': 'No credit account found'}), 404
    return jsonify(acc), 200


@credit_bp.route('/repay', methods=['POST'])
@token_required
@role_required('Farmer')
def repay():
    data = request.get_json(silent=True) or {}
    amount = data.get('amount')
    if not amount or float(amount) <= 0:
        return jsonify({'error': 'Valid repayment amount required'}), 400
    result = credit_service.repay(g.current_user['id'], float(amount))
    if not result['success']:
        return jsonify({'error': result['error']}), 400
    return jsonify(result), 200


@credit_bp.route('/transactions', methods=['GET'])
@token_required
@role_required('Farmer')
def transactions():
    return jsonify(credit_service.get_transactions(g.current_user['id'])), 200


@credit_bp.route('/kyc', methods=['GET'])
@token_required
def get_kyc():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS kyc_profiles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT UNIQUE,
                full_name VARCHAR(255),
                age INT,
                farm_size VARCHAR(50),
                aadhaar VARCHAR(50),
                pan VARCHAR(50),
                status VARCHAR(50) DEFAULT 'pending',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        ''')
        
        # Check current status and mathematically force-expire if KYC is older than 3 months!
        cursor.execute('''
            SELECT *, 
                   CASE WHEN updated_at < DATE_SUB(NOW(), INTERVAL 3 MONTH) THEN 1 ELSE 0 END as is_expired 
            FROM kyc_profiles WHERE user_id = %s
        ''', (g.current_user['id'],))
        row = cursor.fetchone()
        
        if not row:
            return jsonify({'status': 'pending'}), 200
            
        if row['is_expired'] == 1 and row['status'] == 'verified':
            # Expire it dynamically in the DB
            cursor.execute("UPDATE kyc_profiles SET status='expired' WHERE user_id = %s", (g.current_user['id'],))
            conn.commit()
            row['status'] = 'expired'
            
        return jsonify(row), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@credit_bp.route('/kyc', methods=['POST'])
@token_required
def submit_kyc():
    data = request.get_json(silent=True) or {}
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO kyc_profiles (user_id, full_name, age, farm_size, aadhaar, pan, status)
            VALUES (%s, %s, %s, %s, %s, %s, 'pending_admin')
            ON DUPLICATE KEY UPDATE 
                full_name=VALUES(full_name), age=VALUES(age), farm_size=VALUES(farm_size),
                aadhaar=VALUES(aadhaar), pan=VALUES(pan), status='pending_admin'
        ''', (
            g.current_user['id'],
            data.get('full_name', g.current_user.get('full_name', '')),
            data.get('age'),
            data.get('farm_size'),
            data.get('aadhaar'),
            data.get('pan')
        ))
        conn.commit()
        return jsonify({"message": "KYC submitted to database", "status": "pending_admin"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
