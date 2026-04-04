import os
import uuid
from flask import Blueprint, request, jsonify, g, current_app
from werkzeug.utils import secure_filename
from services.ml_service import PlantDiseaseService
from services.pesticide_service import PesticideService
from services.explanation_engine import explain_prediction
from utils.auth_middleware import token_required
from utils.helpers import allowed_file
from utils.db import get_db

disease_bp = Blueprint('disease', __name__)
ml_service = PlantDiseaseService()
pesticide_service = PesticideService()


@disease_bp.route('/predict', methods=['POST'])
@token_required
def predict_disease():
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400

    file = request.files['image']
    if file.filename == '' or not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type. Allowed: jpg, jpeg, png, webp'}), 400

    image_bytes = file.read()

    try:
        prediction = ml_service.predict_image(image_bytes)

        # Generate farmer-friendly explanation
        explanation = explain_prediction(
            prediction['disease_name'],
            prediction['confidence'],
            prediction['severity_level']
        )

        # Persist image to uploads folder and save record to database
        upload_dir = current_app.config.get('UPLOAD_FOLDER', 'uploads')
        os.makedirs(upload_dir, exist_ok=True)
        ext = secure_filename(file.filename).rsplit('.', 1)[-1]
        filename = f"{uuid.uuid4().hex}.{ext}"
        img_path = os.path.join(upload_dir, filename)
        with open(img_path, 'wb') as fp:
            fp.write(image_bytes)
        image_url = f"/uploads/{filename}"

        # Generate annotated image with highlighted disease regions
        annotated_image_url = None
        spot_count = 0
        is_healthy = "healthy" in prediction['disease_name'].lower()

        if not is_healthy:
            highlight = ml_service.highlight_disease_regions(image_bytes)
            if highlight:
                ann_filename = f"{uuid.uuid4().hex}_annotated.png"
                ann_path = os.path.join(upload_dir, ann_filename)
                with open(ann_path, 'wb') as fp:
                    fp.write(highlight['image_bytes'])
                annotated_image_url = f"/uploads/{ann_filename}"
                spot_count = highlight['spot_count']

        # Save to disease_records
        conn = get_db()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "INSERT INTO disease_records (user_id, image_url, predicted_disease, confidence_score, severity_level) "
                "VALUES (%s, %s, %s, %s, %s)",
                (
                    g.current_user['id'],
                    image_url,
                    prediction['disease_name'],
                    prediction['confidence'],
                    prediction['severity_level'],
                )
            )
            prediction_id = cursor.lastrowid
            conn.commit()
        finally:
            cursor.close()
            conn.close()

        solution = pesticide_service.get_solution(prediction['disease_name'])

        return jsonify({
            'success': True,
            'prediction_id': prediction_id,
            'result': prediction,
            'solution': solution,
            'explanation': explanation,
            'image_url': image_url,
            'annotated_image_url': annotated_image_url,
            'spot_count': spot_count,
        }), 200

    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@disease_bp.route('/history', methods=['GET'])
@token_required
def disease_history():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT dr.*, ps.recommended_pesticide "
            "FROM disease_records dr "
            "LEFT JOIN pesticide_solutions ps ON dr.predicted_disease = ps.disease_name "
            "WHERE dr.user_id = %s ORDER BY dr.created_at DESC LIMIT 20",
            (g.current_user['id'],)
        )
        records = cursor.fetchall()
    finally:
        cursor.close()
        conn.close()
    return jsonify(records), 200


@disease_bp.route('/feedback', methods=['POST'])
@token_required
def submit_feedback():
    data = request.get_json(silent=True) or {}
    prediction_id = data.get('prediction_id')
    is_correct     = data.get('is_correct')
    actual_disease = data.get('actual_disease', '')

    if prediction_id is None or is_correct is None:
        return jsonify({'error': 'prediction_id and is_correct are required'}), 400

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT predicted_disease FROM disease_records WHERE id = %s AND user_id = %s",
                       (prediction_id, g.current_user['id']))
        record = cursor.fetchone()
        if not record:
            return jsonify({'error': 'Prediction record not found'}), 404

        feedback_type = 'Correct' if bool(is_correct) else 'Incorrect'
        cursor.execute(
            "INSERT INTO prediction_feedback "
            "(user_id, prediction_id, predicted_disease, actual_disease, feedback_type, is_correct, comment) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s)",
            (
                g.current_user['id'], prediction_id,
                record['predicted_disease'], actual_disease,
                feedback_type, bool(is_correct), data.get('comment', ''),
            )
        )
        conn.commit()
    finally:
        cursor.close()
        conn.close()

    return jsonify({'success': True, 'message': 'Feedback saved for model improvement'}), 201