import os
import uuid
import bcrypt
import mysql.connector
from flask import Blueprint, request, jsonify, g, current_app
from werkzeug.utils import secure_filename
from utils.auth_middleware import token_required, role_required
from utils.helpers import allowed_file
from utils.db import get_db

admin_bp = Blueprint('admin', __name__)


@admin_bp.route('/test', methods=['GET'])
def admin_test():
    return jsonify({'msg': 'admin routes loaded'}), 200


def _role_id(cursor, role_name):
    cursor.execute("SELECT id FROM roles WHERE role_name = %s", (role_name,))
    row = cursor.fetchone()
    return row['id'] if row else None


def _save_uploaded_image(file_obj):
    if not file_obj or file_obj.filename == '':
        return None
    if not allowed_file(file_obj.filename):
        raise ValueError('Invalid file type. Allowed: jpg, jpeg, png, webp')

    upload_dir = current_app.config.get('UPLOAD_FOLDER', 'uploads')
    os.makedirs(upload_dir, exist_ok=True)
    ext = secure_filename(file_obj.filename).rsplit('.', 1)[-1].lower()
    filename = f"{uuid.uuid4().hex}.{ext}"
    abs_path = os.path.join(upload_dir, filename)
    file_obj.save(abs_path)
    return f"{request.host_url.rstrip('/')}/uploads/{filename}"


@admin_bp.route('/dashboard', methods=['GET'])
@token_required
@role_required('Admin')
def dashboard():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT COUNT(*) AS total_users FROM users")
        users = cursor.fetchone()['total_users']

        cursor.execute(
            "SELECT COUNT(*) AS total FROM users u "
            "JOIN roles r ON u.role_id = r.id WHERE r.role_name = 'Farmer'"
        )
        customers = cursor.fetchone()['total']

        cursor.execute(
            "SELECT COUNT(*) AS total FROM users u "
            "JOIN roles r ON u.role_id = r.id WHERE r.role_name = 'Worker'"
        )
        workers = cursor.fetchone()['total']

        cursor.execute("SELECT COUNT(*) AS total FROM products WHERE is_active = TRUE")
        products = cursor.fetchone()['total']

        cursor.execute("SELECT COUNT(*) AS total FROM orders")
        orders = cursor.fetchone()['total']

        cursor.execute("SELECT COUNT(*) AS total FROM disease_records")
        predictions = cursor.fetchone()['total']

        cursor.execute("SELECT COUNT(*) AS total FROM job_requests WHERE status = 'Pending'")
        pending_jobs = cursor.fetchone()['total']

        cursor.execute("SELECT SUM(due_amount) AS total_due FROM credit_accounts")
        due = cursor.fetchone()['total_due'] or 0

        return jsonify({
            'total_users':     users,
            'total_customers': customers,
            'total_workers':   workers,
            'total_products':  products,
            'total_orders':    orders,
            'total_predictions': predictions,
            'pending_jobs':    pending_jobs,
            'total_credit_due': float(due),
        }), 200
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/users', methods=['GET'])
@token_required
@role_required('Admin')
def list_users():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT u.id, u.full_name, u.email, u.phone, u.is_active, u.created_at, r.role_name "
            "FROM users u JOIN roles r ON u.role_id = r.id ORDER BY u.created_at DESC"
        )
        return jsonify(cursor.fetchall()), 200
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/users/<int:user_id>/toggle', methods=['PATCH'])
@token_required
@role_required('Admin')
def toggle_user(user_id):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE users SET is_active = NOT is_active WHERE id = %s AND id != %s",
            (user_id, g.current_user['id'])  
        )
        conn.commit()
        return jsonify({'message': 'User status toggled'}), 200
    finally:
        cursor.close()
        conn.close()

# ORDERS

@admin_bp.route('/orders', methods=['GET'])
@token_required
@role_required('Admin')
def all_orders():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT o.*, f.full_name AS farmer_name, b.full_name AS buyer_name "
            "FROM orders o "
            "JOIN users f ON o.farmer_id = f.id "
            "JOIN users b ON o.buyer_id = b.id "
            "ORDER BY o.ordered_at DESC LIMIT 100"
        )
        # Handle string serialization for decimals/dates 
        rows = cursor.fetchall()
        for r in rows:
            r['ordered_at'] = str(r['ordered_at']) if r.get('ordered_at') else ''
            r['quantity_kg'] = float(r['quantity_kg'])
            r['price_per_kg'] = float(r['price_per_kg'])
            r['total_amount'] = float(r['total_amount'])
        return jsonify(rows), 200
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/orders/<int:order_id>/status', methods=['PATCH'])
@token_required
@role_required('Admin')
def update_order_status(order_id):
    data = request.get_json(silent=True) or {}
    status = data.get('status', '').strip()
    valid_statuses = ('Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled')
    if status not in valid_statuses:
        return jsonify({'error': f'status must be one of {valid_statuses}'}), 400
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE orders SET status = %s WHERE id = %s", (status, order_id))
        conn.commit()
        return jsonify({'message': f'Order {order_id} updated to {status}'}), 200
    finally:
        cursor.close()
        conn.close()

