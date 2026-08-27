import requests
import json

try:
    response = requests.get("http://localhost:5000/api/all-stories")
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Found {data.get('total', 0)} stories")
        for story in data.get('stories', [])[:3]:  # Show first 3 stories
            print(f"- {story['filename']}: {story['emotion']} ({story.get('confidence', 0):.2f})")
    else:
        print(f"Error: {response.text}")
except Exception as e:
    print(f"Exception: {e}")
