import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent
STATE_FILE = ROOT / ".services_pids.json"
PORTS = [5000, 5001, 8000, 8080, 8100]


def _run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def _kill_pid(pid):
    if not pid:
        return
    _run([r"C:\Windows\System32\taskkill.exe", "/PID", str(pid), "/T", "/F"])


def _pids_from_netstat():
    p = _run([r"C:\Windows\System32\netstat.exe", "-ano"])
    pids = set()
    if p.returncode != 0:
        return pids
    for line in p.stdout.splitlines():
        line = line.strip()
        if not line.startswith("TCP"):
            continue
        parts = line.split()
        if len(parts) < 5:
            continue
        local = parts[1]
        state = parts[3] if len(parts) >= 5 else ""
        pid = parts[-1]
        if ":" not in local:
            continue
        try:
            port = int(local.rsplit(":", 1)[1])
        except ValueError:
            continue
        if port in PORTS and state.upper() == "LISTENING":
            try:
                pids.add(int(pid))
            except ValueError:
                pass
    return pids


def main():
    killed = set()

    if STATE_FILE.exists():
        try:
            entries = json.loads(STATE_FILE.read_text(encoding="utf-8"))
            for e in entries:
                pid = int(e.get("pid"))
                _kill_pid(pid)
                killed.add(pid)
        except Exception:
            pass
        try:
            STATE_FILE.unlink()
        except Exception:
            pass

    for pid in _pids_from_netstat():
        _kill_pid(pid)
        killed.add(pid)

    print(f"Stopped processes: {sorted(killed)}")


if __name__ == "__main__":
    main()
