from flask import Flask, request, jsonify, render_template, send_from_directory, url_for, redirect
import uuid
import os
import math

def generate_mock_animation_frames(sign_name):
    """Generate mock animation frames with pose landmarks for sign language"""
    frames = []
    num_frames = 60  # 2 seconds at 30fps
    
    # Different movement patterns for different signs
    patterns = {
        'hello': {'hand_y': [0.3, 0.2, 0.1, 0.2, 0.3], 'hand_x': [0.5, 0.6, 0.5, 0.4, 0.5]},
        'thank_you': {'hand_y': [0.4, 0.3, 0.4, 0.5, 0.4], 'hand_x': [0.3, 0.5, 0.7, 0.5, 0.3]},
        'please': {'hand_y': [0.5, 0.4, 0.3, 0.4, 0.5], 'hand_x': [0.4, 0.4, 0.4, 0.4, 0.4]},
        'sorry': {'hand_y': [0.6, 0.5, 0.4, 0.5, 0.6], 'hand_x': [0.5, 0.5, 0.5, 0.5, 0.5]},
        'yes': {'hand_y': [0.4, 0.2, 0.4, 0.2, 0.4], 'hand_x': [0.5, 0.5, 0.5, 0.5, 0.5]},
        'no': {'hand_y': [0.4, 0.4, 0.4, 0.4, 0.4], 'hand_x': [0.3, 0.7, 0.3, 0.7, 0.3]},
        'love': {'hand_y': [0.3, 0.2, 0.1, 0.2, 0.3], 'hand_x': [0.5, 0.5, 0.5, 0.5, 0.5]},
        'help': {'hand_y': [0.5, 0.3, 0.4, 0.5, 0.4], 'hand_x': [0.4, 0.6, 0.5, 0.4, 0.6]},
        'start': {'hand_y': [0.6, 0.4, 0.2, 0.4, 0.6], 'hand_x': [0.3, 0.5, 0.7, 0.5, 0.3]},
        'stop': {'hand_y': [0.3, 0.5, 0.7, 0.5, 0.3], 'hand_x': [0.5, 0.5, 0.5, 0.5, 0.5]},
        'good': {'hand_y': [0.4, 0.2, 0.3, 0.4, 0.4], 'hand_x': [0.5, 0.6, 0.5, 0.4, 0.5]},
        'morning': {'hand_y': [0.5, 0.3, 0.2, 0.3, 0.5], 'hand_x': [0.4, 0.5, 0.6, 0.5, 0.4]},
        'good_morning': {'hand_y': [0.5, 0.3, 0.1, 0.3, 0.5], 'hand_x': [0.3, 0.5, 0.7, 0.5, 0.3]},
    }
    
    # Default pattern if sign not found
    pattern = patterns.get(sign_name, {
        'hand_y': [0.4, 0.3, 0.2, 0.3, 0.4],
        'hand_x': [0.5, 0.5, 0.5, 0.5, 0.5]
    })
    
    for frame_idx in range(num_frames):
        # Create smooth interpolation using sine waves
        t = frame_idx / num_frames * 2 * math.pi
        
        # Hand positions (normalized 0-1)
        hand_y = 0.4 + 0.2 * math.sin(t * 2) + pattern['hand_y'][frame_idx % len(pattern['hand_y'])] * 0.1
        hand_x = 0.5 + 0.1 * math.cos(t * 3) + pattern['hand_x'][frame_idx % len(pattern['hand_x'])] * 0.1
        
        # Generate pose landmarks (MediaPipe format: 33 pose points + 21 hand points per hand)
        landmarks = []
        
        # Pose landmarks (simplified - just upper body)
        pose_landmarks = [
            0.5, 0.1,  # nose
            0.5, 0.2,  # left eye
            0.5, 0.2,  # right eye
            0.48, 0.25, # left ear
            0.52, 0.25, # right ear
            0.45, 0.3,  # left shoulder
            0.55, 0.3,  # right shoulder
            0.4, 0.5,   # left elbow
            0.6, 0.5,   # right elbow
            0.35, 0.7,  # left wrist
            hand_x, hand_y,  # right wrist (animated)
        ]
        
        # Pad pose landmarks to 33 points (66 values)
        while len(pose_landmarks) < 66:
            pose_landmarks.extend([0.0, 0.0])
        
        landmarks.extend(pose_landmarks[:66])
        
        # Left hand landmarks (21 points = 42 values)
        left_hand = []
        for i in range(21):
            left_hand.extend([0.3 + i * 0.01, 0.6 + math.sin(t + i) * 0.05])
        landmarks.extend(left_hand)
        
        # Right hand landmarks (animated - 21 points = 42 values)
        right_hand = []
        for i in range(21):
            right_hand.extend([
                hand_x + math.cos(t + i * 0.5) * 0.05, 
                hand_y + math.sin(t + i * 0.3) * 0.05
            ])
        landmarks.extend(right_hand)
        
        # Convert to the format expected by the frontend (pose, left, right arrays of [x,y] pairs)
        frame_data = [round(x, 6) for x in landmarks]

        # Split into pose, left hand, right hand according to MediaPipe format
        # Pose: 33 points * 2 values (x, y) -> 66 values
        # Left hand: 21 points * 2 values -> 42 values
        # Right hand: 21 points * 2 values -> 42 values
        pose_data = frame_data[:66]
        left_hand_data = frame_data[66:66 + 42]
        right_hand_data = frame_data[66 + 42:66 + 42 + 42]

        # Pad if needed
        while len(pose_data) < 66:
            pose_data.extend([0.0, 0.0])
        while len(left_hand_data) < 42:
            left_hand_data.extend([0.0, 0.0])
        while len(right_hand_data) < 42:
            right_hand_data.extend([0.0, 0.0])

        # Convert flat arrays to arrays of [x, y] pairs
        def pairify(arr):
            return [[arr[i], arr[i + 1]] for i in range(0, len(arr), 2)]

        frames.append({
            "pose": pairify(pose_data),
            "left": pairify(left_hand_data),
            "right": pairify(right_hand_data)
        })
    
    return frames

