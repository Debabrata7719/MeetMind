"""
tests/conftest.py (FASTER-WHISPER COMPATIBLE)

Shared session-scoped fixtures for the Meeting Intelligence System.

The full pipeline (video -> audio -> transcript -> chunks -> embeddings)
runs ONCE per test session using the real uploads/test_video.mp4.
All test files share these fixtures - no duplication, no mocks on core pipeline.

CHANGES FOR FASTER-WHISPER:
- Fixture signature for audio_to_text changed (now takes meeting_id & chunk_index)
- Comments updated to reflect faster-whisper (not openai-whisper)
"""

# Python 3.13 compatibility fix
# soundfile sets __spec__ = None which causes transformers' import_utils to
# raise ValueError: "soundfile.__spec__ is not set" when checking availability.
# Patch it before any other import touches transformers or sentence_transformers.
import importlib.util as _ilu
import importlib as _il

_real_find_spec = _ilu.find_spec


def _safe_find_spec(name, *args, **kwargs):
    try:
        return _real_find_spec(name, *args, **kwargs)
    except ValueError:
        return None


_ilu.find_spec = _safe_find_spec

import pytest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REAL_VIDEO = ROOT / "uploads" / "test_video.mp4"
REAL_MEETING_ID = "test_video_meeting"


def pytest_configure(config):
    """Fail immediately and clearly if the test video is missing."""
    if not REAL_VIDEO.exists():
        pytest.exit(
            f"\n\n[FATAL] Test video not found: {REAL_VIDEO}\n"
            "Place test_video.mp4 in the uploads/ folder and re-run.\n",
            returncode=1,
        )


# Step 0 - video path
@pytest.fixture(scope="session")
def real_video_path():
    return str(REAL_VIDEO)


# Step 1 - video -> audio (real FFmpeg)
@pytest.fixture(scope="session")
def real_audio_path(real_video_path):
    from app.core.config import FFMPEG_EXE
    from app.pipeline.video_to_audio import video_to_audio

    print("\n[SESSION] Step 1/4 - extracting audio with FFmpeg...")
    chunk_paths = video_to_audio(real_video_path, REAL_MEETING_ID)
    # video_to_audio returns a list of chunk paths, use the first one
    assert len(chunk_paths) > 0, f"FFmpeg produced no output"
    path = chunk_paths[0]
    print(f"[SESSION]   audio -> {path}  ({Path(path).stat().st_size // 1024} KB)")
    return path


# Step 2 - audio -> transcript (real faster-whisper)
@pytest.fixture(scope="session")
def real_transcript_path(real_audio_path):
    from app.pipeline.audio_to_text import audio_to_text

    print(
        "\n[SESSION] Step 2/4 - transcribing with faster-whisper (may take 30-60 sec)..."
    )
    # audio_to_text now requires meeting_id and chunk_index parameters
    path = audio_to_text(real_audio_path, meeting_id=REAL_MEETING_ID, chunk_index=0)
    assert Path(path).exists(), f"faster-whisper produced no output: {path}"
    chars = len(Path(path).read_text(encoding="utf-8"))
    print(f"[SESSION]   transcript -> {path}  ({chars} chars)")
    return path


# Step 3 - transcript -> chunks
@pytest.fixture(scope="session")
def real_chunks_path(real_transcript_path):
    from app.pipeline.chunk_text import chunk_text

    print("\n[SESSION] Step 3/4 - chunking transcript...")
    path = chunk_text(real_transcript_path, meeting_id=REAL_MEETING_ID, chunk_index=0)
    assert Path(path).exists(), f"Chunking produced no output: {path}"
    n = Path(path).read_text(encoding="utf-8").count("----- CHUNK")
    print(f"[SESSION]   chunks -> {path}  ({n} chunks)")
    return path


# Step 4 - chunks -> embeddings (real ChromaDB)
@pytest.fixture(scope="session")
def real_meeting_id(real_chunks_path):
    from app.storage.embed_store import embed_store

    print(f"\n[SESSION] Step 4/4 - embedding into ChromaDB (id={REAL_MEETING_ID})...")
    embed_store(real_chunks_path, REAL_MEETING_ID)
    print("[SESSION]   pipeline complete.\n")
    return REAL_MEETING_ID


# Convenience text fixtures
@pytest.fixture(scope="session")
def real_transcript_text(real_transcript_path):
    return Path(real_transcript_path).read_text(encoding="utf-8")


@pytest.fixture(scope="session")
def real_chunks_content(real_chunks_path):
    return Path(real_chunks_path).read_text(encoding="utf-8")
