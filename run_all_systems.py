import os
import signal
import subprocess
import sys
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parent


def start_service(name, cmd, cwd, env=None):
    full_env = os.environ.copy()
    if env:
        full_env.update(env)
    proc = subprocess.Popen(cmd, cwd=str(cwd), env=full_env)
    print(f"[STARTED] {name} (pid={proc.pid})")
    return proc


def main():
    services = []
    py = sys.executable

    try:
        specs = [
            {
                "name": "Emotion Backend",
                "cmd": [py, "app.py"],
                "cwd": ROOT / "emotional story recommondation" / "backend",
                "env": {"EMOTION_PORT": "5005", "EMOTION_DEBUG": "0"},
                "restart": True,
                "max_restarts": 5,
            },
            {
                "name": "Emotion Frontend",
                "cmd": [py, "server.py"],
                "cwd": ROOT / "emotional story recommondation" / "frontend",
                "env": {"FRONTEND_PORT": "8080"},
                "restart": True,
                "max_restarts": 5,
            },
            {
                "name": "Stutter Backend",
                "cmd": [py, "main.py"],
                "cwd": ROOT / "stutter" / "backend",
                "env": {"STUTTER_PORT": "8001", "STUTTER_RELOAD": "0"},
                "restart": True,
                "max_restarts": 5,
            },
            {
                "name": "Stutter Frontend",
                "cmd": [py, "-m", "http.server", "8100"],
                "cwd": ROOT / "stutter" / "frontend",
                "env": {},
                "restart": True,
                "max_restarts": 5,
            },
            {
                "name": "Sign Backend+Frontend",
                "cmd": [py, "flaskApi_minimal.py"],
                "cwd": ROOT / "sign" / "MyResearch",
                "env": {"SIGN_PORT": "5001", "SIGN_DEBUG": "0"},
                "restart": True,
                "max_restarts": 5,
            },
        ]

        for spec in specs:
            proc = start_service(spec["name"], spec["cmd"], spec["cwd"], spec["env"])
            services.append(
                {
                    **spec,
                    "proc": proc,
                    "restarts": 0,
                    "down_reported": False,
                }
            )

        print("\nUnified system is running.")
        print("Main portals:")
        print("  Emotional Story Reader: http://localhost:8080/index.html")
        print("  Emotional API:          http://localhost:5005")
        print("  TTS API:                http://localhost:5005/api/process-story-xtts-multispeaker")
        print("  Stutter Frontend:       http://localhost:8100/dashboard.html")
        print("  Stutter API:            http://localhost:8001")
        print("  Sign App:               http://localhost:5001")
        print("  Sign Console:           http://localhost:5001/sign")
        print("\nPress Ctrl+C to stop all services.\n")

        while True:
            # Keep parent alive and detect crashed child services.
            alive_count = 0
            for service in services:
                name = service["name"]
                proc = service["proc"]
                if proc.poll() is None:
                    alive_count += 1
                    continue

                if not service["down_reported"]:
                    print(f"[DOWN] {name} exited with code {proc.returncode}")
                    service["down_reported"] = True

                can_restart = service.get("restart", False) and service["restarts"] < service.get("max_restarts", 0)
                if can_restart:
                    service["restarts"] += 1
                    print(f"[RESTART] {name} (attempt {service['restarts']}/{service['max_restarts']})")
                    time.sleep(1)
                    new_proc = start_service(name, service["cmd"], service["cwd"], service["env"])
                    service["proc"] = new_proc
                    service["down_reported"] = False
                    alive_count += 1

            if alive_count == 0:
                raise RuntimeError("All services have stopped.")
            time.sleep(1)

    except KeyboardInterrupt:
        print("\nStopping all services...")
    except Exception as e:
        print(f"\n[ERROR] {e}")
    finally:
        for service in services:
            name = service["name"]
            proc = service["proc"]
            if proc.poll() is None:
                try:
                    if os.name == "nt":
                        proc.send_signal(signal.CTRL_BREAK_EVENT)
                    else:
                        proc.terminate()
                except Exception:
                    pass
        # Give them a moment to terminate, then force kill if needed.
        time.sleep(2)
        for service in services:
            proc = service["proc"]
            if proc.poll() is None:
                try:
                    proc.kill()
                except Exception:
                    pass
        print("All services stopped.")


if __name__ == "__main__":
    main()

