# SERVICES.md — Microservice Boundary Map & API Contracts

This document defines the domain-driven microservice boundaries, public API contracts, datastores, and communication patterns for the `EmotionalChildReader` architecture.

---

## Architecture Overview

```
                                  ┌───────────────────────────┐
                                  │   React 18 Frontend App   │
                                  └─────────────┬─────────────┘
                                                │ REST / JSON
                                                ▼
                                  ┌───────────────────────────┐
                                  │   API Gateway / BFF       │
                                  │ (Node.js / Express Proxy) │
                                  └─────────────┬─────────────┘
                                                │
      ┌──────────────┬──────────────────┼──────────────────┬──────────────┬──────────────┐
      │              │                  │                  │              │              │
      ▼              ▼                  ▼                  ▼              ▼              ▼
┌───────────┐  ┌───────────┐      ┌───────────┐      ┌───────────┐  ┌───────────┐  ┌───────────┐
│   Auth    │  │   Story   │      │  Emotion  │      │  Stutter  │  │   Sign    │  │    TTS    │
│  Service  │  │  Service  │      │  Service  │      │  Service  │  │  Service  │  │  Service  │
│ (Node.js) │  │  (Python) │      │ (Node.js) │      │ (Python)  │  │ (Python)  │  │ (Python)  │
└─────┬─────┘  └─────┬─────┘      └─────┬─────┘      └─────┬─────┘  └─────┬─────┘  └─────┬─────┘
      │              │                  │                  │              │              │
      ▼              ▼                  ▼                  ▼              ▼              ▼
  [Auth DB]      [Story DB]        [Face++ API]       [Stutter DB]    [Sign Models]   [Job Queue]
```

---

## 1. Auth & User Service (`auth-service`)

- **Single Responsibility**: Manages user accounts, authentication credentials, JWT access tokens, and child user profiles.
- **Runtime**: Node.js / Express — ideal for lightweight JSON API execution, bcrypt hashing, and JWT signing.
- **Datastore**: Isolated SQLite / PostgreSQL (`auth.db`) storing `users` and `profiles`.
- **Communication Pattern**: Synchronous REST over HTTP via Gateway.

### Public API Contracts
- `POST /api/auth/register`
  - **Request**: `{ "username": "string", "email": "string", "password": "string", "child_name": "string" }`
  - **Response**: `{ "status": "success", "user_id": "string", "token": "string" }`
- `POST /api/auth/login`
  - **Request**: `{ "email": "string", "password": "string" }`
  - **Response**: `{ "status": "success", "user_id": "string", "token": "string" }`
- `GET /api/auth/me` (Protected)
  - **Response**: `{ "user_id": "string", "email": "string", "child_name": "string" }`

---

## 2. Emotion Detection Service (`emotion-service`)

- **Single Responsibility**: Processes facial images and text inputs to score emotional state (happy, sad, neutral, angry, fear, surprise, disgust).
- **Runtime**: Node.js / Express — handles file upload buffer streams to Face++ API and local sentiment evaluation.
- **Datastore**: Stateless (External Face++ API integration + local emotion rule map).
- **Communication Pattern**: Synchronous REST over HTTP.

### Public API Contracts
- `POST /api/emotion/detect-facial`
  - **Request**: `multipart/form-data` with `image` file field.
  - **Response**: `{ "emotion": "happy", "confidence": 0.95, "allEmotions": [...], "source": "Face++ API" }`
- `POST /api/emotion/detect-text`
  - **Request**: `{ "text": "string" }`
  - **Response**: `{ "emotion": "happy", "confidence": 0.88 }`
- `GET /api/emotion/health`
  - **Response**: `{ "status": "OK", "facepp_configured": true }`

---

## 3. Story & Recommendation Service (`story-service`)

- **Single Responsibility**: Manages story content library, catalog metadata, reading progress, and emotion-matched story recommendations.
- **Runtime**: Python 3.10 / Flask — allows seamless integration with Python ML/NLP recommendation models.
- **Datastore**: Isolated SQLite (`stories.db`) and `story_metadata.json`.
- **Communication Pattern**: Synchronous REST over HTTP.

