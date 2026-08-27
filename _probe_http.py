import urllib.request

URLS = [
    "http://localhost:8000/",
    "http://localhost:8000/docs",
    "http://localhost:5000/api/recommend-with-sign?emotion=happy&max_tokens=10",
    "http://localhost:5000/api/recommend?emotion=happy",
]

for url in URLS:
    print("\n---", url)
    try:
        with urllib.request.urlopen(url, timeout=30) as r:
            body = r.read(300).decode("utf-8", "ignore")
            print("STATUS", r.status)
            print(body[:300])
    except Exception as e:
        print("ERROR", repr(e))
