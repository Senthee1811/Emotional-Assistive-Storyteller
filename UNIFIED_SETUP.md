# Unified Setup (Emotion + Sign + Stutter)

Run everything with one command from:

`c:\Users\kaaya\OneDrive\Desktop\New folder`

```bash
python run_all_systems.py
```

This starts all backend + frontend services together:

1. Emotion Story Backend: `http://localhost:5000`
2. Emotion Story Frontend: `http://localhost:8080/index.html`
3. Stutter Backend API: `http://localhost:8000` (docs: `/docs`)
4. Stutter Frontend: `http://localhost:8100/dashboard.html`
5. Sign Backend + Frontend: `http://localhost:5001` (sign page: `/sign`)

Press `Ctrl+C` in the launcher terminal to stop all services.

## Notes

- Homepage links in StoryPal now point to the integrated Sign and Stutter modules.
- Ports are configurable via env vars:
  - Emotion: `EMOTION_PORT`
  - Stutter: `STUTTER_PORT`
  - Sign: `SIGN_PORT`
  - Story frontend static server: `FRONTEND_PORT`
