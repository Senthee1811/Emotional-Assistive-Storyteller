from pathlib import Path
import re

targets = [
    (
        Path("emotional story recommondation/backend/app.py"),
        r"recommend-with-sign|sign-story|detect-emotion|if __name__|app.run|SIGN_READY|def recommend|@app\.route",
    ),
    (
        Path("stutter/backend/main.py"),
        r"if __name__|uvicorn\.run|@app\.get\(\"/\"\)|FastAPI\(|print\(",
    ),
]

for path, patt in targets:
    print("\n" + "=" * 80)
    print(path)
    print("=" * 80)
    rx = re.compile(patt)
    lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
    for i, line in enumerate(lines, 1):
        if rx.search(line):
            print(f"{i:04d}: {line}")
