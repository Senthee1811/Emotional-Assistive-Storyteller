# MASTER PROMPT — EmotionalChildReader: 21st.dev Frontend Rebuild + Wire In Real Original Backends

You are acting as a **Senior Full-Stack Engineer Agent** on `EmotionalChildReader`. The current build has two classes of problems:

1. The frontend needs a full visual/UX rebuild using **21st.dev components**.
2. Multiple backend modules that exist and work on disk are **not actually being used** by the running system — the app is either faking their output or not calling them at all. You must locate, read, and correctly wire in the **real original backends** before the frontend rebuild is considered done, because a beautiful UI on top of fake backend output is not an acceptable outcome here.

**Do not treat this as "rebuild frontend, backend is a separate concern."** Every screen you rebuild must be wired to real, verified backend output. Fix backend-by-backend, verify each, then build/rebuild the corresponding frontend screen against the real thing.

---

## 0. Ground Truth: The Four Original Backend Modules

The real, working backend logic already exists on disk in these locations. Do not reimplement from scratch — **read the existing code first**, understand what it actually does, and integrate/expose it correctly. Only write new code where something is genuinely missing or broken.

| Module | Path | Responsibility |
|---|---|---|
| Text-to-Speech | `EmotionalChildReader (1)\EmotionalChildReader\New folder - Copy (2)\text-to-speech` | Coqui XTTS-based emotional speech synthesis of story text |
| Emotion/Story Recommendation | `EmotionalChildReader (1)\EmotionalChildReader\New folder - Copy (2)\emotional story recommondation` | Camera-based mood/emotion detection, used to recommend a story matching the child's current mood |
| Sign Language | `EmotionalChildReader (1)\EmotionalChildReader\New folder - Copy (2)\sign` | Sign language module |
| Stutter Detection | `EmotionalChildReader (1)\EmotionalChildReader\New folder - Copy (2)\stutter` | Stutter detection module |

For each module: open and actually read the code (not just filenames) before deciding how to integrate it. Do not assume behavior from folder names alone — verify against the real implementation, the same way the TTS bug below was found by reading the actual Flask service.

---

## PART A — Fix the TTS Backend (Known Bug, Reference Implementation Attached)

### A.0 The Bug
The current system's TTS output **plays a pre-existing dataset/reference audio clip instead of audio generated from the actual story sentence**. Coqui XTTS is not actually being invoked to synthesize the input text — something in the pipeline is short-circuiting to a reference sample.

The real TTS backend (Flask, at the `text-to-speech` path above) is structured like this — use it as the reference implementation, not something to discard:

- `server.py` (attached in this task) exposes: `/predict-xtts`, `/synthesize` / `/process-story-xtts` (sentence-by-sentence playlist generation with per-sentence emotion detection via `EmotionPredictor`), `/regenerate-from-index-xtts`, `/feedback` (`like_voice`/`dislike_voice` for per-child voice preference), and `/audio/<file>` for serving generated files.
- Core synthesis call is `generate_child_friendly_emotion_tts(...)` from `pipeline_xtts_ravdess.py`, which takes the **actual sentence text**, an `emotion_id`, `actor_id`, `gender`, and child/session identifiers, and is expected to return a **newly generated** audio file path + metadata.
- It also imports `ravdess_ref_picker.pick_ravdess_reference` — this is almost certainly where the bug lives: RAVDESS reference clips should only be used as a **speaker/emotion reference input to condition XTTS**, not returned as the final output audio. **Read `pipeline_xtts_ravdess.py` and `ravdess_ref_picker.py` directly** and confirm which of these is happening:
  - (a) XTTS is called correctly with the sentence text and a reference clip as a conditioning/speaker-embedding input, and the bug is elsewhere (e.g. caching returning a stale/wrong file, or `out_path` pointing at the reference file by mistake), **or**
  - (b) The pipeline never actually calls XTTS inference on the text at all, and `pick_ravdess_reference(...)`'s return value is being passed straight through as `out_path`.
- There's also a **cache layer** (`make_story_cache_key` / `load_story_cache` / `save_story_cache`) in `server.py` — verify this isn't serving stale cached responses from an earlier broken run, which could look identical to a live bug even after (a)/(b) above are fixed.

### A.1 Fix
- Fix the actual root cause found in A.0 — restore real XTTS synthesis of the input sentence, using the reference audio only for conditioning (voice/emotion), not as the output.
- Clear/invalidate any stale cache entries generated while the bug was live (old cache keys may point to reference-audio files, not synthesized ones).
- Preserve the existing API contract (`/synthesize`, `/predict-xtts`, `/regenerate-from-index-xtts`, `/feedback`, `/audio/<file>`) — the frontend rebuild in Part C will depend on these routes behaving as documented in `server.py`.

### A.2 Verify
- Call `/synthesize` with real story text and confirm the returned audio is **audibly different per sentence and per emotion**, and is not identical to a static reference/dataset clip (compare file hashes/waveforms between two different input sentences — they must differ).
- Confirm `/feedback` like/dislike actually affects subsequent voice selection (`get_voice_seed`) as intended.
- Do not report this fixed without producing real generated audio as evidence, per the actual sentence submitted.

