import whisper
import os

# Import config first so FFmpeg bin/ is injected into PATH before Whisper
# tries to call 'ffmpeg' internally (in whisper/audio.py load_audio).
from app.core.config import FFMPEG_EXE as _FFMPEG_EXE  # noqa: F401 (side-effect import)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# load model only once (fast)
model = whisper.load_model("small")


def audio_to_text(audio_path: str, meeting_id: str, chunk_index: int):

    output_folder = os.path.join(BASE_DIR, "data", "intermediate", meeting_id)
    os.makedirs(output_folder, exist_ok=True)

    result = model.transcribe(audio_path, task="translate")

    output_file = os.path.join(output_folder, f"transcript_chunk_{chunk_index}.txt")


    segments = result["segments"]

    with open(output_file, "w", encoding="utf-8") as f:
        for seg in segments:
            f.write(seg["text"].strip() + "\n")

    print(f"Transcript saved at {output_file}")

    return output_file   # VERY IMPORTANT
