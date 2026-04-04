from flask import Blueprint, request, jsonify, g
from services.crop_service import CropService
from utils.auth_middleware import token_required

crop_bp = Blueprint('crop', __name__)
crop_service = CropService()

VALID_SOILS   = ['Clay', 'Loam', 'Sandy', 'Silt']
VALID_SEASONS = ['Summer', 'Winter', 'Monsoon']


@crop_bp.route('/predict', methods=['POST'])
@token_required
def predict_crop():
    data = request.get_json(silent=True) or {}
    required = ('soil_type', 'season', 'avg_temperature', 'rainfall', 'humidity')
    missing = [f for f in required if data.get(f) is None]
    if missing:
        return jsonify({'error': f'Missing: {", ".join(missing)}'}), 400

    soil_type = data['soil_type'].strip().title()
    season    = data['season'].strip().title()
    if soil_type not in VALID_SOILS:
        return jsonify({'error': f'soil_type must be one of {VALID_SOILS}'}), 400
    if season not in VALID_SEASONS:
        return jsonify({'error': f'season must be one of {VALID_SEASONS}'}), 400

    try:
        avg_temp  = float(data['avg_temperature'])
        rainfall  = float(data['rainfall'])
        humidity  = float(data['humidity'])
    except (ValueError, TypeError):
        return jsonify({'error': 'avg_temperature, rainfall, humidity must be numbers'}), 400

    result = crop_service.predict(
        soil_type=soil_type, season=season,
        avg_temperature=avg_temp, rainfall=rainfall, humidity=humidity,
        user_id=g.current_user['id'],
    )
    return jsonify(result), 201


@crop_bp.route('/history', methods=['GET'])
@token_required
def crop_history():
    return jsonify(crop_service.get_history(g.current_user['id'])), 200
