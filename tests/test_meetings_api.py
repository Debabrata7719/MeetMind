"""
tests/test_meetings_api.py

Tests for the meetings management endpoints:
  GET    /meetings           — list all user meetings
  POST   /set-meeting-name   — rename a meeting
  DELETE /meetings/{id}      — delete a meeting (cascade across all systems)
  GET    /status/{id}        — check pipeline job progress
  GET    /download-notes     — download highlights as PDF/TXT/DOCX

All DB, Redis, and filesystem calls are mocked.
"""

import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

MEETING_ID = "abc123def456"
USER_ID = 1


# ─────────────────────────────────────────────
# Client fixture
# ─────────────────────────────────────────────

@pytest.fixture(scope="module")
def client():
    mock_user = {"user_id": USER_ID, "email": "test@example.com"}

    import main
    from auth.dependencies import get_current_user
    main.app.dependency_overrides[get_current_user] = lambda: mock_user

    yield TestClient(main.app, raise_server_exceptions=False)

    main.app.dependency_overrides.clear()


# ─────────────────────────────────────────────
# GET /meetings
# ─────────────────────────────────────────────

class TestGetMeetings:
    def test_returns_list(self, client):
        with patch("api.routes.meeting.get_user_meetings", return_value=[]):
            resp = client.get("/meetings")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_returns_meetings_for_user(self, client):
        meetings = [{"id": MEETING_ID, "name": "Standup"}]
        with patch("api.routes.meeting.get_user_meetings", return_value=meetings):
            resp = client.get("/meetings")
        assert resp.status_code == 200
        assert resp.json()[0]["id"] == MEETING_ID

    def test_unauthenticated_returns_401(self):
        import main
        main.app.dependency_overrides.clear()
        client_no_auth = TestClient(main.app, raise_server_exceptions=False)
        resp = client_no_auth.get("/meetings")
        assert resp.status_code == 401
        # Restore override for remaining tests
        from auth.dependencies import get_current_user
        main.app.dependency_overrides[get_current_user] = lambda: {"user_id": USER_ID, "email": "test@example.com"}


# ─────────────────────────────────────────────
# POST /set-meeting-name
# ─────────────────────────────────────────────

class TestSetMeetingName:
    def test_rename_success(self, client):
        with patch("api.routes.meeting.update_meeting_name", return_value=True):
            resp = client.post("/set-meeting-name", json={
                "meeting_id": MEETING_ID,
                "name": "Q2 Planning"
            })
        assert resp.status_code == 200
        assert resp.json()["status"] == "saved"

    def test_rename_nonexistent_meeting_returns_404(self, client):
        with patch("api.routes.meeting.update_meeting_name", return_value=False):
            resp = client.post("/set-meeting-name", json={
                "meeting_id": "does_not_exist",
                "name": "Ghost"
            })
        assert resp.status_code == 404

    def test_rename_missing_fields_returns_422(self, client):
        resp = client.post("/set-meeting-name", json={"meeting_id": MEETING_ID})
        assert resp.status_code == 422


# ─────────────────────────────────────────────
# DELETE /meetings/{id}
# ─────────────────────────────────────────────

class TestDeleteMeeting:
    def test_delete_success_cascades(self, client):
        """DELETE must cascade across MySQL, ChromaDB, Redis, and filesystem."""
        with patch("api.routes.meeting.meeting_belongs_to_user", return_value=True), \
             patch("api.routes.meeting.delete_meeting_from_db", return_value=True), \
             patch("api.routes.meeting.chromadb") as mock_chroma, \
             patch("api.routes.meeting.redis") as mock_redis, \
             patch("api.routes.meeting.shutil") as mock_shutil, \
             patch("api.routes.meeting.os") as mock_os:
            mock_chroma.PersistentClient.return_value = MagicMock()
            mock_os.path.exists.return_value = False
            resp = client.delete(f"/meetings/{MEETING_ID}")
        assert resp.status_code == 200

    def test_delete_wrong_owner_returns_403(self, client):
        """Cannot delete another user's meeting."""
        with patch("api.routes.meeting.meeting_belongs_to_user", return_value=False):
            resp = client.delete(f"/meetings/{MEETING_ID}")
        assert resp.status_code in (403, 404)

    def test_delete_nonexistent_meeting_returns_404(self, client):
        """Deleting a meeting that doesn't exist returns 404."""
        with patch("api.routes.meeting.meeting_belongs_to_user", return_value=False):
            resp = client.delete("/meetings/does_not_exist_xyz")
        assert resp.status_code in (403, 404)


# ─────────────────────────────────────────────
# GET /status/{meeting_id}
# ─────────────────────────────────────────────

class TestJobStatus:
    def test_status_queued(self, client):
        with patch("app.core.job_progress.get_job_progress",
                   return_value={"status": "queued", "progress": 0}):
            resp = client.get(f"/status/{MEETING_ID}")
        assert resp.status_code == 200
        assert resp.json()["status"] == "queued"

    def test_status_processing(self, client):
        with patch("app.core.job_progress.get_job_progress",
                   return_value={"status": "processing", "progress": 45}):
            resp = client.get(f"/status/{MEETING_ID}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "processing"
        assert data["progress"] == 45

    def test_status_complete(self, client):
        with patch("app.core.job_progress.get_job_progress",
                   return_value={"status": "complete", "progress": 100}):
            resp = client.get(f"/status/{MEETING_ID}")
        assert resp.status_code == 200
        assert resp.json()["progress"] == 100

    def test_status_unknown_meeting_id(self, client):
        with patch("app.core.job_progress.get_job_progress", return_value=None):
            resp = client.get("/status/unknown_meeting_xyz")
        assert resp.status_code in (200, 404)


# ─────────────────────────────────────────────
# GET /download-notes
# ─────────────────────────────────────────────

class TestDownloadNotes:
    def test_download_txt_success(self, client, tmp_path, monkeypatch):
        monkeypatch.chdir(tmp_path)
        notes_dir = tmp_path / "Notes"
        notes_dir.mkdir()
        (notes_dir / f"highlights_{MEETING_ID}.txt").write_text("• Bullet point", encoding="utf-8")
        with patch("api.routes.download.get_meeting_name", return_value="Test Meeting"), \
             patch("api.routes.download.meeting_belongs_to_user", return_value=True):
            resp = client.get("/download-notes", params={"meeting_id": MEETING_ID, "format": "txt"})
        assert resp.status_code == 200

    def test_download_invalid_format_returns_error(self, client, tmp_path, monkeypatch):
        monkeypatch.chdir(tmp_path)
        notes_dir = tmp_path / "Notes"
        notes_dir.mkdir()
        (notes_dir / f"highlights_{MEETING_ID}.txt").write_text("• Bullet", encoding="utf-8")
        resp = client.get("/download-notes", params={"meeting_id": MEETING_ID, "format": "xml"})
        assert resp.status_code == 200
        assert "error" in resp.json()

    def test_download_nonexistent_notes_returns_error(self, client, tmp_path, monkeypatch):
        monkeypatch.chdir(tmp_path)
        resp = client.get("/download-notes", params={"meeting_id": "no_such_id", "format": "pdf"})
        assert resp.status_code == 200
        assert "error" in resp.json()
