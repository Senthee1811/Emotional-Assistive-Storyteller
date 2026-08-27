import os
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

PORT = int(os.environ.get("PORT", 5005))

SIGN_DICTIONARY = {
    "hello": {"gestures": ["wave_right_hand", "open_palm"], "confidence": 0.98},
    "thank you": {"gestures": ["hand_to_chin", "extend_forward"], "confidence": 0.96},
    "happy": {"gestures": ["pat_chest", "upward_brush"], "confidence": 0.94},
    "sad": {"gestures": ["open_hand_down_face"], "confidence": 0.92},
    "story": {"gestures": ["twisting_fingers_outward"], "confidence": 0.90},
    "bear": {"gestures": ["crossed_arms_claw_chest"], "confidence": 0.95}
}

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "service": "sign-service", "port": PORT})

@app.route('/api/sign/translate', methods=['POST'])
def translate_text():
    data = request.json or {}
    text = data.get("text", "").lower().strip()
    words = text.split()
    
    sequence = []
    for w in words:
        if w in SIGN_DICTIONARY:
            sequence.append({"word": w, "found": True, **SIGN_DICTIONARY[w]})
        else:
            # Fingerspell fallback
            sequence.append({"word": w, "found": False, "fingerspell": list(w)})
            
    return jsonify({
        "input_text": text,
        "translated_sequence": sequence,
        "total_words": len(words)
    })

@app.route('/api/sign/predict-landmarks', methods=['POST'])
def predict_landmarks():
    data = request.json or {}
    landmarks = data.get("landmarks", [])
    if not landmarks:
        return jsonify({"error": "No landmarks provided"}), 400
        
    return jsonify({
        "predicted_sign": "hello",
        "confidence": 0.94,
        "landmark_count": len(landmarks)
    })

if __name__ == '__main__':
    print(f"[sign-service] Running on port {PORT}")
    app.run(host='0.0.0.0', port=PORT)
