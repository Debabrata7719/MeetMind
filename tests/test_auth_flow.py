"""
tests/test_auth_flow.py

Comprehensive test suite covering:
1. Google OAuth login initiation and callback flows
2. Manual registration and login flows
3. Authentication session verification (/auth/me)
4. Unauthenticated access enforcement (401 Unauthorized)
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from main import app
from src.infrastructure.database import SessionLocal, engine
from src.domain.models import User, Base

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    """Ensure database tables exist and clean up test users."""
    db = SessionLocal()
    db.query(User).filter(User.email.like("%test%@example.com")).delete(synchronize_session=False)
    db.commit()
    db.close()
    yield

def test_1_manual_register_and_login():
    """Test manual user registration, login, session check, and logout."""
    email = "manualtest@example.com"
    password = "SecurePassword123!"

    # 1. Register
    reg_res = client.post("/auth/register", json={
        "name": "Manual Test User",
        "email": email,
        "password": password,
        "confirm_password": password
    })
    assert reg_res.status_code == 201, reg_res.text

    # 2. Login
    login_res = client.post("/auth/login", json={
        "email": email,
        "password": password
    })
    assert login_res.status_code == 200
    assert "access_token" in login_res.cookies

    # 3. Check Session /auth/me
    me_res = client.get("/auth/me", cookies=login_res.cookies)
    assert me_res.status_code == 200
    user_data = me_res.json()
    assert user_data["email"] == email
    assert user_data["name"] == "Manual Test User"

    # 4. Logout
    logout_res = client.post("/auth/logout", cookies=login_res.cookies)
    assert logout_res.status_code == 200

def test_2_google_oauth_redirect_urls():
    """Test GET and HEAD requests to /auth/google/login."""
    # Test GET
    get_res = client.get("/auth/google/login", follow_redirects=False)
    assert get_res.status_code == 307
    assert "accounts.google.com" in get_res.headers["location"]

    # Test HEAD (used by UptimeRobot and browser pre-flights)
    head_res = client.head("/auth/google/login")
    assert head_res.status_code == 200

@patch("httpx.AsyncClient.post")
@patch("httpx.AsyncClient.get")
def test_3_google_oauth_callback_flow(mock_get, mock_post):
    """Test Google OAuth callback exchange, user creation, and cookie issuing."""
    # Mock Google Token Response
    mock_token_resp = MagicMock()
    mock_token_resp.json.return_value = {"access_token": "mock_google_access_token"}
    mock_post.return_value = mock_token_resp

    # Mock Google User Info Response
    mock_user_resp = MagicMock()
    mock_user_resp.json.return_value = {
        "email": "googletest@example.com",
        "name": "Google User",
        "picture": "https://lh3.googleusercontent.com/a/mock_avatar_url"
    }
    mock_get.return_value = mock_user_resp

    # Call Google Callback
    callback_res = client.get("/auth/google/callback?code=mock_code", follow_redirects=False)
    assert callback_res.status_code == 307
    assert "access_token" in callback_res.cookies

    # Verify session via /auth/me
    me_res = client.get("/auth/me", cookies=callback_res.cookies)
    assert me_res.status_code == 200
    user_data = me_res.json()
    assert user_data["email"] == "googletest@example.com"
    assert user_data["profile_image_url"] == "https://lh3.googleusercontent.com/a/mock_avatar_url"

def test_4_unauthenticated_access_denied():
    """Verify 401 Unauthorized for requests without cookies or tokens."""
    res = client.get("/auth/me")
    assert res.status_code == 401
    assert res.json()["detail"] == "Not authenticated"
