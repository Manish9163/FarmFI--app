from utils.db import get_db


class MarketplaceService:
    # PRODUCTS
    def list_products(self, category: str = None, page: int = 1, per_page: int = 12) -> dict:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        offset = (page - 1) * per_page
        try:
            if category:
                cursor.execute(
                    "SELECT p.*, i.stock_quantity FROM products p "
                    "JOIN inventory i ON p.id = i.product_id "
                    "WHERE p.is_active = TRUE AND p.category = %s "
                    "LIMIT %s OFFSET %s",
                    (category, per_page, offset)
                )
            else:
                cursor.execute(
                    "SELECT p.*, i.stock_quantity FROM products p "
                    "JOIN inventory i ON p.id = i.product_id "
                    "WHERE p.is_active = TRUE LIMIT %s OFFSET %s",
                    (per_page, offset)
                )
            products = cursor.fetchall()
            cursor.execute("SELECT COUNT(*) AS total FROM products WHERE is_active = TRUE")
            total = cursor.fetchone()['total']
            return {'products': products, 'total': total, 'page': page, 'per_page': per_page}
        finally:
            cursor.close()
            conn.close()

    def get_product(self, product_id: int) -> dict | None:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute(
                "SELECT p.*, i.stock_quantity FROM products p "
                "JOIN inventory i ON p.id = i.product_id "
                "WHERE p.id = %s AND p.is_active = TRUE",
                (product_id,)
            )
            return cursor.fetchone()
        finally:
            cursor.close()
            conn.close()

    # CART
    def get_cart(self, user_id: int) -> list:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute(
                "SELECT c.id AS cart_id, c.quantity, p.id, p.name, p.price, p.image_url, "
                "i.stock_quantity, (c.quantity * p.price) AS subtotal "
                "FROM carts c JOIN products p ON c.product_id = p.id "
                "JOIN inventory i ON p.id = i.product_id "
                "WHERE c.user_id = %s",
                (user_id,)
            )
            return cursor.fetchall()
        finally:
            cursor.close()
            conn.close()

    def upsert_cart(self, user_id: int, product_id: int, quantity: int) -> dict:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        try:
            # Validate stock
            cursor.execute("SELECT stock_quantity FROM inventory WHERE product_id = %s", (product_id,))
            inv = cursor.fetchone()
            if not inv:
                return {'success': False, 'error': 'Product not found'}
            if quantity > inv['stock_quantity']:
                return {'success': False, 'error': 'Not enough stock'}

            if quantity <= 0:
                cursor.execute("DELETE FROM carts WHERE user_id = %s AND product_id = %s", (user_id, product_id))
            else:
                cursor.execute(
                    "INSERT INTO carts (user_id, product_id, quantity) VALUES (%s,%s,%s) "
                    "ON DUPLICATE KEY UPDATE quantity = %s",
                    (user_id, product_id, quantity, quantity)
                )
            conn.commit()
            return {'success': True}
        finally:
            cursor.close()
            conn.close()

    def remove_from_cart(self, user_id: int, product_id: int):
        conn = get_db()
        cursor = conn.cursor()
        try:
            cursor.execute("DELETE FROM carts WHERE user_id = %s AND product_id = %s", (user_id, product_id))
            conn.commit()
        finally:
            cursor.close()
            conn.close()

    # ORDERS
    def place_order(self, farmer_id: int, cart_items: list, payment_method: str,
                    delivery_address: str = '', notes: str = '') -> dict:
        if not cart_items:
            return {'success': False, 'error': 'Cart is empty'}

        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        try:
            total = sum(item['price'] * item['quantity'] for item in cart_items)

            # Create order
            cursor.execute(
                "INSERT INTO orders (farmer_id, total_amount, payment_method, delivery_address, notes) "
                "VALUES (%s,%s,%s,%s,%s)",
                (farmer_id, total, payment_method, delivery_address, notes)
            )
            order_id = cursor.lastrowid

            # Insert items & deduct stock
            for item in cart_items:
                cursor.execute(
                    "INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) "
                    "VALUES (%s,%s,%s,%s)",
                    (order_id, item['id'], item['quantity'], item['price'])
                )
                cursor.execute(
                    "UPDATE inventory SET stock_quantity = stock_quantity - %s WHERE product_id = %s",
                    (item['quantity'], item['id'])
                )

            # Clear cart
            cursor.execute("DELETE FROM carts WHERE user_id = %s", (farmer_id,))
            conn.commit()
            return {'success': True, 'order_id': order_id, 'total': total}
        except Exception as e:
            conn.rollback()
            return {'success': False, 'error': str(e)}
        finally:
            cursor.close()
            conn.close()

    def get_orders(self, farmer_id: int) -> list:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute(
                "SELECT o.*, GROUP_CONCAT(p.name SEPARATOR ', ') AS products_summary "
                "FROM orders o "
                "LEFT JOIN order_items oi ON o.id = oi.order_id "
                "LEFT JOIN products p ON oi.product_id = p.id "
                "WHERE o.farmer_id = %s GROUP BY o.id ORDER BY o.created_at DESC",
                (farmer_id,)
            )
            return cursor.fetchall()
        finally:
            cursor.close()
            conn.close()

    def get_order_detail(self, order_id: int, farmer_id: int) -> dict | None:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute("SELECT * FROM orders WHERE id = %s AND farmer_id = %s", (order_id, farmer_id))
            order = cursor.fetchone()
            if not order:
                return None
            cursor.execute(
                "SELECT oi.*, p.name, p.image_url FROM order_items oi "
                "JOIN products p ON oi.product_id = p.id WHERE oi.order_id = %s",
                (order_id,)
            )
            order['items'] = cursor.fetchall()
            return order
        finally:
            cursor.close()
            conn.close()
