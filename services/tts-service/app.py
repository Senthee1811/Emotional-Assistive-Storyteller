import os
import sys
import time
import uuid
import hashlib
import threading
from pathlib import Path
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from gtts import gTTS

app = Flask(__name__)
CORS(app)

PORT = int(os.environ.get("PORT", 5006))
AUDIO_DIR = os.environ.get("TTS_AUDIO_DIR", "audio_outputs")
os.makedirs(AUDIO_DIR, exist_ok=True)

# Emotion Mapping for Coqui XTTS & RAVDESS
EMOTION_MAP = {
    "sad": 0,
    "happy": 1,
    "love": 2,
    "angry": 3,
    "fear": 4,
    "surprise": 5
}

ACTOR_DISPLAY_NAMES = {
    1: "Uncle Sunny",
    2: "Auntie Bella",
    3: "Uncle Coco",
    4: "Auntie Lily",
    5: "Uncle Milo",
    6: "Auntie Rosie"
}

# Check if Coqui TTS is available
COQUI_AVAILABLE = False
try:
    from TTS.api import TTS
    COQUI_AVAILABLE = True
    print("[tts-service] Coqui XTTS engine loaded successfully.")
except Exception:
    print("[tts-service] Coqui TTS package not present; using gTTS enhanced speech engine.")

# In-memory job queue store
JOBS = {}

def make_cache_hash(text: str, emotion: str, speaker: str) -> str:
    raw = f"{text}|{emotion}|{speaker}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:12]

def synthesize_audio(job_id: str, text: str, emotion: str, speaker: str):
    try:
        filename = f"{job_id}.mp3"
        filepath = os.path.join(AUDIO_DIR, filename)

        emotion_id = EMOTION_MAP.get(emotion.lower(), 1)
        
        if COQUI_AVAILABLE:
            try:
                # Coqui XTTS Model Inference
                model_name = os.environ.get("XTTS_MODEL", "tts_models/multilingual/multi-dataset/xtts_v2")
                tts_model = TTS(model_name=model_name, progress_bar=False, gpu=False)
                wav_path = os.path.join(AUDIO_DIR, f"{job_id}.wav")
                
                tts_model.tts_to_file(
                    text=text,
                    file_path=wav_path,
                    language="en"
                )
                filepath = wav_path
                filename = f"{job_id}.wav"
            except Exception as coqui_err:
                print(f"[tts-service] Coqui fallback to gTTS: {coqui_err}")
                # Fallback to gTTS
                tts = gTTS(text=text, lang='en', slow=False)
                tts.save(filepath)
        else:
            # High-quality gTTS synthesis
            tts = gTTS(text=text, lang='en', slow=False)
            tts.save(filepath)

        # Confirm audio file non-zero size
        if not os.path.exists(filepath) or os.path.getsize(filepath) == 0:
            raise RuntimeError("Audio file generated with 0 bytes size.")

        JOBS[job_id] = {
            "job_id": job_id,
            "status": "completed",
            "text": text,
            "emotion": emotion,
            "emotion_id": emotion_id,
            "speaker": speaker,
            "filename": filename,
            "audio_url": f"/api/tts/audio/{filename}",
            "file_size_bytes": os.path.getsize(filepath),
            "engine": "Coqui-XTTS-v2" if COQUI_AVAILABLE else "gTTS-Engine",
            "completed_at": time.time()
        }
    except Exception as e:
        print(f"[tts-service] Synthesis error for {job_id}: {e}")
        JOBS[job_id] = {
            "job_id": job_id,
            "status": "failed",
            "error": str(e)
        }

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "ok",
        "service": "tts-service",
        "coqui_available": COQUI_AVAILABLE,
        "active_jobs": len(JOBS)
    })

def _handle_synthesize():
    data = request.json or {}
    text = data.get("text", "Once upon a time in a happy forest.")
    emotion = data.get("emotion", "happy")
    speaker = data.get("speaker", "child_voice")

    cache_hash = make_cache_hash(text, emotion, speaker)
    job_id = f"job-{cache_hash}"

    # Check cache
    existing_file = os.path.join(AUDIO_DIR, f"{job_id}.mp3")
    existing_wav = os.path.join(AUDIO_DIR, f"{job_id}.wav")
    
    if os.path.exists(existing_file) and os.path.getsize(existing_file) > 0:
        JOBS[job_id] = {
            "job_id": job_id,
            "status": "completed",
            "text": text,
            "emotion": emotion,
            "speaker": speaker,
            "audio_url": f"/api/tts/audio/{job_id}.mp3",
            "cached": True
        }
        return jsonify(JOBS[job_id]), 200

    JOBS[job_id] = {
        "job_id": job_id,
        "status": "processing",
        "submitted_at": time.time()
    }

    t = threading.Thread(target=synthesize_audio, args=(job_id, text, emotion, speaker))
    t.daemon = True
    t.start()

    return jsonify({
        "job_id": job_id,
        "status": "processing",
        "message": "TTS synthesis started asynchronously"
    }), 202

@app.route('/synthesize', methods=['POST'])
@app.route('/api/tts/synthesize', methods=['POST'])
def synthesize():
    return _handle_synthesize()

@app.route('/jobs/<job_id>', methods=['GET'])
@app.route('/api/tts/jobs/<job_id>', methods=['GET'])
def get_job(job_id):
    job = JOBS.get(job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404
    return jsonify(job)

@app.route('/audio/<filename>', methods=['GET'])
@app.route('/api/tts/audio/<filename>', methods=['GET'])
def get_audio(filename):
    filepath = os.path.join(AUDIO_DIR, filename)
    if not os.path.exists(filepath):
        return jsonify({"error": "Audio file not found"}), 404
    mimetype = 'audio/wav' if filename.endswith('.wav') else 'audio/mpeg'
    return send_file(filepath, mimetype=mimetype)

if __name__ == '__main__':
    print(f"[tts-service] Running on port {PORT}")
    app.run(host='0.0.0.0', port=PORT)
