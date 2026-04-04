import mysql.connector
from mysql.connector import pooling
from config import Config

_pool = None

def run_migrations():
    conn = get_pool().get_connection()
    cursor = conn.cursor()
    try:
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
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS vegetables (
                id INT AUTO_INCREMENT PRIMARY KEY,
                farmer_id INT,
                name VARCHAR(255),
                price_per_kg DECIMAL(10,2),
                quantity_kg INT,
                image_url VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE
            )
        ''')
        conn.commit()
        print("[DB] Migrations executed successfully.")
    except Exception as e:
        print(f"[DB] Migration warning: {e}")
    finally:
        cursor.close()
        conn.close()

def get_pool():
    global _pool
    if _pool is None:
        _pool = pooling.MySQLConnectionPool(
            pool_name="farmfi_pool",
            pool_size=10,
            host=Config.DB_HOST,
            port=Config.DB_PORT,
            database=Config.DB_NAME,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD,
            charset='utf8mb4',
            autocommit=False,
        )
        run_migrations()
    return _pool

def get_db():
    """Return a connection from the pool.  Use as context manager or call .close()."""
    return get_pool().get_connection()

