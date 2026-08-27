from pathlib import Path

FILES = [
    "check_services.py",
    "run_all_systems.py",
    "start_all_services.py",
    "stutter/backend/main.py",
    "stutter/backend/auth.py",
    "emotional story recommondation/backend/app.py",
]

for fp in FILES:
    p = Path(fp)
    print("\n" + "=" * 80)
    print(fp)
    print("=" * 80)
    if not p.exists():
        print("MISSING")
        continue
    txt = p.read_text(encoding="utf-8", errors="replace")
    lines = txt.splitlines()
    print(f"TOTAL LINES: {len(lines)}")
    preview = lines[:220]
    for i, line in enumerate(preview, 1):
        print(f"{i:04d}: {line}")
    if len(lines) > len(preview):
        print("... [truncated] ...")
