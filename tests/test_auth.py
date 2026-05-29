"""
tests/test_auth.py

Unit tests for all authentication endpoints:
  POST /auth/register
  POST /auth/login
  POST /auth/logout
  GET  /auth/me
  POST /auth/forgot-password
  POST /auth/verify-otp
  POST /auth/reset-password

All DB and Redis calls are mocked — no live database or Redis required.
"""

import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient


# ─────────────────────────────────────────────
# App fixture — full auth router, DB + Redis mocked
# ─────────────────────────────────────────────

@pytest.fixture(scope="module")
def client():
    """TestClient with DB session and Redis fully mocked."""
    mock_db = MagicMock()

    with patch("auth.db.get_db", return_value=iter([mock_db])), \
         patch("auth.db.engine"), \
         patch("slowapi.middleware.SlowAPIMiddleware.__call__", side_effect=lambda scope, receive, send: None):

        import main
        from fastapi.testclient import TestClient
        yield TestClient(main.app, raise_server_exceptions=False)


# ─────────────────────────────────────────────
# POST /auth/register
# ─────────────────────────────────────────────

class TestRegister:
    def test_register_success(self, client):
        """Valid registration creates a new user and returns 200."""
        with patch("auth.router.get_user_by_email", return_value=None), \
             patch("auth.router.create_user") as mock_create:
            mock_create.return_value = MagicMock(id=1, email="newuser@example.com")
            resp = client.post("/auth/register", json={
                "email": "newuser@example.com",
                "password": "Str0ng!Pass",
                "confirm_password": "Str0ng!Pass"
            })
        assert resp.status_code == 200
        assert "created" in resp.json()["message"].lower()

    def test_register_mismatched_passwords_returns_422(self, client):
        """Passwords that don't match return 422."""
        resp = client.post("/auth/register", json={
            "email": "a@example.com",
            "password": "Str0ng!Pass",
            "confirm_password": "DifferentPass!"
        })
        assert resp.status_code == 422

    def test_register_duplicate_email_returns_409(self, client):
        """Registering an already-used email returns 409 Conflict."""
        from sqlalchemy.exc import IntegrityError
        with patch("auth.router.get_user_by_email", return_value=None), \
             patch("auth.router.create_user", side_effect=IntegrityError("", {}, Exception())):
            resp = client.post("/auth/register", json={
                "email": "existing@example.com",
                "password": "Str0ng!Pass",
                "confirm_password": "Str0ng!Pass"
            })
        assert resp.status_code == 409

    def test_register_weak_password_returns_400(self, client):
        """Passwords that fail complexity rules return 400."""
        with patch("auth.router.get_user_by_email", return_value=None):
            resp = client.post("/auth/register", json={
                "email": "weak@example.com",
                "password": "abc",
                "confirm_password": "abc"
            })
        assert resp.status_code == 400


# ─────────────────────────────────────────────
# POST /auth/login
# ─────────────────────────────────────────────

class TestLogin:
    def test_login_success_sets_cookie(self, client):
        """Correct credentials return 200 and set an httpOnly cookie."""
        mock_user = MagicMock(id=1, email="user@example.com", password="hashed")
        with patch("auth.router.get_user_by_email", return_value=mock_user), \
             patch("auth.router.verify_password", return_value=True):
            resp = client.post("/auth/login", json={
                "email": "user@example.com",
                "password": "Str0ng!Pass"
            })
        assert resp.status_code == 200
        assert "access_token" in resp.cookies or resp.headers.get("set-cookie")

    def test_login_wrong_password_returns_401(self, client):
        """Wrong password returns 401."""
        mock_user = MagicMock(id=1, email="user@example.com", password="hashed")
        with patch("auth.router.get_user_by_email", return_value=mock_user), \
             patch("auth.router.verify_password", return_value=False):
            resp = client.post("/auth/login", json={
                "email": "user@example.com",
                "password": "wrongpassword"
            })
        assert resp.status_code == 401

    def test_login_nonexistent_user_returns_401(self, client):
        """Unknown email returns 401 (same message as wrong password — no enumeration)."""
        with patch("auth.router.get_user_by_email", return_value=None):
            resp = client.post("/auth/login", json={
                "email": "ghost@example.com",
                "password": "anypassword"
            })
        assert resp.status_code == 401

    def test_login_missing_fields_returns_422(self, client):
        """Missing email or password returns 422 Unprocessable Entity."""
        resp = client.post("/auth/login", json={"email": "user@example.com"})
        assert resp.status_code == 422


# ─────────────────────────────────────────────
# POST /auth/logout
# ─────────────────────────────────────────────

class TestLogout:
    def test_logout_returns_200(self, client):
        """Logout always returns 200 and clears the cookie."""
        resp = client.post("/auth/logout")
        assert resp.status_code == 200
        assert "logged out" in resp.json()["message"].lower()


# ─────────────────────────────────────────────
# GET /auth/me
# ─────────────────────────────────────────────

class TestMe:
    def test_me_without_cookie_returns_401(self, client):
        """Calling /me with no cookie returns 401."""
        resp = client.get("/auth/me")
        assert resp.status_code == 401

    def test_me_with_valid_token_returns_user(self, client):
        """Valid JWT cookie returns the user email and id."""
        from auth.security import create_access_token
        token = create_access_token(user_id=1, email="test@example.com")
        resp = client.get("/auth/me", cookies={"access_token": token})
        assert resp.status_code == 200
        assert resp.json()["email"] == "test@example.com"


