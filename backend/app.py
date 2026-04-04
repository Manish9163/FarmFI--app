import os
from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
from config import Config
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_talisman import Talisman
from waitress import serve

from routes.auth_routes import auth_bp
from routes.disease_routes import disease_bp
from routes.weather_routes import weather_bp
from routes.risk_routes import risk_bp
from routes.crop_routes import crop_bp
from routes.marketplace_routes import marketplace_bp
from routes.credit_routes import credit_bp
from routes.worker_routes import worker_bp
from routes.admin_routes import admin_bp
from routes.feedback_routes import feedback_bp
from routes.payment_routes import payment_bp
from routes.farm_routes import farm_bp
from routes.vegetable_routes import vegetable_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    # AUTO-MIGRATION: Ensure all required roles and tables exist
    from utils.db import get_db
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("INSERT IGNORE INTO roles (role_name) VALUES ('Buyer')")
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS buyer_profiles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL UNIQUE,
                business_name VARCHAR(255),
                delivery_address TEXT,
                city VARCHAR(100),
                state VARCHAR(100),
                pincode VARCHAR(10),
                gst_number VARCHAR(20),
                preferred_payment VARCHAR(50) DEFAULT 'UPI',
                total_orders INT DEFAULT 0,
                total_spent DECIMAL(12,2) DEFAULT 0.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        ''')
        conn.commit()
        cursor.close()
        conn.close()
        print("[MIGRATION] Buyer role + buyer_profiles table verified.")
    except Exception as e:
        print(f"[MIGRATION WARNING] Could not run migrations: {e}")

    # CORS 
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # SECURE: Cryptographic Security Headers (allowing local HTTP mapping for Expo)
    Talisman(app, content_security_policy=None, force_https=False)

    # SECURE: Native Rate-Limiter Gateway (DDoS & Brute-Force prevention)
    limiter = Limiter(
        get_remote_address,
        app=app,
        default_limits=["2500 per day", "150 per minute"],
        storage_uri="memory://"
    )

    # STABLE: Global Error Handling to prevent fatal uncaught HTTP crashes
    @app.errorhandler(429)
    def ratelimit_handler(e):
        return jsonify(error="RATE_LIMIT_EXCEEDED", message="Too many requests. Please slow down and respect FarmFi server limits."), 429

    @app.errorhandler(404)
    def route_not_found(e):
        return jsonify(error="NOT_FOUND", message="This endpoint does not exist on the API router."), 404

    @app.errorhandler(500)
    def internal_server_error(e):
        return jsonify(error="FATAL_500", message="The requested operation crashed severely on the backend container."), 500

    # Blueprint Registration 
    app.register_blueprint(auth_bp, url_prefix='/api/v1/auth')
    app.register_blueprint(disease_bp, url_prefix='/api/v1/disease')
    app.register_blueprint(weather_bp, url_prefix='/api/v1/weather')
    app.register_blueprint(risk_bp, url_prefix='/api/v1/risk')
    app.register_blueprint(crop_bp, url_prefix='/api/v1/crop')
    app.register_blueprint(marketplace_bp, url_prefix='/api/v1/marketplace')
    app.register_blueprint(credit_bp, url_prefix='/api/v1/credit')
    app.register_blueprint(worker_bp, url_prefix='/api/v1/workers')
    app.register_blueprint(admin_bp, url_prefix='/api/v1/admin')
    app.register_blueprint(feedback_bp, url_prefix='/api/v1/feedback')
    app.register_blueprint(payment_bp, url_prefix='/api/v1/payment')
    app.register_blueprint(farm_bp, url_prefix='/api/v1/farm')
    app.register_blueprint(vegetable_bp, url_prefix='/api/v1/vegetables')

    # Static file 
    @app.route('/uploads/<path:filename>')
    def serve_upload(filename):
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

    # Health check
    @app.route('/health')
    def health_check():
        return jsonify({'status': 'healthy', 'service': 'FarmFi API', 'version': '1.0'})

    return app


if __name__ == '__main__':
    app = create_app()
    # SCALABLE & FAST: Switch entirely out of Dev Mode and natively multi-thread the core via Waitress WSGI
    print("🚀 FARMFI CORE SECURED: Initializing Waitress Production WSGI Multi-Threaded Engine on Port 5000...")
    serve(app, host='0.0.0.0', port=5000, threads=8)