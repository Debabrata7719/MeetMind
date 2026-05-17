import subprocess
import os

from app.core.config import FFMPEG_EXE

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


import glob

def video_to_audio(video_path: str, meeting_id: str) -> list[str]:
    """
    Extracts audio from video and splits it into 5-minute chunks using FFmpeg.
    Returns a sorted list of generated chunk file paths.
    """
    output_folder = os.path.join(BASE_DIR, "data", "intermediate", meeting_id)
    os.makedirs(output_folder, exist_ok=True)

    output_pattern = os.path.join(output_folder, "chunk_%03d.wav")

    command = [
        FFMPEG_EXE,
        "-y",
        "-i", video_path,
        "-f", "segment",
        "-segment_time", "300",
        "-ar", "16000",
        "-ac", "1",
        "-af", "loudnorm,afftdn",
        output_pattern
    ]

    subprocess.run(command, check=True)

    # Find and return all generated chunk files, sorted alphabetically (chunk_000, chunk_001...)
    chunks = sorted(glob.glob(os.path.join(output_folder, "chunk_*.wav")))
    return chunks

