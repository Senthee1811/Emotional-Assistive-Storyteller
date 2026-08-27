import os
from pathlib import Path

ROOT = Path(".")
print("CWD:", ROOT.resolve())
for name in [
    "check_services.py",
    "run_all_systems.py",
    "start_all_services.py",
    "emotional story recommondation/backend/app.py",
    "stutter/backend/main.py",
    "stutter/backend/auth.py",
]:
    p = ROOT / name
    print(name, "=>", "OK" if p.exists() else "MISSING")
