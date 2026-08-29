import urllib.request
import urllib.error
import json

CHECKS = [
    ("API Gateway / BFF", "http://localhost:4000/health"),
    ("Auth Service", "http://localhost:5001/health"),
    ("Emotion Service", "http://localhost:5002/health"),
    ("Story Service", "http://localhost:5003/api/health"),
    ("Stutter Service (Docs)", "http://localhost:5004/docs"),
    ("Sign Service (Labels)", "http://localhost:5005/api/sign/labels"),
    ("TTS Service (Backend)", "http://localhost:5006/"),
]


def check(name, url):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "HealthCheck/1.0"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            body = resp.read(200).decode("utf-8", "ignore").replace("\n", " ")
            print(f"[UP]   {name:<25} ({resp.status}) -> {url}")
            return True
    except Exception as exc:
        print(f"[DOWN] {name:<25} -> {url} ({exc})")
        return False


def main():
    print("==================================================")
    print("  CHECKING MICROSERVICES HEALTH")
    print("==================================================")
    up = 0
    for name, url in CHECKS:
        if check(name, url):
            up += 1
    print("--------------------------------------------------")
    print(f"Summary: {up}/{len(CHECKS)} services UP")


if __name__ == "__main__":
    main()

