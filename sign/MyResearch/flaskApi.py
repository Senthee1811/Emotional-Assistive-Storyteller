from flask import Flask, request, jsonify, render_template, send_from_directory, url_for, redirect
try:
    from predictor_fixed import EmotionPredictor
except ImportError:
    print("Warning: Could not import predictor_fixed, using fallback")
    EmotionPredictor = None
from tts_engine import init_tts, apply_emotion_settings
# Safe imports for sign prediction
from data_loader_safe import DataLoader
from model_safe import SignLanguageModel
from predictor import SignPredictor
from config import MODEL_FILE
import uuid
import os

app = Flask(__name__, static_folder="static", template_folder="templates")

# Debug endpoint to confirm which file is running
@app.route("/api/_which")
def which_file():
    return jsonify({
        "running_file": __file__,
        "cwd": os.getcwd(),
    })

# Return JSON for API errors (so the frontend doesn't choke on HTML error pages)
@app.errorhandler(404)
def handle_not_found(e):
    if request.path.startswith("/api/"):
        return jsonify({"error": "Not found", "path": request.path}), 404
    return e

@app.errorhandler(405)
def handle_method_not_allowed(e):
    if request.path.startswith("/api/"):
        return jsonify({"error": "Method not allowed", "path": request.path}), 405
    return e

@app.errorhandler(Exception)
def handle_api_exception(e):
    # Return JSON for API endpoints so the frontend doesn't try to parse HTML.
    if request.path.startswith("/api/"):
        return jsonify({
            "error": "Internal server error",
            "details": str(e)
        }), 500
    raise e

# Initialize once
try:
    engine = init_tts()
    tts_error = None
except Exception as exc:
    engine = None
    tts_error = str(exc)
predictor = None
predictor_error = None
sign_predictor = None
sign_predictor_error = None

AUDIO_OUTPUT_DIR = "tts_output"
os.makedirs(AUDIO_OUTPUT_DIR, exist_ok=True)


def get_predictor():
    global predictor, predictor_error
    if predictor is not None:
        return predictor, None
    if predictor_error is not None:
        return None, predictor_error
    if EmotionPredictor is None:
        predictor_error = "EmotionPredictor not available"
        return None, predictor_error
    try:
        predictor = EmotionPredictor()
        return predictor, None
    except Exception as exc:
        predictor_error = str(exc)
        return None, predictor_error

def get_sign_predictor():
    global sign_predictor, sign_predictor_error
    if sign_predictor is not None:
        return sign_predictor, None
    if sign_predictor_error is not None:
        return None, sign_predictor_error

    try:
        model_wrapper = SignLanguageModel(input_shape=(None, 1), num_classes=1)
        if not model_wrapper.load(MODEL_FILE):
            sign_predictor_error = "Could not load sign model. Train the sign model first."
            return None, sign_predictor_error

        loader = DataLoader()
        label_encoder = loader.load_label_encoder()
        if label_encoder is None:
            sign_predictor_error = "Label encoder not found. Train the sign model first."
            return None, sign_predictor_error

        sign_predictor = SignPredictor(model_wrapper.model, label_encoder)
        return sign_predictor, None
    except Exception as exc:
        sign_predictor_error = str(exc)
        return None, sign_predictor_error


def _extract_xy_landmarks(frame_row):
    # Matches animation_opengl.py indexing: starts at column 2.
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


@app.route("/predict", methods=["POST"])
def predict_emotion():
    predictor_instance, load_error = get_predictor()
    if predictor_instance is None:
        return jsonify({
            "error": "Emotion model is not available. Train or place model files in ./emotion_model.",
            "details": load_error
        }), 500

    data = request.get_json()

    # Validate input
    if not data:
        return jsonify({"error": "JSON body required"}), 400

    # Accept both "sentence" and "story"
    if "sentence" in data:
        story = [data["sentence"]]
    elif "story" in data:
        story = data["story"]
        if not isinstance(story, list):
            return jsonify({"error": "story must be a list of strings"}), 400
    else:
        return jsonify({"error": "Provide 'sentence' or 'story'"}), 400

    results = []

    for sentence in story:
        # Predict emotion
        label, score = predictor_instance.predict(sentence)

        # Prepare TTS file (optional)
        audio_path = None
        audio_url = None
        if engine is not None:
            audio_id = str(uuid.uuid4())
            audio_path = os.path.join(AUDIO_OUTPUT_DIR, f"{audio_id}.mp3")
            apply_emotion_settings(engine, label)
            engine.save_to_file(sentence, audio_path)
            engine.runAndWait()
            audio_url = url_for("serve_audio", filename=f"{audio_id}.mp3", _external=False)

        results.append({
            "sentence": sentence,
            "emotion": label,
            "score": round(score, 2),
            "tts_audio_file": audio_path,
            "tts_audio_url": audio_url
        })

    response = {
        "status": "success",
        "results": results
    }
    if tts_error is not None:
        response["tts_warning"] = "TTS is unavailable in this environment."
        response["tts_details"] = tts_error
    return jsonify(response)


