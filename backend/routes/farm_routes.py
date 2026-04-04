from flask import Blueprint, request, jsonify, g
from utils.auth_middleware import token_required
from utils.db import get_db

farm_bp = Blueprint('farm', __name__)

@farm_bp.route('/overview', methods=['GET'])
@token_required
def get_overview():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS farms (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT UNIQUE,
                acres VARCHAR(50),
                status VARCHAR(100),
                base_temp DECIMAL(5,2),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        ''')

        try: cursor.execute("ALTER TABLE farms ADD COLUMN primary_crop VARCHAR(100) DEFAULT 'Wheat'")
        except: pass
        try: cursor.execute("ALTER TABLE farms ADD COLUMN soil_moisture INT DEFAULT 65")
        except: pass
        try: cursor.execute("ALTER TABLE farms ADD COLUMN alerts VARCHAR(100) DEFAULT 'None'")
        except: pass
        try: cursor.execute("ALTER TABLE farms ADD COLUMN weather_state VARCHAR(50) DEFAULT 'Sunny'")
        except: pass

        cursor.execute("SELECT acres, status, base_temp, primary_crop, soil_moisture, alerts, weather_state FROM farms WHERE user_id = %s", (g.current_user['id'],))
        row = cursor.fetchone()
        
        if row:
            # Cast Decimal to float
            row['base_temp'] = float(row['base_temp']) if row['base_temp'] else 22.5
            return jsonify({
                "acres": row.get('acres', '10 Acres'),
                "status": row.get('status', 'Ready for Sowing'),
                "base_temp": row['base_temp'],
                "primary_crop": row.get('primary_crop') or 'Wheat',
                "soil_moisture": row.get('soil_moisture') or 65,
                "alerts": row.get('alerts') or 'None',
                "weather_state": row.get('weather_state') or 'Sunny'
            }), 200
        else:
            return jsonify({
                "acres": "10 Acres", 
                "status": "Ready for Sowing", 
                "base_temp": 24.5,
                "primary_crop": "Wheat",
                "soil_moisture": 65,
                "alerts": "None",
                "weather_state": "Sunny"
            }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@farm_bp.route('/overview', methods=['POST'])
@token_required
def update_overview():
    data = request.get_json(silent=True) or {}
    acres = data.get('acres', '10 Acres')
    status = data.get('status', 'Healthy')
    primary_crop = data.get('primary_crop', 'Wheat')
    alerts = data.get('alerts', 'None')
    weather_state = data.get('weather_state', 'Sunny')
    try:
        base_temp = float(data.get('base_temp', 24.5))
    except ValueError:
        base_temp = 24.5
    try:
        soil_moisture = int(data.get('soil_moisture', 65))
    except ValueError:
        soil_moisture = 65
    
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS farms (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT UNIQUE,
                acres VARCHAR(50),
                status VARCHAR(100),
                base_temp DECIMAL(5,2),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        ''')
        
        try: cursor.execute("ALTER TABLE farms ADD COLUMN primary_crop VARCHAR(100) DEFAULT 'Wheat'")
        except: pass
        try: cursor.execute("ALTER TABLE farms ADD COLUMN soil_moisture INT DEFAULT 65")
        except: pass
        try: cursor.execute("ALTER TABLE farms ADD COLUMN alerts VARCHAR(100) DEFAULT 'None'")
        except: pass
        try: cursor.execute("ALTER TABLE farms ADD COLUMN weather_state VARCHAR(50) DEFAULT 'Sunny'")
        except: pass

        cursor.execute('''
            INSERT INTO farms (user_id, acres, status, base_temp, primary_crop, soil_moisture, alerts, weather_state)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE 
                acres=VALUES(acres), status=VALUES(status), base_temp=VALUES(base_temp),
                primary_crop=VALUES(primary_crop), soil_moisture=VALUES(soil_moisture), alerts=VALUES(alerts), weather_state=VALUES(weather_state)
        ''', (g.current_user['id'], acres, status, base_temp, primary_crop, soil_moisture, alerts, weather_state))
        conn.commit()
        return jsonify({"message": "Farm advanced profile updated"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
