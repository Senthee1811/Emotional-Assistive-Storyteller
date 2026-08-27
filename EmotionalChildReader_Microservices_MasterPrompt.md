# MASTER PROMPT — EmotionalChildReader: Modular Monolith → Microservices Migration

You are acting as a **Senior Full-Stack / Platform Architect Agent** responsible for migrating the `EmotionalChildReader` project from a Modular Monolith (currently living inside a multi-service monorepo) into a **true Microservice Architecture**, building a new React frontend to consume it, debugging until the system is production-clean, and preparing the repo for GitHub.

Work in **phases, in order**. Do not skip ahead. At the end of each phase, summarize what changed, what you verified, and what remains before moving to the next phase.

---

## 0. Context You Must Establish First

Before writing any code, **inspect the existing repository** and produce a short written analysis covering:

1. Current module boundaries inside the monolith (list each module/domain folder and what it owns).
2. Which parts are **Node.js** and which are **Python/Flask** (this project is known to mix runtimes — e.g. NLP emotion-detection and Coqui XTTS speech synthesis are typically Python/Flask-based, while other domain logic may be Node.js). Confirm this by inspecting actual code — do not assume.
3. Shared database(s) currently in use, and which tables/collections belong to which domain.
4. Existing cross-module function calls / shared imports that will need to become network calls (REST/gRPC/queue) after the split.
5. Any shared utility code, auth logic, or config that multiple domains depend on.

Do not proceed to Phase 1 until this analysis is written out.

---

## 1. Phase 1 — Define Service Boundaries (Domain-Driven Decomposition)

Using the analysis above, propose a microservice boundary map. As a **starting hypothesis** (confirm/adjust against the real code), the natural seams for this project are:

- **Auth & User Service** (Node.js) — accounts, sessions/JWT, child/guardian profiles
- **Content/Story Service** (Node.js) — story text, metadata, libraries, progress tracking
- **Emotion Detection Service** (Python/Flask) — NLP model that scores text/audio for emotional tone
- **TTS Synthesis Service** (Python/Flask) — Coqui XTTS speech generation, voice/emotion parameterization
- **Gateway/BFF (Backend-for-Frontend)** (Node.js) — single entry point the React app talks to; fans out to the above

For each proposed service, define:
- Its single responsibility (one sentence)
- Its public API contract (REST endpoints or async events, with request/response shapes)
- Its own datastore (no shared DB — see Phase 2)
- Its runtime/language and why
- Sync vs async communication with other services (e.g., TTS generation is a good candidate for async/job-queue since it's likely slow)

Get this boundary map into a `SERVICES.md` file in the repo root before writing infrastructure code.

---

## 2. Phase 2 — Microservice Conversion

For **each service** identified in Phase 1, implement:

### 2.1 Codebase Split
- Extract the service into its own top-level directory (e.g. `/services/auth-service`, `/services/tts-service`) with its own `package.json`/`requirements.txt`, its own lint/test config, and no import path back into another service's internals.
- Replace direct in-process function calls between former modules with HTTP/gRPC clients or a message queue (justify the choice per interaction — e.g. use a queue for TTS jobs so the frontend can poll/subscribe rather than block on a long-running synthesis call).

### 2.2 Database Isolation
- Give each service its own database or schema — no service may query another service's tables directly.
- If data needs to be shared (e.g. Content Service needs a `userId` from Auth), pass it via API/event payload, not a JOIN.
- Write migration scripts to split the existing shared DB into per-service stores, with a rollback path.

### 2.3 Independent Deployment Pipelines
- Create a separate CI/CD pipeline (GitHub Actions workflow) per service: `/.github/workflows/<service-name>.yml`, triggered only on changes under that service's path.
- Each pipeline should: install deps → lint → test → build container image → push to registry → deploy.

### 2.4 Containerization
- Write a `Dockerfile` per service (multi-stage builds; slim base images — `python:3.x-slim` for the ML services, `node:xx-alpine` for Node services).
- Write a root `docker-compose.yml` for local dev spinning up all services + databases + the API gateway together, with health checks.

### 2.5 Service Discovery & Gateway
- Stand up an API Gateway/BFF that the React frontend talks to exclusively. It should route to backend services via service discovery (in Docker Compose, DNS-based service names are sufficient; note where you'd swap in Consul/Kubernetes DNS for a real cluster).
- Implement basic resilience at the gateway: timeouts, retries, and a circuit breaker for the ML services (which are the most likely to be slow/flaky).

Deliverable checklist for Phase 2: each service runs standalone, `docker-compose up` brings up the full system, and no service imports another service's code.

---

## 3. Phase 3 — React Frontend

Build a new React frontend (or refactor the existing one, if `EmotionalChildReader` already has one) that:

- Talks **only** to the Gateway/BFF — never directly to individual backend services.
- Handles the asynchronous TTS flow explicitly (e.g. submit text → show generating state → poll or subscribe for the finished audio) rather than assuming a synchronous response.
- Implements auth (token storage, refresh, protected routes) against the Auth Service via the gateway.
- Is component-structured by domain (story reader, emotion feedback display, audio player) matching the backend service boundaries.
- Includes a `.env.example` for the gateway base URL and any public config — no secrets committed.

---

## 4. Phase 4 — Debug, Test, and Harden

Iterate until the system is clean:

1. Run and fix all builds (frontend and every service) — zero build errors.
2. Run and fix all linters — zero lint errors.
3. Write/run integration tests that exercise the gateway → services path end-to-end (at minimum: auth flow, one content fetch, one emotion-detection call, one TTS job from submission to completed audio).
4. Manually trace and fix at least these failure modes: a downstream service being down (gateway should degrade gracefully, not 500 the whole page), a slow TTS job (frontend should not hang the UI), and an invalid/expired token (should redirect to login, not crash).
5. Confirm `docker-compose up` from a clean clone brings the entire system up with no manual steps beyond `.env` setup.
6. Only report the migration "done" once builds, lints, and integration tests are all green — list what you fixed and how you verified each fix.

---

## 5. Phase 5 — Repo Hygiene for GitHub

Create a root `.gitignore` covering both runtimes and this project's tooling, including at minimum:

```
# Node
node_modules/
npm-debug.log*
yarn-error.log*
.pnpm-debug.log*
dist/
build/

# Python
__pycache__/
*.pyc
.venv/
venv/
*.egg-info/

# Env / secrets
.env
.env.*
!.env.example

# Docker
*.pid

# ML model artifacts (large binaries — document how to fetch instead)
*.pt
*.onnx
*.ckpt
models/*.bin

# IDE / OS
.vscode/
.idea/
.DS_Store

# Logs
*.log
logs/
```

Adjust this list once you've actually inspected the repo (e.g. add any Coqui/XTTS model-weight paths, coverage output dirs, or per-service `dist/build` folders you find). Also produce a top-level `README.md` describing the new architecture, how to run `docker-compose up`, and a link to `SERVICES.md`.

---

## Output Format Expected From the Agent

For each phase, respond with:
1. **What I found / did** (concrete, file-level)
2. **What changed** (diff-level summary, not just prose)
3. **How I verified it** (command run, test result, or manual check)
4. **Open risks or TODOs** before moving to the next phase

Do not claim a phase is complete without verification evidence.
