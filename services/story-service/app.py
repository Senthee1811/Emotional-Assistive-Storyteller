import os
import sys
from pathlib import Path
from flask import Flask, jsonify, request
from flask_cors import CORS

ROOT = Path(__file__).resolve().parent.parent.parent
STORY_REC_DIR = ROOT / "emotional story recommondation"

if str(STORY_REC_DIR) not in sys.path:
    sys.path.insert(0, str(STORY_REC_DIR))

app = Flask(__name__)
CORS(app)

PORT = int(os.environ.get("PORT", 5003))

# Preferred story emotion mapping from original emotional story recommondation/Final_recommendation.py
SUGGEST_MAP = {
    "sad": ["happy", "calm", "neutral"],
    "happy": ["happy", "surprised"],
    "angry": ["calm", "happy"],
    "fear": ["calm", "happy"],
    "fearful": ["calm", "happy"],
    "surprised": ["happy", "surprised"],
    "calm": ["calm", "happy"]
}

STORIES = [
    {
        "id": "story-telex-1",
        "title": "Telex and the Crystal Robot Forest",
        "emotion": "surprised",
        "category": "adventure",
        "summary": "Telex discovers a glowing mechanical hummingbird that teaches the language of cosmic music.",
        "sentences": [
            {"text": "Telex stepped into the emerald crystal grove, where silver trees chimed with soft melodies.", "emotion": "calm", "actor": "Narrator"},
            {"text": "Look! A tiny golden hummingbird is hovering over the glowing stream, whispered Telex with wide eyes.", "emotion": "surprised", "actor": "Telex"},
            {"text": "Welcome Telex! We have been waiting for your cheerful energy to activate the crystal star, chirped the hummingbird.", "emotion": "happy", "actor": "Sparky"},
            {"text": "Telex smiled bravely, pressed the rainbow crystal, and the entire forest sparkled with warm laughter.", "emotion": "happy", "actor": "Telex"}
        ]
    },
    {
        "id": "story-1",
        "title": "The Brave Little Star",
        "emotion": "fear",
        "category": "courage",
        "summary": "A glowing star named Pip learns how to shine bright in the deep midnight sky.",
        "sentences": [
            {"text": "Once upon a time, in the quiet indigo sky, lived a little star named Pip.", "emotion": "calm", "actor": "Narrator"},
            {"text": "Pip felt scared because the dark night was so big and endless.", "emotion": "fear", "actor": "Pip"},
            {"text": "Look how softly you glow! whispered Mother Moon with a warm smile.", "emotion": "happy", "actor": "Moon"},
            {"text": "Pip took a deep breath, twinkled with all his might, and lit up the entire valley!", "emotion": "happy", "actor": "Pip"},
            {"text": "From that night on, Pip knew that bravery is finding your own light.", "emotion": "calm", "actor": "Narrator"}
        ]
    },
    {
        "id": "story-2",
        "title": "The Whispering Forest Friend",
        "emotion": "happy",
        "category": "friendship",
        "summary": "Maya and an eccentric bunny discover the magical secret behind colorful autumn leaves.",
        "sentences": [
            {"text": "Maya skipped down the enchanted garden path on a bright sunny morning.", "emotion": "happy", "actor": "Maya"},
            {"text": "Suddenly, a tiny blue rabbit hopped out of the silver bushes!", "emotion": "surprised", "actor": "Narrator"},
            {"text": "Hello there! Are you looking for the lost golden acorn? asked the rabbit cheerfully.", "emotion": "happy", "actor": "Rabbit"},
            {"text": "Together, they laughed and uncovered the sparkling treasure under the ancient oak.", "emotion": "happy", "actor": "Maya"}
        ]
    },
    {
        "id": "story-3",
        "title": "Leo the Dragon Learns to Breathe",
        "emotion": "angry",
        "category": "calm",
        "summary": "Leo gets very upset when his sandcastle falls, but discovers how calm breathing cools his flame.",
        "sentences": [
            {"text": "Leo stamped his feet as the waves knocked down his magnificent sandcastle.", "emotion": "angry", "actor": "Leo"},
            {"text": "Smoke puffed from his nostrils and his cheeks turned bright red!", "emotion": "angry", "actor": "Narrator"},
            {"text": "Let us count to four together, breathed gentle Turtle slowly.", "emotion": "calm", "actor": "Turtle"},
            {"text": "One... two... three... four. The flame cooled into a gentle, happy breeze.", "emotion": "calm", "actor": "Leo"}
        ]
    },
    {
        "id": "story-4",
        "title": "The Gentle Blue Cloud",
        "emotion": "sad",
        "category": "kindness",
        "summary": "A small cloud learns that raining helps flowers grow bright and tall.",
        "sentences": [
            {"text": "Little Blue felt very sad today because his rain drops fell softly on the dusty ground.", "emotion": "sad", "actor": "Narrator"},
            {"text": "A wise old oak tree whispered, Your soft tears give life to the meadow.", "emotion": "calm", "actor": "Oak"},
            {"text": "Tiny green leaves and purple blossoms began to dance in the cool rain.", "emotion": "happy", "actor": "Narrator"},
            {"text": "Little Blue smiled, realizing his feelings had a beautiful purpose.", "emotion": "happy", "actor": "Little Blue"}
        ]
    }
]

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "ok",
        "service": "story-service",
        "port": PORT,
        "recommendation_logic": "SUGGEST_MAP from emotional story recommondation"
    })

@app.route('/', methods=['GET'])
@app.route('/api/stories', methods=['GET'])
@app.route('/api/stories/', methods=['GET'])
def get_all_stories():
    return jsonify({"stories": STORIES, "total": len(STORIES)})

@app.route('/<story_id>', methods=['GET'])
@app.route('/api/stories/<story_id>', methods=['GET'])
def get_story(story_id):
    story = next((s for s in STORIES if s["id"] == story_id), None)
    if not story:
        return jsonify({"error": "Story not found"}), 404
    return jsonify(story)

@app.route('/recommend', methods=['POST', 'GET'])
@app.route('/api/stories/recommend', methods=['POST', 'GET'])
def recommend_story():
    if request.method == 'POST':
        data = request.json or {}
        detected_emotion = data.get("emotion", "happy").lower()
    else:
        detected_emotion = request.args.get("emotion", "happy").lower()
    
    preferred_emotions = SUGGEST_MAP.get(detected_emotion, [detected_emotion, "happy"])
    matched = [s for s in STORIES if s["emotion"] in preferred_emotions]
    if not matched:
        matched = STORIES
        
    return jsonify({
        "detected_emotion": detected_emotion,
        "recommended_targets": preferred_emotions,
        "recommended_stories": matched,
        "stories": matched,
        "count": len(matched)
    })

if __name__ == '__main__':
    print(f"[story-service] Running on port {PORT} with {STORY_REC_DIR}")
    app.run(host='0.0.0.0', port=PORT)