app = Flask(__name__, static_folder="static", template_folder="templates")

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/sign")
def sign_page():
    return render_template("sign.html")

@app.route("/signin")
def sign_in_page():
    # Alias /signin to /sign for compatibility with some integrations
    return redirect(url_for("sign_page"))

@app.route("/api/sign/predict", methods=["POST"])
def sign_predict():
    # Minimal mock prediction with proper response format
    data = request.get_json()
    if not data or "text" not in data:
        return jsonify({"error": "Provide 'text' in JSON body."}), 400

    text = str(data.get("text", "")).strip()
    if not text:
        return jsonify({"error": "Text cannot be empty."}), 400

    # Parse tokens (handle multiple words/phrases)
    tokens = [token.strip() for token in text.replace("\n", ",").split(",") if token.strip()]
    if not tokens:
        tokens = [text]

    # Mock sign predictions
    mock_signs = {
        'hello': 'hello',
        'thank you': 'thank_you', 
        'please': 'please',
        'sorry': 'sorry',
        'yes': 'yes',
        'no': 'no',
        'love': 'love',
        'help': 'help',
        'good': 'good',
        'morning': 'morning',
        'good morning': 'good_morning',
        'beginning': 'start',
        'start': 'start',
        'end': 'end',
        'stop': 'stop',
        'go': 'go',
        'come': 'come',
        'see': 'see',
        'look': 'look',
        'listen': 'listen',
        'speak': 'speak',
        'eat': 'eat',
        'drink': 'drink',
        'sleep': 'sleep',
        'wake': 'wake',
        'work': 'work',
        'play': 'play',
        'learn': 'learn',
        'teach': 'teach'
    }
    
    results = []
    for token in tokens:
        text_lower = token.lower()
        predicted_sign = 'hello'  # default
        confidence = 0.5
        
        # Find best match
        for keyword, sign in mock_signs.items():
            if keyword in text_lower:
                predicted_sign = sign
                confidence = 0.9
                break
            elif any(word in text_lower for word in keyword.split()):
                predicted_sign = sign
                confidence = 0.7
                break
        
        # Create mock animation frames with pose landmarks
        animation_frames = generate_mock_animation_frames(predicted_sign)
        has_animation = True
        
        results.append({
            "input": token,
            "predicted_label": predicted_sign,
            "resolved_label": predicted_sign,
            "confidence": confidence,
            "has_animation": has_animation,
            "animation_frames": animation_frames,
            "resolution_source": "predicted" if confidence < 0.9 else "direct"
        })
    
    return jsonify({"results": results})


@app.route("/api/sign/labels", methods=["GET"])
def sign_labels():
    # Provide a basic set of available labels for the frontend label browser
    labels = [
        "hello",
        "thank_you",
        "please",
        "sorry",
        "yes",
        "no",
        "love",
        "help",
        "start",
        "stop",
        "good",
        "morning",
        "good_morning",
        "go",
        "come",
        "see",
        "look",
        "listen",
        "speak",
        "eat",
        "drink",
        "sleep",
        "wake",
        "work",
        "play",
        "learn",
        "teach",
    ]
    return jsonify({"status": "success", "count": len(labels), "labels": labels})


@app.route("/api/emotion/predict", methods=["POST"])
def emotion_predict():
    # Minimal mock emotion prediction
    data = request.get_json()
    if not data or "text" not in data:
        return jsonify({"error": "Provide 'text' in JSON body."}), 400

    text = str(data.get("text", "")).strip()
    if not text:
        return jsonify({"error": "Text cannot be empty."}), 400

    # Mock emotion prediction
    emotions = ["happy", "sad", "angry", "neutral", "surprise"]
    import random
    emotion = random.choice(emotions)
    
    return jsonify({
        "emotion": emotion,
        "confidence": 0.7
    })

if __name__ == "__main__":
    print("Starting minimal sign language backend...")
    print("Sign App: http://localhost:5001")
    print("Sign Console: http://localhost:5001/sign")
    app.run(host="0.0.0.0", port=5001, debug=False)
