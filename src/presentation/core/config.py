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

# Removed FFmpeg fallback path since we moved to AssemblyAI.
