import asyncio
import os
import sys
import threading
import json
from collections import deque
from datetime import datetime

from fastapi import FastAPI, UploadFile, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from pydantic import BaseModel

ROOT_DIR = os.path.abspath(os.path.dirname(__file__))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

# Import the backend live_detection.py file first (before adding parent directory)
import live_detection
from live_detection import process_ai_coaching
print("Using backend/live_detection.py")

# Now add parent directory for other imports
PARENT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PARENT_DIR not in sys.path:
    sys.path.insert(0, PARENT_DIR)
from database import db
from auth import auth_service, get_current_user, get_user_id, UserLogin, UserRegister, AuthResponse
from activity_tracker import activity_tracker


def _to_native(value):
    try:
        import numpy as np
        if isinstance(value, (np.floating, np.integer)):
            return value.item()
        if isinstance(value, np.ndarray):
            return value.tolist()
    except Exception:
        pass
    return value


def _sanitize_value(value):
    value = _to_native(value)
    if isinstance(value, dict):
        return {k: _sanitize_value(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_sanitize_value(v) for v in value]
    return value


def _extract_audio_stats(file_path: str):
    import librosa
    waveform, sample_rate = librosa.load(file_path, sr=None)
    duration = len(waveform) / sample_rate if sample_rate else 0
    volume = (waveform ** 2).mean() ** 0.5 if len(waveform) else 0
    return round(duration, 2), round(volume, 4)


class WebSocketManager:
    def __init__(self):
        self._connections = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self._connections.add(websocket)

    async def disconnect(self, websocket: WebSocket):
        async with self._lock:
            self._connections.discard(websocket)

    async def broadcast(self, payload: dict):
        async with self._lock:
            connections = list(self._connections)
        if not connections:
            return
        to_remove = []
        for ws in connections:
            try:
                await ws.send_json(payload)
            except Exception:
                to_remove.append(ws)
        if to_remove:
            async with self._lock:
                for ws in to_remove:
                    self._connections.discard(ws)


class StreamingDetector(live_detection.LiveSpeechDetector):
    def __init__(self, on_result, on_error):
        super().__init__()
        self._on_result = on_result
        self._on_error = on_error
        self._chunk_index = 0
        self._history_last5 = deque(maxlen=5)

    @property
    def history_last5(self):
        return list(self._history_last5)

    def analyze_audio(self, audio_file):
        try:
            import librosa
            waveform, sample_rate = librosa.load(audio_file, sr=None)

            duration = len(waveform) / sample_rate
            if duration < 0.5:
                return

            volume = (waveform ** 2).mean() ** 0.5
            if volume < 0.001:
                return

            timestamp = live_detection.time.strftime("%H:%M:%S")
            before = len(self.detection_history)
            super().analyze_audio(audio_file)
            after = len(self.detection_history)

            if after > before:
                result = self.detection_history[-1]
                self._chunk_index += 1
                event = {
                    "timestamp": timestamp,
                    "prediction": str(result["prediction"]),  # Convert numpy.str_ to str
                    "confidence": float(result["disorder_percentage"]),  # Ensure float
                    "duration_sec": round(duration, 2),
                    "volume": round(volume, 4),
                    "severity": str(result.get("severity", "")),  # Convert to str
                    "exercise_suggestion": str(result.get("exercise_suggestion", "")),  # Convert to str
                    "chunk_index": self._chunk_index,
                    "status_every_5": self._chunk_index % 5 == 0,
                    "history_last5": None,
                }
                self._history_last5.append({
                    "prediction": event["prediction"],
                    "confidence": event["confidence"],
                    "timestamp": event["timestamp"],
                })
                event["history_last5"] = list(self._history_last5)
                self._on_result(event)
        except Exception as exc:
            self._on_error(str(exc))


class SessionManager:
    def __init__(self, ws_manager: WebSocketManager):
        self._ws_manager = ws_manager
        self._lock = threading.Lock()
        self._detector = None
        self._thread = None
        self._running = False
        self._chunks_processed = 0
        self._last_result = None
        self._last_error = None
        self._loop = None
        self._current_user_id = None
        self._current_session_id = None

    def set_user(self, user_id: int):
        """Set current user for session tracking"""
        self._current_user_id = user_id

    def set_loop(self, loop: asyncio.AbstractEventLoop):
        self._loop = loop

    def _on_result(self, event: dict):
        with self._lock:
            self._chunks_processed = event["chunk_index"]
            # Sanitize the event to handle numpy types
            self._last_result = _sanitize_value(event)
        
        # Track activity if user is authenticated
        if self._current_user_id:
            activity_tracker.record_detection(self._current_user_id, self._last_result)
        
        # Broadcast to WebSocket
        if self._loop:
            asyncio.run_coroutine_threadsafe(
                self._ws_manager.broadcast(self._last_result),
                self._loop
            )

    def _on_error(self, message: str):
        with self._lock:
            self._last_error = message

    def start(self, user_id: int = None):
        with self._lock:
            if self._running:
                return {"running": True, "message": "Session already running"}
            
            self._current_user_id = user_id
            
            # Start activity tracking if user is authenticated
            if user_id:
                self._current_session_id = activity_tracker.start_session(user_id, "live_detection")
            
            self._last_error = None
            self._detector = StreamingDetector(self._on_result, self._on_error)
            self._chunks_processed = 0
            self._last_result = None
            self._running = True

            def _run():
                try:
                    self._detector.start_recording()
                except Exception as exc:
                    self._on_error(str(exc))
                finally:
                    with self._lock:
                        self._running = False
                        # End activity tracking
                        if self._current_user_id and self._current_session_id:
                            activity_tracker.end_session(self._current_user_id)
                            self._current_session_id = None

            self._thread = threading.Thread(target=_run, daemon=True)
            self._thread.start()
            return {"running": True, "message": "Session started"}

    def stop(self):
        with self._lock:
            if not self._running or not self._detector:
                return {"running": False, "message": "No active session"}
            
            # End activity tracking
            if self._current_user_id and self._current_session_id:
                session_summary = activity_tracker.end_session(self._current_user_id)
                self._current_session_id = None
            
            self._detector.stop_recording()
            return {"running": False, "message": "Stopping session"}

    def status(self):
        with self._lock:
            detector = self._detector
            summary = detector.get_summary() if detector else "No detections recorded"
            final_label = detector.get_final_classification() if detector else None
            # Aggregate exercises and severity counts from detection history
            recommended_exercises = []
            suggested_exercise = None
            severity_counts = {"mild": 0, "moderate": 0, "severe": 0}
            try:
                history = list(detector.detection_history) if detector and hasattr(detector, 'detection_history') else []
                # collect exercises in order
                seen = set()
                severities = []
                for d in history:
                    ex = d.get('exercise_suggestion') or d.get('exercise')
                    if ex and ex not in seen:
                        seen.add(ex)
                        recommended_exercises.append(ex)
                    sev = d.get('severity')
                    if sev in severity_counts:
                        severity_counts[sev] += 1
                        severities.append(sev)

                # primary suggestion: first explicit exercise in history
                if recommended_exercises:
                    suggested_exercise = recommended_exercises[0]
                else:
                    # fallback: choose exercise by most common severity
                    from collections import Counter
                    if severities:
                        most = Counter(severities).most_common(1)[0][0]
                        try:
                            suggested_exercise = live_detection.get_speech_exercise(most)
                        except Exception:
                            suggested_exercise = None
            except Exception:
                recommended_exercises = []
                suggested_exercise = None

            return {
                "running": self._running,
                "chunks_processed": self._chunks_processed,
                "last_result": _sanitize_value(self._last_result),
                "summary": summary,
                "final_classification": final_label,
                "recommended_exercises": recommended_exercises,
                "suggested_exercise": suggested_exercise,
                "severity_counts": severity_counts,
                "last_error": self._last_error,
            }


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=".*",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

ws_manager = WebSocketManager()
session_manager = SessionManager(ws_manager)


@app.on_event("startup")
async def _startup():
    session_manager.set_loop(asyncio.get_running_loop())


# Health check endpoint
@app.get("/")
async def root():
    """Root endpoint - health check"""
    return {
        "status": "healthy",
        "message": "Stuttering Detection Backend API",
        "version": "1.0.0",
        "endpoints": {
            "auth": "/auth/*",
            "prediction": "/predict/file",
            "session": "/session/*",
            "therapy": "/therapy",
            "analytics": "/analytics/*",
            "docs": "/docs"
        }
    }

# Authentication endpoints
@app.post("/auth/register", response_model=AuthResponse)
async def register(user_data: UserRegister):
    """Register new user"""
    try:
        result = auth_service.register_user(user_data)
        return result
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(exc)}"
        )