@app.route("/", methods=["GET"])
def home():
    return render_template("index.html")


@app.route("/sign", methods=["GET"])
def sign_home():
    return render_template("sign.html")

@app.route("/signin", methods=["GET"])
def sign_in():
    # Alias /signin to /sign for compatibility with some integrations
    return redirect(url_for("sign_home"))


@app.route("/audio/<path:filename>", methods=["GET"])
def serve_audio(filename):
    return send_from_directory(AUDIO_OUTPUT_DIR, filename)


@app.route("/api/sign/labels", methods=["GET"])
def sign_labels():
    sign_predictor_instance, load_error = get_sign_predictor()
    if sign_predictor_instance is None:
        return jsonify({
            "error": "Sign model is not available.",
            "details": load_error
        }), 500

    labels = sign_predictor_instance.list_available_labels()
    return jsonify({
        "status": "success",
        "count": len(labels),
        "labels": labels
    })


@app.route("/api/sign/predict", methods=["POST"])
def sign_predict():
    sign_predictor_instance, load_error = get_sign_predictor()
    if sign_predictor_instance is None:
        return jsonify({
            "error": "Sign model is not available.",
            "details": load_error
        }), 500

    data = request.get_json()
    if not data or "text" not in data:
        return jsonify({"error": "Provide 'text' in JSON body."}), 400

    raw_text = str(data.get("text", "")).strip()
    if not raw_text:
        return jsonify({"error": "Text cannot be empty."}), 400

    # Debug/logging: show incoming text and headers
    print(f"[sign_predict] request text={raw_text!r} headers={dict(request.headers)}")

    tokens = [token.strip() for token in raw_text.replace("\n", ",").split(",") if token.strip()]
    if not tokens:
        tokens = [raw_text]

    results = []
    max_frames = 90
    for token in tokens:
        direct_frames, _ = sign_predictor_instance.load_sign_frames(token)
        predicted_label = None
        confidence = 0.0
        resolved_label = token
        source = "direct"
        frames = direct_frames

        if not frames:
            predicted_label, confidence = sign_predictor_instance.predict(token)
            if predicted_label:
                resolved_label = predicted_label
                frames, _ = sign_predictor_instance.load_sign_frames(predicted_label)
                source = "predicted"

        parsed_frames = []
        for row in frames[:max_frames]:
            parsed = _extract_xy_landmarks(row)
            if parsed is not None:
                parsed_frames.append(parsed)

        results.append({
            "input": token,
            "predicted_label": predicted_label,
            "resolved_label": resolved_label,
            "resolution_source": source,
            "confidence": round(float(confidence), 4) if confidence is not None else 0.0,
            "has_animation": bool(frames),
            "frame_count": len(frames),
            "animation_frames": parsed_frames
        })

    # Debugging output: show what was returned
    for r in results:
        print(f"[sign_predict] token={r['input']!r} -> resolved={r['resolved_label']!r} source={r['resolution_source']} frames={r['frame_count']} confidence={r['confidence']}")

    return jsonify({
        "status": "success",
        "results": results
    })


if __name__ == "__main__":
    port = int(os.environ.get("SIGN_PORT", "5002"))
    host = os.environ.get("SIGN_HOST", "0.0.0.0")
    debug = os.environ.get("SIGN_DEBUG", "1") == "1"
    print(f"Starting Flask API on http://{host}:{port} (debug={debug})")
    app.run(host=host, port=port, debug=debug)
