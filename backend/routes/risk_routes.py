from flask import Blueprint, request, jsonify, g
from services.risk_service import RiskPredictionService
from utils.auth_middleware import token_required

risk_bp = Blueprint('risk', __name__)
risk_service = RiskPredictionService()

VALID_CROPS = ['Tomato', 'Potato', 'Corn', 'Wheat', 'Rice', 'Soybean', 'Other']


@risk_bp.route('/predict', methods=['POST'])
@token_required
def predict_risk():
    data = request.get_json(silent=True) or {}
    required = ('temperature', 'humidity', 'rainfall', 'crop_type')
    missing = [f for f in required if data.get(f) is None]
    if missing:
        return jsonify({'error': f'Missing: {", ".join(missing)}'}), 400

    try:
        temperature = float(data['temperature'])
        humidity    = float(data['humidity'])
        rainfall    = float(data['rainfall'])
    except (ValueError, TypeError):
        return jsonify({'error': 'temperature, humidity and rainfall must be numbers'}), 400

    crop_type = data['crop_type'].strip().title()

    result = risk_service.predict(
        temperature=temperature,
        humidity=humidity,
        rainfall=rainfall,
        crop_type=crop_type,
        user_id=g.current_user['id'],
        weather_log_id=data.get('weather_log_id'),
    )
    return jsonify(result), 201


@risk_bp.route('/history', methods=['GET'])
@token_required
def risk_history():
    records = risk_service.get_history(g.current_user['id'])
    return jsonify(records), 200
