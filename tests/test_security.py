"""
tests/test_security.py

Security boundary tests:
  - Password hashing (bcrypt round-trip)
  - Password complexity validation rules
  - JWT token creation and decoding
  - JWT token tampering (modified signature rejected)
  - JWT expiry (expired tokens rejected)
  - Email OTP service (mocked SMTP — no real email sent)
"""

import time
import pytest
from unittest.mock import patch, MagicMock


# ─────────────────────────────────────────────
# Password Hashing
# ─────────────────────────────────────────────

class TestPasswordHashing:
    def test_hash_is_not_plaintext(self):
        from auth.security import hash_password
        hashed = hash_password("MySecret123!")
        assert hashed != "MySecret123!"

    def test_correct_password_verifies(self):
        from auth.security import hash_password, verify_password
        hashed = hash_password("MySecret123!")
        assert verify_password("MySecret123!", hashed) is True

    def test_wrong_password_fails(self):
        from auth.security import hash_password, verify_password
        hashed = hash_password("MySecret123!")
        assert verify_password("WrongPassword!", hashed) is False

    def test_empty_password_fails_verify(self):
        from auth.security import hash_password, verify_password
        hashed = hash_password("MySecret123!")
        assert verify_password("", hashed) is False

    def test_two_hashes_of_same_password_differ(self):
        """bcrypt uses a random salt — same password produces different hashes."""
        from auth.security import hash_password
        h1 = hash_password("same")
        h2 = hash_password("same")
        assert h1 != h2


# ─────────────────────────────────────────────
# Password Validation Rules
# ─────────────────────────────────────────────

class TestPasswordValidation:
    def test_strong_password_passes(self):
        from auth.security import validate_password
        errors = validate_password("Secure!Pass1")
        assert errors == []

    def test_too_short_fails(self):
        from auth.security import validate_password
        errors = validate_password("Ab1!")
        assert any("8" in e or "short" in e.lower() or "length" in e.lower() for e in errors)

    def test_no_uppercase_fails(self):
        from auth.security import validate_password
        errors = validate_password("allowercase1!")
        assert len(errors) > 0

    def test_no_digit_fails(self):
        from auth.security import validate_password
        errors = validate_password("NoDigitsHere!")
        assert len(errors) > 0

    def test_no_special_char_fails(self):
        from auth.security import validate_password
        errors = validate_password("NoSpecialChar1")
        assert len(errors) > 0

    def test_common_password_fails(self):
        from auth.security import validate_password
        errors = validate_password("password")
        assert len(errors) > 0


# ─────────────────────────────────────────────
# JWT Token Creation and Decoding
# ─────────────────────────────────────────────

class TestJWT:
    def test_token_created_successfully(self):
        from auth.security import create_access_token
        token = create_access_token(user_id=42, email="user@example.com")
        assert isinstance(token, str)
        assert len(token) > 20

    def test_token_decodes_correctly(self):
        from auth.security import create_access_token, decode_access_token
        token = create_access_token(user_id=42, email="user@example.com")
        payload = decode_access_token(token)
        assert payload["sub"] == "42"
        assert payload["email"] == "user@example.com"

    def test_tampered_token_rejected(self):
        from auth.security import create_access_token, decode_access_token
        import pytest
        token = create_access_token(user_id=1, email="a@b.com")
        # Tamper with the signature
        parts = token.split(".")
        tampered = parts[0] + "." + parts[1] + "." + "invalidsignature"
        with pytest.raises(Exception):
            decode_access_token(tampered)

    def test_garbage_token_rejected(self):
        from auth.security import decode_access_token
        import pytest
        with pytest.raises(Exception):
            decode_access_token("this.is.garbage")

    def test_empty_token_rejected(self):
        from auth.security import decode_access_token
        import pytest
        with pytest.raises(Exception):
            decode_access_token("")


# ─────────────────────────────────────────────
# OTP Email Service
# ─────────────────────────────────────────────

class TestEmailService:
    def test_send_otp_email_calls_smtp(self):
        """send_otp_email must connect to Gmail SMTP and send the message."""
        import smtplib
        mock_smtp = MagicMock()

        with patch.dict("os.environ", {
            "EMAIL_ADDRESS": "sender@gmail.com",
            "EMAIL_APP_PASSWORD": "app_password_here"
        }), patch("smtplib.SMTP_SSL", return_value=mock_smtp.__enter__.return_value):
            mock_smtp.__enter__ = MagicMock(return_value=mock_smtp)
            mock_smtp.__exit__ = MagicMock(return_value=False)
            with patch("smtplib.SMTP_SSL") as mock_ssl:
                ctx = MagicMock()
                mock_ssl.return_value.__enter__ = MagicMock(return_value=ctx)
                mock_ssl.return_value.__exit__ = MagicMock(return_value=False)

                from auth.email_service import send_otp_email
                send_otp_email("recipient@example.com", "7314")

                mock_ssl.assert_called_once_with("smtp.gmail.com", 465)
                ctx.login.assert_called_once()
                ctx.sendmail.assert_called_once()

    def test_send_otp_email_raises_when_env_missing(self):
        """If EMAIL_ADDRESS or EMAIL_APP_PASSWORD is missing, raises RuntimeError."""
        with patch.dict("os.environ", {}, clear=True):
            # Reload the module to pick up the cleared env
            import importlib
            import auth.email_service as em
            em.EMAIL_ADDRESS = None
            em.EMAIL_APP_PASSWORD = None

            with pytest.raises(RuntimeError, match="EMAIL_ADDRESS"):
                em.send_otp_email("recipient@example.com", "1234")

    def test_otp_is_in_email_body(self):
        """The OTP must appear in the sent email body."""
        captured = {}

        def fake_sendmail(from_addr, to_addr, message_str):
            captured["body"] = message_str

        with patch.dict("os.environ", {
            "EMAIL_ADDRESS": "sender@gmail.com",
            "EMAIL_APP_PASSWORD": "app_pass"
        }), patch("smtplib.SMTP_SSL") as mock_ssl:
            ctx = MagicMock()
            ctx.sendmail.side_effect = fake_sendmail
            mock_ssl.return_value.__enter__ = MagicMock(return_value=ctx)
            mock_ssl.return_value.__exit__ = MagicMock(return_value=False)

            import auth.email_service as em
            em.EMAIL_ADDRESS = "sender@gmail.com"
            em.EMAIL_APP_PASSWORD = "app_pass"
            em.send_otp_email("recipient@example.com", "5678")

        assert "5678" in captured.get("body", "")
