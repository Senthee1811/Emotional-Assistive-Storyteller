import json
from pathlib import Path
import sys
import re
import csv
import base64
import time
import os
import hashlib

# Prevent transformers from importing TensorFlow (which can fail due to missing DLLs)
os.environ["TRANSFORMERS_NO_TF"] = "1"
import numpy as np
import joblib
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
import pdfplumber

try:
    import pytesseract
    from PIL import Image
except ImportError:
    pytesseract = None
    Image = None

try:
    import cv2
    import torch
    from torchvision import transforms
except Exception:
    # torch can raise OSError when dependencies / CUDA drivers are missing
    cv2 = None
    torch = None
    transforms = None


BASE_DIR = Path(__file__).resolve().parent.parent
PDF_DIR = BASE_DIR / "Story_Classfication" / "test_pdfs"
IMG_DIR = BASE_DIR / "Story_Classfication" / "test_images"
SORTED_IMG_DIR = BASE_DIR / "Story_Classfication" / "sorted_images"
SORTED_PDF_DIR = BASE_DIR / "Story_Classfication" / "sorted_pdfs"

# Ensure project root is on path so Story_Classfication imports work when running from backend/
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from Story_Classfication.multi_pdf import predict_pdf_emotion

# Load text model artifacts once
MODEL_DIR = BASE_DIR / "Story_Models"
TEXT_MODEL = joblib.load(MODEL_DIR / "emotion_model.pkl")
TEXT_VECTORIZER = joblib.load(MODEL_DIR / "emotion_vectorizer.pkl")
TEXT_LABELS = joblib.load(MODEL_DIR / "emotion_labels.pkl")  # dict label->id
TEXT_REVERSE = {v: k for k, v in TEXT_LABELS.items()}
FEEDBACK_FILE = BASE_DIR / "Story_Classfication" / "dataset" / "user_feedback.csv"
SIGN_BASE_DIR = BASE_DIR.parent / "sign" / "MyResearch"
STUTTER_FRONTEND_DIR = BASE_DIR.parent / "stutter" / "frontend"

app = Flask(__name__)
CORS(app)

# --- Coqui TTS integration --------------------------------------------------
TTS_PROJECT_DIR = BASE_DIR.parent / "text-to-speech" / "backend_tts"
TTS_OUTPUT_DIR = TTS_PROJECT_DIR / "tts_output"
TTS_CACHE_DIR = TTS_PROJECT_DIR / "cache_store"
XTTS_PROMPT_CACHE_DIR = TTS_OUTPUT_DIR / "prompt_cache"
TTS_RAVDESS_DIR = TTS_PROJECT_DIR / "audio_speech_actors_01-24"

# Ensure tts modules are importable
if str(TTS_PROJECT_DIR) not in sys.path:
    sys.path.insert(0, str(TTS_PROJECT_DIR))

# Ensure output/cache directories exist
TTS_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
TTS_CACHE_DIR.mkdir(parents=True, exist_ok=True)
XTTS_PROMPT_CACHE_DIR.mkdir(parents=True, exist_ok=True)

TTS_EMOTION_LABELS = {
    0: "Sad",
    1: "Happy",
    2: "Love",
    3: "Angry",
    4: "Fear",
    5: "Surprise",
}
TTS_NAME_TO_ID = {v.lower(): k for k, v in TTS_EMOTION_LABELS.items()}

def map_target_emotion_to_tts_label(target_emotion: str) -> str:
    if not target_emotion:
        return "Happy"
    lower = target_emotion.strip().lower()
    mapping = {
        "happy": "Happy",
        "sad": "Sad",
        "angry": "Angry",
        "fear": "Fear",
        "surprise": "Surprise",
        "disgust": "Angry",
        "neutral": "Happy",
        "love": "Love",
        "joy": "Happy",
    }
    return mapping.get(lower, "Happy")


def resolve_emotion_label(raw_label):
    try:
        idx = int(float(raw_label))
        return TTS_EMOTION_LABELS.get(idx, "Unknown")
    except Exception:
        pass

    if isinstance(raw_label, str):
        lower = raw_label.lower().strip()

        if "label_" in lower:
            try:
                idx = int(lower.split("_")[-1])
                return TTS_EMOTION_LABELS.get(idx, "Unknown")
            except Exception:
                pass

        for emotion in TTS_EMOTION_LABELS.values():
            if emotion.lower() == lower:
                return emotion

    return "Unknown"


def emotion_label_to_id(emotion_label: str) -> int:
    return TTS_NAME_TO_ID.get((emotion_label or "").lower(), -1)


def make_audio_url(filename: str) -> str:
    base = request.host_url.rstrip("/")
    return f"{base}/api/audio/{filename}"


def is_valid_sentence(text, allow_short=False):
    text = (text or "").strip()
    if not allow_short and len(text) < 5:
        return False

    blacklist = [
        "copyright",
        "all rights reserved",
        "http",
        "www",
        "box",
        "address",
        "education",
        "foundation",
        "isbn",
    ]

    lower = text.lower()
    if any(b in lower for b in blacklist):
        return False

    if not re.search(r"[a-zA-Z]{2,}", text):
        return False

    return True


def merge_short_sentences(sentences, min_len=30):
    if not sentences:
        return []

    merged = [sentences[0].strip()]
    buffer = ""
    for s in sentences[1:]:
        s = s.strip()
        if len(s) < min_len:
            buffer += " " + s
        else:
            if buffer:
                merged.append(buffer.strip())
                buffer = ""
            merged.append(s)
    if buffer:
        merged.append(buffer.strip())
    return merged


