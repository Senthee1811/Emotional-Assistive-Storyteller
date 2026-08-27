import os
import sys

PORTS = [3000, 4000, 5001, 5002, 5003, 5004, 5005, 5006]

try:
    import psutil
except Exception as e:
    print("psutil not available:", e)
    sys.exit(0)

me = os.getpid()
killed = []
for proc in psutil.process_iter(["pid", "name"]):
    pid = proc.info["pid"]
    if pid == me:
        continue
    try:
        conns = proc.connections(kind="inet")
    except Exception:
        continue
    for c in conns:
        if c.status == psutil.CONN_LISTEN and c.laddr and c.laddr.port in PORTS:
            try:
                print(f"KILL pid={pid} name={proc.info.get('name')} port={c.laddr.port}")
                proc.terminate()
                killed.append(pid)
            except Exception as e:
                pass
            break

print("Port cleanup completed.")