### Public API Contracts
- `GET /api/stories/`
  - **Response**: `{ "stories": [ { "id": "1", "title": "The Happy Bear", "emotion": "happy", "content": "..." } ] }`
- `POST /api/stories/recommend`
  - **Request**: `{ "emotion": "sad", "age": 7 }`
  - **Response**: `{ "recommended_stories": [...], "matched_emotion": "sad" }`
- `GET /api/stories/:id`
  - **Response**: `{ "id": "1", "title": "The Happy Bear", "content": "..." }`

---

## 4. Stutter Detection Service (`stutter-service`)

- **Single Responsibility**: Classifies speech audio recordings for stuttering disfluency, extracts acoustic features, and logs analysis history.
- **Runtime**: Python 3.10 / FastAPI — provides high-performance asynchronous audio binary processing.
- **Datastore**: Isolated SQLite (`stutter.db`) storing detection history and audio metrics.
- **Communication Pattern**: Synchronous audio classification REST endpoint.

### Public API Contracts
- `POST /api/stutter/analyze`
  - **Request**: `multipart/form-data` with `audio` file field.
  - **Response**: `{ "is_stutter": true, "confidence": 0.84, "disfluency_type": "repetition", "audio_id": "123" }`
- `GET /api/stutter/history` (Protected)
  - **Response**: `{ "history": [ { "timestamp": "...", "is_stutter": true, "confidence": 0.84 } ] }`
- `GET /api/stutter/health`
  - **Response**: `{ "status": "ok" }`

---

## 5. Sign Language Service (`sign-service`)

- **Single Responsibility**: Translates text input or visual landmarks into sign language gesture coordinates and animated rendering instructions.
- **Runtime**: Python 3.10 / Flask — handles MediaPipe/PyTorch sign language models and keypoint sequences.
- **Datastore**: Pre-trained model artifacts (`sign_model.h5`, `scaler.pkl`, `label_encoder.pkl`).
- **Communication Pattern**: Synchronous REST over HTTP.

### Public API Contracts
- `POST /api/sign/translate`
  - **Request**: `{ "text": "hello" }`
  - **Response**: `{ "word": "hello", "gesture_found": true, "animation_sequence": [...] }`
- `POST /api/sign/predict-landmarks`
  - **Request**: `{ "landmarks": [...] }`
  - **Response**: `{ "predicted_sign": "thank you", "confidence": 0.92 }`

---

## 6. TTS Synthesis Service (`tts-service`)

- **Single Responsibility**: Generates audio speech output from story text parameterized by target emotion and voice speaker.
- **Runtime**: Python 3.10 / Flask — manages Coqui XTTS / gTTS speech synthesis engines.
- **Datastore**: In-memory job status map + audio artifact output directory.
- **Communication Pattern**: **Asynchronous Job Queue**. Synthesis requests return a `job_id` immediately; clients poll until status is `completed` and download the audio.

### Public API Contracts
- `POST /api/tts/synthesize`
  - **Request**: `{ "text": "Once upon a time...", "emotion": "happy", "speaker": "child_voice" }`
  - **Response**: `{ "job_id": "job-abc123", "status": "processing" }`
- `GET /api/tts/jobs/:job_id`
  - **Response**: `{ "job_id": "job-abc123", "status": "completed", "audio_url": "/api/tts/audio/job-abc123.mp3" }`
- `GET /api/tts/audio/:filename`
  - **Response**: Binary audio stream (`audio/mpeg` or `audio/wav`).

---

## 7. Gateway / BFF (`gateway`)

- **Single Responsibility**: Serves as the single API entry point for the React frontend, handling JWT verification, CORS, service proxying, rate limiting, and circuit breaker fallbacks.
- **Runtime**: Node.js / Express + `http-proxy-middleware`.
- **Proxy Routes**:
  - `/api/auth/*` $\rightarrow$ `http://auth-service:5001`
  - `/api/emotion/*` $\rightarrow$ `http://emotion-service:5002`
  - `/api/stories/*` $\rightarrow$ `http://story-service:5003`
  - `/api/stutter/*` $\rightarrow$ `http://stutter-service:5004`
  - `/api/sign/*` $\rightarrow$ `http://sign-service:5005`
  - `/api/tts/*` $\rightarrow$ `http://tts-service:5006`
