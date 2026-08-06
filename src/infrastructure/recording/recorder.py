# app/recording/recorder.py

try:
    import sounddevice as sd
    import numpy as np
    import soundfile as sf
except Exception:
    sd = None
    np = None
    sf = None

FS = 16000
DEVICE_ID = 1      #  Stereo Mix (Realtek)
CHANNELS = 2       # stereo

recording = []
is_recording = False


# Callback
def _callback(indata, frames, time, status):
    if is_recording:
        recording.append(indata.copy())


# Start recording
def start_recording():
    global recording, is_recording

    recording = []
    is_recording = True

    stream = sd.InputStream(
        samplerate=FS,
        channels=CHANNELS,
        device=DEVICE_ID,
        callback=_callback
    )

    stream.start()
    print("[REC] Recording SYSTEM AUDIO (Stereo Mix)...")

    return stream


# Stop recording
def stop_recording(stream, filename="uploads/meeting.wav"):
    global is_recording

    is_recording = False

    stream.stop()
    stream.close()

    if len(recording) == 0:
        print("[WARN] No audio captured")
        return None

    audio = np.concatenate(recording, axis=0)

    sf.write(filename, audio, FS)

    print(f"[OK] Saved to {filename}")

    return filename
