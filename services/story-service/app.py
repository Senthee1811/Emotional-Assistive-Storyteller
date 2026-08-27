import os
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

PORT = int(os.environ.get("PORT", 5003))

STORIES = [
    {
        "id": "story-1",
        "title": "The Laughing Little Bear",
        "emotion": "happy",
        "age_group": "4-8",
        "summary": "Barnaby the little bear discovers a meadow of giggling flowers.",
        "content": "Once upon a time, deep in the sunny forest, lived Barnaby the little brown bear. Barnaby loved to laugh. One morning, he stumbled upon a magical meadow where every flower giggled when tickled by the gentle morning breeze! Barnaby spent the entire afternoon dancing and laughing with his new flower friends."
    },
    {
        "id": "story-2",
        "title": "The Gentle Blue Cloud",
        "emotion": "sad",
        "age_group": "4-8",
        "summary": "A small cloud learns that raining helps flowers grow bright and tall.",
        "content": "Little Blue felt very sad today because his rain drops fell softly on the dusty ground. But soon, tiny green leaves began to sprout! A wise old oak tree whispered, 'Your soft tears give life to the meadow.' Little Blue smiled, realizing his feelings had a beautiful purpose."
    },
    {
        "id": "story-3",
        "title": "Brave Sammy's Night Lantern",
        "emotion": "fear",
        "age_group": "5-9",
        "summary": "Sammy the squirrel turns scary shadows into playful night puppets.",
        "content": "When the sun set, shadows danced on Sammy's cozy bedroom wall. Sammy held up his small yellow lantern and made bunny ears with his paws! Suddenly, the scary dark shapes became a funny rabbit show."
    },
    {
        "id": "story-4",
        "title": "Calm River's Deep Breath",
        "emotion": "angry",
        "age_group": "4-8",
        "summary": "Leo the lion learns how to blow out imaginary candles when feeling hot and angry.",
        "content": "Leo felt a big roaring anger bubbling inside his chest. His friend Turtle suggested, 'Take a deep breath in through your nose, then blow out like you are cooling hot soup.' Leo tried it three times, and his fiery anger melted into peace."
    }
]

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "service": "story-service", "port": PORT})

@app.route('/', methods=['GET'])
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

@app.route('/recommend', methods=['POST'])
@app.route('/api/stories/recommend', methods=['POST'])
def recommend_story():
    data = request.json or {}
    emotion = data.get("emotion", "happy").lower()
    
    matched = [s for s in STORIES if s["emotion"] == emotion]
    if not matched:
        matched = STORIES
        
    return jsonify({
        "matched_emotion": emotion,
        "recommended_stories": matched,
        "count": len(matched)
    })

if __name__ == '__main__':
    print(f"[story-service] Running on port {PORT}")
    app.run(host='0.0.0.0', port=PORT)