# KYC
@admin_bp.route('/kyc', methods=['GET'])
@token_required
@role_required('Admin')
def list_kyc():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute('''
            SELECT k.*, u.role_id, r.role_name 
            FROM kyc_profiles k 
            JOIN users u ON k.user_id = u.id 
            JOIN roles r ON u.role_id = r.id
            ORDER BY k.updated_at DESC
        ''')
        rows = cursor.fetchall()
        for r in rows:
            r['updated_at'] = str(r['updated_at']) if r.get('updated_at') else ''
        return jsonify(rows), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@admin_bp.route('/kyc/<int:kyc_id>', methods=['PATCH'])
@token_required
@role_required('Admin')
def update_kyc(kyc_id):
    data = request.get_json(silent=True) or {}
    status = data.get('status', 'verified')
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE kyc_profiles SET status = %s WHERE id = %s", (status, kyc_id))
        conn.commit()
        return jsonify({'message': f'KYC status updated to {status}'}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# VEGETABLES
@admin_bp.route('/vegetables', methods=['GET'])
@token_required
@role_required('Admin')
def list_vegetables():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute('''
            SELECT v.*, u.full_name as farmer_name 
            FROM vegetables v 
            JOIN users u ON v.farmer_id = u.id 
            ORDER BY v.created_at DESC
        ''')
        rows = cursor.fetchall()
        for r in rows:
            r['created_at'] = str(r['created_at']) if r.get('created_at') else ''
            r['price_per_kg'] = float(r['price_per_kg']) if r.get('price_per_kg') else 0
            # Ensure quantity_kg string conversion for UI ease
            r['quantity_kg'] = str(r['quantity_kg'])
        return jsonify(rows), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


#  BUYERS 
@admin_bp.route('/buyers', methods=['GET'])
@token_required
@role_required('Admin')
def list_buyers():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT u.id, u.full_name, u.email, u.phone, u.is_active, u.created_at, "
            "b.business_name, b.city, b.total_orders, b.total_spent "
            "FROM users u "
            "JOIN roles r ON u.role_id = r.id "
            "LEFT JOIN buyer_profiles b ON b.user_id = u.id "
            "WHERE r.role_name = 'Buyer' ORDER BY u.created_at DESC"
        )
        return jsonify(cursor.fetchall()), 200
    finally:
        cursor.close()
        conn.close()

