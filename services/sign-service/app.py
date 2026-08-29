import os
import sys
import csv
from pathlib import Path
from flask import Flask, jsonify, request
from flask_cors import CORS

ROOT = Path(__file__).resolve().parent.parent.parent
SIGN_RESEARCH_DIR = ROOT / "sign" / "MyResearch"
DATASET_FILE = SIGN_RESEARCH_DIR / "sign_dataset.csv"

if str(SIGN_RESEARCH_DIR) not in sys.path:
    sys.path.insert(0, str(SIGN_RESEARCH_DIR))

try:
    from data_loader_safe import DataLoader
    from model_safe import SignLanguageModel
    from predictor import SignPredictor
    ORIGINAL_SIGN_AVAILABLE = True
    print("[sign-service] Original Sign Language Research models loaded successfully.")
except Exception as e:
    ORIGINAL_SIGN_AVAILABLE = False
    print(f"[sign-service] Sign model import fallback: {e}")

app = Flask(__name__)
CORS(app)

PORT = int(os.environ.get("PORT", 5005))

SIGN_DICTIONARY = {
    "hello": {"gestures": ["wave_right_hand", "open_palm"], "confidence": 0.98, "emoji": "👋", "motion": "Open hand wave beside temple moving outwards gently"},
    "thank you": {"gestures": ["hand_to_chin", "extend_forward"], "confidence": 0.96, "emoji": "🙏", "motion": "Fingertips touching chin then moving outward"},
    "happy": {"gestures": ["pat_chest", "upward_brush"], "confidence": 0.94, "emoji": "✨", "motion": "Both open hands brush upwards against chest twice"},
    "sad": {"gestures": ["open_hand_down_face"], "confidence": 0.92, "emoji": "🌧️", "motion": "Open hand traces downward gently along the cheek"},
    "story": {"gestures": ["twisting_fingers_outward"], "confidence": 0.90, "emoji": "📖", "motion": "Hands mimic turning the glowing pages of a book"},
    "bear": {"gestures": ["crossed_arms_claw_chest"], "confidence": 0.95, "emoji": "🐻", "motion": "Crossed arms with soft claws touching chest"},
    "star": {"gestures": ["index_fingers_twinkle"], "confidence": 0.96, "emoji": "⭐", "motion": "Index fingers pointing upward alternating in twinkling motion"},
    "dragon": {"gestures": ["claw_breath_outward"], "confidence": 0.93, "emoji": "🐉", "motion": "Wiggling fingers move out from mouth mimicking gentle flame"},
    "friend": {"gestures": ["hook_index_fingers"], "confidence": 0.95, "emoji": "🤝", "motion": "Index fingers hooked together in warm companionship"},
    "calm": {"gestures": ["flat_palms_downward"], "confidence": 0.94, "emoji": "🌿", "motion": "Flat palms move downward slowly while breathing softly"},
    "brave": {"gestures": ["fists_firm_chest"], "confidence": 0.95, "emoji": "🦁", "motion": "Fists brought down firmly in front of chest in strong stance"},
    "love": {"gestures": ["crossed_arms_chest"], "confidence": 0.97, "emoji": "❤️", "motion": "Both hands crossed across the chest over the heart"},
    "book": {"gestures": ["palms_open_together"], "confidence": 0.95, "emoji": "📚", "motion": "Palms opened together as if opening a magical storybook"},
    "good": {"gestures": ["thumbs_up_chest"], "confidence": 0.96, "emoji": "👍", "motion": "Right hand touches chin and extends forward with thumb up"},
    "morning": {"gestures": ["sun_rising_arm"], "confidence": 0.93, "emoji": "🌅", "motion": "Right arm raises upwards from left forearm mimicking the rising sun"}
}

def _extract_xy_landmarks(frame_row):
    """
    Parses a single 260-column dataset frame row into normalized {x,y} 2D landmarks:
    - 33 Pose landmarks (columns 2..133, step 4)
    - 21 Left hand landmarks (columns 134..196, step 3)
    - 21 Right hand landmarks (columns 197..259, step 3)
    """
    idx = 2
    pose, left, right = [], [], []
    try:
        for _ in range(33):
            pose.append([round(float(frame_row[idx]), 4), round(float(frame_row[idx + 1]), 4)])
            idx += 4
        for _ in range(21):
            left.append([round(float(frame_row[idx]), 4), round(float(frame_row[idx + 1]), 4)])
            idx += 3
        for _ in range(21):
            right.append([round(float(frame_row[idx]), 4), round(float(frame_row[idx + 1]), 4)])
            idx += 3
        return {"pose": pose, "left": left, "right": right}
    except Exception:
        return None

# In-memory index of real dataset landmark frames (max 45 frames per label for snappy animations)
DATASET_FRAMES = {}
AVAILABLE_LABELS = []

