
from utils.db import get_db


_CROP_RISK_THRESHOLDS = {
    'Tomato':   {'humidity_high': 75, 'temp_high': 32, 'rain_high': 10},
    'Potato':   {'humidity_high': 70, 'temp_high': 28, 'rain_high': 8},
    'Corn':     {'humidity_high': 80, 'temp_high': 35, 'rain_high': 15},
    'Wheat':    {'humidity_high': 70, 'temp_high': 30, 'rain_high': 12},
    'Rice':     {'humidity_high': 90, 'temp_high': 35, 'rain_high': 20},
    'Soybean':  {'humidity_high': 75, 'temp_high': 32, 'rain_high': 10},
    'default':  {'humidity_high': 75, 'temp_high': 32, 'rain_high': 10},
}


class RiskPredictionService:
    def predict(self, temperature: float, humidity: float, rainfall: float,
                crop_type: str, user_id: int, weather_log_id: int = None) -> dict:

        thresholds = _CROP_RISK_THRESHOLDS.get(crop_type, _CROP_RISK_THRESHOLDS['default'])

        score = 0
        if humidity   >= thresholds['humidity_high']: score += 1
        if temperature >= thresholds['temp_high']:    score += 1
        if rainfall    >= thresholds['rain_high']:    score += 1

        risk_level        = ['Low', 'Medium', 'Medium', 'High'][score]
        probability_score = round(score / 3 * 100, 2)

        # Persist
        conn = get_db()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "INSERT INTO risk_predictions "
                "(user_id, weather_log_id, crop_type, temperature, humidity, rainfall, risk_level, probability_score) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
                (user_id, weather_log_id, crop_type, temperature, humidity, rainfall,
                 risk_level, probability_score)
            )
            record_id = cursor.lastrowid
            conn.commit()
        finally:
            cursor.close()
            conn.close()

        return {
            'id':                record_id,
            'crop_type':         crop_type,
            'risk_level':        risk_level,
            'probability_score': probability_score,
            'factors': {
                'high_humidity':    humidity >= thresholds['humidity_high'],
                'high_temperature': temperature >= thresholds['temp_high'],
                'high_rainfall':    rainfall >= thresholds['rain_high'],
            }
        }

    def get_history(self, user_id: int) -> list:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute(
                "SELECT * FROM risk_predictions WHERE user_id = %s ORDER BY created_at DESC LIMIT 20",
                (user_id,)
            )
            return cursor.fetchall()
        finally:
            cursor.close()
            conn.close()
