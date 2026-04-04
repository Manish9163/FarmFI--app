from flask import Blueprint, request, jsonify, g
from services.marketplace_service import MarketplaceService
from services.credit_service import CreditService
from utils.auth_middleware import token_required, role_required

marketplace_bp = Blueprint('marketplace', __name__)
market_service  = MarketplaceService()
credit_service  = CreditService()


# PRODUCTS 
@marketplace_bp.route('/products', methods=['GET'])
def list_products():
    category = request.args.get('category')
    page     = int(request.args.get('page', 1))
    result   = market_service.list_products(category=category, page=page)
    return jsonify(result), 200


@marketplace_bp.route('/products/<int:product_id>', methods=['GET'])
def get_product(product_id):
    product = market_service.get_product(product_id)
    if not product:
        return jsonify({'error': 'Product not found'}), 404
    return jsonify(product), 200


# CART 
@marketplace_bp.route('/cart', methods=['GET'])
@token_required
def get_cart():
    return jsonify(market_service.get_cart(g.current_user['id'])), 200


@marketplace_bp.route('/cart', methods=['POST'])
@token_required
def update_cart():
    data = request.get_json(silent=True) or {}
    if not data.get('product_id') or data.get('quantity') is None:
        return jsonify({'error': 'product_id and quantity required'}), 400
    result = market_service.upsert_cart(
        g.current_user['id'], int(data['product_id']), int(data['quantity'])
    )
    if not result['success']:
        return jsonify({'error': result['error']}), 400
    return jsonify({'message': 'Cart updated'}), 200


@marketplace_bp.route('/cart/<int:product_id>', methods=['DELETE'])
@token_required
def remove_from_cart(product_id):
    market_service.remove_from_cart(g.current_user['id'], product_id)
    return jsonify({'message': 'Item removed'}), 200


# ORDERS 
@marketplace_bp.route('/orders', methods=['POST'])
@token_required
@role_required('Farmer')
def place_order():
    data = request.get_json(silent=True) or {}
    payment_method   = data.get('payment_method', 'Cash')
    delivery_address = data.get('delivery_address', '')

    cart_items = market_service.get_cart(g.current_user['id'])
    if not cart_items:
        return jsonify({'error': 'Cart is empty'}), 400

    # Credit flow
    if payment_method == 'Credit':
        total = sum(float(i['price']) * int(i['quantity']) for i in cart_items)
        check = credit_service.can_purchase(g.current_user['id'], total)
        if not check['approved']:
            return jsonify({'error': check['reason']}), 402

    result = market_service.place_order(
        farmer_id=g.current_user['id'],
        cart_items=cart_items,
        payment_method=payment_method,
        delivery_address=delivery_address,
    )
    if not result['success']:
        return jsonify({'error': result['error']}), 400

    # Record credit charge
    if payment_method == 'Credit':
        credit_service.charge(g.current_user['id'], result['order_id'], result['total'])

    return jsonify(result), 201


@marketplace_bp.route('/orders', methods=['GET'])
@token_required
def get_orders():
    return jsonify(market_service.get_orders(g.current_user['id'])), 200


@marketplace_bp.route('/orders/<int:order_id>', methods=['GET'])
@token_required
def get_order(order_id):
    order = market_service.get_order_detail(order_id, g.current_user['id'])
    if not order:
        return jsonify({'error': 'Order not found'}), 404
    return jsonify(order), 200