@admin_bp.route('/buyers', methods=['POST'])
@token_required
@role_required('Admin')
def create_buyer():
    data = request.get_json(silent=True) or {}
    full_name = (data.get('full_name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    phone = (data.get('phone') or '').strip()
    password = data.get('password') or ''
    is_active = bool(data.get('is_active', True))
    business_name = (data.get('business_name') or '').strip()
    city = (data.get('city') or '').strip()

    if not all([full_name, email, phone, password]):
        return jsonify({'error': 'full_name, email, phone, password are required'}), 400

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        buyer_role_id = _role_id(cursor, 'Buyer')
        if not buyer_role_id:
            return jsonify({'error': 'Buyer role not found'}), 500

        pwd_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        cursor.execute(
            "INSERT INTO users (role_id, full_name, email, phone, password_hash, is_active) "
            "VALUES (%s, %s, %s, %s, %s, %s)",
            (buyer_role_id, full_name, email, phone, pwd_hash, is_active)
        )
        user_id = cursor.lastrowid

        cursor.execute(
            "INSERT INTO buyer_profiles (user_id, business_name, city) "
            "VALUES (%s, %s, %s)",
            (user_id, business_name, city)
        )
        
        cursor.execute("INSERT IGNORE INTO wallets (user_id) VALUES (%s)", (user_id,))
        conn.commit()
        return jsonify({'id': user_id, 'message': 'Buyer created'}), 201
    except mysql.connector.IntegrityError as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

@admin_bp.route('/buyers/<int:user_id>', methods=['PUT'])
@token_required
@role_required('Admin')
def update_buyer(user_id):
    data = request.get_json(silent=True) or {}
    full_name = (data.get('full_name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    phone = (data.get('phone') or '').strip()
    password = (data.get('password') or '').strip()
    is_active = bool(data.get('is_active', True))
    business_name = (data.get('business_name') or '').strip()
    city = (data.get('city') or '').strip()

    if not all([full_name, email, phone]):
        return jsonify({'error': 'full_name, email, phone are required'}), 400

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT u.id FROM users u JOIN roles r ON u.role_id = r.id "
            "WHERE u.id = %s AND r.role_name = 'Buyer'",
            (user_id,)
        )
        if not cursor.fetchone():
            return jsonify({'error': 'Buyer not found'}), 404

        if password:
            pwd_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            cursor.execute(
                "UPDATE users SET full_name=%s, email=%s, phone=%s, password_hash=%s, is_active=%s WHERE id=%s",
                (full_name, email, phone, pwd_hash, is_active, user_id)
            )
        else:
            cursor.execute(
                "UPDATE users SET full_name=%s, email=%s, phone=%s, is_active=%s WHERE id=%s",
                (full_name, email, phone, is_active, user_id)
            )
            
        cursor.execute(
            "UPDATE buyer_profiles SET business_name=%s, city=%s WHERE user_id=%s",
            (business_name, city, user_id)
        )
        conn.commit()
        return jsonify({'message': 'Buyer updated'}), 200
    except mysql.connector.IntegrityError as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

@admin_bp.route('/buyers/<int:user_id>', methods=['DELETE'])
@token_required
@role_required('Admin')
def delete_buyer(user_id):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "DELETE u FROM users u "
            "JOIN roles r ON u.role_id = r.id "
            "WHERE u.id = %s AND r.role_name = 'Buyer'",
            (user_id,)
        )
        if cursor.rowcount == 0:
            return jsonify({'error': 'Buyer not found'}), 404
        conn.commit()
        return jsonify({'message': 'Buyer deleted'}), 200
    finally:
        cursor.close()
        conn.close()


# FARMERS
@admin_bp.route('/customers', methods=['GET'])
@token_required
@role_required('Admin')
def list_customers():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT u.id, u.full_name, u.email, u.phone, u.is_active, u.created_at "
            "FROM users u JOIN roles r ON u.role_id = r.id "
            "WHERE r.role_name = 'Farmer' ORDER BY u.created_at DESC"
        )
        return jsonify(cursor.fetchall()), 200
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/customers', methods=['POST'])
@token_required
@role_required('Admin')
def create_customer():
    data = request.get_json(silent=True) or {}
    full_name = (data.get('full_name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    phone = (data.get('phone') or '').strip()
    password = data.get('password') or ''
    is_active = bool(data.get('is_active', True))

    if not all([full_name, email, phone, password]):
        return jsonify({'error': 'full_name, email, phone, password are required'}), 400

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        farmer_role_id = _role_id(cursor, 'Farmer')
        if not farmer_role_id:
            return jsonify({'error': 'Farmer role not found'}), 500

        pwd_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        cursor.execute(
            "INSERT INTO users (role_id, full_name, email, phone, password_hash, is_active) "
            "VALUES (%s, %s, %s, %s, %s, %s)",
            (farmer_role_id, full_name, email, phone, pwd_hash, is_active)
        )
        user_id = cursor.lastrowid

        cursor.execute(
            "INSERT IGNORE INTO credit_accounts (farmer_id, credit_limit, used_credit, due_amount) "
            "VALUES (%s, 5000, 0, 0)",
            (user_id,)
        )
        conn.commit()
        return jsonify({'id': user_id, 'message': 'Customer created'}), 201
    except mysql.connector.IntegrityError as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/customers/<int:user_id>', methods=['PUT'])
@token_required
@role_required('Admin')
def update_customer(user_id):
    data = request.get_json(silent=True) or {}
    full_name = (data.get('full_name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    phone = (data.get('phone') or '').strip()
    password = (data.get('password') or '').strip()
    is_active = bool(data.get('is_active', True))

    if not all([full_name, email, phone]):
        return jsonify({'error': 'full_name, email, phone are required'}), 400

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT u.id FROM users u JOIN roles r ON u.role_id = r.id "
            "WHERE u.id = %s AND r.role_name = 'Farmer'",
            (user_id,)
        )
        if not cursor.fetchone():
            return jsonify({'error': 'Customer not found'}), 404

        if password:
            pwd_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            cursor.execute(
                "UPDATE users SET full_name=%s, email=%s, phone=%s, password_hash=%s, is_active=%s WHERE id=%s",
                (full_name, email, phone, pwd_hash, is_active, user_id)
            )
        else:
            cursor.execute(
                "UPDATE users SET full_name=%s, email=%s, phone=%s, is_active=%s WHERE id=%s",
                (full_name, email, phone, is_active, user_id)
            )
        conn.commit()
        return jsonify({'message': 'Customer updated'}), 200
    except mysql.connector.IntegrityError as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/customers/<int:user_id>', methods=['DELETE'])
@token_required
@role_required('Admin')
def delete_customer(user_id):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "DELETE u FROM users u "
            "JOIN roles r ON u.role_id = r.id "
            "WHERE u.id = %s AND r.role_name = 'Farmer'",
            (user_id,)
        )
        if cursor.rowcount == 0:
            return jsonify({'error': 'Customer not found'}), 404
        conn.commit()
        return jsonify({'message': 'Customer deleted'}), 200
    finally:
        cursor.close()
        conn.close()


#  WORKERS 
@admin_bp.route('/workers', methods=['GET'])
@token_required
@role_required('Admin')
def list_workers():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT u.id, u.full_name, u.email, u.phone, u.is_active, u.created_at, "
            "w.skills, w.daily_rate, w.is_available, w.location, w.bio, w.rating "
            "FROM users u "
            "JOIN roles r ON u.role_id = r.id "
            "LEFT JOIN workers w ON w.worker_id = u.id "
            "WHERE r.role_name = 'Worker' "
            "ORDER BY u.created_at DESC"
        )
        return jsonify(cursor.fetchall()), 200
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/workers', methods=['POST'])
@token_required
@role_required('Admin')
def create_worker():
    data = request.get_json(silent=True) or {}
    full_name = (data.get('full_name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    phone = (data.get('phone') or '').strip()
    password = data.get('password') or ''
    skills = (data.get('skills') or '').strip()
    daily_rate = float(data.get('daily_rate') or 0)
    location = (data.get('location') or '').strip()
    bio = (data.get('bio') or '').strip()
    is_available = bool(data.get('is_available', True))
    is_active = bool(data.get('is_active', True))

    if not all([full_name, email, phone, password, skills]) or daily_rate <= 0:
        return jsonify({'error': 'full_name, email, phone, password, skills, daily_rate are required'}), 400

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        worker_role_id = _role_id(cursor, 'Worker')
        if not worker_role_id:
            return jsonify({'error': 'Worker role not found'}), 500

        pwd_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        cursor.execute(
            "INSERT INTO users (role_id, full_name, email, phone, password_hash, is_active) "
            "VALUES (%s, %s, %s, %s, %s, %s)",
            (worker_role_id, full_name, email, phone, pwd_hash, is_active)
        )
        worker_id = cursor.lastrowid

        cursor.execute(
            "INSERT INTO workers (worker_id, skills, daily_rate, is_available, location, bio) "
            "VALUES (%s, %s, %s, %s, %s, %s)",
            (worker_id, skills, daily_rate, is_available, location, bio)
        )
        conn.commit()
        return jsonify({'id': worker_id, 'message': 'Worker created'}), 201
    except mysql.connector.IntegrityError as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/workers/<int:worker_id>', methods=['PUT'])
@token_required
@role_required('Admin')
def update_worker(worker_id):
    data = request.get_json(silent=True) or {}
    full_name = (data.get('full_name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    phone = (data.get('phone') or '').strip()
    password = (data.get('password') or '').strip()
    skills = (data.get('skills') or '').strip()
    daily_rate = float(data.get('daily_rate') or 0)
    location = (data.get('location') or '').strip()
    bio = (data.get('bio') or '').strip()
    is_available = bool(data.get('is_available', True))
    is_active = bool(data.get('is_active', True))

    if not all([full_name, email, phone, skills]) or daily_rate <= 0:
        return jsonify({'error': 'full_name, email, phone, skills, daily_rate are required'}), 400

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT u.id FROM users u JOIN roles r ON u.role_id = r.id "
            "WHERE u.id = %s AND r.role_name = 'Worker'",
            (worker_id,)
        )
        if not cursor.fetchone():
            return jsonify({'error': 'Worker not found'}), 404

        if password:
            pwd_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            cursor.execute(
                "UPDATE users SET full_name=%s, email=%s, phone=%s, password_hash=%s, is_active=%s WHERE id=%s",
                (full_name, email, phone, pwd_hash, is_active, worker_id)
            )
        else:
            cursor.execute(
                "UPDATE users SET full_name=%s, email=%s, phone=%s, is_active=%s WHERE id=%s",
                (full_name, email, phone, is_active, worker_id)
            )

        cursor.execute(
            "UPDATE workers SET skills=%s, daily_rate=%s, is_available=%s, location=%s, bio=%s WHERE worker_id=%s",
            (skills, daily_rate, is_available, location, bio, worker_id)
        )
        conn.commit()
        return jsonify({'message': 'Worker updated'}), 200
    except mysql.connector.IntegrityError as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/workers/<int:worker_id>', methods=['DELETE'])
@token_required
@role_required('Admin')
def delete_worker(worker_id):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "DELETE u FROM users u "
            "JOIN roles r ON u.role_id = r.id "
            "WHERE u.id = %s AND r.role_name = 'Worker'",
            (worker_id,)
        )
        if cursor.rowcount == 0:
            return jsonify({'error': 'Worker not found'}), 404
        conn.commit()
        return jsonify({'message': 'Worker deleted'}), 200
    finally:
        cursor.close()
        conn.close()


# PRODUCTS 
@admin_bp.route('/products', methods=['GET'])
@token_required
@role_required('Admin')
def list_products_admin():
    include_inactive = request.args.get('include_inactive', 'true').lower() == 'true'
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        if include_inactive:
            cursor.execute(
                "SELECT p.*, i.stock_quantity, i.reorder_level "
                "FROM products p LEFT JOIN inventory i ON i.product_id = p.id "
                "ORDER BY p.created_at DESC"
            )
        else:
            cursor.execute(
                "SELECT p.*, i.stock_quantity, i.reorder_level "
                "FROM products p LEFT JOIN inventory i ON i.product_id = p.id "
                "WHERE p.is_active = TRUE ORDER BY p.created_at DESC"
            )
        return jsonify(cursor.fetchall()), 200
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/products', methods=['POST'])
@token_required
@role_required('Admin')
def create_product():
    data = request.form if request.form else (request.get_json(silent=True) or {})
    name = (data.get('name') or '').strip()
    description = (data.get('description') or '').strip()
    category = (data.get('category') or '').strip()
    price = float(data.get('price') or 0)
    stock_quantity = int(data.get('stock_quantity') or 0)
    reorder_level = int(data.get('reorder_level') or 10)
    is_active = str(data.get('is_active', 'true')).lower() == 'true'

    if not all([name, category]) or price <= 0:
        return jsonify({'error': 'name, category, price are required'}), 400

    valid_categories = ('Seeds', 'Fertilizer', 'Tools', 'Pesticide', 'Equipment', 'Other')
    if category not in valid_categories:
        return jsonify({'error': f'category must be one of {valid_categories}'}), 400

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        image_url = _save_uploaded_image(request.files.get('image')) if request.files else (data.get('image_url') or None)

        cursor.execute(
            "INSERT INTO products (name, description, price, category, image_url, is_active) "
            "VALUES (%s, %s, %s, %s, %s, %s)",
            (name, description, price, category, image_url, is_active)
        )
        product_id = cursor.lastrowid
        cursor.execute(
            "INSERT INTO inventory (product_id, stock_quantity, reorder_level) VALUES (%s, %s, %s)",
            (product_id, max(stock_quantity, 0), max(reorder_level, 0))
        )
        conn.commit()
        return jsonify({'id': product_id, 'message': 'Product created'}), 201
    except ValueError as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/products/<int:product_id>', methods=['PUT'])
@token_required
@role_required('Admin')
def update_product(product_id):
    data = request.form if request.form else (request.get_json(silent=True) or {})
    name = (data.get('name') or '').strip()
    description = (data.get('description') or '').strip()
    category = (data.get('category') or '').strip()
    price = float(data.get('price') or 0)
    stock_quantity = int(data.get('stock_quantity') or 0)
    reorder_level = int(data.get('reorder_level') or 10)
    is_active = str(data.get('is_active', 'true')).lower() == 'true'

    if not all([name, category]) or price <= 0:
        return jsonify({'error': 'name, category, price are required'}), 400

    valid_categories = ('Seeds', 'Fertilizer', 'Tools', 'Pesticide', 'Equipment', 'Other')
    if category not in valid_categories:
        return jsonify({'error': f'category must be one of {valid_categories}'}), 400

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT image_url FROM products WHERE id = %s", (product_id,))
        existing = cursor.fetchone()
        if not existing:
            return jsonify({'error': 'Product not found'}), 404

        new_image = _save_uploaded_image(request.files.get('image')) if request.files else None
        image_url = new_image or (data.get('image_url') or existing['image_url'])

        cursor.execute(
            "UPDATE products SET name=%s, description=%s, price=%s, category=%s, image_url=%s, is_active=%s WHERE id=%s",
            (name, description, price, category, image_url, is_active, product_id)
        )
        cursor.execute(
            "INSERT INTO inventory (product_id, stock_quantity, reorder_level) VALUES (%s, %s, %s) "
            "ON DUPLICATE KEY UPDATE stock_quantity = VALUES(stock_quantity), reorder_level = VALUES(reorder_level)",
            (product_id, max(stock_quantity, 0), max(reorder_level, 0))
        )
        conn.commit()
        return jsonify({'message': 'Product updated'}), 200
    except ValueError as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/products/<int:product_id>', methods=['DELETE'])
@token_required
@role_required('Admin')
def delete_product(product_id):
    conn = get_db()
    cursor = conn.cursor()
    try:
        # Soft delete 
        cursor.execute("UPDATE products SET is_active = FALSE WHERE id = %s", (product_id,))
        if cursor.rowcount == 0:
            return jsonify({'error': 'Product not found'}), 404
        conn.commit()
        return jsonify({'message': 'Product deactivated'}), 200
    finally:
        cursor.close()
        conn.close()


# -------- ANALYTICS CHART ROUTES --------

@admin_bp.route('/analytics/user-growth', methods=['GET'])
@token_required
@role_required('Admin')
def user_growth():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT DATE(created_at) as date, COUNT(*) as new_users FROM users GROUP BY DATE(created_at) ORDER BY date ASC LIMIT 30")
        rows = cursor.fetchall()
        for r in rows: r['date'] = str(r['date'])
        return jsonify(rows), 200
    finally:
        cursor.close()
        conn.close()

@admin_bp.route('/analytics/disease-distribution', methods=['GET'])
@token_required
@role_required('Admin')
def disease_distribution():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT predicted_disease as result_disease, COUNT(*) as count FROM disease_records WHERE predicted_disease IS NOT NULL AND predicted_disease != '' GROUP by predicted_disease ORDER BY count DESC LIMIT 10")
        rows = cursor.fetchall()
        ret = [{'disease_name': r['result_disease'], 'count': r['count']} for r in rows]
        return jsonify(ret), 200
    finally:
        cursor.close()
        conn.close()

@admin_bp.route('/analytics/crop-recommendations', methods=['GET'])
@token_required
@role_required('Admin')
def crop_recommendations():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        import json
        from collections import Counter
        cursor.execute("SELECT recommended_crops FROM crop_predictions WHERE recommended_crops IS NOT NULL")
        rows = cursor.fetchall()
        
        counter = Counter()
        for r in rows:
            try:
                crops_list = json.loads(r['recommended_crops'])
                if crops_list and isinstance(crops_list, list):
                    # Take highest rated crop from prediction
                    top_crop = crops_list[0].get('crop')
                    if top_crop:
                        counter[top_crop] += 1
            except Exception:
                continue

        top_10 = counter.most_common(10)
        ret = [{'crop_name': crop, 'recommendation_count': count} for crop, count in top_10]
        return jsonify(ret), 200
    finally:
        cursor.close()
        conn.close()

@admin_bp.route('/analytics/product-sales', methods=['GET'])
@token_required
@role_required('Admin')
def product_sales():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT p.name as product_name, SUM(oi.quantity) as total_orders FROM order_items oi JOIN products p ON p.id = oi.product_id GROUP BY p.name ORDER BY total_orders DESC LIMIT 10")
        rows = cursor.fetchall()
        ret = [{'product_name': r['product_name'], 'total_orders': int(r['total_orders'] or 0)} for r in rows]
        return jsonify(ret), 200
    finally:
        cursor.close()
        conn.close()

@admin_bp.route('/analytics/feedback-trend', methods=['GET'])
@token_required
@role_required('Admin')
def feedback_trend():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT DATE(created_at) as date, SUM(is_correct) as correct_predictions, COUNT(*) - SUM(is_correct) as incorrect_predictions FROM prediction_feedback GROUP BY DATE(created_at) ORDER BY date ASC LIMIT 30")
        rows = cursor.fetchall()
        ret = []
        for r in rows:
            ret.append({
                'date': str(r['date']),
                'correct_predictions': int(r['correct_predictions'] or 0),
                'incorrect_predictions': int(r['incorrect_predictions'] or 0)
            })
        return jsonify(ret), 200
    finally:
        cursor.close()
        conn.close()




#  USER PATCH / DELETE 
@admin_bp.route('/users/<int:user_id>', methods=['PATCH'])
@token_required
@role_required('Admin')
def patch_user(user_id):
    data = request.get_json(silent=True) or {}
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        if 'credit_limit' in data:
            cursor.execute("UPDATE credit_accounts SET credit_limit = %s WHERE farmer_id = %s", (data['credit_limit'], user_id))
        if 'phone' in data:
            cursor.execute("UPDATE users SET phone = %s WHERE id = %s", (data['phone'], user_id))
        conn.commit()
        return jsonify({'message': 'User updated successfully'}), 200
    finally:
        cursor.close(); conn.close()

@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@token_required
@role_required('Admin')
def delete_user(user_id):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM users WHERE id = %s AND id != %s", (user_id, g.current_user['id']))
        conn.commit()
        return jsonify({'message': 'User deleted'}), 200
    finally:
        cursor.close(); conn.close()

#  PREDICTIONS 
@admin_bp.route('/predictions', methods=['GET'])
@token_required
@role_required('Admin')
def list_predictions():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT id AS prediction_id, user_id, image_url AS image_path, "
            "predicted_disease AS disease_name, confidence_score, created_at "
            "FROM disease_records ORDER BY created_at DESC LIMIT 100"
        )
        return jsonify(cursor.fetchall()), 200
    finally:
        cursor.close(); conn.close()

#  PESTICIDES CRUD 
@admin_bp.route('/pesticides', methods=['GET'])
@token_required
@role_required('Admin')
def list_pesticides():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, disease_name, recommended_pesticide AS pesticide_name, dosage, safety_precautions FROM pesticide_solutions ORDER BY id DESC")
        return jsonify(cursor.fetchall()), 200
    finally:
        cursor.close(); conn.close()

@admin_bp.route('/pesticides', methods=['POST'])
@token_required
@role_required('Admin')
def create_pesticide():
    data = request.get_json(silent=True) or {}
    disease_name     = (data.get('disease_name') or '').strip()
    pesticide_name   = (data.get('pesticide_name') or '').strip()
    dosage           = (data.get('dosage') or '').strip()
    safety           = (data.get('safety_precautions') or '').strip()
    if not disease_name or not pesticide_name:
        return jsonify({'error': 'disease_name and pesticide_name are required'}), 400
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO pesticide_solutions (disease_name, recommended_pesticide, dosage, safety_precautions) VALUES (%s,%s,%s,%s)",
            (disease_name, pesticide_name, dosage, safety)
        )
        conn.commit()
        return jsonify({'message': 'Pesticide added', 'id': cursor.lastrowid}), 201
    except mysql.connector.IntegrityError:
        conn.rollback()
        return jsonify({'error': 'A record for this disease already exists'}), 400
    finally:
        cursor.close(); conn.close()

@admin_bp.route('/pesticides/<int:pest_id>', methods=['PUT'])
@token_required
@role_required('Admin')
def update_pesticide(pest_id):
    data = request.get_json(silent=True) or {}
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE pesticide_solutions SET disease_name=%s, recommended_pesticide=%s, dosage=%s, safety_precautions=%s WHERE id=%s",
            (data.get('disease_name'), data.get('pesticide_name'), data.get('dosage'), data.get('safety_precautions'), pest_id)
        )
        conn.commit()
        return jsonify({'message': 'Pesticide updated'}), 200
    finally:
        cursor.close(); conn.close()

@admin_bp.route('/pesticides/<int:pest_id>', methods=['DELETE'])
@token_required
@role_required('Admin')
def delete_pesticide(pest_id):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM pesticide_solutions WHERE id=%s", (pest_id,))
        conn.commit()
        return jsonify({'message': 'Pesticide deleted'}), 200
    finally:
        cursor.close(); conn.close()

#  CROP PREDICTIONS 
@admin_bp.route('/crop-predictions', methods=['GET'])
@token_required
@role_required('Admin')
def list_crop_predictions():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT id AS prediction_id, user_id, soil_type AS location, "
            "recommended_crops, suitability_score, created_at AS timestamp "
            "FROM crop_predictions ORDER BY created_at DESC LIMIT 100"
        )
        return jsonify(cursor.fetchall()), 200
    finally:
        cursor.close(); conn.close()

