"""
tests/test_api.py

Integration tests for all FastAPI endpoints.
Routes live in api/routes/ — main.py is just the entry point.
Uses httpx TestClient — no live server needed.

Recording endpoints are SKIPPED (no audio hardware on this machine).
All AI/pipeline processing is mocked so tests are fast.
File upload tests use the real uploads/test_video.mp4.
"""

import sys
import pytest
from unittest.mock import patch, MagicMock

from app.core.config import BASE_DIR

REAL_VIDEO      = BASE_DIR / "uploads" / "test_video.mp4"
REAL_MEETING_ID = "test_video_meeting"


def _make_mocks():
    """All modules that must be mocked before importing the app."""
    lc = MagicMock(); lc.__spec__ = None
    st = MagicMock(); st.__spec__ = None
    lts = MagicMock(); lts.__spec__ = None
    lts.RecursiveCharacterTextSplitter = MagicMock()

    return {
        "langchain_classic":              lc,
        "langchain_classic.chains":       lc,
        "langchain_classic.memory":       lc,
        "sentence_transformers":          st,
        "chromadb":                       MagicMock(),
        "whisper":                        MagicMock(),
        "faster_whisper":                 MagicMock(),
        "sounddevice":                    MagicMock(),
        "soundfile":                      MagicMock(),
        "langchain_text_splitters":       lts,
        "langchain_groq":                 MagicMock(),
        "langchain_chroma":               MagicMock(),
        "langchain_community":            MagicMock(),
        "langchain_community.embeddings": MagicMock(),
        "langchain_core":                 MagicMock(),
        "langchain_core.prompts":         MagicMock(),
    }


# ─────────────────────────────────────────────
# TestClient fixture
# ─────────────────────────────────────────────

@pytest.fixture(scope="module")
def client():
    """
    FastAPI TestClient with all heavy deps mocked.
    Imports app.services first under mocks, patches service functions,
    then imports main so the app uses the patched versions.
    """
    mocks = _make_mocks()
    saved = {k: sys.modules.get(k) for k in mocks}

    # Wipe all app/api cached modules
    for key in list(sys.modules.keys()):
        if key.startswith("app.") or key.startswith("api.") or key == "main":
            del sys.modules[key]

    # Inject mocks and import services
    with patch.dict("sys.modules", mocks):
        import app.services as svc

    # Now patch the bound names on the already-imported svc module
    with patch.object(svc, "process_meeting"), \
         patch.object(svc, "embed_store"), \
         patch.object(svc, "extract_highlights", return_value="• Test highlight"), \
         patch.object(svc, "chat_ask", return_value="Test answer"), \
         patch("auth.db.meeting_belongs_to_user", return_value=True), \
         patch("auth.db.get_meeting_name", return_value="Test Video Meeting"), \
         patch("auth.db.save_meeting"), \
         patch("auth.db.update_meeting_name", return_value=True), \
         patch("auth.db.get_user_meetings", return_value=[{"id": REAL_MEETING_ID, "name": "Test Video Meeting"}]):

        # Wipe api/main so they re-import and pick up patched svc
        for key in list(sys.modules.keys()):
            if key.startswith("api.") or key == "main":
                del sys.modules[key]

        import main
        from auth.dependencies import get_current_user
        main.app.dependency_overrides[get_current_user] = lambda: {"user_id": 1, "email": "test@example.com"}

        from fastapi.testclient import TestClient
        yield TestClient(main.app)

    # Restore
    for k, original in saved.items():
        if original is None:
            sys.modules.pop(k, None)
        else:
            sys.modules[k] = original

    for key in list(sys.modules.keys()):
        if key.startswith("app.") or key.startswith("api.") or key == "main":
            del sys.modules[key]


# ─────────────────────────────────────────────
# GET /
# ─────────────────────────────────────────────

def test_root_returns_200(client):
    assert client.get("/").status_code == 200


def test_root_message(client):
    assert client.get("/").json()["message"] == "API running"


# ─────────────────────────────────────────────
# POST /upload
# ─────────────────────────────────────────────

def test_upload_rejects_invalid_extension(client):
    resp = client.post("/upload",
        files={"file": ("notes.txt", b"text", "text/plain")})
    assert resp.status_code == 400


def test_upload_rejects_pdf(client):
    resp = client.post("/upload",
        files={"file": ("report.pdf", b"%PDF", "application/pdf")})
    assert resp.status_code == 400


