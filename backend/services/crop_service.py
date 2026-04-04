"""
Crop Suitability Prediction Service
Uses a pre-trained RandomForest model (if available) or a rule-based fallback.
"""
import os
import json
import pickle
from utils.db import get_db

# recomendation ( if fail ml model, use this rules )
_CROP_RULES = {
    ('Clay',   'Summer'): [('Rice', 88, None),        ('Sugarcane', 75, 'Heat stress risk'),  ('Soybean', 62, None)],
    ('Clay',   'Winter'): [('Wheat', 90, None),        ('Mustard', 78, None),                  ('Potato', 65, None)],
    ('Clay',   'Monsoon'):[('Rice', 92, None),          ('Jute', 70, None),                     ('Maize', 60, 'Waterlogging risk')],
    ('Loam',   'Summer'): [('Maize', 85, None),         ('Tomato', 82, None),                   ('Sunflower', 70, None)],
    ('Loam',   'Winter'): [('Wheat', 91, None),         ('Barley', 80, None),                   ('Pea', 75, None)],
    ('Loam',   'Monsoon'):[('Soybean', 88, None),       ('Groundnut', 76, None),                ('Cotton', 65, 'High moisture risk')],
    ('Sandy',  'Summer'): [('Groundnut', 80, None),     ('Watermelon', 75, None),               ('Bajra', 70, None)],
    ('Sandy',  'Winter'): [('Mustard', 72, None),       ('Chickpea', 68, None),                 ('Lentil', 60, None)],
    ('Sandy',  'Monsoon'):[('Bajra', 78, 'Low water retention'), ('Groundnut', 70, None),       ('Sorghum', 65, None)],
    ('Silt',   'Summer'): [('Tomato', 86, None),        ('Onion', 80, None),                    ('Chilli', 75, None)],
    ('Silt',   'Winter'): [('Wheat', 88, None),         ('Potato', 82, None),                   ('Garlic', 75, None)],
    ('Silt',   'Monsoon'):[('Rice', 84, None),           ('Taro', 70, None),                     ('Spinach', 68, None)],
}

_MODEL_PATH = os.path.join(os.path.dirname(__file__), '../ml_models/crop_rf_model.pkl')


class CropService:
    def __init__(self):
        self.model = None
        if os.path.exists(_MODEL_PATH):
            try:
                with open(_MODEL_PATH, 'rb') as f:
                    self.model = pickle.load(f)
            except Exception:
                self.model = None

    def predict(self, soil_type: str, season: str, avg_temperature: float,
                rainfall: float, humidity: float, user_id: int) -> dict:

        if self.model:
            crops = self._ml_predict(soil_type, season, avg_temperature, rainfall, humidity)
        else:
            crops = self._rule_predict(soil_type, season)

        # temperature / rainfall
        crops = self._apply_climate_adjustments(crops, avg_temperature, rainfall, humidity)

        conn = get_db()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "INSERT INTO crop_predictions "
                "(user_id, soil_type, season, avg_temperature, rainfall, humidity, recommended_crops, suitability_score) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
                (
                    user_id, soil_type, season, avg_temperature, rainfall, humidity,
                    json.dumps(crops),
                    crops[0]['suitability_pct'] if crops else 0,
                )
            )
            record_id = cursor.lastrowid
            conn.commit()
        finally:
            cursor.close()
            conn.close()

        return {
            'id': record_id,
            'top_crops': crops,
            'inputs': {
                'soil_type': soil_type, 'season': season,
                'avg_temperature': avg_temperature,
                'rainfall': rainfall, 'humidity': humidity,
            }
        }

    def get_history(self, user_id: int) -> list:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute(
                "SELECT * FROM crop_predictions WHERE user_id = %s ORDER BY created_at DESC LIMIT 20",
                (user_id,)
            )
            rows = cursor.fetchall()
            for r in rows:
                if isinstance(r.get('recommended_crops'), str):
                    r['recommended_crops'] = json.loads(r['recommended_crops'])
            return rows
        finally:
            cursor.close()
            conn.close()

    def _rule_predict(self, soil_type: str, season: str) -> list:
        key = (soil_type.title(), season.title())
        raw = _CROP_RULES.get(key, [('Maize', 60, None), ('Soybean', 55, None), ('Wheat', 50, None)])
        return [{'crop': c, 'suitability_pct': s, 'risk_warning': r} for c, s, r in raw]

    def _ml_predict(self, soil_type, season, temperature, rainfall, humidity) -> list:
        return self._rule_predict(soil_type, season)

    @staticmethod
    def _apply_climate_adjustments(crops: list, temperature: float, rainfall: float, humidity: float) -> list:
        for crop in crops:
            penalty = 0
            if temperature > 40:
                penalty += 10
                if not crop['risk_warning']:
                    crop['risk_warning'] = 'Extreme heat stress'
            if rainfall < 50:
                penalty += 5
            if humidity > 90:
                penalty += 5
                if not crop['risk_warning']:
                    crop['risk_warning'] = 'High disease pressure expected'
            crop['suitability_pct'] = max(0, crop['suitability_pct'] - penalty)
        return sorted(crops, key=lambda x: x['suitability_pct'], reverse=True)