#  CREDIT ACCOUNTS 
@admin_bp.route('/credit', methods=['GET'])
@token_required
@role_required('Admin')
def list_credit_accounts():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT farmer_id, credit_limit, used_credit, "
            "(credit_limit - used_credit) AS remaining_credit, "
            "due_amount, due_date, created_at "
            "FROM credit_accounts ORDER BY created_at DESC"
        )
        return jsonify(cursor.fetchall()), 200
    finally:
        cursor.close(); conn.close()

#  JOB REQUESTS 
@admin_bp.route('/jobs', methods=['GET'])
@token_required
@role_required('Admin')
def list_jobs():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT id AS job_id, farmer_id, worker_id, "
            "job_description, status AS job_status, created_at "
            "FROM job_requests ORDER BY created_at DESC LIMIT 100"
        )
        return jsonify(cursor.fetchall()), 200
    finally:
        cursor.close(); conn.close()

#  FEEDBACK 
@admin_bp.route('/feedback', methods=['GET'])
@token_required
@role_required('Admin')
def list_feedback():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT id AS feedback_id, prediction_id, user_id, "
            "predicted_disease, actual_disease, feedback_type, comment, created_at "
            "FROM prediction_feedback ORDER BY created_at DESC LIMIT 100"
        )
        return jsonify(cursor.fetchall()), 200
    finally:
        cursor.close(); conn.close()

