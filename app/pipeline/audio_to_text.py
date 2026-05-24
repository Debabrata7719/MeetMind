"""
app/pipeline/audio_to_text.py (FASTER-WHISPER VERSION)

Transcribe audio chunks to text using faster-whisper (CTranslate2 backend).
- 4x faster than OpenAI Whisper on CPU
- Lower memory usage (~50% reduction)
- Same transcription quality (uses same weights)
- API compatible with original code

Key changes from openai-whisper:
1. Import: from faster_whisper import WhisperModel (not import whisper)
2. Model loading: WhisperModel() instead of whisper.load_model()
3. Result format: (segments_generator, info) instead of dict
4. Segment access: seg.text instead of seg["text"]
"""

from faster_whisper import WhisperModel
import os

# Import config first so FFmpeg bin/ is injected into PATH before faster-whisper
# tries to call 'ffmpeg' internally
from app.core.config import FFMPEG_EXE as _FFMPEG_EXE  # noqa: F401 (side-effect import)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load model only once (cached in memory for subsequent calls)
# device="cpu" for CPU-only, can switch to "cuda" if GPU available
# compute_type="default" uses optimal precision for platform
model = WhisperModel("small", device="cpu", compute_type="default")


def audio_to_text(
    audio_path: str, meeting_id: str = "default", chunk_index: int = 0
) -> str:
    """
    Transcribe an audio file to text using faster-whisper.

    Args:
        audio_path: Path to .wav, .mp3, or .mp4 audio file
        meeting_id: Meeting identifier (used for output directory)
        chunk_index: Which chunk this is (0, 1, 2, ...) for naming

    Returns:
        Path to the saved transcript file
    """

    output_folder = os.path.join(BASE_DIR, "data", "intermediate", meeting_id)
    os.makedirs(output_folder, exist_ok=True)

    # Transcribe with language specified (for consistency)
    # faster-whisper returns a generator of Segment objects
    segments, info = model.transcribe(
        audio_path,
        language="en",  # Explicitly set to English
        task="translate",  # Translate non-English to English
    )

    output_file = os.path.join(output_folder, f"transcript_chunk_{chunk_index}.txt")

    # Convert generator to list and write to file
    # NOTE: segments is a generator, must iterate to get all results
    with open(output_file, "w", encoding="utf-8") as f:
        for segment in segments:
            # segment is a Segment object with attributes: id, seek, start, end, text
            text = segment.text.strip()
            if text:  # Skip empty segments
                f.write(text + "\n")

    print(f"Transcript saved at {output_file}")

    return output_file
