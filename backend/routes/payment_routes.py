import time
import hmac
import hashlib

from flask import Blueprint, request, jsonify, g
from config import Config
from utils.auth_middleware import token_required

payment_bp = Blueprint('payment', __name__)


def _razorpay_client():
    try:
        import razorpay
        return razorpay.Client(auth=(Config.RAZORPAY_KEY_ID, Config.RAZORPAY_KEY_SECRET))
    except Exception as e:
        raise RuntimeError(f'Razorpay unavailable: {e}')


#  order (Razorpay) 
@payment_bp.route('/create-order', methods=['POST'])
@token_required
def create_order():
    if not Config.RAZORPAY_KEY_ID or not Config.RAZORPAY_KEY_SECRET:
        return jsonify({'error': 'Payment gateway not configured'}), 503

    data = request.get_json(silent=True) or {}
    amount = data.get('amount')
    if not amount or float(amount) <= 0:
        return jsonify({'error': 'Valid amount required'}), 400
    amount = float(amount)

    if amount > Config.MAX_ONLINE_TXN_INR:
        return jsonify({
            'error': f'Per-transaction limit is ₹{Config.MAX_ONLINE_TXN_INR:.0f}. Split this payment into smaller amounts.'
        }), 400

    try:
        client = _razorpay_client()
        receipt = f"farmfi_{g.current_user['id']}_{int(time.time())}"
        order = client.order.create({
            'amount':          int(amount * 100),   # paise
            'currency':        'INR',
            'receipt':         receipt,
            'payment_capture': 1,
        })
        return jsonify({
            'order_id': order['id'],
            'amount':   order['amount'],
            'currency': order['currency'],
            'key_id':   Config.RAZORPAY_KEY_ID,
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Verify payment (HMAC-SHA256) 
@payment_bp.route('/verify', methods=['POST'])
@token_required
def verify_payment():
    data = request.get_json(silent=True) or {}
    required = ('razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature')
    if not all(data.get(k) for k in required):
        return jsonify({'error': 'Missing verification fields'}), 400

    msg = f"{data['razorpay_order_id']}|{data['razorpay_payment_id']}"
    expected = hmac.new(
        Config.RAZORPAY_KEY_SECRET.encode('utf-8'),
        msg.encode('utf-8'),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, data['razorpay_signature']):
        return jsonify({'verified': False, 'error': 'Signature mismatch — possible tampering'}), 400

    return jsonify({'verified': True}), 200
