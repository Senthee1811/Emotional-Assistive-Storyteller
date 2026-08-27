import os
import sys
import time
import json
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

ROOT = Path(__file__).resolve().parent.parent.parent
TTS_SRC = ROOT / "text-to-speech" / "backend_tts"

if str(TTS_SRC) not in sys.path:
    sys.path.insert(0, str(TTS_SRC))

# Import original TTS backend components
try:
    from predictor import EmotionPredictor
    from text_utils import split_sentences
    from pipeline_xtts_ravdess import generate_child_friendly_emotion_tts, ACTOR_DISPLAY_NAMES
    from feedback_actions import like_voice, dislike_voice, get_voice_seed
    ORIGINAL_TTS_AVAILABLE = True
    print("[tts-service] Original Coqui XTTS & RAVDESS backend loaded.")
except Exception as err:
    ORIGINAL_TTS_AVAILABLE = False
    print(f"[tts-service] Original TTS import fallback: {err}")

app = Flask(__name__)
CORS(app)

PORT = int(os.environ.get("PORT", 5006))
AUDIO_OUTPUT_DIR = str(TTS_SRC / "tts_output")
CACHE_DIR = str(TTS_SRC / "cache_store")

os.makedirs(AUDIO_OUTPUT_DIR, exist_ok=True)
os.makedirs(CACHE_DIR, exist_ok=True)

EMOTION_LABELS = {
    0: "Sad",
    1: "Happy",
    2: "Love",
    3: "Angry",
    4: "Fear",
    5: "Surprise",
}
NAME_TO_ID = {v.lower(): k for k, v in EMOTION_LABELS.items()}

if ORIGINAL_TTS_AVAILABLE:
    try:
        predictor = EmotionPredictor()
    except Exception as e:
        print(f"[tts-service] EmotionPredictor load fallback: {e}")
        predictor = None
else:
    predictor = None

def resolve_emotion_label(raw_label):
    try:
        idx = int(float(raw_label))
        return EMOTION_LABELS.get(idx, "Happy")
    except Exception:
        pass
    if isinstance(raw_label, str):
        lower = raw_label.lower().strip()
        for emotion in EMOTION_LABELS.values():
            if emotion.lower() == lower:
                return emotion
    return "Happy"

def emotion_label_to_id(emotion_label: str) -> int:
    return NAME_TO_ID.get((emotion_label or "").lower(), 1)

def make_audio_url(filename: str) -> str:
    return f"/api/tts/audio/{filename}"

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "ok",
        "service": "tts-service",
        "port": PORT,
        "original_backend": ORIGINAL_TTS_AVAILABLE,
        "actors": ACTOR_DISPLAY_NAMES if ORIGINAL_TTS_AVAILABLE else {1: "Uncle Sunny", 2: "Auntie Bella", 3: "Uncle Coco", 4: "Auntie Lily", 5: "Uncle Milo", 6: "Auntie Rosie"}
    })

@app.route('/actors', methods=['GET'])
@app.route('/api/tts/actors', methods=['GET'])
def get_actors():
    actors = [
        {"id": k, "name": v, "gender": "male" if k in [1, 3, 5] else "female"}
        for k, v in (ACTOR_DISPLAY_NAMES.items() if ORIGINAL_TTS_AVAILABLE else {1: "Uncle Sunny", 2: "Auntie Bella", 3: "Uncle Coco", 4: "Auntie Lily", 5: "Uncle Milo", 6: "Auntie Rosie"}.items())
    ]
    return jsonify({"actors": actors})

@app.route("/audio/<path:filename>")
@app.route("/api/tts/audio/<path:filename>")
def serve_audio(filename):
    if os.path.exists(os.path.join(AUDIO_OUTPUT_DIR, filename)):
        return send_from_directory(AUDIO_OUTPUT_DIR, filename)
    # Check default fallback outputs
    fallback_dir = os.path.join(os.path.dirname(__file__), "audio_outputs")
    if os.path.exists(os.path.join(fallback_dir, filename)):
        return send_from_directory(fallback_dir, filename)
    return jsonify({"error": "Audio file not found"}), 404

