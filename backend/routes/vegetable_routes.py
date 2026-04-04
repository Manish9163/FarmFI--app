from flask import Blueprint, request, jsonify, g
from utils.auth_middleware import token_required
from utils.db import get_db

vegetable_bp = Blueprint('vegetables', __name__)

@vegetable_bp.route('/', methods=['GET'])
@token_required
def get_vegetables():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        # Construct DB structure securely via schema definition
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS vegetables (
                id INT AUTO_INCREMENT PRIMARY KEY,
                farmer_id INT,
                name VARCHAR(255),
                price_per_kg DECIMAL(10,2),
                quantity_kg INT,
                image_url VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE
            )
        ''')
        
        # If user is a farmer, show their listings specifically.
        # If consumer/buyer, show everything > 0
        if g.current_user.get('role') == 'Farmer':
            cursor.execute('''
                SELECT v.*, u.full_name as farmer_name 
                FROM vegetables v 
                JOIN users u ON v.farmer_id = u.id 
                WHERE v.farmer_id = %s
                ORDER BY v.created_at DESC
            ''', (g.current_user['id'],))
        else:
            cursor.execute('''
                SELECT v.*, u.full_name as farmer_name 
                FROM vegetables v 
                JOIN users u ON v.farmer_id = u.id 
                WHERE v.quantity_kg > 0
                ORDER BY v.created_at DESC
            ''')
        return jsonify(cursor.fetchall()), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@vegetable_bp.route('/', methods=['POST'])
@token_required
def add_vegetable():
    if g.current_user.get('role') != 'Farmer':
        return jsonify({'error': 'ACCESS_DENIED: Only registered Farmers can provision supply.'}), 403
    
    data = request.get_json(silent=True) or {}
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO vegetables (farmer_id, name, price_per_kg, quantity_kg, image_url) VALUES (%s, %s, %s, %s, %s)",
            (g.current_user['id'], data.get('name'), data.get('price_per_kg'), data.get('quantity_kg'), data.get('image_url'))
        )
        conn.commit()
        return jsonify({'message': 'Vegetable natively listed into centralized inventory.'}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@vegetable_bp.route('/buy', methods=['POST'])
@token_required
def buy_vegetable():
    data = request.get_json(silent=True) or {}
    veg_id = data.get('vegetable_id')
    buy_qty = float(data.get('quantity_kg', 1))
    
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        # High concurrency transaction locking
        cursor.execute("SELECT quantity_kg, name FROM vegetables WHERE id = %s FOR UPDATE", (veg_id,))
        row = cursor.fetchone()
        
        if not row:
            return jsonify({'error': 'Vector isolated: Product no longer exists.'}), 404
            
        if row['quantity_kg'] < buy_qty:
            return jsonify({'error': f'Insufficient stock. Only {row["quantity_kg"]}kg available.'}), 400
        
        # Deduct natively
        cursor.execute(
            "UPDATE vegetables SET quantity_kg = quantity_kg - %s WHERE id = %s",
            (buy_qty, veg_id)
        )
        conn.commit()
        return jsonify({'message': f'Successfully acquired {buy_qty}kg of {row["name"]}! Payment routed to Farmer.'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
