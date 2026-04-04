import smtplib
from email.message import EmailMessage
from config import Config

def send_otp_email(to_email: str, otp_code: str):
    """
    Sends an OTP code to the provided email address using the SMTP configuration in Config.
    """
    if not Config.SMTP_USER or not Config.SMTP_PASSWORD:
        # Fallback for dev if email config is missing
        print(f"WARNING: SMTP credentials not set. Simulated Email -> TO: {to_email} | OTP: {otp_code}")
        return True

    try:
        msg = EmailMessage()
        msg['Subject'] = "Your FarmFi Verification Code"
        msg['From'] = f"FarmFi <{Config.SMTP_USER}>"
        msg['To'] = to_email
        
        # Plain text fallback
        msg.set_content(f"Hello,\n\nYour one-time password (OTP) for FarmFi is: {otp_code}\n\nThis code will expire in 10 minutes.\n\nThank you,\nThe FarmFi Team")
        
        # Professional HTML Template
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {{
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background-color: #f3f4f6;
              margin: 0;
              padding: 0;
            }}
            .container {{
              max-width: 600px;
              margin: 40px auto;
              background-color: #ffffff;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 15px rgba(0,0,0,0.05);
            }}
            .header {{
              background-color: #10b981;
              padding: 30px 20px;
              text-align: center;
            }}
            .header h1 {{
              margin: 0;
              color: #ffffff;
              font-size: 28px;
              font-weight: 700;
              letter-spacing: 1px;
            }}
            .content {{
              padding: 40px 30px;
              color: #374151;
              line-height: 1.6;
              font-size: 16px;
            }}
            .otp-container {{
              text-align: center;
              margin: 35px 0;
            }}
            .otp-code {{
              font-size: 36px;
              font-weight: 800;
              letter-spacing: 6px;
              color: #10b981;
              background-color: #ecfdf5;
              padding: 20px 30px;
              border-radius: 8px;
              display: inline-block;
              border: 2px dashed #a7f3d0;
            }}
            .message-text {{
              margin-bottom: 20px;
            }}
            .footer {{
              background-color: #f9fafb;
              padding: 20px;
              text-align: center;
              color: #6b7280;
              font-size: 13px;
              border-top: 1px solid #e5e7eb;
            }}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>FarmFi</h1>
            </div>
            <div class="content">
              <p class="message-text">Hello,</p>
              <p class="message-text">Thank you for choosing FarmFi! Please use the following One-Time Password (OTP) to complete your verification process. This code will securely verify your account.</p>
              
              <div class="otp-container">
                <div class="otp-code">{otp_code}</div>
              </div>
              
              <p class="message-text">This code is valid for the next <b>10 minutes</b>. If you did not request this OTP, please ignore this email to ensure your account remains secure.</p>
              <p class="message-text">Best regards,<br><b>The FarmFi Team</b></p>
            </div>
            <div class="footer">
              <p>&copy; 2024 FarmFi. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
        """
        
        msg.add_alternative(html_content, subtype='html')

        server = smtplib.SMTP(Config.SMTP_SERVER, Config.SMTP_PORT)
        server.starttls()
        server.login(Config.SMTP_USER, Config.SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"Error sending email: {e}")
        return False
