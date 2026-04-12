import bcrypt
import jwt
import datetime
import random
import re
from config import Config
from utils.db import get_db
from utils.email_service import send_otp_email
from utils.sms_service import send_sms

def detect_identifier(identifier: str) -> dict:
    identifier = identifier.strip()
    if '@' in identifier:
        if re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', identifier):
            return {'type': 'email', 'value': identifier.lower()}
        return {'type': 'invalid', 'value': None}
        
    # Phone number extraction
    normalized_phone = re.sub(r'\D', '', identifier)
    if len(normalized_phone) > 10 and normalized_phone.startswith('91'):
        normalized_phone = normalized_phone[2:]
    elif len(normalized_phone) > 10 and normalized_phone.startswith('0'):
        normalized_phone = normalized_phone[1:]
    elif len(normalized_phone) > 10:
        normalized_phone = normalized_phone[-10:]
        
    if re.match(r'^[6-9]\d{9}$', normalized_phone):
        return {'type': 'phone', 'value': normalized_phone}
        
    return {'type': 'invalid', 'value': None}

class AuthService:
    def register(self, full_name: str, email: str, phone: str, password: str, role_name: str = 'Farmer') -> dict:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        try:
            # Resolve role
            cursor.execute("SELECT id FROM roles WHERE role_name = %s", (role_name,))
            role = cursor.fetchone()
            if not role:
                return {'success': False, 'error': f'Invalid role: {role_name}'}

            # Duplicate check
            cursor.execute("SELECT id FROM users WHERE email = %s OR phone = %s", (email, phone))
            if cursor.fetchone():
                return {'success': False, 'error': 'Email or phone already registered'}

            # Hash password
            pw_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

            cursor.execute(
                "INSERT INTO users (role_id, full_name, email, phone, password_hash) VALUES (%s,%s,%s,%s,%s)",
                (role['id'], full_name, email, phone, pw_hash)
            )
            user_id = cursor.lastrowid
            conn.commit()

            # Auto-create credit account for Farmers
            if role_name == 'Farmer':
                cursor.execute(
                    "INSERT INTO credit_accounts (farmer_id) VALUES (%s)", (user_id,)
                )
                conn.commit()

            return {'success': True, 'user_id': user_id, 'role': role_name}
        except Exception as e:
            conn.rollback()
            return {'success': False, 'error': str(e)}
        finally:
            cursor.close()
            conn.close()

    # LOGIN

    def login(self, email: str, password: str) -> dict:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute(
                "SELECT u.id, u.full_name, u.email, u.phone, u.password_hash, r.role_name "
                "FROM users u JOIN roles r ON u.role_id = r.id "
                "WHERE u.email = %s AND u.is_active = TRUE",
                (email,)
            )
            user = cursor.fetchone()
        finally:
            cursor.close()
            conn.close()

        if not user:
            return {'success': False, 'error': 'Invalid credentials'}

        if not bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
            return {'success': False, 'error': 'Invalid credentials'}

        # Skip OTP for Admin users
        # NOTE: OTP is commented out for testing — uncomment below to re-enable
        # if user.get('role_name') == 'Admin':
        token = self._generate_token(user['id'], user['role_name'])
        return {
            'success': True,
            'requires_otp': False,
            'token': token,
            'user': {
                'id': user['id'],
                'full_name': user['full_name'],
                'email': user['email'],
                'role': user['role_name'],
            }
        }

        # ── OTP FLOW (commented out for testing) ──────────────────────
        # # Generate OTP
        # otp = str(random.randint(100000, 999999))
        # expires = datetime.datetime.utcnow() + datetime.timedelta(minutes=10)
        # 
        # # Save to database
        # conn = get_db()
        # cursor = conn.cursor()
        # try:
        #     cursor.execute(
        #         "UPDATE users SET otp_code = %s, otp_expires_at = %s WHERE id = %s",
        #         (otp, expires, user['id'])
        #     )
        #     conn.commit()
        #     
        #     # Send email
        #     email_sent = send_otp_email(user['email'], otp)
        #     if not email_sent:
        #         return {'success': False, 'error': 'Failed to send OTP email'}
        #         
        # except Exception as e:
        #     conn.rollback()
        #     return {'success': False, 'error': 'Failed to generate OTP'}
        # finally:
        #     cursor.close()
        #     conn.close()
        #
        # return {
        #     'success': True,
        #     'requires_otp': True,
        #     'message': 'OTP sent to email. Please verify.'
        # }

    def verify_otp(self, identifier: str, otp: str) -> dict:
        detect = detect_identifier(identifier)
        if detect['type'] == 'invalid':
            return {'success': False, 'error': 'Invalid email or phone number format'}
            
        id_type = detect['type']
        id_value = detect['value']

        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        try:
            query = (
                "SELECT u.id, u.full_name, u.email, u.phone, u.otp_code, "
                "u.otp_expires_at, u.otp_attempts, r.role_name "
                "FROM users u JOIN roles r ON u.role_id = r.id "
                "WHERE u.{} = %s AND u.is_active = TRUE".format(id_type)
            )
            cursor.execute(query, (id_value,))
            user = cursor.fetchone()
            
            if not user or not user['otp_code']:
                return {'success': False, 'error': 'OTP not requested or expired'}
                
            if datetime.datetime.utcnow() > user['otp_expires_at']:
                # Clear expired
                cursor.execute("UPDATE users SET otp_code = NULL, otp_expires_at = NULL, otp_attempts = 0 WHERE id = %s", (user['id'],))
                conn.commit()
                return {'success': False, 'error': 'OTP has expired'}
                
            if user['otp_attempts'] >= 5:
                cursor.execute("UPDATE users SET otp_code = NULL, otp_expires_at = NULL, otp_attempts = 0 WHERE id = %s", (user['id'],))
                conn.commit()
                return {'success': False, 'error': 'Too many failed attempts. Please request a new OTP.'}
                
            if user['otp_code'] != otp:
                cursor.execute("UPDATE users SET otp_attempts = otp_attempts + 1 WHERE id = %s", (user['id'],))
                conn.commit()
                return {'success': False, 'error': 'Invalid OTP'}
                
            # Clear on success
            cursor.execute("UPDATE users SET otp_code = NULL, otp_expires_at = NULL, otp_attempts = 0 WHERE id = %s", (user['id'],))
            conn.commit()
            
        except Exception as e:
            conn.rollback()
            return {'success': False, 'error': 'Failed validating OTP'}
        finally:
            cursor.close()
            conn.close()

        token = self._generate_token(user['id'], user['role_name'])
        return {
            'success': True,
            'token': token,
            'user': {
                'id': user['id'],
                'full_name': user['full_name'],
                'email': user['email'],
                'role': user['role_name'],
            }
        }

    def request_otp(self, identifier: str) -> dict:
        detect = detect_identifier(identifier)
        if detect['type'] == 'invalid':
            return {'success': False, 'error': 'Invalid email or phone number format'}
            
        id_type = detect['type']
        id_value = detect['value']

        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        try:
            # Rate limiting check (1 per 30s)
            cursor.execute(
                "SELECT COUNT(*) as count FROM otp_requests WHERE identifier = %s AND requested_at > DATE_SUB(NOW(), INTERVAL 30 SECOND)",
                (id_value,)
            )
            rate_limit = cursor.fetchone()
            if rate_limit['count'] > 0:
                return {'success': False, 'error': 'Please wait 30 seconds before requesting another OTP'}

            # Find user
            query = "SELECT u.id, u.email, u.phone FROM users u WHERE u.{} = %s AND u.is_active = TRUE".format(id_type)
            cursor.execute(query, (id_value,))
            user = cursor.fetchone()
            
            if not user:
                return {'success': False, 'error': f'No account found with this {id_type}'}

            # Generate OTP
            otp = str(random.randint(100000, 999999))
            expires = datetime.datetime.utcnow() + datetime.timedelta(minutes=5)
            
            # Save OTP to user
            cursor.execute(
                "UPDATE users SET otp_code = %s, otp_expires_at = %s, otp_attempts = 0 WHERE id = %s",
                (otp, expires, user['id'])
            )
            
            # Log request
            db_req_type = 'sms' if id_type == 'phone' else 'email'
            cursor.execute(
                "INSERT INTO otp_requests (identifier, request_type) VALUES (%s, %s)",
                (id_value, db_req_type)
            )
            conn.commit()
            
            # Send OTP
            if id_type == 'phone':
                sent = send_sms(user['phone'], otp)
                if not sent and user['email']:
                    send_otp_email(user['email'], otp)
                    return {'success': True, 'message': 'SMS failed, OTP sent to email.', 'type': 'email'}
                elif not sent:
                    return {'success': False, 'error': 'Failed to send SMS'}
                return {'success': True, 'message': 'OTP sent via SMS.', 'type': id_type}
            else:
                sent = send_otp_email(user['email'], otp)
                if not sent:
                    return {'success': False, 'error': 'Failed to send Email'}
                return {'success': True, 'message': 'OTP sent to email.', 'type': id_type}
                
        except Exception as e:
            import traceback
            traceback.print_exc()
            conn.rollback()
            return {'success': False, 'error': f'Failed to generate OTP: {str(e)}'}
        finally:
            cursor.close()
            conn.close()
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute(
                "SELECT u.id, u.full_name, u.email, u.phone, u.created_at, r.role_name "
                "FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = %s",
                (user_id,)
            )
            return cursor.fetchone()
        finally:
            cursor.close()
            conn.close()

    # INTERNAL
    def _generate_token(self, user_id: int, role: str) -> str:
        payload = {
            'user_id': user_id,
            'role': role,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=Config.JWT_EXPIRY_HOURS),
            'iat': datetime.datetime.utcnow(),
        }
        return jwt.encode(payload, Config.SECRET_KEY, algorithm='HS256')