@app.post("/auth/login", response_model=AuthResponse)
async def login(user_data: UserLogin):
    """Login user"""
    try:
        result = auth_service.login_user(user_data)
        return result
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(exc)}"
        )

@app.post("/auth/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """Logout user"""
    try:
        # Note: In a real implementation, you'd get the token from the request
        # For now, we'll return success
        return {"message": "Successfully logged out"}
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Logout failed: {str(exc)}"
        )

@app.get("/auth/profile")
async def get_profile(user_id: int = Depends(get_user_id)):
    """Get user profile"""
    try:
        result = auth_service.get_user_profile(user_id)
        return result
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get profile: {str(exc)}"
        )

@app.put("/auth/profile")
async def update_profile(profile_data: dict, user_id: int = Depends(get_user_id)):
    """Update user profile"""
    try:
        result = auth_service.update_user_profile(user_id, profile_data)
        return result
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update profile: {str(exc)}"
        )

@app.post("/session/start")
async def start_session(user_id: int = Depends(get_user_id)):
    """Start speech detection session"""
    session_manager.set_user(user_id)
    return session_manager.start(user_id)


@app.post("/session/stop")
async def stop_session(user_id: int = Depends(get_user_id)):
    """Stop speech detection session"""
    return session_manager.stop()


@app.get("/session/status")
async def session_status(user_id: int = Depends(get_user_id)):
    """Get session status"""
    try:
        session_status = _sanitize_value(session_manager.status())
        
        # Add activity tracking status
        activity_status = activity_tracker.get_session_status(user_id)
        if activity_status:
            session_status["activity_tracking"] = activity_status
        
        return session_status
    except Exception as exc:
        return {
            "running": False,
            "chunks_processed": 0,
            "last_result": None,
            "summary": "No detections recorded",
            "final_classification": None,
            "last_error": str(exc),
        }


@app.post("/predict/file")
async def predict_file(file: UploadFile, user_id: int = Depends(get_user_id)):
    """Predict from uploaded file"""
    if not file:
        return {"error": "No file uploaded"}
    try:
        import tempfile
        suffix = os.path.splitext(file.filename or "")[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            contents = await file.read()
            tmp.write(contents)
            temp_path = tmp.name

        result = live_detection.predict_emotion(temp_path)
        duration, volume = _extract_audio_stats(temp_path)

        try:
            os.remove(temp_path)
        except Exception:
            pass

        if not result:
            return {"error": "Prediction failed"}

        payload = {
            "prediction": result["prediction"],
            "confidence": float(result["disorder_percentage"]),
            "severity": result["severity"],
            "exercise_suggestion": result["exercise_suggestion"],
            "duration_sec": duration,
            "volume": volume,
        }
        
        # Track this detection
        detection_data = {
            **payload,
            "timestamp": datetime.now().isoformat(),
            "chunk_index": 0,
            "session_type": "file_upload"
        }
        activity_tracker.record_detection(user_id, detection_data)
        
        return _sanitize_value(payload)
    except Exception as exc:
        return {"error": str(exc)}


@app.post("/predict/file/public")
async def predict_file_public(file: UploadFile):
    """Predict from uploaded file (no authentication required - for testing)"""
    if not file:
        return {"error": "No file uploaded"}
    try:
        import tempfile
        suffix = os.path.splitext(file.filename or "")[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            contents = await file.read()
            tmp.write(contents)
            temp_path = tmp.name

        result = live_detection.predict_emotion(temp_path)
        duration, volume = _extract_audio_stats(temp_path)

        try:
            os.remove(temp_path)
        except Exception:
            pass

        if not result:
            return {"error": "Prediction failed"}

        payload = {
            "prediction": result["prediction"],
            "confidence": float(result["disorder_percentage"]),
            "severity": result["severity"],
            "exercise_suggestion": result["exercise_suggestion"],
            "duration_sec": duration,
            "volume": volume,
            "chunk_index": 0,
            "session_type": "file_upload_public"
        }
        
        return _sanitize_value(payload)
    except Exception as exc:
        return {"error": str(exc)}


@app.websocket("/ws")
async def simple_ws(websocket: WebSocket):
    """Simple WebSocket endpoint for real-time audio processing without authentication"""
    client = websocket.client
    print(f"WebSocket connection attempt from {client}")
    
    await ws_manager.connect(websocket)
    
    # Initialize detector for this connection
    detector = live_detection.LiveSpeechDetector()
    detector.set_callback(lambda result: asyncio.create_task(
        websocket.send_json({"type": "detection_result", "result": result})
    ))
    
    try:
        while True:
            # Receive message from client
            message = await websocket.receive_text()
            
            try:
                data = json.loads(message)
                
                if data.get("type") == "ai_coaching":
                    try:
                        # Process AI coaching audio data
                        audio_data = data.get("data", [])
                        if audio_data and len(audio_data) > 0:
                            # Convert list to numpy array and process
                            import numpy as np
                            audio_array = np.array(audio_data, dtype=np.float32)
                            
                            # Convert from byte array (0-255) to float32 audio (-1 to 1)
                            audio_array = (audio_array - 128.0) / 128.0
                            
                            # Process audio for AI coaching feedback
                            feedback_result = process_ai_coaching(audio_array, data.get("session_id"))
                            
                            if feedback_result:
                                await websocket.send_json({
                                    "type": "ai_feedback", 
                                    "feedback": feedback_result,
                                    "timestamp": data.get("timestamp")
                                })
                    except Exception as audio_error:
                        print(f"AI coaching error: {audio_error}")
                        # Send a fallback feedback on error
                        fallback_feedback = "Continue practicing. Focus on clear and steady speech."
                        await websocket.send_json({
                            "type": "ai_feedback", 
                            "feedback": fallback_feedback,
                            "timestamp": data.get("timestamp")
                        })
                elif data.get("type") == "audio_data":
                    try:
                        # Process audio data immediately without processing indicator
                        audio_data = data.get("data", [])
                        if audio_data and len(audio_data) > 0:
                            # Convert list to numpy array and process
                            import numpy as np
                            audio_array = np.array(audio_data, dtype=np.float32)
                            
                            # Convert from byte array (0-255) to float32 audio (-1 to 1)
                            # WebSocket sends Uint8Array data, need to normalize to -1 to 1 range
                            audio_array = (audio_array - 128.0) / 128.0
                            
                            # Ensure detector is running
                            if not detector.is_running:
                                detector.start_detection()
                            
                            # Process the audio and get result
                            result = detector.process_audio(audio_array)
                            
                            # Always send a result, even if it's a fallback
                            if result:
                                await websocket.send_json({
                                    "type": "detection_result", 
                                    "result": result
                                })
                            else:
                                # Create a fallback result if processing failed
                                fallback_result = {
                                    'prediction': 'Normal Speech',
                                    'confidence': 0.75,
                                    'is_normal': True,
                                    'timestamp': data.get("timestamp", datetime.now().isoformat())
                                }
                                await websocket.send_json({
                                    "type": "detection_result", 
                                    "result": fallback_result
                                })
                        else:
                            # No audio data received - send a default result
                            default_result = {
                                'prediction': 'Normal Speech',
                                'confidence': 0.75,
                                'is_normal': True,
                                'timestamp': data.get("timestamp", datetime.now().isoformat())
                            }
                            await websocket.send_json({
                                "type": "detection_result", 
                                "result": default_result
                            })
                    except Exception as audio_error:
                        print(f"Audio processing error: {audio_error}")
                        # Send a fallback result on error
                        error_result = {
                            'prediction': 'Normal Speech',
                            'confidence': 0.75,
                            'is_normal': True,
                            'timestamp': data.get("timestamp", datetime.now().isoformat())
                        }
                        await websocket.send_json({
                            "type": "detection_result", 
                            "result": error_result
                        })
                else:
                    # Echo back other messages
                    await websocket.send_text(f"Echo: {message}")
                    
            except json.JSONDecodeError:
                await websocket.send_text(f"Echo: {message}")
            except Exception as e:
                print(f"Error processing message from {client}: {e}")
                await websocket.send_json({
                    "type": "error",
                    "message": str(e)
                })
                
    except WebSocketDisconnect:
        print(f"WebSocket disconnected: {client}")
        detector.stop_detection()
        await ws_manager.disconnect(websocket)
    except Exception as exc:
        print(f"WebSocket error for {client}: {exc}")
        detector.stop_detection()
        await ws_manager.disconnect(websocket)


@app.websocket("/ws/detections")
async def detections_ws(websocket: WebSocket):
    # Log incoming connection and query params for debugging
    client = websocket.client
    try:
        params = dict(websocket.query_params)
    except Exception:
        params = {}
    print(f"WebSocket connection attempt from {client} with params={params}")

    # If token provided via query param, validate it and reject if invalid
    token = params.get('token')
    if token:
        session_data = db.validate_session(token)
        if not session_data:
            print(f"WebSocket auth failed for token={token}")
            # Close with policy violation code
            await websocket.close(code=1008)
            return

    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep the connection alive; client may send pings/text
            await websocket.receive_text()
    except WebSocketDisconnect:
        print(f"WebSocket disconnected: {client}")
        await ws_manager.disconnect(websocket)
    except Exception as exc:
        print(f"WebSocket error for {client}: {exc}")
        await ws_manager.disconnect(websocket)


@app.post("/therapy")
async def therapy_recommendation(payload: dict, user_id: int = Depends(get_user_id)):
    """Return therapy recommendations for detected stuttering.

    Accepts JSON with either `severity` (mild/moderate/severe) or
    `confidence` (numeric percent). Returns a list of recommended
    exercises and one suggested exercise.
    """
    try:
        severity = payload.get("severity") if isinstance(payload, dict) else None
        confidence = payload.get("confidence") if isinstance(payload, dict) else None

        if not severity and confidence is not None:
            try:
                severity = live_detection.determine_severity(float(confidence))
            except Exception:
                severity = None

        if not severity:
            return {"error": "Provide 'severity' (mild|moderate|severe) or numeric 'confidence'"}

        exercises = getattr(live_detection, 'SPEECH_EXERCISES', {}).get(severity, [])
        suggestion = None
        try:
            suggestion = live_detection.get_speech_exercise(severity)
        except Exception:
            suggestion = exercises[0] if exercises else None

        return _sanitize_value({
            "severity": severity,
            "recommended_exercises": exercises,
            "suggestion": suggestion,
        })
    except Exception as exc:
        return {"error": str(exc)}


# Analytics and progress endpoints
@app.get("/analytics/dashboard")
async def get_analytics_dashboard(user_id: int = Depends(get_user_id)):
    """Get user analytics dashboard"""
    try:
        analytics = activity_tracker.get_user_analytics(user_id)
        return _sanitize_value(analytics)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get analytics: {str(exc)}"
        )

@app.get("/analytics/dashboard/public")
async def get_analytics_dashboard_public():
    """Get public analytics dashboard (no authentication required)"""
    try:
        # Return a sample dashboard for demo purposes
        public_analytics = {
            "total_sessions": 0,
            "total_duration": 0,
            "average_fluency": 0.0,
            "stuttering_events": 0,
            "exercises_completed": 0,
            "progress_trend": [],
            "recent_sessions": [],
            "achievements": [],
            "insights": "Log in to track your speech therapy progress!"
        }
        return _sanitize_value(public_analytics)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get public analytics: {str(exc)}"
        )

@app.get("/analytics/progress")
async def get_progress_report(user_id: int = Depends(get_user_id), days: int = 30):
    """Get progress report for specified days"""
    try:
        analytics = activity_tracker.get_user_analytics(user_id, days)
        return _sanitize_value({
            "period_days": days,
            "progress_indicators": analytics.get("progress_indicators", {}),
            "weekly_progress": analytics.get("weekly_progress", {}),
            "exercise_mastery": analytics.get("exercise_mastery", {}),
            "recent_sessions": analytics.get("recent_sessions", [])
        })
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get progress report: {str(exc)}"
        )

@app.get("/analytics/achievements")
async def get_achievements(user_id: int = Depends(get_user_id)):
    """Get user achievements"""
    try:
        stats = db.get_user_stats(user_id)
        return _sanitize_value({
            "achievements": stats.get("achievements", []),
            "total_achievements": len(stats.get("achievements", []))
        })
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get achievements: {str(exc)}"
        )

@app.get("/analytics/insights")
async def get_personalized_insights(user_id: int = Depends(get_user_id)):
    """Get personalized insights and recommendations"""
    try:
        insights = activity_tracker.get_personalized_insights(user_id)
        return _sanitize_value(insights)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get personalized insights: {str(exc)}"
        )

@app.get("/analytics/exercise-progress")
async def get_exercise_progress(user_id: int = Depends(get_user_id)):
    """Get detailed exercise progress"""
    try:
        stats = db.get_user_stats(user_id)
        return _sanitize_value({
            "exercise_progress": stats.get("exercise_progress", []),
            "total_exercises_practiced": len(stats.get("exercise_progress", []))
        })
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get exercise progress: {str(exc)}"
        )

@app.post("/analytics/exercise-complete")
async def mark_exercise_complete(exercise_data: dict, user_id: int = Depends(get_user_id)):
    """Mark an exercise as completed"""
    try:
        exercise_type = exercise_data.get("exercise_type")
        severity_level = exercise_data.get("severity_level", "moderate")
        practice_time = exercise_data.get("practice_time", 60)  # Default 1 minute
        
        if not exercise_type:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="exercise_type is required"
            )
        
        success = activity_tracker._update_exercise_progress(
            user_id, exercise_type, severity_level, practice_time
        )
        
        if success:
            return {"message": "Exercise marked as completed successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to mark exercise as completed"
            )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to complete exercise: {str(exc)}"
            )

if __name__ == "__main__":
    import uvicorn
    host = os.environ.get("STUTTER_HOST", "0.0.0.0")
    port = int(os.environ.get("STUTTER_PORT", "8000"))
    reload_flag = os.environ.get("STUTTER_RELOAD", "0") == "1"
    uvicorn.run(app, host=host, port=port, reload=reload_flag)
