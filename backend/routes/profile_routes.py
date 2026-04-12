from flask import Blueprint, request, jsonify, g
from utils.auth_middleware import token_required
from utils.db import get_db

profile_bp = Blueprint('profile', __name__)


@profile_bp.route('/', methods=['GET'], strict_slashes=False)
@token_required
def get_profile():
    """Aggregated profile: user info, KYC, wallet, orders, credit summary"""
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    uid = g.current_user['id']
    role = g.current_user.get('role_name', '')

    try:
        # --- Basic user info ---
        profile = {
            'id': uid,
            'full_name': g.current_user['full_name'],
            'email': g.current_user['email'],
            'role': role,
        }

        # --- Wallet (auto-create table + row) ---
        try:
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS wallets (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL UNIQUE,
                    balance DECIMAL(12,2) DEFAULT 0.00,
                    total_earned DECIMAL(12,2) DEFAULT 0.00,
                    total_spent DECIMAL(12,2) DEFAULT 0.00,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            ''')
            cursor.execute("INSERT IGNORE INTO wallets (user_id) VALUES (%s)", (uid,))
            conn.commit()
            cursor.execute("SELECT balance, total_earned, total_spent FROM wallets WHERE user_id = %s", (uid,))
            wallet = cursor.fetchone()
            profile['wallet'] = {
                'balance': float(wallet['balance']) if wallet else 0,
                'total_earned': float(wallet['total_earned']) if wallet else 0,
                'total_spent': float(wallet['total_spent']) if wallet else 0,
            }
        except Exception:
            profile['wallet'] = {'balance': 0, 'total_earned': 0, 'total_spent': 0}

        # --- KYC Status ---
        try:
            cursor.execute("SELECT status, full_name, aadhaar, pan, farm_size, age FROM kyc_profiles WHERE user_id = %s", (uid,))
            kyc = cursor.fetchone()
            profile['kyc'] = kyc or {'status': 'not_submitted'}
        except Exception:
            profile['kyc'] = {'status': 'not_submitted'}

        # --- Orders (purchases as buyer) ---
        try:
            cursor.execute(
                "SELECT COUNT(*) as total_orders, COALESCE(SUM(total_amount),0) as total_spent_orders "
                "FROM orders WHERE buyer_id = %s", (uid,)
            )
            buyer_stats = cursor.fetchone()
            profile['purchases'] = {
                'total_orders': buyer_stats['total_orders'] if buyer_stats else 0,
                'total_spent': float(buyer_stats['total_spent_orders']) if buyer_stats else 0,
            }
        except Exception:
            profile['purchases'] = {'total_orders': 0, 'total_spent': 0}

        # Recent purchase history (last 10)
        try:
            cursor.execute('''
                SELECT o.vegetable_name, o.quantity_kg, o.price_per_kg, o.total_amount, 
                       o.status, o.ordered_at, u.full_name as farmer_name
                FROM orders o JOIN users u ON o.farmer_id = u.id
                WHERE o.buyer_id = %s ORDER BY o.ordered_at DESC LIMIT 10
            ''', (uid,))
            rows = cursor.fetchall()
            # Convert Decimal/datetime to serializable types
            purchase_history = []
            for r in rows:
                purchase_history.append({
                    'vegetable_name': r['vegetable_name'],
                    'quantity_kg': float(r['quantity_kg']) if r['quantity_kg'] else 0,
                    'price_per_kg': float(r['price_per_kg']) if r['price_per_kg'] else 0,
                    'total_amount': float(r['total_amount']) if r['total_amount'] else 0,
                    'status': r['status'],
                    'ordered_at': str(r['ordered_at']) if r['ordered_at'] else '',
                    'farmer_name': r['farmer_name'],
                })
            profile['purchase_history'] = purchase_history
        except Exception:
            profile['purchase_history'] = []

        # --- Sales (as farmer) ---
        try:
            cursor.execute(
                "SELECT COUNT(*) as total_sales, COALESCE(SUM(total_amount),0) as total_earned_sales "
                "FROM orders WHERE farmer_id = %s", (uid,)
            )
            seller_stats = cursor.fetchone()
            profile['sales'] = {
                'total_sales': seller_stats['total_sales'] if seller_stats else 0,
                'total_earned': float(seller_stats['total_earned_sales']) if seller_stats else 0,
            }
        except Exception:
            profile['sales'] = {'total_sales': 0, 'total_earned': 0}

        # Recent sales history (last 10)
        try:
            cursor.execute('''
                SELECT o.vegetable_name, o.quantity_kg, o.price_per_kg, o.total_amount, 
                       o.status, o.ordered_at, u.full_name as buyer_name
                FROM orders o JOIN users u ON o.buyer_id = u.id
                WHERE o.farmer_id = %s ORDER BY o.ordered_at DESC LIMIT 10
            ''', (uid,))
            rows = cursor.fetchall()
            sales_history = []
            for r in rows:
                sales_history.append({
                    'vegetable_name': r['vegetable_name'],
                    'quantity_kg': float(r['quantity_kg']) if r['quantity_kg'] else 0,
                    'price_per_kg': float(r['price_per_kg']) if r['price_per_kg'] else 0,
                    'total_amount': float(r['total_amount']) if r['total_amount'] else 0,
                    'status': r['status'],
                    'ordered_at': str(r['ordered_at']) if r['ordered_at'] else '',
                    'buyer_name': r['buyer_name'],
                })
            profile['sales_history'] = sales_history
        except Exception:
            profile['sales_history'] = []

        # --- Credit summary (for farmers) ---
        if role == 'Farmer':
            try:
                cursor.execute(
                    "SELECT outstanding_balance, credit_limit, credit_score "
                    "FROM credit_accounts WHERE user_id = %s", (uid,)
                )
                credit = cursor.fetchone()
                if credit:
                    profile['credit'] = {
                        'outstanding_balance': float(credit['outstanding_balance']),
                        'credit_limit': float(credit['credit_limit']),
                        'credit_score': int(credit['credit_score']) if credit['credit_score'] else 0,
                    }
                else:
                    profile['credit'] = {'outstanding_balance': 0, 'credit_limit': 0, 'credit_score': 0}
            except Exception:
                profile['credit'] = {'outstanding_balance': 0, 'credit_limit': 0, 'credit_score': 0}
        else:
            profile['credit'] = None

        # --- Active listings (for farmers) ---
        if role == 'Farmer':
            try:
                cursor.execute(
                    "SELECT COUNT(*) as active_listings, COALESCE(SUM(quantity_kg),0) as total_stock "
                    "FROM vegetables WHERE farmer_id = %s AND quantity_kg > 0", (uid,)
                )
                listings = cursor.fetchone()
                profile['listings'] = {
                    'active': listings['active_listings'] if listings else 0,
                    'total_stock_kg': float(listings['total_stock']) if listings else 0,
                }
            except Exception:
                profile['listings'] = {'active': 0, 'total_stock_kg': 0}
        else:
            profile['listings'] = None

        return jsonify(profile), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500
    finally:
        cursor.close()
        conn.close()


@profile_bp.route('/wallet/add', methods=['POST'])
@token_required
def add_wallet_funds():
    data = request.get_json(silent=True) or {}
    amount = float(data.get('amount', 0))
    if amount <= 0:
        return jsonify({'error': 'Amount must be positive'}), 400

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS wallets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL UNIQUE,
                balance DECIMAL(12,2) DEFAULT 0.00,
                total_earned DECIMAL(12,2) DEFAULT 0.00,
                total_spent DECIMAL(12,2) DEFAULT 0.00,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        ''')
        cursor.execute("INSERT IGNORE INTO wallets (user_id) VALUES (%s)", (g.current_user['id'],))
        cursor.execute(
            "UPDATE wallets SET balance = balance + %s, total_earned = total_earned + %s WHERE user_id = %s",
            (amount, amount, g.current_user['id'])
        )
        conn.commit()
        return jsonify({'message': f'Added {amount} to wallet successfully.'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
