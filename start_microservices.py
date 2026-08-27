import os
import sys
import time
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PY = sys.executable

SERVICES = [
    {"name": "Auth Service (5001)", "cmd": ["node", "index.js"], "cwd": ROOT / "services" / "auth-service"},
    {"name": "Emotion Service (5002)", "cmd": ["node", "index.js"], "cwd": ROOT / "services" / "emotion-service"},
    {"name": "Story Service (5003)", "cmd": [PY, "app.py"], "cwd": ROOT / "services" / "story-service"},
    {"name": "Stutter Service (5004)", "cmd": [PY, "main.py"], "cwd": ROOT / "services" / "stutter-service"},
    {"name": "Sign Service (5005)", "cmd": [PY, "app.py"], "cwd": ROOT / "services" / "sign-service"},
    {"name": "TTS Service (5006)", "cmd": [PY, "app.py"], "cwd": ROOT / "services" / "tts-service"},
    {"name": "API Gateway / BFF (4000)", "cmd": ["node", "index.js"], "cwd": ROOT / "gateway"},
    {"name": "React Frontend (3000)", "cmd": ["npx", "vite", "--port", "3000", "--host"], "cwd": ROOT / "frontend"}
]

def main():
    print("==================================================")
    print("  LAUNCHING EMOTIONALCHILDREADER MICROSERVICES")
    print("==================================================")
    
    processes = []
    for s in SERVICES:
        env = os.environ.copy()
        if "env" in s:
            env.update(s["env"])
            
        try:
            p = subprocess.Popen(s["cmd"], cwd=str(s["cwd"]), env=env)
            processes.append((s["name"], p))
            print(f"  [STARTED] {s['name']} (PID: {p.pid})")
        except Exception as e:
            print(f"  [FAILED] {s['name']}: {e}")

    print("\n--------------------------------------------------")
    print("  ALL MICROSERVICES RUNNING:")
    print("  * React Frontend:        http://localhost:3000")
    print("  * API Gateway / BFF:     http://localhost:4000")
    print("  * Auth Service:          http://localhost:5001")
    print("  * Emotion Service:       http://localhost:5002")
    print("  * Story Service:         http://localhost:5003")
    print("  * Stutter Service:       http://localhost:5004")
    print("  * Sign Service:          http://localhost:5005")
    print("  * TTS Service:           http://localhost:5006")
    print("--------------------------------------------------\n")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down microservices...")
        for name, p in processes:
            try:
                p.terminate()
            except Exception:
                pass
        print("Done.")

if __name__ == "__main__":
    main()