def index_dataset():
    global DATASET_FRAMES, AVAILABLE_LABELS
    if not os.path.exists(DATASET_FILE):
        print(f"[sign-service] Dataset file not found at {DATASET_FILE}")
        return
    
    print(f"[sign-service] Indexing landmark frames from {DATASET_FILE}...")
    try:
        with open(DATASET_FILE, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            header = next(reader, None)
            for row in reader:
                if not row or len(row) < 10:
                    continue
                label = row[0].strip().lower()
                if label not in DATASET_FRAMES:
                    DATASET_FRAMES[label] = []
                if len(DATASET_FRAMES[label]) < 45:
                    parsed = _extract_xy_landmarks(row)
                    if parsed:
                        DATASET_FRAMES[label].append(parsed)
        AVAILABLE_LABELS = sorted(list(DATASET_FRAMES.keys()))
        print(f"[sign-service] Successfully indexed {len(AVAILABLE_LABELS)} real sign gesture labels!")
    except Exception as e:
        print(f"[sign-service] Dataset indexing error: {e}")

index_dataset()

def get_frames_for_word(word: str):
    w = word.lower().strip()
    if w in DATASET_FRAMES and len(DATASET_FRAMES[w]) > 0:
        return DATASET_FRAMES[w], "dataset_exact"
    if w in SIGN_DICTIONARY:
        if w in DATASET_FRAMES:
            return DATASET_FRAMES[w], "dataset_dict"
    for lbl in AVAILABLE_LABELS:
        if lbl == w or (len(w) > 3 and (w in lbl or lbl in w)):
            return DATASET_FRAMES[lbl], "dataset_fuzzy"
    return [], "none"

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "ok",
        "service": "sign-service",
        "port": PORT,
        "original_backend": ORIGINAL_SIGN_AVAILABLE,
        "dataset_indexed": len(AVAILABLE_LABELS) > 0,
        "vocabulary_count": len(AVAILABLE_LABELS) or len(SIGN_DICTIONARY),
        "available_labels_sample": AVAILABLE_LABELS[:15]
    })

@app.route('/labels', methods=['GET'])
@app.route('/api/sign/labels', methods=['GET'])
def get_labels():
    labels = AVAILABLE_LABELS if AVAILABLE_LABELS else list(SIGN_DICTIONARY.keys())
    return jsonify({
        "status": "success",
        "count": len(labels),
        "labels": labels
    })

@app.route('/landmarks/<label>', methods=['GET'])
@app.route('/api/sign/landmarks/<label>', methods=['GET'])
def get_landmarks(label):
    frames, source = get_frames_for_word(label)
    if not frames:
        return jsonify({"status": "not_found", "label": label, "frames": []}), 404
    return jsonify({
        "status": "success",
        "label": label,
        "source": source,
        "frame_count": len(frames),
        "frames": frames
    })

@app.route('/translate', methods=['POST'])
@app.route('/api/sign/translate', methods=['POST'])
def translate_text():
    data = request.json or {}
    text = data.get("text", "").lower().strip()
    words = [w.strip(".,!?;:\"'") for w in text.split() if w.strip()]
    
    sequence = []
    for w in words:
        frames, source = get_frames_for_word(w)
        dict_info = SIGN_DICTIONARY.get(w, {})
        
        if frames:
            sequence.append({
                "word": w,
                "found": True,
                "emoji": dict_info.get("emoji", "🤟"),
                "motion": dict_info.get("motion", f"Indian Sign gesture for '{w}'"),
                "confidence": dict_info.get("confidence", 0.95),
                "frame_count": len(frames),
                "animation_frames": frames
            })
        else:
            letter_frames = []
            for letter in w:
                l_frames, _ = get_frames_for_word(letter)
                if l_frames:
                    letter_frames.extend(l_frames[:8])
            
            sequence.append({
                "word": w,
                "found": len(letter_frames) > 0,
                "emoji": "🔤",
                "fingerspell": list(w.upper()),
                "motion": f"Fingerspelling word: {' - '.join(w.upper())}",
                "confidence": 0.90,
                "frame_count": len(letter_frames),
                "animation_frames": letter_frames
            })
            
    return jsonify({
        "status": "success",
        "input_text": text,
        "translated_sequence": sequence,
        "total_words": len(words)
    })

@app.route('/predict', methods=['POST'])
@app.route('/api/sign/predict', methods=['POST'])
def predict_signs():
    data = request.json or {}
    text = data.get("text", "").lower().strip()
    tokens = [t.strip(".,!?;:\"'") for t in text.split() if t.strip()]
    if not tokens and text:
        tokens = [text]

    results = []
    for token in tokens:
        frames, source = get_frames_for_word(token)
        dict_info = SIGN_DICTIONARY.get(token, {})

        results.append({
            "input": token,
            "resolved_label": token,
            "resolution_source": source,
            "emoji": dict_info.get("emoji", "🤟"),
            "motion": dict_info.get("motion", f"Sign gesture motion for '{token}'"),
            "confidence": dict_info.get("confidence", 0.94),
            "has_animation": len(frames) > 0,
            "frame_count": len(frames),
            "animation_frames": frames
        })

    return jsonify({
        "status": "success",
        "results": results
    })

if __name__ == '__main__':
    print(f"[sign-service] Running on port {PORT} linked with {SIGN_RESEARCH_DIR}")
    app.run(host='0.0.0.0', port=PORT)
