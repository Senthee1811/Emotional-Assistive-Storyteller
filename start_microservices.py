import os
import sys
import time
import signal
import atexit
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PY = sys.executable

USER_SITE = r"C:\Users\senth\AppData\Roaming\Python\Python313\site-packages"
DEFAULT_ENV = os.environ.copy()
if os.path.exists(USER_SITE):
    existing_pp = DEFAULT_ENV.get("PYTHONPATH", "")
    DEFAULT_ENV["PYTHONPATH"] = f"{USER_SITE};{existing_pp}" if existing_pp else USER_SITE

SERVICES = [
    {"name": "Auth Service (5001)", "port": 5001, "cmd": ["node", "index.js"], "cwd": ROOT / "services" / "auth-service"},
    {"name": "Emotion Service (5002)", "port": 5002, "cmd": ["node", "index.js"], "cwd": ROOT / "services" / "emotion-service"},
    {"name": "Story Service (5003)", "port": 5003, "cmd": [PY, "app.py"], "cwd": ROOT / "services" / "story-service"},
    {"name": "Stutter Service (5004)", "port": 5004, "cmd": [PY, "main.py"], "cwd": ROOT / "services" / "stutter-service"},
    {"name": "Sign Service (5005)", "port": 5005, "cmd": [PY, "app.py"], "cwd": ROOT / "services" / "sign-service"},
    {"name": "TTS Service (5006 - Original backend_tts)", "port": 5006, "cmd": [PY, "flaskApi.py"], "cwd": ROOT / "text-to-speech" / "backend_tts", "env": {"TTS_PORT": "5006", "PORT": "5006"}},
    {"name": "API Gateway / BFF (4000)", "port": 4000, "cmd": ["node", "index.js"], "cwd": ROOT / "gateway"}
]

TARGET_PORTS = [s["port"] for s in SERVICES if "port" in s]

def free_ports(ports):
    """Kills any lingering processes bound to the specified ports on Windows."""
    if os.name != "nt":
        return
    try:
        res = subprocess.run(["netstat", "-ano"], capture_output=True, text=True, check=False)
        pids_to_kill = set()
        my_pid = os.getpid()
        for line in res.stdout.splitlines():
            line = line.strip()
            if not line.startswith("TCP"):
                continue
            parts = line.split()
            if len(parts) < 5:
                continue
            local_addr = parts[1]
            state = parts[3]
            pid_str = parts[-1]
            if state.upper() == "LISTENING" and ":" in local_addr:
                try:
                    port = int(local_addr.rsplit(":", 1)[-1])
                    pid = int(pid_str)
                    if port in ports and pid != my_pid and pid != 0:
                        pids_to_kill.add(pid)
                except ValueError:
                    pass
        for pid in pids_to_kill:
            subprocess.run(["taskkill", "/F", "/T", "/PID", str(pid)], capture_output=True)
        if pids_to_kill:
            print(f"  [CLEANUP] Freed occupied ports by terminating previous PIDs: {sorted(pids_to_kill)}")
            time.sleep(0.5)
    except Exception as e:
        print(f"  [WARNING] Port cleanup encounter: {e}")

def shutdown_processes(processes):
    print("\nShutting down microservices...")
    for name, p in processes:
        try:
            if os.name == "nt":
                subprocess.run(["taskkill", "/F", "/T", "/PID", str(p.pid)], capture_output=True)
            else:
                p.terminate()
        except Exception:
            pass
    free_ports(TARGET_PORTS)
    print("All microservices stopped.")

def main():
    print("==================================================")
    print("  LAUNCHING EMOTIONALCHILDREADER MICROSERVICES")
    print("==================================================")
    
    # Pre-emptively clear any zombie processes on our target ports
    free_ports(TARGET_PORTS)
    
    processes = []
    
    def handle_exit(signum=None, frame=None):
        shutdown_processes(processes)
        sys.exit(0)

    signal.signal(signal.SIGINT, handle_exit)
    signal.signal(signal.SIGTERM, handle_exit)

    for s in SERVICES:
        env = DEFAULT_ENV.copy()
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
    print("  * API Gateway / BFF:     http://localhost:4000")
    print("  * Auth Service:          http://localhost:5001")
    print("  * Emotion Service:       http://localhost:5002")
    print("  * Story Service:         http://localhost:5003")
    print("  * Stutter Service:       http://localhost:5004")
    print("  * Sign Service:          http://localhost:5005")
    print("  * TTS Service (backend_tts): http://localhost:5006")
    print("--------------------------------------------------\n")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        handle_exit()

if __name__ == "__main__":
    main()

