import os

routes = """

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
        cursor.execute("SELECT disease_name as result_disease, COUNT(*) as count FROM disease_records WHERE disease_name IS NOT NULL AND disease_name != '' GROUP BY disease_name ORDER BY count DESC LIMIT 10")
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
        cursor.execute("SELECT predicted_crop as crop_name, COUNT(*) as recommendation_count FROM crop_predictions WHERE predicted_crop IS NOT NULL GROUP BY predicted_crop ORDER BY recommendation_count DESC LIMIT 10")
        rows = cursor.fetchall()
        return jsonify(rows), 200
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

"""
with open('backend/routes/admin_routes.py', 'a') as f:
    f.write(routes)
print('Done!')
