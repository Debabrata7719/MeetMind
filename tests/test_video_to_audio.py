"""
tests/test_video_to_audio.py

Tests for app/pipeline/video_to_audio.py

Uses the REAL uploads/test_video.mp4 with the REAL FFmpeg binary.
No mocks — if FFmpeg is broken, these tests will tell you.
"""

import subprocess
import pytest
from pathlib import Path

from app.core.config import FFMPEG_EXE, UPLOADS_DIR, INTERMEDIATE_DIR

REAL_VIDEO = UPLOADS_DIR / "test_video.mp4"


def test_ffmpeg_is_available():
    """FFmpeg binary must be reachable and return version info."""
    result = subprocess.run(
        [FFMPEG_EXE, "-version"],
        capture_output=True, text=True
    )
    assert result.returncode == 0, f"FFmpeg not found:\n{result.stderr}"
    combined = result.stdout + result.stderr
    assert "ffmpeg version" in combined.lower()
    print(f"\n[OK] FFmpeg: {FFMPEG_EXE}")


def test_video_file_exists():
    """uploads/test_video.mp4 must exist and be non-empty."""
    assert REAL_VIDEO.exists(), f"Video not found: {REAL_VIDEO}"
    assert REAL_VIDEO.stat().st_size > 0
    mb = REAL_VIDEO.stat().st_size / (1024 * 1024)
    print(f"\n[OK] Video: {REAL_VIDEO.name}  ({mb:.2f} MB)")


def test_video_to_audio_returns_path(real_audio_path):
    """video_to_audio() must return a non-empty string path."""
    assert isinstance(real_audio_path, str)
    assert len(real_audio_path) > 0
    print(f"\n[OK] Returned path: {real_audio_path}")


def test_video_to_audio_file_exists(real_audio_path):
    """Output WAV file must exist on disk after conversion."""
    assert Path(real_audio_path).exists(), f"WAV not found: {real_audio_path}"


def test_video_to_audio_is_wav(real_audio_path):
    """Output file must have .wav extension."""
    assert Path(real_audio_path).suffix == ".wav"


def test_video_to_audio_is_nonempty(real_audio_path):
    """Output WAV must not be empty."""
    size = Path(real_audio_path).stat().st_size
    assert size > 0, "WAV file is empty!"
    print(f"\n[OK] WAV size: {size // 1024} KB")


def test_video_to_audio_correct_filename(real_audio_path):
    """Output filename must be clean_meeting_audio.wav."""
    assert Path(real_audio_path).name == "clean_meeting_audio.wav"


def test_video_to_audio_correct_directory(real_audio_path):
    """Output must be saved inside data/intermediate/."""
    assert Path(real_audio_path).parent == INTERMEDIATE_DIR


def test_video_to_audio_raises_on_missing_file():
    """Passing a non-existent path must raise CalledProcessError."""
    from app.pipeline.video_to_audio import video_to_audio
    with pytest.raises(subprocess.CalledProcessError):
        video_to_audio("uploads/does_not_exist_xyz.mp4")
    print("\n[OK] Correctly raised CalledProcessError for missing file")
