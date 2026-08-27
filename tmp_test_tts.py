import requests

text = "I was stuck in traffic for over two hours because of careless drivers.\nI shouted and felt frustrated with the situation.\nMy anger kept growing as people ignored traffic rules."
resp = requests.post(
    "http://localhost:5000/process-story-xtts",
    json={
        "text": text,
        "child_id": "child_001",
        "gender": "male",
        "session_id": "story_001",
        "child_friendly": True,
    },
)
print("status", resp.status_code)
data = resp.json()
print("playlist length", len(data.get("playlist", [])))
for i, item in enumerate(data.get("playlist", [])):
    print(i, item.get("sentence"))