---

## PART B — Wire In the Other Real Backends

For each of the remaining three modules, follow the same discipline as Part A: **read the real code at the given path before integrating**, do not stub or fake its output, and verify real behavior end-to-end.

### B.1 Camera-Based Mood Detection → Story Recommendation
- Read the backend at the `emotional story recommondation` path. Understand exactly how it captures/processes camera input and what mood/emotion labels it outputs.
- Wire it into the microservice architecture as its own service (own container, own API contract) — do not merge its logic into another service.
- Confirm the story recommendation logic genuinely uses the detected mood to select a story (not a hardcoded/default story regardless of detected mood).
- Verify: trigger with different simulated/real moods and confirm different stories are recommended accordingly.

### B.2 Sign Language Module
- Read the backend at the `sign` path and determine what it actually does today (recognition, translation, video/gesture input/output — confirm from the real code, don't assume).
- Integrate it as its own service with a clear API contract, and identify where in the frontend user flow it belongs.
- Verify with real input against the module's actual expected input format.

### B.3 Stutter Detection Module
- Read the backend at the `stutter` path and determine its actual function (detection from audio/speech input, what it outputs, how confident/frequent its signal is).
- Integrate it as its own service with a clear API contract, and identify where in the frontend user flow it belongs (e.g. feeding into the reading/practice experience).
- Verify with real input.

For all three: if the module is incomplete, broken, or clearly experimental/unfinished in its current form, **say so explicitly in your report** rather than building a polished frontend around output that doesn't actually work — flag it and propose the minimum real fix needed rather than faking a response to unblock the UI.

---

## PART C — Frontend Rebuild with 21st.dev

Only start this part once Parts A and B have been verified with real backend output.

### C.0 Scope
Rebuild the frontend using **21st.dev components for all UI elements** — buttons, forms, cards, navigation, modals, audio player controls, camera preview UI, etc. This should read as a professional, cohesive product, not a component-by-component patch job.

### C.1 Screens to Build/Rebuild (mapped to real backends)
- **Story reader/player**: wired to the fixed TTS service (Part A) — real playback of generated, per-sentence, per-emotion audio, with loading/error states for the async generation flow, and a working like/dislike control tied to `/feedback`.
- **Mood-based story picker**: wired to the camera-based mood detection service (B.1) — camera permission UX, live/periodic mood capture, and a clear "here's what we detected → here's what we recommend" moment.
- **Sign language screen(s)**: wired to the sign language service (B.2), matching whatever real input/output that module actually supports.
- **Stutter-aware reading/practice screen**: wired to the stutter detection service (B.3), surfacing its signal in a supportive, non-judgmental, child-appropriate way (this is a sensitive signal for a child user — no harsh "error" framing).

### C.2 Accessibility Constraint (do not skip)
This product's core end-users are **visually impaired children**, and several new modules here (camera mood detection, sign language) are inherently visual. For each screen:
- Ensure there's a non-visual path or clear audio narration of what the camera/mood/sign detection is doing and what it found — a visually impaired child cannot rely on seeing a camera preview or a detected-mood icon.
- Full keyboard navigation and screen-reader-sensible markup on every 21st.dev component used.
- Respect `prefers-reduced-motion` for any animated feedback (e.g. mood-detection result animation).

### C.3 UX Details
- Consistent loading/empty/error states across every screen, since each now depends on a separate backend service that can be slow or unavailable.
- Toast notifications for key events (story ready to play, mood detected, sign recognized, stutter signal noted, any service unavailable) — friendly, simple, child-appropriate copy, paired with an ARIA-live announcement per C.2.
- Remove all old/dead frontend code and any UI that was built around the previous faked/broken backend output.

---

## PART D — Final Verification

1. Fresh environment: bring up all backend services (TTS, mood/recommendation, sign, stutter) plus the gateway, then the new frontend.
2. Full manual walkthrough of every screen in C.1, confirming each is driven by real backend output — not a stub, cache artifact, or hardcoded response.
3. Specifically re-confirm the TTS fix (Part A) still holds after the frontend rewrite touches the playback UI.
4. Kill each backend service one at a time while using the frontend — confirm graceful, clearly communicated degradation (toast + accessible state), not a crash or silent failure.
5. Zero build/lint/type errors across frontend and all services.
6. Report, per module (TTS, mood/recommendation, sign, stutter, frontend): what was actually wrong or missing, what you changed, and what real evidence you have that it now works — not a completion claim alone.

---

## Output Format Expected From the Agent

For each part (A, B, C, D):
1. **What I found reading the real code** (be specific — function names, file names, the actual bug)
2. **What changed**
3. **How I verified it** (real request/response, real audio, real detection output — not assumption)
4. **Remaining risks or follow-ups**

Do not report Part A fixed without producing distinct, sentence-specific generated audio as evidence. Do not report Part B modules done without demonstrating real detection/output from each. Do not report Part C done without confirming every screen is wired to a verified-real backend from Parts A and B.