@app.route('/synthesize', methods=['POST'])
@app.route('/api/tts/synthesize', methods=['POST'])
@app.route('/process-story-xtts', methods=['POST'])
@app.route('/api/tts/process-story-xtts-multispeaker', methods=['POST'])
def process_story_xtts():
    data = request.get_json() or {}
    text = data.get("text", "")
    child_id = data.get("child_id", "child_001")
    session_id = data.get("session_id", "story_001")
    gender = data.get("gender", "male")
    actor_id = int(data.get("actor_id", 1))
    target_emotion = data.get("emotion", "happy")

    if not text.strip():
        return jsonify({"error": "Text is required"}), 400

    # Split text into sentence-level emotion narrative
    if ORIGINAL_TTS_AVAILABLE and predictor:
        sentences = split_sentences(text)
    else:
        sentences = [s.strip() for s in text.replace('!', '.').replace('?', '.').split('.') if s.strip()]

    playlist = []
    for idx, sentence in enumerate(sentences):
        if len(sentence) < 3:
            continue

        if ORIGINAL_TTS_AVAILABLE and predictor:
            try:
                raw_label, score = predictor.predict(sentence)
                emotion = resolve_emotion_label(raw_label)
            except Exception:
                emotion = target_emotion.capitalize()
                score = 0.9
        else:
            emotion = target_emotion.capitalize()
            score = 0.9

        emotion_id = emotion_label_to_id(emotion)

        try:
            if ORIGINAL_TTS_AVAILABLE:
                out_path, meta = generate_child_friendly_emotion_tts(
                    text=sentence,
                    emotion_id=emotion_id,
                    child_id=child_id,
                    gender=gender,
                    session_id=session_id,
                    out_dir=os.path.join(AUDIO_OUTPUT_DIR, "xtts_ravdess"),
                    child_friendly=True,
                    actor_id=actor_id
                )
                filename = os.path.relpath(out_path, AUDIO_OUTPUT_DIR).replace("\\", "/")
            else:
                from gtts import gTTS
                out_dir = os.path.join(AUDIO_OUTPUT_DIR, "xtts_ravdess")
                os.makedirs(out_dir, exist_ok=True)
                filename = f"xtts_ravdess/sent_{idx}_{int(time.time())}.mp3"
                out_path = os.path.join(AUDIO_OUTPUT_DIR, filename)
                tts = gTTS(text=sentence, lang='en', slow=False)
                tts.save(out_path)
                meta = {"actor_id": actor_id, "actor_name": ACTOR_DISPLAY_NAMES.get(actor_id, "Uncle Sunny")}

            playlist.append({
                "sentence": sentence,
                "emotion": emotion,
                "emotion_id": emotion_id,
                "score": round(float(score), 2),
                "audio_url": make_audio_url(filename),
                "actor_id": actor_id,
                "actor_name": ACTOR_DISPLAY_NAMES.get(actor_id, f"Actor {actor_id}"),
                "meta": meta
            })
        except Exception as err:
            print(f"[tts-service] Sentence synthesis error: {err}")

    # Fallback if no playlist items generated
    if not playlist:
        playlist.append({
            "sentence": text,
            "emotion": target_emotion.capitalize(),
            "emotion_id": emotion_label_to_id(target_emotion),
            "score": 0.95,
            "audio_url": make_audio_url("fallback.mp3"),
            "actor_id": actor_id,
            "actor_name": ACTOR_DISPLAY_NAMES.get(actor_id, "Uncle Sunny")
        })

    return jsonify({
        "status": "success",
        "story_text": text,
        "selected_actor": ACTOR_DISPLAY_NAMES.get(actor_id, "Uncle Sunny"),
        "playlist": playlist,
        "total_sentences": len(playlist)
    }), 200

@app.route("/feedback", methods=["POST"])
@app.route("/api/tts/feedback", methods=["POST"])
def feedback():
    data = request.get_json() or {}
    child_id = data.get("child_id", "child_001")
    session_id = data.get("session_id", "story_001")
    actor_id = int(data.get("actor_id", 1))
    liked = bool(data.get("liked", True))

    if ORIGINAL_TTS_AVAILABLE:
        if liked:
            like_voice(child_id, actor_id)
        else:
            dislike_voice(child_id, actor_id, session_id=session_id)

    return jsonify({"status": "success", "actor_id": actor_id, "liked": liked}), 200

if __name__ == '__main__':
    print(f"[tts-service] Running on port {PORT}")
    app.run(host='0.0.0.0', port=PORT)
