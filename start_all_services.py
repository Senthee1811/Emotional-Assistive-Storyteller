import json
import os
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PY = sys.executable


def spawn(cmd, cwd, env=None):
    full_env = os.environ.copy()
    if env:
        full_env.update(env)

    kwargs = {
        "cwd": str(cwd),
        "env": full_env,
        "stdout": subprocess.DEVNULL,
        "stderr": subprocess.DEVNULL,
    }

    if os.name == "nt":
        kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.DETACHED_PROCESS

    return subprocess.Popen(cmd, **kwargs)


def main():
    services = [
        {
            "name": "Emotion Backend",
            "cmd": [PY, "app.py"],
            "cwd": ROOT / "emotional story recommondation" / "backend",
            "env": {"EMOTION_PORT": "5005", "EMOTION_DEBUG": "0"},
        },
        {
            "name": "Emotion Frontend",
            "cmd": [PY, "server.py"],
            "cwd": ROOT / "emotional story recommondation" / "frontend",
            "env": {"FRONTEND_PORT": "8080"},
        },
        {
            "name": "Stutter Backend",
            "cmd": [PY, "main.py"],
            "cwd": ROOT / "stutter" / "backend",
            "env": {"STUTTER_PORT": "8001", "STUTTER_RELOAD": "0"},
        },
        {
            "name": "Stutter Frontend",
            "cmd": [PY, "-m", "http.server", "8100"],
            "cwd": ROOT / "stutter" / "frontend",
            "env": {},
        },
        {
            "name": "Sign Backend+Frontend",
            "cmd": [PY, "flaskApi.py"],
            "cwd": ROOT / "sign" / "MyResearch",
            "env": {"SIGN_PORT": "5001", "SIGN_DEBUG": "0"},
        },
    ]

    started = []
    for spec in services:
        proc = spawn(spec["cmd"], spec["cwd"], spec["env"])
        started.append({"name": spec["name"], "pid": proc.pid})
        print(f"[STARTED] {spec['name']} pid={proc.pid}")

    state_path = ROOT / ".services_pids.json"
    state_path.write_text(json.dumps(started, indent=2), encoding="utf-8")
    print(f"\nSaved PIDs to {state_path}")
    print("Services launched in background.")


if __name__ == "__main__":
    main()