@admin_bp.route('/feedback/stats', methods=['GET'])
@token_required
@role_required('Admin')
def feedback_stats():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT COUNT(*) AS total_predictions FROM disease_records")
        total_p = cursor.fetchone()['total_predictions']
        cursor.execute("SELECT COUNT(*) AS c FROM prediction_feedback")
        total_f = cursor.fetchone()['c']
        cursor.execute("SELECT COUNT(*) AS c FROM prediction_feedback WHERE feedback_type = 'Correct'")
        correct = cursor.fetchone()['c']
        cursor.execute("SELECT COUNT(*) AS c FROM prediction_feedback WHERE feedback_type = 'Incorrect'")
        incorrect = cursor.fetchone()['c']
        acc = round((correct / total_f * 100), 2) if total_f > 0 else 0
        cursor.execute(
            "SELECT predicted_disease, COUNT(*) AS count "
            "FROM prediction_feedback WHERE feedback_type = 'Incorrect' "
            "GROUP BY predicted_disease ORDER BY count DESC LIMIT 5"
        )
        most_misclassified = cursor.fetchall()
        return jsonify({
            'total_predictions': total_p,
            'total_feedback_submitted': total_f,
            'correct_predictions': correct,
            'incorrect_predictions': incorrect,
            'accuracy_percentage': acc,
            'most_misclassified': most_misclassified,
        }), 200
    finally:
        cursor.close(); conn.close()

