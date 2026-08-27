from pathlib import Path
import sys

if len(sys.argv) < 4:
    print("usage: python _show_range.py <path> <start> <end>")
    raise SystemExit(1)

start = int(sys.argv[-2])
end = int(sys.argv[-1])
p = Path(" ".join(sys.argv[1:-2]))
lines = p.read_text(encoding="utf-8", errors="replace").splitlines()
for i in range(start, min(end, len(lines)) + 1):
    print(f"{i:04d}: {lines[i-1]}")
