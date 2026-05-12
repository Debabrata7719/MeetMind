"""
app/core/config.py

Central configuration — project-wide paths resolved from BASE_DIR.
Import this wherever you need a reliable absolute path.
"""

import os
import shutil
from pathlib import Path

# Root of the project (two levels up from this file)
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Runtime directories (created on-demand by each module)
DATA_DIR         = BASE_DIR / "data"
INTERMEDIATE_DIR = DATA_DIR / "intermediate"
VECTORDB_DIR     = DATA_DIR / "vectordb"
NOTES_DIR        = BASE_DIR / "Notes"
UPLOADS_DIR      = BASE_DIR / "uploads"
MEETINGS_FILE    = DATA_DIR / "meetings.json"

# ──────────────────────────────────────────────
# FFmpeg — search PATH first, then known local install
# If found locally, inject its bin/ dir into PATH so that
# Whisper's internal audio loader (which calls "ffmpeg" directly)
# also works without system-wide installation.
# ──────────────────────────────────────────────
_FFMPEG_FALLBACK_BIN = (
    Path(r"C:\Users\debab\Downloads\ffmpeg")
    / "ffmpeg-2025-09-10-git-c1dc2e2b7c-full_build"
    / "bin"
)


def _find_ffmpeg() -> str:
    """Return the full path to the ffmpeg executable."""
    on_path = shutil.which("ffmpeg")
    if on_path:
        return on_path
    exe = _FFMPEG_FALLBACK_BIN / "ffmpeg.exe"
    if exe.exists():
        # Inject the bin/ dir into PATH so all subprocesses find it
        bin_str = str(_FFMPEG_FALLBACK_BIN)
        if bin_str not in os.environ.get("PATH", ""):
            os.environ["PATH"] = bin_str + os.pathsep + os.environ.get("PATH", "")
        return str(exe)
    return "ffmpeg"   # will raise FileNotFoundError at runtime if truly missing


FFMPEG_EXE = _find_ffmpeg()
