import socket

def check(port):
    s = socket.socket()
    s.settimeout(1)
    try:
        s.connect(("127.0.0.1", port))
        print(f"OPEN {port}")
    except Exception as e:
        print(f"CLOSED {port}: {e}")
    finally:
        s.close()

for p in [5000, 5001, 8000, 8080, 8100]:
    check(p)
