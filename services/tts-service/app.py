import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
TTS_SRC = ROOT / "text-to-speech" / "backend_tts"

if str(TTS_SRC) not in sys.path:
    sys.path.insert(0, str(TTS_SRC))

os.chdir(str(TTS_SRC))

# Import and run original backend_tts application
from flaskApi import app

if __name__ == '__main__':
    port = int(os.environ.get("PORT", os.environ.get("TTS_PORT", 5006)))
    host = os.environ.get("TTS_HOST", "0.0.0.0")
    print(f"🚀 [tts-service] Running original backend_tts engine on port {port} in {TTS_SRC}")
    app.run(host=host, port=port, debug=False, threaded=True)
