import subprocess
import os

from app.core.config import FFMPEG_EXE

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def video_to_audio(video_path):

    output_folder = os.path.join(BASE_DIR, "data", "intermediate")
    clean_audio_name = "clean_meeting_audio.wav"

    os.makedirs(output_folder, exist_ok=True)

    output_path = os.path.join(output_folder, clean_audio_name)

    command = [
        FFMPEG_EXE,
        "-y",
        "-i", video_path,
        "-ar", "16000",
        "-ac", "1",
        "-af", "loudnorm,afftdn",
        output_path
    ]

    subprocess.run(command, check=True)

    return output_path