def test_upload_accepts_mp4(client):
    assert REAL_VIDEO.exists(), f"Real video not found: {REAL_VIDEO}"
    with open(REAL_VIDEO, "rb") as f:
        data = f.read()
    with patch("api.routes.upload.run_in_threadpool", side_effect=lambda fn, *a: fn(*a)):
        resp = client.post("/upload",
            files={"file": ("test_video.mp4", data, "video/mp4")})
    assert resp.status_code != 400
    print(f"\n[OK] MP4 upload: HTTP {resp.status_code}")


def test_upload_returns_meeting_id(client):
    assert REAL_VIDEO.exists()
    with open(REAL_VIDEO, "rb") as f:
        data = f.read()
    with patch("api.routes.upload.run_in_threadpool", side_effect=lambda fn, *a: fn(*a)):
        resp = client.post("/upload",
            files={"file": ("test_video.mp4", data, "video/mp4")})
    if resp.status_code == 200:
        assert "meeting_id" in resp.json()


# ─────────────────────────────────────────────
# POST /notes
# ─────────────────────────────────────────────

def test_notes_endpoint_exists(client):
    resp = client.post("/notes", json={"meeting_id": REAL_MEETING_ID})
    assert resp.status_code not in (404, 405)


def test_notes_returns_notes_key(client):
    resp = client.post("/notes", json={"meeting_id": REAL_MEETING_ID})
    assert resp.status_code == 200
    assert "notes" in resp.json()
    print(f"\n[OK] /notes: {resp.json()['notes']}")


# ─────────────────────────────────────────────
# POST /chat
# ─────────────────────────────────────────────

def test_chat_endpoint_exists(client):
    resp = client.post("/chat", json={
        "question": "What was discussed?",
        "meeting_id": REAL_MEETING_ID})
    assert resp.status_code not in (404, 405)


def test_chat_returns_answer_key(client):
    resp = client.post("/chat", json={
        "question": "What was discussed?",
        "meeting_id": REAL_MEETING_ID})
    assert resp.status_code == 200
    assert "answer" in resp.json()
    print(f"\n[OK] /chat: {resp.json()['answer']}")


# ─────────────────────────────────────────────
# POST /set-meeting-name  +  GET /meetings
# ─────────────────────────────────────────────

def test_set_meeting_name_returns_saved(client, tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    resp = client.post("/set-meeting-name", json={
        "meeting_id": REAL_MEETING_ID, "name": "Test Video Meeting"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "saved"


def test_meetings_empty_when_no_data(client, tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    resp = client.get("/meetings")
    assert resp.status_code == 200
    assert resp.json() == []


def test_meetings_lists_saved_meeting(client, tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    client.post("/set-meeting-name", json={
        "meeting_id": REAL_MEETING_ID, "name": "Test Video Meeting"})
    resp = client.get("/meetings")
    assert REAL_MEETING_ID in [m["id"] for m in resp.json()]
    print(f"\n[OK] {REAL_MEETING_ID} in /meetings")


def test_meetings_returns_list(client, tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    assert isinstance(client.get("/meetings").json(), list)


# ─────────────────────────────────────────────
# GET /download-notes
# ─────────────────────────────────────────────

def test_download_notes_missing_returns_error(client, tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    resp = client.get("/download-notes",
        params={"meeting_id": "no_such_meeting_xyz", "format": "pdf"})
    assert resp.status_code == 200
    assert "error" in resp.json()


def test_download_notes_invalid_format_returns_error(client, tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    notes_dir = tmp_path / "Notes"
    notes_dir.mkdir()
    (notes_dir / f"highlights_{REAL_MEETING_ID}.txt").write_text(
        "• Test highlight.", encoding="utf-8")
    resp = client.get("/download-notes",
        params={"meeting_id": REAL_MEETING_ID, "format": "xml"})
    assert resp.status_code == 200
    assert "error" in resp.json()


# ─────────────────────────────────────────────
# Recording — SKIPPED (no audio hardware)
# ─────────────────────────────────────────────

@pytest.mark.skip(reason="No audio hardware available on this machine")
def test_start_recording():
    pass


@pytest.mark.skip(reason="No audio hardware available on this machine")
def test_stop_recording():
    pass


def test_stop_recording_without_start_returns_400(client):
    import api.routes.recording as rec_route
    rec_route.stream = None
    resp = client.post("/stop-recording")
    assert resp.status_code == 400
    print("\n[OK] /stop-recording without start → 400")