@admin_bp.route('/feedback/errors', methods=['GET'])
@token_required
@role_required('Admin')
def feedback_errors():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT id AS feedback_id, prediction_id, user_id, "
            "predicted_disease, actual_disease, feedback_type, comment, created_at "
            "FROM prediction_feedback WHERE feedback_type = 'Incorrect' "
            "ORDER BY created_at DESC LIMIT 100"
        )
        return jsonify(cursor.fetchall()), 200
    finally:
        cursor.close(); conn.close()

@admin_bp.route('/feedback/export', methods=['GET'])
@token_required
@role_required('Admin')
def feedback_export():
    import csv
    from io import StringIO
    from flask import Response
    fmt = request.args.get('format', 'json')
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT d.image_url AS image_path, p.predicted_disease, p.actual_disease "
            "FROM prediction_feedback p "
            "JOIN disease_records d ON p.prediction_id = d.id "
            "WHERE p.actual_disease IS NOT NULL AND p.actual_disease != ''"
        )
        rows = cursor.fetchall()
        if fmt == 'csv':
            si = StringIO()
            cw = csv.DictWriter(si, fieldnames=['image_path', 'predicted_disease', 'actual_disease'])
            cw.writeheader()
            cw.writerows(rows)
            return Response(
                si.getvalue(), mimetype='text/csv',
                headers={'Content-Disposition': 'attachment;filename=feedback_export.csv'}
            )
        return jsonify(rows), 200
    finally:
        cursor.close(); conn.close()
