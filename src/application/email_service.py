"""
auth/email_service.py

Sends OTP emails via Gmail SMTP using app password from .env
"""

import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

EMAIL_ADDRESS = os.getenv("EMAIL_ADDRESS")
EMAIL_APP_PASSWORD = os.getenv("EMAIL_APP_PASSWORD")


def send_otp_email(recipient_email: str, otp: str) -> None:
    """
    Sends a formatted OTP email to the recipient using Gmail SMTP.
    Raises an exception if the email fails to send.
    """
    if not EMAIL_ADDRESS or not EMAIL_APP_PASSWORD:
        raise RuntimeError("EMAIL_ADDRESS or EMAIL_APP_PASSWORD is not set in .env")

    subject = "Your Meet Mind Password Reset OTP"

    body = f"""
Hello,

You requested a password reset for your Meet Mind account.

Your One-Time Password (OTP) is:

    ━━━━━━━━━━━━━━━━━
         {otp}
    ━━━━━━━━━━━━━━━━━

Use this OTP for Meet Mind. This is valid for 5 minutes.

If you did not request this, please ignore this email. Your password will not change.

— The Meet Mind Team
"""

    msg = MIMEMultipart()
    msg["From"] = EMAIL_ADDRESS
    msg["To"] = recipient_email
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
        smtp.login(EMAIL_ADDRESS, EMAIL_APP_PASSWORD)
        smtp.sendmail(EMAIL_ADDRESS, recipient_email, msg.as_string())
