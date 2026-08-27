import os
import time
import uuid
import threading
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from gtts import gTTS

app = Flask(__name__)
CORS(app)

PORT = int(os.environ.get("PORT", 5006))
AUDIO_DIR = os.environ.get("TTS_AUDIO_DIR", "audio_outputs")

os.makedirs(AUDIO_DIR, exist_ok=True)

JOBS = {}

def process_tts_job(job_id, text, emotion, speaker):
    try:
        time.sleep(1.0)
        filename = f"{job_id}.mp3"
        filepath = os.path.join(AUDIO_DIR, filename)
        
        tts = gTTS(text=text, lang='en', slow=False)
        tts.save(filepath)
        
        JOBS[job_id] = {
            "job_id": job_id,
            "status": "completed",
            "text": text,
            "emotion": emotion,
            "speaker": speaker,
            "filename": filename,
            "audio_url": f"/api/tts/audio/{filename}",
            "completed_at": time.time()
        }
    except Exception as e:
        JOBS[job_id] = {
            "job_id": job_id,
            "status": "failed",
            "error": str(e)
        }

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "service": "tts-service", "active_jobs": len(JOBS)})

@app.route('/synthesize', methods=['POST'])
@app.route('/api/tts/synthesize', methods=['POST'])
def submit_synthesis():
    data = request.json or {}
    text = data.get("text", "Once upon a time in a happy forest.")
    emotion = data.get("emotion", "happy")
    speaker = data.get("speaker", "child_voice")
    
    job_id = f"job-{uuid.uuid4().hex[:8]}"
    JOBS[job_id] = {
        "job_id": job_id,
        "status": "processing",
        "submitted_at": time.time()
    }
    
    t = threading.Thread(target=process_tts_job, args=(job_id, text, emotion, speaker))
    t.daemon = True
    t.start()
    
    return jsonify({
        "job_id": job_id,
        "status": "processing",
        "message": "TTS synthesis started asynchronously"
    }), 202

@app.route('/jobs/<job_id>', methods=['GET'])
@app.route('/api/tts/jobs/<job_id>', methods=['GET'])
def get_job_status(job_id):
    job = JOBS.get(job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404
    return jsonify(job)

@app.route('/audio/<filename>', methods=['GET'])
@app.route('/api/tts/audio/<filename>', methods=['GET'])
def get_audio_file(filename):
    filepath = os.path.join(AUDIO_DIR, filename)
    if not os.path.exists(filepath):
        return jsonify({"error": "Audio file not found"}), 404
    return send_file(filepath, mimetype='audio/mpeg')

if __name__ == '__main__':
    print(f"[tts-service] Running on port {PORT}")
    app.run(host='0.0.0.0', port=PORT)