def make_story_cache_key(
    text: str,
    child_id: str,
    gender: str,
    child_friendly: bool,
    voice_seed: int,
    emotion_id=None,
) -> str:
    raw = f"{text}|{child_id}|{gender}|{child_friendly}|{voice_seed}|{emotion_id}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def get_story_cache_path(cache_key: str) -> Path:
    return TTS_CACHE_DIR / f"{cache_key}.json"


def load_story_cache(cache_key: str):
    path = get_story_cache_path(cache_key)
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return None


def save_story_cache(cache_key: str, data):
    path = get_story_cache_path(cache_key)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)




def get_prompt_cache_file(actor_id: int, prompt_type: str) -> Path:
    return XTTS_PROMPT_CACHE_DIR / f"actor{actor_id:02d}_{prompt_type}.wav"


def process_story_text_with_tts(
    text: str,
    child_id: str = "child_001",
    session_id: str = "story_001",
    gender: str = "male",
    child_friendly: bool = True,
):
    if not text or not text.strip():
        raise ValueError("Text is required")

    voice_seed = get_voice_seed(child_id, session_id)

    cache_key = make_story_cache_key(
        text=text,
        child_id=child_id,
        gender=gender,
        child_friendly=child_friendly,
        voice_seed=voice_seed,
        emotion_id="sentence_xtts",
    )

    cached = load_story_cache(cache_key)
    if cached:
        return cached

    sentences = split_sentences(text)
    sentences = merge_short_sentences(sentences, min_len=15)

    playlist = []
    for idx, sentence in enumerate(sentences):
        if not is_valid_sentence(sentence, allow_short=(idx == 0)):
            continue

        # Primary path: standalone TTS predictor. Fallback: project text classifier.
        score = 0.0
        if TTS_PREDICTOR is not None:
            raw_label, raw_score = TTS_PREDICTOR.predict(sentence)
            emotion = resolve_emotion_label(raw_label)
            try:
                score = float(raw_score)
            except Exception:
                score = 0.0
        else:
            try:
                predicted, conf = classify_text(sentence)
                emotion = map_target_emotion_to_tts_label(predicted or "neutral")
                score = float(conf or 0.0)
            except Exception:
                emotion = map_target_emotion_to_tts_label("neutral")
                score = 0.0

        if score < 0.6:
            emotion = map_target_emotion_to_tts_label("neutral")
            emotion_id = emotion_label_to_id(emotion)
            score = 0.0
        else:
            emotion_id = emotion_label_to_id(emotion)

        if emotion_id < 0:
            continue

        out_path, meta = generate_child_friendly_emotion_tts(
            text=sentence,
            emotion_id=emotion_id,
            child_id=child_id,
            gender=gender,
            session_id=session_id,
            ravdess_root=str(TTS_RAVDESS_DIR),
            out_dir=str(TTS_OUTPUT_DIR / "xtts_ravdess"),
            child_friendly=child_friendly,
        )

        rel = os.path.relpath(out_path, str(TTS_OUTPUT_DIR)).replace("\\", "/")
        playlist.append(
            {
                "sentence": sentence,
                "emotion": emotion,
                "emotion_id": emotion_id,
                "score": round(score, 2),
                "audio_url": make_audio_url(rel),
                "meta": meta,
            }
        )

    response_data = {"playlist": playlist}
    save_story_cache(cache_key, response_data)
    return response_data


try:
    from predictor import EmotionPredictor
    from text_utils import split_sentences
    from pipeline_xtts_ravdess import generate_child_friendly_emotion_tts
    from feedback_actions import like_voice, dislike_voice, get_voice_seed

    TTS_PREDICTOR = EmotionPredictor()
    TTS_PREDICTOR_ERROR = None
except Exception as e:
    TTS_PREDICTOR = None
    TTS_PREDICTOR_ERROR = str(e)


SIGN_PREDICTOR = None
SIGN_PREDICTOR_ERROR = None
SIGN_READY = False
FACE_MODEL = None
FACE_TRANSFORM = None
FACE_CLASSES = []
FACE_DEVICE = None
FACE_LOAD_ERROR = None

# Map target emotions to accepted tags (folders) for mood-support recommendations.
# Tags can be used as folder names under sorted_pdfs/ or sorted_images/.
EMOTION_SUPPORT_TAGS = {
    "happy": [
        "happy",
        "comedy",
        "celebration",
        "friendship",
        "adventure",
        "gratitude",
        "kindness",
        "sharing",
    ],
    "sad": [
        "sad",
        "comfort",
        "reflective",
        "motivational",
        "hopeful",
        "heartwarming",
        "friendship",
    ],
    "angry": [
        "angry",
        "calm-down",
        "mindfulness",
        "forgiveness",
        "cooperation",
        "problem-solving",
        "justice",
    ],
    "fear": [
        "fear",
        "brave-hero",
        "safe-adventure",
        "reassuring",
        "confidence",
        "family",
    ],
    "disgust": [
        "disgust",
        "health",
        "clean-up",
        "boundaries",
        "humor",
        "curiosity",
    ],
    "surprise": [
        "surprise",
        "mystery",
        "twist",
        "discovery",
        "learning",
        "wonder",
    ],
    "neutral": [
        "neutral",
        "everyday",
        "slice-of-life",
        "curiosity",
        "light-adventure",
    ],
}

DEFAULT_STORIES = {
    "happy": "A bright morning breeze carried laughter across the garden, and every step felt light and hopeful.",
    "sad": "Soft rain tapped the window while a kind friend sat nearby, reminding you that heavy days still pass.",
    "angry": "A deep breath, a quiet pause, and a calm walk helped turn sharp feelings into clear thoughts.",
    "fear": "In the dark hallway, a small light appeared, and each careful step made the path feel safer.",
    "disgust": "With patience and care, the mess was cleaned, and the room felt fresh and comfortable again.",
    "surprise": "A sudden sparkle filled the sky, and everyone smiled at the unexpected wonder.",
    "neutral": "The day moved gently, with simple moments, steady breaths, and peaceful balance.",
}