# ─────────────────────────────────────────────
# POST /auth/forgot-password
# ─────────────────────────────────────────────

class TestForgotPassword:
    def test_forgot_password_nonexistent_email_returns_404(self, client):
        """Email not in DB returns 404 with helpful message."""
        with patch("auth.router.get_user_by_email", return_value=None):
            resp = client.post("/auth/forgot-password", json={"email": "ghost@example.com"})
        assert resp.status_code == 404

    def test_forgot_password_valid_email_sends_otp(self, client):
        """Valid email generates OTP, stores in Redis, sends email, returns 200."""
        mock_user = MagicMock(id=1, email="real@example.com")
        mock_redis = MagicMock()
        with patch("auth.router.get_user_by_email", return_value=mock_user), \
             patch("auth.router._get_redis", return_value=mock_redis), \
             patch("auth.router.send_otp_email") as mock_email:
            resp = client.post("/auth/forgot-password", json={"email": "real@example.com"})
        assert resp.status_code == 200
        mock_email.assert_called_once()
        mock_redis.setex.assert_called_once()

    def test_forgot_password_missing_email_returns_400(self, client):
        """Empty email field returns 400."""
        resp = client.post("/auth/forgot-password", json={"email": ""})
        assert resp.status_code == 400

    def test_forgot_password_email_failure_cleans_redis(self, client):
        """If Gmail fails, the OTP key is deleted from Redis and 500 is returned."""
        mock_user = MagicMock(id=1, email="real@example.com")
        mock_redis = MagicMock()
        with patch("auth.router.get_user_by_email", return_value=mock_user), \
             patch("auth.router._get_redis", return_value=mock_redis), \
             patch("auth.router.send_otp_email", side_effect=Exception("SMTP error")):
            resp = client.post("/auth/forgot-password", json={"email": "real@example.com"})
        assert resp.status_code == 500
        mock_redis.delete.assert_called_once()


# ─────────────────────────────────────────────
# POST /auth/verify-otp
# ─────────────────────────────────────────────

class TestVerifyOTP:
    def test_verify_otp_correct_returns_200(self, client):
        """Correct OTP returns 200 and sets verified flag in Redis."""
        mock_redis = MagicMock()
        mock_redis.get.return_value = "4321"
        mock_redis.ttl.return_value = 180
        with patch("auth.router._get_redis", return_value=mock_redis):
            resp = client.post("/auth/verify-otp", json={
                "email": "user@example.com",
                "otp": "4321"
            })
        assert resp.status_code == 200
        mock_redis.setex.assert_called_once()

    def test_verify_otp_wrong_otp_returns_400(self, client):
        """Wrong OTP returns 400."""
        mock_redis = MagicMock()
        mock_redis.get.return_value = "1234"
        with patch("auth.router._get_redis", return_value=mock_redis):
            resp = client.post("/auth/verify-otp", json={
                "email": "user@example.com",
                "otp": "9999"
            })
        assert resp.status_code == 400

    def test_verify_otp_expired_returns_400(self, client):
        """Expired OTP (not in Redis) returns 400 with helpful message."""
        mock_redis = MagicMock()
        mock_redis.get.return_value = None  # key expired
        with patch("auth.router._get_redis", return_value=mock_redis):
            resp = client.post("/auth/verify-otp", json={
                "email": "user@example.com",
                "otp": "1234"
            })
        assert resp.status_code == 400
        assert "expired" in resp.json()["detail"].lower() or "invalid" in resp.json()["detail"].lower()

    def test_verify_otp_missing_fields_returns_400(self, client):
        """Missing email or otp returns 400."""
        resp = client.post("/auth/verify-otp", json={"email": "user@example.com"})
        assert resp.status_code == 400


# ─────────────────────────────────────────────
# POST /auth/reset-password
# ─────────────────────────────────────────────

class TestResetPassword:
    def test_reset_password_success(self, client):
        """Correct flow: OTP verified flag exists → password updated → Redis cleaned."""
        mock_redis = MagicMock()
        mock_redis.get.return_value = "1"  # verified flag present
        with patch("auth.router._get_redis", return_value=mock_redis), \
             patch("auth.router.update_password", return_value=True):
            resp = client.post("/auth/reset-password", json={
                "email": "user@example.com",
                "new_password": "NewStr0ng!Pass"
            })
        assert resp.status_code == 200
        mock_redis.delete.assert_called()

    def test_reset_password_without_otp_verification_returns_403(self, client):
        """Trying to reset without completing OTP step returns 403."""
        mock_redis = MagicMock()
        mock_redis.get.return_value = None  # verified flag missing
        with patch("auth.router._get_redis", return_value=mock_redis):
            resp = client.post("/auth/reset-password", json={
                "email": "user@example.com",
                "new_password": "NewStr0ng!Pass"
            })
        assert resp.status_code == 403

    def test_reset_password_weak_password_returns_400(self, client):
        """Weak new password fails password rules and returns 400."""
        mock_redis = MagicMock()
        mock_redis.get.return_value = "1"
        with patch("auth.router._get_redis", return_value=mock_redis):
            resp = client.post("/auth/reset-password", json={
                "email": "user@example.com",
                "new_password": "abc"
            })
        assert resp.status_code == 400

    def test_reset_password_missing_fields_returns_400(self, client):
        """Missing email or new_password returns 400."""
        resp = client.post("/auth/reset-password", json={"email": "user@example.com"})
        assert resp.status_code == 400
