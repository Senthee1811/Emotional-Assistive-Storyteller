"""Unified deployable service for this repository.

This module combines the existing backend services into a single ASGI app.
It mounts:
  - Emotional story recommendation backend (Flask)
  - Sign language backend (Flask)
  - Stutter detection backend (FastAPI)

Run via:
  python unified_service.py

Or with uvicorn:
  uvicorn unified_service:app --host 0.0.0.0 --port 5000

The mounted services are available at:
  /emotion/*    (emotional story recommender)
  /sign/*       (sign language API)
  /stutter/*    (stutter detection API)

"""

import os
from pathlib import Path
import importlib.util

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.wsgi import WSGIMiddleware


ROOT = Path(__file__).resolve().parent


def _load_module_from_path(name: str, path: Path):
    """Dynamically load a module from a filesystem path.

    This ensures local packages in the same directory (e.g., sign/MyResearch) can
    be imported even if the module is loaded from a different working directory.
    """
    spec = importlib.util.spec_from_file_location(name, str(path))
    module = importlib.util.module_from_spec(spec)

    # Ensure local imports work for modules in the same directory.
    import sys

    original_sys_path = list(sys.path)
    sys.path.insert(0, str(path.parent))
    try:
        spec.loader.exec_module(module)
    finally:
        sys.path[:] = original_sys_path

    return module


def _load_flask_app(name: str, relative_path: str):
    path = ROOT / relative_path
    if not path.exists():
        raise FileNotFoundError(f"Expected module at: {path}")
    mod = _load_module_from_path(name, path)
    if not hasattr(mod, "app"):
        raise AttributeError(f"Module {name} does not define an 'app' variable")
    return mod.app


def _load_fastapi_app(name: str, relative_path: str):
    path = ROOT / relative_path
    if not path.exists():
        raise FileNotFoundError(f"Expected module at: {path}")
    mod = _load_module_from_path(name, path)
    if not hasattr(mod, "app"):
        raise AttributeError(f"Module {name} does not define an 'app' variable")
    return mod.app


# Load the existing services (they must be importable without running their own uvicorn/flask server)
# If a dependency is missing or a service fails to load, we fall back to a stub app
# that returns a 503 with the error details.

from flask import Flask, jsonify
from fastapi import FastAPI as _FastAPI


def _stub_flask_app(name: str, error: Exception):
    stub = Flask(name)

    @stub.route("/", defaults={"path": ""})
    @stub.route("/<path:path>")
    def _unavailable(path: str):
        return (
            jsonify(
                {
                    "error": "service_unavailable",
                    "service": name,
                    "details": str(error),
                }
            ),
            503,
        )

    return stub


def _stub_fastapi_app(name: str, error: Exception):
    app = _FastAPI(title=f"{name} (unavailable)")

    @app.get("/{path:path}")
    async def _unavailable(path: str = ""):
        return {"error": "service_unavailable", "service": name, "details": str(error)}

    return app


try:
    emotion_app = _load_flask_app(
        "emotion_backend", "emotional story recommondation/backend/app.py"
    )
except Exception as e:
    emotion_app = _stub_flask_app("emotion_backend", e)

try:
    sign_app = _load_flask_app("sign_backend", "sign/MyResearch/flaskApi.py")
except Exception as e:
    sign_app = _stub_flask_app("sign_backend", e)

try:
    stutter_app = _load_fastapi_app("stutter_backend", "stutter/backend/main.py")
except Exception as e:
    stutter_app = _stub_fastapi_app("stutter_backend", e)


app = FastAPI(title="Unified Multi-Service API")

# Optional: allow all CORS for easy local development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "status": "ok",
        "message": "Unified API: /emotion, /sign, /stutter",
        "routes": {
            "emotion": "/emotion/",
            "sign": "/sign/",
            "stutter": "/stutter/",
        },
    }


# Mount the existing backends under path prefixes so they can co-exist.
app.mount("/emotion", WSGIMiddleware(emotion_app))
app.mount("/sign", WSGIMiddleware(sign_app))
app.mount("/stutter", stutter_app)


if __name__ == "__main__":
    import uvicorn

    host = os.environ.get("UNIFIED_HOST", "0.0.0.0")
    port = int(os.environ.get("UNIFIED_PORT", "5000"))
    reload_flag = os.environ.get("UNIFIED_RELOAD", "0") in ("1", "true", "True")

    uvicorn.run(app, host=host, port=port, reload=reload_flag)
