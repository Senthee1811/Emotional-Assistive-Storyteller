import subprocess

for cmd in [
    ["netstat", "-ano"],
    ["taskkill", "/?"],
    ["powershell", "-Command", "Get-Process | Select-Object -First 1"],
    [r"C:\Windows\System32\netstat.exe", "-ano"],
    [r"C:\Windows\System32\taskkill.exe", "/?"],
]:
    print("\nCMD:", cmd)
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        print("RC:", p.returncode)
        out = (p.stdout or "")[:400]
        err = (p.stderr or "")[:400]
        print("OUT:", out.replace("\n", " "))
        print("ERR:", err.replace("\n", " "))
    except Exception as e:
        print("EXC:", repr(e))
