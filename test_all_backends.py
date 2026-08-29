import urllib.request
import json
import os
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent

print("=== 1. TESTING TTS SYNTHESIS VIA GATEWAY ===")
tts_payload = json.dumps({
    "text": "Pip the brave little star twinkled joyfully in the peaceful night sky.",
    "emotion": "happy",
    "actor_id": 1,
    "child_id": "child_verification_test",
    "session_id": "session_test_001"
}).encode()

req = urllib.request.Request("http://localhost:4000/api/tts/synthesize", data=tts_payload, headers={"Content-Type": "application/json"})
with urllib.request.urlopen(req, timeout=120) as resp:
    tts_res = json.loads(resp.read().decode())
    print("TTS Synthesize Status:", resp.status)
    if "playlist" in tts_res and len(tts_res["playlist"]) > 0:
        item = tts_res["playlist"][0]
        print("  Audio URL:", item.get("audio_url"))
        print("  Emotion:", item.get("emotion"))
        print("  Sentence:", item.get("sentence"))
        print("  Actor:", item.get("actor_name"))

print("\n=== 2. TESTING SIGN TRANSLATION VIA GATEWAY ===")
sign_payload = json.dumps({"text": "hello star love"}).encode()
req = urllib.request.Request("http://localhost:4000/api/sign/translate", data=sign_payload, headers={"Content-Type": "application/json"})
with urllib.request.urlopen(req, timeout=10) as resp:
    sign_res = json.loads(resp.read().decode())
    print("Sign Translation Status:", sign_res.get("status"))
    seq = sign_res.get("translated_sequence", [])
    print(f"Translated {len(seq)} words:")
    for w in seq:
        print(f"  - Word: '{w.get('word')}', Found: {w.get('found')}, Frames: {w.get('frame_count')}")

print("\n=== 3. TESTING STUTTER ACOUSTIC CLASSIFIER VIA GATEWAY ===")
sample_wav = ROOT / "stutter" / "archive" / "torgo_audios" / "02-02.wav"
if not sample_wav.exists():
    sample_wav = ROOT / "stutter" / "02-02.wav"

with open(sample_wav, "rb") as f:
    wav_bytes = f.read()

boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
body = (
    f"--{boundary}\r\n"
    f'Content-Disposition: form-data; name="file"; filename="02-02.wav"\r\n'
    f"Content-Type: audio/wav\r\n\r\n"
).encode() + wav_bytes + f"\r\n--{boundary}--\r\n".encode()

req = urllib.request.Request(
    "http://localhost:4000/api/stutter/analyze",
    data=body,
    headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
)
with urllib.request.urlopen(req, timeout=10) as resp:
    stutter_res = json.loads(resp.read().decode())
    print("Stutter Analysis Status:", resp.status)
    print("Stutter Analysis Response:", stutter_res)

print("\n=== 4. TESTING STORY RECOMMENDATION VIA GATEWAY ===")
req = urllib.request.Request("http://localhost:4000/api/stories/recommend?emotion=sad", headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req, timeout=10) as resp:
    rec_res = json.loads(resp.read().decode())
    print("Emotion Suggest Map Targets:", rec_res.get("recommended_targets"))
    print("Recommended stories count:", rec_res.get("count"))
    for s in rec_res.get("recommended_stories", []):
        print(f"  - Story: {s.get('title')} (Emotion: {s.get('emotion')})")

print("\n=== ALL 4 BACKENDS VERIFIED END-TO-END VIA GATEWAY ===")