def extract_pdf_text_only(pdf_path: Path) -> str:
    text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            content = page.extract_text()
            if content:
                text += content + "\n"
    return text.strip()


def clean_text(text: str) -> str:
    text = re.sub(r"http\S+", "", text)
    text = re.sub(r"[^A-Za-z\s]", " ", text)
    return text.lower().strip()


def classify_text(text: str):
    vec = TEXT_VECTORIZER.transform([clean_text(text)])
    # LinearSVC has no predict_proba; fallback to softmax over decision_function
    if hasattr(TEXT_MODEL, "predict_proba"):
        probs = TEXT_MODEL.predict_proba(vec)[0]
    else:
        scores = TEXT_MODEL.decision_function(vec)
        scores = np.array(scores).ravel()
        exp_scores = np.exp(scores - scores.max())
        probs = exp_scores / exp_scores.sum()
    idx = int(np.argmax(probs))
    return TEXT_REVERSE.get(idx), float(probs[idx])


def append_feedback(text: str, label_id: int):
    FEEDBACK_FILE.parent.mkdir(parents=True, exist_ok=True)
    exists = FEEDBACK_FILE.exists()
    # Normalize text to a single line to match training.csv style
    normalized = " ".join((text or "").split()).replace(",", " ")
    with FEEDBACK_FILE.open("a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        if not exists:
            writer.writerow(["text", "label"])
        writer.writerow([normalized, label_id])


def extract_text_from_image(img_path: Path) -> str:
    if pytesseract is None or Image is None:
        raise RuntimeError("pytesseract/PIL not installed")
    try:
        _ = pytesseract.get_tesseract_version()
    except Exception as e:
        # Provide a helpful error message with installation instructions
        error_msg = (
            "Tesseract binary not found on PATH. Please install Tesseract OCR:\n"
            "1. Download from: https://github.com/UB-Mannheim/tesseract/releases\n"
            "2. Install tesseract-ocr-w64-setup-5.3.3.exe\n"
            "3. Add C:\\Program Files\\Tesseract-OCR to PATH\n"
            "4. Restart your terminal and backend server"
        )
        raise RuntimeError(error_msg) from e

    img = Image.open(img_path)
    return pytesseract.image_to_string(img)


def get_face_detector():
    global FACE_MODEL, FACE_TRANSFORM, FACE_CLASSES, FACE_DEVICE, FACE_LOAD_ERROR

    if FACE_MODEL is not None:
        if FACE_TRANSFORM is None:
            FACE_LOAD_ERROR = "Face transform function is unavailable. Check torch/torchvision installation."
            return None, None, None, None, FACE_LOAD_ERROR
        return FACE_MODEL, FACE_TRANSFORM, FACE_CLASSES, FACE_DEVICE, None
    if FACE_LOAD_ERROR is not None:
        return None, None, None, None, FACE_LOAD_ERROR

    if cv2 is None or torch is None or transforms is None or Image is None:
        FACE_LOAD_ERROR = "Missing cv2/torch/torchvision/PIL dependencies for face detection."
        return None, None, None, None, FACE_LOAD_ERROR

    try:
        # Use absolute imports to avoid conflicts
        backend_dir = Path(__file__).resolve().parent
        config_path = backend_dir / "config.py"
        train_path = backend_dir / "train.py"
        
        # Import config directly
        import importlib.util
        spec = importlib.util.spec_from_file_location("config", config_path)
        config = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(config)
        
        MODEL_PATH = config.MODEL_PATH
        DEVICE = config.DEVICE
        EMOTION_CLASSES = config.EMOTION_CLASSES
        IMG_SIZE = config.IMG_SIZE
        
        # Import train module directly
        spec_train = importlib.util.spec_from_file_location("train", train_path)
        train = importlib.util.module_from_spec(spec_train)
        spec_train.loader.exec_module(train)
        
        EmotionCNN = train.EmotionCNN

        FACE_DEVICE = DEVICE
        FACE_CLASSES = EMOTION_CLASSES
        FACE_MODEL = EmotionCNN().to(FACE_DEVICE)
        FACE_MODEL.load_state_dict(torch.load(MODEL_PATH, map_location=FACE_DEVICE))
        FACE_MODEL.eval()

        FACE_TRANSFORM = transforms.Compose(
            [
                transforms.Grayscale(num_output_channels=3),
                transforms.Resize((IMG_SIZE, IMG_SIZE)),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
            ]
        )
        return FACE_MODEL, FACE_TRANSFORM, FACE_CLASSES, FACE_DEVICE, None
    except Exception as e:
        FACE_LOAD_ERROR = str(e)
        return None, None, None, None, FACE_LOAD_ERROR


def decode_base64_image(data_url: str):
    if not data_url:
        return None
    try:
        if "," in data_url:
            data_url = data_url.split(",", 1)[1]
        raw = base64.b64decode(data_url)
        arr = np.frombuffer(raw, dtype=np.uint8)
        return cv2.imdecode(arr, cv2.IMREAD_COLOR)
    except Exception:
        return None


def predict_face_emotion_from_frame(frame_bgr):
    model, transform_fn, classes, device, err = get_face_detector()
    if model is None:
        return None, None, err

    gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    faces = face_cascade.detectMultiScale(gray, 1.3, 5)

    if len(faces) > 0:
        x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
        face_img = frame_bgr[y : y + h, x : x + w]
    else:
        # Fallback: center crop when no face is detected.
        h, w = frame_bgr.shape[:2]
        side = int(min(h, w) * 0.7)
        cx, cy = w // 2, h // 2
        x1, y1 = max(cx - side // 2, 0), max(cy - side // 2, 0)
        x2, y2 = min(x1 + side, w), min(y1 + side, h)
        face_img = frame_bgr[y1:y2, x1:x2]

    if face_img.size == 0:
        return None, None, "Could not extract face region."

    face_pil = Image.fromarray(cv2.cvtColor(face_img, cv2.COLOR_BGR2RGB))

    if not callable(transform_fn):
        return None, None, "Face transform function is unavailable (missing torch/torchvision or failed initialization)."

    try:
        img = transform_fn(face_pil).unsqueeze(0).to(device)
    except Exception as ex:
        return None, None, f"Face transform failed: {ex}"

    try:
        with torch.no_grad():
            output = model(img)
            probs = torch.softmax(output, dim=1).squeeze(0).cpu().numpy()
    except Exception as ex:
        return None, None, f"Emotion model inference failed: {ex}"
    idx = int(np.argmax(probs))
    return classes[idx], float(probs[idx]), None


def _extract_xy_landmarks(frame_row):
    # Sign dataset format: label, frame, then pose(33*4), left(21*3), right(21*3).
    idx = 2
    pose = []
    left = []
    right = []
    try:
        for _ in range(33):
            pose.append([float(frame_row[idx]), float(frame_row[idx + 1])])
            idx += 4
        for _ in range(21):
            left.append([float(frame_row[idx]), float(frame_row[idx + 1])])
            idx += 3
        for _ in range(21):
            right.append([float(frame_row[idx]), float(frame_row[idx + 1])])
            idx += 3
        return {"pose": pose, "left": left, "right": right}
    except Exception:
        return None


def _tokenize_story_text(text: str, max_tokens=40):
    tokens = re.findall(r"[A-Za-z]+", text or "")
    return [t.lower() for t in tokens[:max_tokens]]


def _build_spelled_frames(predictor, token: str, max_frames_per_token: int):
    """Fallback for unknown words: stitch letter animations if available."""
    merged = []
    used_letters = []
    for ch in token:
        letter_frames, _ = predictor.load_sign_frames(ch)
        if not letter_frames:
            continue
        for row in letter_frames:
            parsed = _extract_xy_landmarks(row)
            if parsed is not None:
                merged.append(parsed)
                if len(merged) >= max_frames_per_token:
                    break
        used_letters.append(ch)
        if len(merged) >= max_frames_per_token:
            break
    return merged, "".join(used_letters)


def get_sign_predictor():
    global SIGN_PREDICTOR, SIGN_PREDICTOR_ERROR, SIGN_READY

    if SIGN_READY and SIGN_PREDICTOR is not None:
        return SIGN_PREDICTOR, None
    if SIGN_PREDICTOR_ERROR is not None:
        return None, SIGN_PREDICTOR_ERROR

    if not SIGN_BASE_DIR.exists():
        SIGN_PREDICTOR_ERROR = (
            f"Sign project folder not found at: {SIGN_BASE_DIR}. "
            "Expected sign/MyResearch beside this project."
        )
        return None, SIGN_PREDICTOR_ERROR

    try:
        sign_dir = str(SIGN_BASE_DIR.resolve())
        if sign_dir not in sys.path:
            sys.path.insert(0, sign_dir)

        from model import SignLanguageModel
        from data_loader import DataLoader
        from predictor import SignPredictor
        from config import MODEL_FILE

        model_wrapper = SignLanguageModel(input_shape=(None, 1), num_classes=1)
        if not model_wrapper.load(MODEL_FILE):
            SIGN_PREDICTOR_ERROR = "Could not load sign model. Train sign/MyResearch model first."
            return None, SIGN_PREDICTOR_ERROR

        loader = DataLoader()
        label_encoder = loader.load_label_encoder()
        if label_encoder is None:
            SIGN_PREDICTOR_ERROR = "Label encoder not found for sign model."
            return None, SIGN_PREDICTOR_ERROR

        SIGN_PREDICTOR = SignPredictor(model_wrapper.model, label_encoder)
        SIGN_READY = True
        return SIGN_PREDICTOR, None
    except Exception as e:
        SIGN_PREDICTOR_ERROR = str(e)
        return None, SIGN_PREDICTOR_ERROR


def build_sign_sequence_from_text(text: str, max_tokens=40, max_frames_per_token=90):
    predictor, error = get_sign_predictor()
    if predictor is None:
        return None, error

    tokens = _tokenize_story_text(text, max_tokens=max_tokens)
    if not tokens:
        return [], None

    results = []
    for token in tokens:
        direct_frames, _ = predictor.load_sign_frames(token)
        resolved_label = token
        source = "direct"
        parsed_frames = []

        for row in direct_frames[:max_frames_per_token]:
            parsed = _extract_xy_landmarks(row)
            if parsed is not None:
                parsed_frames.append(parsed)

        if not parsed_frames:
            spelled_frames, letters_used = _build_spelled_frames(
                predictor, token, max_frames_per_token=max_frames_per_token
            )
            if spelled_frames:
                parsed_frames = spelled_frames
                resolved_label = letters_used or token
                source = "spelled"

        if parsed_frames:
            results.append(
                {
                    "input": token,
                    "predicted_label": None,
                    "resolved_label": resolved_label,
                    "resolution_source": source,
                    "confidence": 1.0 if source == "direct" else 0.7,
                    "frame_count": len(parsed_frames),
                    "animation_frames": parsed_frames,
                }
            )

    return results, None


@app.route("/api/pdfs", methods=["GET"])
def list_pdfs():
    files = [p.name for p in PDF_DIR.glob("*.pdf")]
    return jsonify({"files": files})


@app.route("/api/classify", methods=["POST"])
def classify_pdf():
    data = request.get_json(force=True, silent=True) or {}
    filename = data.get("filename")
    if not filename:
        return jsonify({"error": "filename is required"}), 400

    pdf_path = PDF_DIR / filename
    if not pdf_path.exists():
        return jsonify({"error": f"{filename} not found"}), 404

    num, emotion, probs = predict_pdf_emotion(pdf_path)
    if emotion is None:
        return jsonify({"error": "No text found in PDF"}), 422

    story_text = extract_pdf_text_only(pdf_path)
    confidence = None
    if probs is not None:
        try:
            confidence = float(max(probs))
        except Exception:
            confidence = None

    return jsonify(
        {
            "filename": filename,
            "emotion": emotion,
            "confidence": confidence,
            "story_text": story_text,
        }
    )


@app.route("/api/detect-emotion", methods=["POST"])
def detect_emotion():
    data = request.get_json(force=True, silent=True) or {}
    image_data = data.get("image")
    if not image_data:
        return jsonify({"error": "image is required"}), 400

    frame = decode_base64_image(image_data)
    if frame is None:
        return jsonify({"error": "Invalid image payload"}), 400

    emotion, confidence, err = predict_face_emotion_from_frame(frame)
    if err:
        # Return a safe default (neutral) instead of failing the whole request.
        return jsonify({
            "emotion": "neutral",
            "confidence": 0.0,
            "timestamp": int(time.time() * 1000),
            "warning": "Emotion detector unavailable",
            "details": err,
        }), 200

    if emotion is None:
        return jsonify({
            "emotion": "neutral",
            "confidence": 0.0,
            "timestamp": int(time.time() * 1000),
            "warning": "Could not detect emotion",
        }), 200

    return jsonify(
        {
            "emotion": emotion,
            "confidence": confidence,
            "timestamp": int(time.time() * 1000),
        }
    )


def gather_pdf_candidates():
    candidates = []
    
    # Only look in the specified directories
    uploaded_stories_dir = BASE_DIR / "data" / "uploaded_stories"
    test_pdfs_dir = BASE_DIR / "backend" / "Story_Classfication" / "test_pdfs"
    
    # Check uploaded_stories directory first
    if uploaded_stories_dir.exists():
        for pdf_path in uploaded_stories_dir.glob("*.pdf"):
            try:
                story = extract_pdf_text_only(pdf_path)
                emotion, confidence = classify_text(story)
                if not story.strip():
                    continue
                candidates.append({
                    "path": pdf_path,
                    "emotion": emotion.lower() if emotion else "neutral",
                    "confidence": confidence if confidence else 0.5,
                    "type": "pdf",
                    "story": story,
                })
            except Exception:
                continue
    
    # Check test_pdfs directory
    if test_pdfs_dir.exists():
        for pdf_path in test_pdfs_dir.glob("*.pdf"):
            try:
                story = extract_pdf_text_only(pdf_path)
                emotion, confidence = classify_text(story)
                if not story.strip():
                    continue
                candidates.append({
                    "path": pdf_path,
                    "emotion": emotion.lower() if emotion else "neutral",
                    "confidence": confidence if confidence else 0.5,
                    "type": "pdf",
                    "story": story,
                })
            except Exception:
                continue
    
    return candidates


def gather_image_candidates():
    # Only look for images in the specified directories if they exist
    candidates = []
    uploaded_stories_dir = BASE_DIR / "data" / "uploaded_stories"
    test_pdfs_dir = BASE_DIR / "backend" / "Story_Classfication" / "test_pdfs"
    
    # Check uploaded_stories directory for images
    if uploaded_stories_dir.exists():
        for img_path in uploaded_stories_dir.glob("*"):
            if img_path.suffix.lower() in {".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff"}:
                try:
                    text = extract_text_from_image(img_path)
                    if not text.strip():
                        continue
                    emotion, confidence = classify_text(text)
                    candidates.append({
                        "path": img_path,
                        "emotion": emotion.lower() if emotion else "neutral",
                        "confidence": confidence if confidence else 0.5,
                        "type": "image",
                        "story": text.strip(),
                    })
                except Exception:
                    continue
    
    # Check test_pdfs directory for images
    if test_pdfs_dir.exists():
        for img_path in test_pdfs_dir.glob("*"):
            if img_path.suffix.lower() in {".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff"}:
                try:
                    text = extract_text_from_image(img_path)
                    if not text.strip():
                        continue
                    emotion, confidence = classify_text(text)
                    candidates.append({
                        "path": img_path,
                        "emotion": emotion.lower() if emotion else "neutral",
                        "confidence": confidence if confidence else 0.5,
                        "type": "image",
                        "story": text.strip(),
                    })
                except Exception:
                    continue
    
    return candidates


def find_best_story_for_emotion(target_emotion: str):
    target = (target_emotion or "").lower()
    preferred_tags = EMOTION_SUPPORT_TAGS.get(target, [target])
    preferred_set = {t.lower() for t in preferred_tags if t}
    candidates = gather_pdf_candidates() + gather_image_candidates()
    if not candidates:
        return None, None, None, None

    best_match = None
    best_any = None
    for c in candidates:
        if best_any is None or c["confidence"] > best_any["confidence"]:
            best_any = c
        if c["emotion"] in preferred_set:
            if best_match is None:
                best_match = c
            else:
                # Prefer exact target tag first, then confidence.
                best_is_exact = best_match["emotion"] == target
                cand_is_exact = c["emotion"] == target
                if cand_is_exact and not best_is_exact:
                    best_match = c
                elif cand_is_exact == best_is_exact and c["confidence"] > best_match["confidence"]:
                    best_match = c

    chosen = best_match if best_match is not None else best_any
    return (
        chosen["path"],
        chosen["confidence"],
        chosen["emotion"],
        chosen["story"],
    )


def fallback_story_payload(target_emotion: str):
    key = (target_emotion or "").lower()
    if key not in DEFAULT_STORIES:
        key = "neutral"
    return {
        "filename": "fallback_story.txt",
        "emotion": key,
        "confidence": 0.0,
        "story_text": DEFAULT_STORIES[key],
        "matched": False,
        "preferred_tags": EMOTION_SUPPORT_TAGS.get(target_emotion, [target_emotion]),
    }


@app.route("/api/recommend", methods=["GET"])
def recommend_pdf():
    target_emotion = request.args.get("emotion", "").strip().lower()
    if not target_emotion:
        return jsonify({"error": "emotion is required"}), 400

    path, conf, used_label, story_text = find_best_story_for_emotion(target_emotion)
    if path is None:
        return jsonify(fallback_story_payload(target_emotion))

    return jsonify(
        {
            "filename": path.name,
            "emotion": used_label or target_emotion,
            "confidence": conf,
            "story_text": story_text,
            "matched": used_label == target_emotion if used_label else False,
            "preferred_tags": EMOTION_SUPPORT_TAGS.get(target_emotion, [target_emotion]),
        }
    )


@app.route("/api/audio/<path:filename>", methods=["GET"])
def serve_tts_audio(filename):
    safe = os.path.normpath(filename).replace("\\", "/")
    if safe.startswith(".."):
        return jsonify({"error": "invalid filename"}), 400
    return send_from_directory(str(TTS_OUTPUT_DIR), safe, as_attachment=False)


@app.route("/api/predict-xtts", methods=["POST"])
def predict_emotion_xtts():
    data = request.get_json(force=True, silent=True) or {}
    text = data.get("text") or data.get("sentence")

    child_id = data.get("child_id", "child_001")
    session_id = data.get("session_id", "story_001")
    gender = data.get("gender", "male")
    child_friendly = bool(data.get("child_friendly", True))

    if not text or len(text.strip()) < 3:
        return jsonify({"error": "Invalid text"}), 400

    used_fallback = False
    if TTS_PREDICTOR is not None:
        raw_label, raw_score = TTS_PREDICTOR.predict(text)
        emotion = resolve_emotion_label(raw_label)
        try:
            score = float(raw_score)
        except Exception:
            score = 0.0
    else:
        used_fallback = True
        try:
            predicted, conf = classify_text(text)
            emotion = map_target_emotion_to_tts_label(predicted or "neutral")
            score = float(conf or 0.0)
        except Exception as ex:
            return jsonify({"error": "Could not predict emotion", "details": str(ex)}), 500

    if score < 0.6 and not used_fallback:
        return jsonify(
            {
                "status": "low_confidence",
                "emotion": "Unknown",
                "score": round(score, 2),
            }
        ), 200

    emotion_id = emotion_label_to_id(emotion)
    if emotion_id < 0:
        return jsonify({"error": f"Unsupported emotion label: {emotion}"}), 400

    out_path, meta = generate_child_friendly_emotion_tts(
        text=text,
        emotion_id=emotion_id,
        child_id=child_id,
        gender=gender,
        session_id=session_id,
        ravdess_root=str(TTS_RAVDESS_DIR),
        out_dir=str(TTS_OUTPUT_DIR / "xtts_ravdess"),
        child_friendly=child_friendly,
    )

    rel = os.path.relpath(out_path, str(TTS_OUTPUT_DIR)).replace("\\", "/")
    return jsonify(
        {
            "status": "success",
            "emotion": emotion,
            "emotion_id": emotion_id,
            "score": round(score, 2),
            "audio_url": make_audio_url(rel),
            "meta": meta,
        }
    )


@app.route("/api/process-story-xtts", methods=["POST"])
@app.route("/api/process-story-xtts-multispeaker", methods=["POST"])
def process_story_xtts():
    data = request.get_json(force=True, silent=True) or {}

    text = data.get("text", "")
    child_id = data.get("child_id", "child_001")
    session_id = data.get("session_id", "story_001")
    gender = data.get("gender", "male")
    child_friendly = bool(data.get("child_friendly", True))

    if not text.strip():
        return jsonify({"error": "Text is required"}), 400

    try:
        result = process_story_text_with_tts(
            text=text,
            child_id=child_id,
            session_id=session_id,
            gender=gender,
            child_friendly=child_friendly,
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": "Failed to process story XTTS", "details": str(e)}), 500


@app.route("/api/regenerate-from-index-xtts", methods=["POST"])
def regenerate_from_index_xtts():
    data = request.get_json(force=True, silent=True) or {}

    playlist = data.get("playlist", [])
    start_index = int(data.get("start_index", 0))
    child_id = data.get("child_id", "child_001")
    session_id = data.get("session_id", "story_001")
    gender = data.get("gender", "male")
    child_friendly = bool(data.get("child_friendly", True))

    if not isinstance(playlist, list):
        return jsonify({"error": "playlist must be a list"}), 400

    updated_items = []
    for i in range(start_index, len(playlist)):
        item = playlist[i]
        sentence = item.get("sentence", "")
        emotion = item.get("emotion", "Unknown")
        emotion_id = int(item.get("emotion_id", -1))
        score = float(item.get("score", 0))

        if not sentence or emotion_id < 0:
            continue

        out_path, meta = generate_child_friendly_emotion_tts(
            text=sentence,
            emotion_id=emotion_id,
            child_id=child_id,
            gender=gender,
            session_id=session_id,
            ravdess_root=str(TTS_RAVDESS_DIR),
            out_dir=str(TTS_OUTPUT_DIR / "xtts_ravdess"),
            child_friendly=child_friendly,
        )

        rel = os.path.relpath(out_path, str(TTS_OUTPUT_DIR)).replace("\\", "/")
        updated_items.append(
            {
                "sentence": sentence,
                "emotion": emotion,
                "emotion_id": emotion_id,
                "score": round(score, 2),
                "audio_url": make_audio_url(rel),
                "meta": meta,
            }
        )

    return jsonify({"updated_items": updated_items}), 200


@app.route("/api/feedback", methods=["POST"])
def feedback():
    data = request.get_json(force=True, silent=True) or {}
    child_id = data.get("child_id", "child_001")
    session_id = data.get("session_id", "story_001")
    actor_id = data.get("actor_id")
    liked = data.get("liked")

    if actor_id is None or liked is None:
        return jsonify({"error": "actor_id and liked are required"}), 400

    actor_id = int(actor_id)
    liked = bool(liked)

    if liked:
        like_voice(child_id, actor_id)
        return jsonify({"ok": True, "message": "Saved like"}), 200

    dislike_voice(child_id, actor_id, session_id=session_id)
    return jsonify({"ok": True, "message": "Saved dislike and session reset"}), 200


@app.route("/api/prompt-xtts", methods=["POST"])
def prompt_xtts():
    data = request.get_json(force=True, silent=True) or {}

    actor_id = int(data.get("actor_id", 1))
    prompt_type = data.get("prompt_type", "ask_keep_change")

    if prompt_type not in {"ask_keep_change", "confirm_keep", "confirm_change"}:
        return jsonify({"error": "Invalid prompt_type"}), 400

    prompt_path = get_prompt_cache_file(actor_id, prompt_type)
    if not prompt_path.exists():
        return jsonify({"error": f"Prompt cache file not found: {prompt_path}"}), 404

    rel = os.path.relpath(prompt_path, str(TTS_OUTPUT_DIR)).replace("\\", "/")
    return jsonify(
        {
            "ok": True,
            "audio_url": make_audio_url(rel),
            "actor_id": actor_id,
            "prompt_type": prompt_type,
        }
    ), 200


@app.route("/api/recommend-with-tts", methods=["GET"])
def recommend_with_tts():
    target_emotion = request.args.get("emotion", "").strip().lower()
    if not target_emotion:
        return jsonify({"error": "emotion is required"}), 400

    child_id = request.args.get("child_id", "child_001")
    session_id = request.args.get("session_id", "story_001")
    gender = request.args.get("gender", "male")
    child_friendly = request.args.get("child_friendly", "true").lower() == "true"

    path, conf, used_label, story_text = find_best_story_for_emotion(target_emotion)
    matched = True
    if path is None:
        payload = fallback_story_payload(target_emotion)
        story_text = payload["story_text"]
        used_label = payload["emotion"]
        conf = payload.get("confidence", 0.0)
        matched = False

    try:
        tts_data = process_story_text_with_tts(
            text=story_text,
            child_id=child_id,
            session_id=session_id,
            gender=gender,
            child_friendly=child_friendly,
        )
    except Exception as e:
        return jsonify({"error": "TTS integration unavailable", "details": str(e)}), 500

    return jsonify(
        {
        "filename": path.name if path else "fallback_story.txt",
        "emotion": used_label or target_emotion,
        "confidence": conf,
        "story_text": story_text,
        "matched": matched,
        "preferred_tags": EMOTION_SUPPORT_TAGS.get(target_emotion, [target_emotion]),
        "playlist": tts_data.get("playlist", []),
        }
    )


@app.route("/api/sign-story", methods=["POST"])
def sign_story():
    data = request.get_json(force=True, silent=True) or {}
    text = (data.get("text") or "").strip()
    if not text:
        return jsonify({"error": "text is required"}), 400

    try:
        max_tokens = int(data.get("max_tokens", 40))
    except (TypeError, ValueError):
        max_tokens = 40
    max_tokens = max(1, min(max_tokens, 120))
    sequence, err = build_sign_sequence_from_text(text, max_tokens=max_tokens)
    if sequence is None:
        return jsonify({"error": "Sign system unavailable", "details": err}), 500

    return jsonify(
        {
            "status": "ok",
            "tokens_requested": max_tokens,
            "tokens_with_animation": len(sequence),
            "sequence": sequence,
        }
    )


@app.route("/api/recommend-with-sign", methods=["GET"])
def recommend_with_sign():
    target_emotion = request.args.get("emotion", "").strip().lower()
    try:
        max_tokens = int(request.args.get("max_tokens", 40))
    except (TypeError, ValueError):
        max_tokens = 40
    max_tokens = max(1, min(max_tokens, 120))

    if not target_emotion:
        return jsonify({"error": "emotion is required"}), 400

    path, conf, used_label, story_text = find_best_story_for_emotion(target_emotion)
    if path is None:
        payload = fallback_story_payload(target_emotion)
        sign_sequence, sign_error = build_sign_sequence_from_text(payload["story_text"], max_tokens=max_tokens)
        payload.update(
            {
                "sign_sequence": sign_sequence if sign_sequence is not None else [],
                "sign_available": sign_sequence is not None,
                "sign_error": sign_error,
            }
        )
        return jsonify(payload)

    sign_sequence, sign_error = build_sign_sequence_from_text(story_text, max_tokens=max_tokens)

    return jsonify(
        {
            "filename": path.name,
            "emotion": used_label or target_emotion,
            "confidence": conf,
            "story_text": story_text,
            "matched": used_label == target_emotion if used_label else False,
            "preferred_tags": EMOTION_SUPPORT_TAGS.get(target_emotion, [target_emotion]),
            "sign_sequence": sign_sequence if sign_sequence is not None else [],
            "sign_available": sign_sequence is not None,
            "sign_error": sign_error,
        }
    )


@app.route("/api/upload", methods=["POST"])
def upload_pdf():
    if "file" not in request.files:
        return jsonify({"error": "file is required"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "empty filename"}), 400

    filename = secure_filename(file.filename)
    if not filename.lower().endswith(".pdf"):
        return jsonify({"error": "only PDF files are accepted"}), 400

    PDF_DIR.mkdir(parents=True, exist_ok=True)
    save_path = PDF_DIR / filename
    file.save(save_path)

    # Classify immediately
    num, emotion, probs = predict_pdf_emotion(save_path)
    if emotion is None:
        return jsonify({"error": "No text found in PDF"}), 422

    story_text = extract_pdf_text_only(save_path)
    confidence = None
    if probs is not None:
        try:
            confidence = float(max(probs))
        except Exception:
            confidence = None

    return jsonify(
        {
            "filename": filename,
            "emotion": emotion,
            "confidence": confidence,
            "story_text": story_text,
        }
    )


@app.route("/api/classify-text", methods=["POST"])
def classify_text_route():
    data = request.get_json(force=True, silent=True) or {}
    text = (data.get("text") or "").strip()
    if not text:
        return jsonify({"error": "text is required"}), 400

    predicted, confidence = classify_text(text)
    if predicted is None:
        return jsonify({"error": "Could not classify text"}), 422

    saved = False
    saved_label = None
    label = data.get("label")
    if label:
        label_norm = str(label).strip().lower()
        if label_norm not in TEXT_LABELS:
            return jsonify({"error": f"label '{label}' not recognized"}), 400
        numeric_id = int(TEXT_LABELS[label_norm])
        append_feedback(text, numeric_id)
        saved = True
        saved_label = label_norm

    return jsonify(
        {
            "predicted": predicted,
            "confidence": confidence,
            "saved": saved,
            "label": saved_label or predicted,
            "message": "Saved with provided label." if saved else "Prediction only.",
        }
    )


@app.route("/api/upload-image", methods=["POST"])
def upload_image():
    if "file" not in request.files:
        return jsonify({"error": "file is required"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "empty filename"}), 400

    filename = secure_filename(file.filename)
    if not filename.lower().endswith((".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff")):
        return jsonify({"error": "only image files are accepted"}), 400

    IMG_DIR.mkdir(parents=True, exist_ok=True)
    save_path = IMG_DIR / filename
    file.save(save_path)

    try:
        extracted = extract_text_from_image(save_path)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    if not extracted.strip():
        return jsonify({"error": "No text found in image"}), 422

    emotion, confidence = classify_text(extracted)
    if emotion is None:
        return jsonify({"error": "Could not classify text"}), 422

    # Store under sorted_images/<emotion>/
    target_dir = SORTED_IMG_DIR / emotion
    target_dir.mkdir(parents=True, exist_ok=True)
    target_path = target_dir / filename
    try:
        save_path.replace(target_path)
    except Exception:
        target_path.write_bytes(save_path.read_bytes())

    return jsonify(
        {
            "filename": filename,
            "emotion": emotion,
            "confidence": confidence,
            "text": extracted.strip(),
            "stored_at": str(target_path.relative_to(BASE_DIR)),
        }
    )


@app.route("/api/all-stories", methods=["GET"])
def get_all_stories():
    """Get all available stories with their emotions and text"""
    all_candidates = []
    
    # Get PDF candidates
    pdf_candidates = gather_pdf_candidates()
    for candidate in pdf_candidates:
        all_candidates.append({
            "filename": candidate["path"].name,
            "emotion": candidate["emotion"],
            "confidence": candidate["confidence"],
            "story_text": candidate["story"],
            "type": "pdf"
        })
    
    # Get image candidates  
    image_candidates = gather_image_candidates()
    for candidate in image_candidates:
        all_candidates.append({
            "filename": candidate["path"].name,
            "emotion": candidate["emotion"],
            "confidence": candidate["confidence"],
            "story_text": candidate["story"],
            "type": "image"
        })
    
    # Sort by emotion and then by confidence
    all_candidates.sort(key=lambda x: (x["emotion"], -x["confidence"]))
    
    return jsonify({
        "stories": all_candidates,
        "total": len(all_candidates)
    })


@app.route("/")
def root():
    return jsonify({"status": "ok", "message": "Emotional Reader API"})


@app.route("/api/health", methods=["GET"])
def api_health():
    return jsonify(
        {
            "status": "ok",
            "service": "emotion-backend",
            "port": int(os.environ.get("EMOTION_PORT", "5005")),
            "timestamp": int(time.time() * 1000),
        }
    )


@app.route("/stutter-app", methods=["GET"])
def stutter_app_home():
    if not STUTTER_FRONTEND_DIR.exists():
        return jsonify(
            {
                "error": "Stutter frontend not found",
                "details": f"Expected path: {STUTTER_FRONTEND_DIR}",
            }
        ), 404
    return send_from_directory(str(STUTTER_FRONTEND_DIR), "dashboard.html")


@app.route("/stutter-app/<path:filename>", methods=["GET"])
def stutter_app_assets(filename):
    if not STUTTER_FRONTEND_DIR.exists():
        return jsonify(
            {
                "error": "Stutter frontend not found",
                "details": f"Expected path: {STUTTER_FRONTEND_DIR}",
            }
        ), 404
    return send_from_directory(str(STUTTER_FRONTEND_DIR), filename)


if __name__ == "__main__":
    host = os.environ.get("EMOTION_HOST", "0.0.0.0")
    port = int(os.environ.get("EMOTION_PORT", "5005"))
    debug = os.environ.get("EMOTION_DEBUG", "1") == "1"
    app.run(host=host, port=port, debug=debug)
