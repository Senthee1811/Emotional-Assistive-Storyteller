import urllib.request
import urllib.error


CHECKS = [
    ("Emotion root", "http://localhost:5000/"),
    ("Emotion detect", "http://localhost:5000/api/pdfs"),
    ("Emotion recommend+sign", "http://localhost:5000/api/recommend-with-sign?emotion=happy&max_tokens=4"),
    ("Stutter root", "http://localhost:8001/"),
    ("Stutter docs", "http://localhost:8001/docs"),
    ("Sign root", "http://localhost:5001/"),
    ("Sign labels", "http://localhost:5001/api/sign/labels"),
    ("Story frontend", "http://localhost:8080/index.html"),
    ("Stutter frontend", "http://localhost:8100/dashboard.html"),
]


def check(name, url):
    try:
        timeout = 20 if "recommend-with-sign" in url else 8
        with urllib.request.urlopen(url, timeout=timeout) as resp:
            body = resp.read(240).decode("utf-8", "ignore").replace("\n", " ")
            print(f"[UP]   {name} ({resp.status})")
            print(f"       {url}")
            print(f"       {body[:160]}")
            return True
    except Exception as exc:
        print(f"[DOWN] {name}")
        print(f"       {url}")
        print(f"       {exc}")
        return False


def main():
    up = 0
    for name, url in CHECKS:
        if check(name, url):
            up += 1
    print(f"\nSummary: {up}/{len(CHECKS)} checks are UP")


if __name__ == "__main__":
    main()
