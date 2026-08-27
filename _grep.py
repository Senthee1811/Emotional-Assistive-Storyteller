from pathlib import Path
import re
import sys

if len(sys.argv) < 3:
    print("usage: python _grep.py <file> <pattern>")
    raise SystemExit(1)

path = Path(sys.argv[1])
pattern = re.compile(sys.argv[2])
for i, line in enumerate(path.read_text(encoding="utf-8", errors="replace").splitlines(), 1):
    if pattern.search(line):
        print(f"{i:04d}: {line}")
