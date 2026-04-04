from flask import Blueprint, request, jsonify, g
from services.weather_service import WeatherService
from utils.auth_middleware import token_required

weather_bp = Blueprint('weather', __name__)
weather_service = WeatherService()


@weather_bp.route('', methods=['GET'])
@token_required
def get_weather():
    location = request.args.get('location', '').strip()
    lat = request.args.get('lat')
    lon = request.args.get('lon')

    if lat and lon:
        try:
            result = weather_service.get_weather_by_coords(float(lat), float(lon), g.current_user['id'])
        except ValueError:
            return jsonify({'error': 'lat/lon must be numbers'}), 400
    elif location:
        result = weather_service.get_weather(location, g.current_user['id'])
    else:
        return jsonify({'error': 'Provide location or lat/lon query param'}), 400

    if 'error' in result:
        return jsonify({'error': result['error']}), 502
    return jsonify(result), 200


@weather_bp.route('/logs', methods=['GET'])
@token_required
def weather_logs():
    logs = weather_service.get_logs(g.current_user['id'])
    return jsonify(logs), 200
