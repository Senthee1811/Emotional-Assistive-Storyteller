# EmotionalChildReader — Microservices Platform (StoryPal)

A production-ready **Microservice Architecture** for an emotional child reader platform. The system combines real-time facial/text emotion recognition, speech stuttering detection, sign language translation, asynchronous XTTS speech synthesis, and an interactive React frontend, all orchestrated behind a single API Gateway (BFF).

---

## 🏛️ Architecture Overview

```
                                  ┌───────────────────────────┐
                                  │   React 18 Frontend App   │
                                  │       (Port 3000)         │
                                  └─────────────┬─────────────┘
                                                │ REST / JSON
                                                ▼
                                  ┌───────────────────────────┐
                                  │    API Gateway / BFF      │
                                  │  (Node.js Express Proxy)  │
                                  │       (Port 4000)         │
                                  └─────────────┬─────────────┘
                                                │
      ┌──────────────┬──────────────────┼──────────────────┬──────────────┬──────────────┐
      │              │                  │                  │              │              │
      ▼              ▼                  ▼                  ▼              ▼              ▼
┌───────────┐  ┌───────────┐      ┌───────────┐      ┌───────────┐  ┌───────────┐  ┌───────────┐
│   Auth    │  │   Story   │      │  Emotion  │      │  Stutter  │  │   Sign    │  │    TTS    │
│  Service  │  │  Service  │      │  Service  │      │  Service  │  │  Service  │  │  Service  │
│ (Node.js) │  │  (Python) │      │ (Node.js) │      │ (Python)  │  │ (Python)  │  │ (Python)  │
│(Port 5001)│  │(Port 5003)│      │(Port 5002)│      │(Port 5004)│  │(Port 5005)│  │(Port 5006)│
└─────┬─────┘  └─────┬─────┘      └─────┬─────┘      └─────┬─────┘  └─────┬─────┘  └─────┬─────┘
      │              │                  │                  │              │              │
      ▼              ▼                  ▼                  ▼              ▼              ▼
  [Auth DB]      [Story DB]        [Face++ API]       [Stutter DB]    [Sign Models]   [Job Queue]
```

Detailed microservice boundary specifications, public API contracts, and datastore isolation rules are documented in [`SERVICES.md`](file:///c:/Users/senth/Desktop/EmotionalChildReader%20%281%29/EmotionalChildReader/New%20folder%20-%20Copy%20%282%29/SERVICES.md).

---

## 🚀 Microservices Directory Structure

- **`/gateway`**: Express reverse proxy handling JWT verification, CORS, and resilient proxying to all microservices.
- **`/services/auth-service`**: Node.js/Express service for user accounts, JWT issuance, and child profiles.
- **`/services/emotion-service`**: Node.js/Express service wrapping Face++ facial emotion recognition and sentiment scoring.
- **`/services/story-service`**: Python/Flask service managing story content and emotion-matched recommendations.
- **`/services/stutter-service`**: Python/FastAPI service for audio stutter disfluency classification with isolated SQLite storage.
- **`/services/sign-service`**: Python/Flask service for sign language translation and 3D gesture sequences.
- **`/services/tts-service`**: Python/Flask service running an **asynchronous job queue** for audio speech synthesis.
- **`/frontend`**: Modern React 18 frontend with Tailwind CSS styling, responsive layout, and dark-mode aesthetics.
- **`/.github/workflows`**: Independent CI/CD GitHub Actions pipeline per service.

---

## 🛠️ Quick Start with Docker Compose

Spin up the entire platform (all 6 microservices + API Gateway + React frontend):

```bash
docker-compose up -d --build
```

### Access Ports:
- **React Frontend Application**: [http://localhost:3000](http://localhost:3000)
- **API Gateway / BFF**: [http://localhost:4000/health](http://localhost:4000/health)
- **Auth Service**: `http://localhost:5001`
- **Emotion Service**: `http://localhost:5002`
- **Story Service**: `http://localhost:5003`
- **Stutter Service**: `http://localhost:5004`
- **Sign Service**: `http://localhost:5005`
- **TTS Service**: `http://localhost:5006`

---

## 🧪 Local Native Development (Without Docker)

You can also run services individually or launch them via the Node/Python runtime scripts:

```bash
# Gateway
cd gateway && npm install && node index.js

# Auth Service
cd services/auth-service && npm install && node index.js

# Story Service
cd services/story-service && pip install -r requirements.txt && python app.py

# Frontend
cd frontend && npm install && npm start
```

---

## 🔒 Security & Secrets

Secrets and API keys (such as `FACEPP_API_KEY`, `JWT_SECRET`) are configured via environment variables. Copy `.env.example` files to `.env` when deploying to production environments.
