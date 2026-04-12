import os
import requests
from config import Config

def send_sms(phone: str, otp: str) -> bool:
    """
    Sends OTP via Fast2SMS Quick SMS API.
    """
    api_key = Config.FAST2SMS_API_KEY
    if not api_key:
        print(f"\n--- MOCK SMS ---\nTO: {phone}\nOTP: {otp}\n----------------\n")
        return True

    url = "https://www.fast2sms.com/dev/bulkV2"
    payload = {
        "route": "q",
        "message": f"Your FarmFi verification code is {otp}. Do not share this with anyone.",
        "language": "english",
        "flash": 0,
        "numbers": phone
    }
    headers = {
        "authorization": api_key,
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(url, json=payload, headers=headers)
        print(f"Fast2SMS Raw Response ({response.status_code}): {response.text}")
        
        try:
            res_data = response.json()
        except ValueError:
            return False

        if res_data.get('return') is True:
            print(f"Fast2SMS: OTP sent to {phone}")
            return True
        else:
            print(f"Fast2SMS FAILED: {res_data.get('message', res_data)}")
            return False
    except Exception as e:
        print(f"Fast2SMS Exception: {e}")
        return False
