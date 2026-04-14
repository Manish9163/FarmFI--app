import os
from dotenv import load_dotenv

load_dotenv(override=True)


def parse_origins(raw_value: str) -> list[str]:
    return [origin.strip().rstrip('/') for origin in raw_value.split(',') if origin.strip()]

class Config:
    FLASK_ENV           = os.getenv('FLASK_ENV', 'development')
    SECRET_KEY          = os.getenv('SECRET_KEY', 'fallback-secret')
    JWT_EXPIRY_HOURS    = int(os.getenv('JWT_EXPIRY_HOURS', 24))

    DB_HOST     = os.getenv('DB_HOST', 'localhost')
    DB_PORT     = int(os.getenv('DB_PORT', 3306))
    DB_NAME     = os.getenv('DB_NAME', 'farmfi')
    DB_USER     = os.getenv('DB_USER', 'root')
    DB_PASSWORD = os.getenv('DB_PASSWORD', '')

    UPLOAD_FOLDER       = os.getenv('UPLOAD_FOLDER', 'uploads')
    MAX_CONTENT_LENGTH  = int(os.getenv('MAX_CONTENT_MB', 16)) * 1024 * 1024
    ALLOWED_EXTENSIONS  = set(os.getenv('ALLOWED_EXTENSIONS', 'jpg,jpeg,png,webp').split(','))

    WEATHER_API_KEY  = os.getenv('WEATHER_API_KEY', '')

    # Razorpay
    RAZORPAY_KEY_ID     = os.getenv('RAZORPAY_KEY_ID', '')
    RAZORPAY_KEY_SECRET = os.getenv('RAZORPAY_KEY_SECRET', '')
    MAX_ONLINE_TXN_INR  = float(os.getenv('MAX_ONLINE_TXN_INR', 5000)) // once you build for production level remove this line
    WEATHER_BASE_URL = os.getenv('WEATHER_BASE_URL', 'https://api.weatherapi.com/v1')

    FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')
    FRONTEND_URLS = parse_origins(os.getenv('FRONTEND_URLS', FRONTEND_URL))

    SMTP_SERVER   = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
    SMTP_PORT     = int(os.getenv('SMTP_PORT', 587))
    SMTP_USER     = os.getenv('SMTP_USER', '')
    SMTP_PASSWORD = os.getenv('SMTP_PASSWORD', '')

    FAST2SMS_API_KEY = os.getenv('FAST2SMS_API_KEY', '')

    if FLASK_ENV == 'development':
        for dev_origin in (
            'http://localhost:5173',
            'http://127.0.0.1:5173',
            'http://localhost:5174',
            'http://127.0.0.1:5174',
        ):
            if dev_origin not in FRONTEND_URLS:
                FRONTEND_URLS.append(dev_origin)
