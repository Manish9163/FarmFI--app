import csv
import io

from flask import Blueprint, request, jsonify, g, make_response

from utils.auth_middleware import token_required, role_required
from services.feedback_service import (
    DISEASE_CLASSES,
    submit_feedback,
    get_stats,
    get_export_rows,
    get_prediction_feedback_history,
)

feedback_bp = Blueprint('feedback', __name__)


# feedback 
@feedback_bp.route('', methods=['POST'])
@token_required
def post_feedback():
    """
    Submit (or update) feedback on a disease prediction.

    Body (JSON):
        prediction_id  : int   — required
        feedback_type  : str   — 'Correct' | 'Incorrect'
        actual_disease : str   — required when feedback_type == 'Incorrect'
        comment        : str   — optional free-text
    """
    data = request.get_json(silent=True) or {}

    prediction_id = data.get('prediction_id')
    feedback_type = data.get('feedback_type')
    actual_disease = data.get('actual_disease', '').strip()
    comment = data.get('comment', '').strip()

    if not prediction_id:
        return jsonify({'error': 'prediction_id is required'}), 400
    if feedback_type not in ('Correct', 'Incorrect'):
        return jsonify({'error': "feedback_type must be 'Correct' or 'Incorrect'"}), 400
    if feedback_type == 'Incorrect' and not actual_disease:
        return jsonify({'error': 'actual_disease is required when feedback_type is Incorrect'}), 400
    if actual_disease and actual_disease not in DISEASE_CLASSES:
        return jsonify({'error': 'actual_disease must be a valid PlantVillage class name'}), 400

    result, err = submit_feedback(
        g.current_user['id'], prediction_id, feedback_type, actual_disease, comment
    )
    if err:
        return jsonify({'error': err}), 404

    return jsonify(result), 201


# history/prediction_id 
@feedback_bp.route('/history/<int:prediction_id>', methods=['GET'])
@token_required
def feedback_history(prediction_id):
    """Returns full feedback edit history for a specific prediction (current user only)."""
    rows, err = get_prediction_feedback_history(g.current_user['id'], prediction_id)
    if err:
        return jsonify({'error': err}), 404
    return jsonify({'history': rows}), 200


# feedback/diseases 
@feedback_bp.route('/diseases', methods=['GET'])
@token_required
def list_diseases():
    """Returns the full list of recognised PlantVillage disease classes."""
    return jsonify({'diseases': DISEASE_CLASSES}), 200


# feedback/stats  (Admin) 
@feedback_bp.route('/stats', methods=['GET'])
@token_required
@role_required('Admin')
def feedback_stats():
    """Aggregated feedback stats and top misclassifications for ML retraining."""
    result, err = get_stats()
    if err:
        return jsonify({'error': err}), 500
    return jsonify(result), 200


# feedback/export  (Admin ) 
@feedback_bp.route('/export', methods=['GET'])
@token_required
@role_required('Admin')
def export_feedback():
    """
    Downloads the full feedback dataset as a CSV file.
    Intended for use as training data in future model-retraining pipelines.
    """
    rows, err = get_export_rows()
    if err:
        return jsonify({'error': err}), 500

    output = io.StringIO()
    fieldnames = [
        'id', 'user_name', 'prediction_id',
        'predicted_disease', 'actual_disease',
        'feedback_type', 'is_correct', 'comment', 'created_at',
    ]
    writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction='ignore')
    writer.writeheader()
    for row in rows:
        row['created_at'] = str(row['created_at'])
        writer.writerow(row)

    response = make_response(output.getvalue())
    response.headers['Content-Type'] = 'text/csv; charset=utf-8'
    response.headers['Content-Disposition'] = 'attachment; filename=farmfi_feedback.csv'
    return response
