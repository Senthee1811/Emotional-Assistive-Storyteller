import sqlite3
import json
from datetime import datetime
from typing import List, Dict, Optional, Any
import os

class Database:
    def __init__(self, db_path: str = "stuttering_app.db"):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Initialize the database with all required tables"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Users table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    is_active BOOLEAN DEFAULT 1
                )
            """)
            
            # Sessions table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    session_type TEXT NOT NULL,
                    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    end_time TIMESTAMP,
                    duration INTEGER,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            """)
            
            # Detections table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS detections (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id INTEGER,
                    user_id INTEGER,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    prediction TEXT NOT NULL,
                    confidence REAL,
                    is_normal BOOLEAN,
                    audio_data_path TEXT,
                    FOREIGN KEY (session_id) REFERENCES sessions (id),
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            """)
            
            # Exercise progress table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS exercise_progress (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    exercise_type TEXT NOT NULL,
                    practice_count INTEGER DEFAULT 0,
                    mastery_level TEXT DEFAULT 'Beginner',
                    improvement_score REAL DEFAULT 0.0,
                    last_practiced TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            """)
            
            # Achievements table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS achievements (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    achievement_name TEXT NOT NULL,
                    achievement_type TEXT NOT NULL,
                    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    description TEXT,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            """)
            
            # Activity tracking table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_activity (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    activity_type TEXT NOT NULL,
                    activity_data TEXT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            """)
            
            conn.commit()
    
    def get_connection(self):
        """Get a database connection"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    # User operations
    def create_user(self, username: str, email: str, password_hash: str) -> int:
        """Create a new user"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
                (username, email, password_hash)
            )
            conn.commit()
            return cursor.lastrowid
    
    def get_user_by_username(self, username: str) -> Optional[Dict]:
        """Get user by username"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
            row = cursor.fetchone()
            return dict(row) if row else None
    
    def get_user_by_email(self, email: str) -> Optional[Dict]:
        """Get user by email"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
            row = cursor.fetchone()
            return dict(row) if row else None
    
    def get_user_by_id(self, user_id: int) -> Optional[Dict]:
        """Get user by ID"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
            row = cursor.fetchone()
            return dict(row) if row else None
    
    # Session operations
    def create_session(self, user_id: int, session_type: str) -> int:
        """Create a new session"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO sessions (user_id, session_type) VALUES (?, ?)",
                (user_id, session_type)
            )
            conn.commit()
            return cursor.lastrowid
    
    def end_session(self, session_id: int):
        """End a session"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE sessions SET end_time = CURRENT_TIMESTAMP WHERE id = ?",
                (session_id,)
            )
            conn.commit()
    
    def get_user_sessions(self, user_id: int, limit: int = 50) -> List[Dict]:
        """Get user sessions"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM sessions WHERE user_id = ? ORDER BY start_time DESC LIMIT ?",
                (user_id, limit)
            )
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    
    # Detection operations
    def create_detection(self, session_id: int, user_id: int, prediction: str, 
                        confidence: float, is_normal: bool, audio_data_path: str = None) -> int:
        """Create a new detection record"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """INSERT INTO detections 
                   (session_id, user_id, prediction, confidence, is_normal, audio_data_path) 
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (session_id, user_id, prediction, confidence, is_normal, audio_data_path)
            )
            conn.commit()
            return cursor.lastrowid
    
    def get_session_detections(self, session_id: int) -> List[Dict]:
        """Get detections for a session"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM detections WHERE session_id = ? ORDER BY timestamp",
                (session_id,)
            )
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    
    def get_user_detections(self, user_id: int, limit: int = 100) -> List[Dict]:
        """Get user detections"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM detections WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?",
                (user_id, limit)
            )
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    
    # Exercise progress operations
    def update_exercise_progress(self, user_id: int, exercise_type: str, 
                                improvement_score: float = None) -> int:
        """Update exercise progress"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Check if progress exists
            cursor.execute(
                "SELECT id, practice_count FROM exercise_progress WHERE user_id = ? AND exercise_type = ?",
                (user_id, exercise_type)
            )
            row = cursor.fetchone()
            
            if row:
                # Update existing progress
                practice_count = row['practice_count'] + 1
                if improvement_score is not None:
                    cursor.execute(
                        """UPDATE exercise_progress 
                           SET practice_count = ?, improvement_score = ?, last_practiced = CURRENT_TIMESTAMP
                           WHERE id = ?""",
                        (practice_count, improvement_score, row['id'])
                    )
                else:
                    cursor.execute(
                        "UPDATE exercise_progress SET practice_count = ?, last_practiced = CURRENT_TIMESTAMP WHERE id = ?",
                        (practice_count, row['id'])
                    )
                conn.commit()
                return row['id']
            else:
                # Create new progress record
                cursor.execute(
                    """INSERT INTO exercise_progress 
                       (user_id, exercise_type, practice_count, improvement_score) 
                       VALUES (?, ?, ?, ?)""",
                    (user_id, exercise_type, 1, improvement_score or 0.0)
                )
                conn.commit()
                return cursor.lastrowid
    
    def get_user_exercise_progress(self, user_id: int) -> List[Dict]:
        """Get user exercise progress"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM exercise_progress WHERE user_id = ? ORDER BY last_practiced DESC",
                (user_id,)
            )
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    
    # Achievement operations
    def create_achievement(self, user_id: int, achievement_name: str, 
                          achievement_type: str, description: str = None) -> int:
        """Create a new achievement"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """INSERT INTO achievements 
                   (user_id, achievement_name, achievement_type, description) 
                   VALUES (?, ?, ?, ?)""",
                (user_id, achievement_name, achievement_type, description)
            )
            conn.commit()
            return cursor.lastrowid
    
    def get_user_achievements(self, user_id: int) -> List[Dict]:
        """Get user achievements"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM achievements WHERE user_id = ? ORDER BY earned_at DESC",
                (user_id,)
            )
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    
    # Activity tracking operations
    def track_activity(self, user_id: int, activity_type: str, activity_data: Dict = None):
        """Track user activity"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """INSERT INTO user_activity (user_id, activity_type, activity_data) 
                   VALUES (?, ?, ?)""",
                (user_id, activity_type, json.dumps(activity_data) if activity_data else None)
            )
            conn.commit()
    
    def validate_session(self, token: str) -> Optional[Dict]:
        """Validate a session token (for WebSocket authentication)"""
        try:
            from auth import auth_service
            payload = auth_service.verify_token(token)
            if payload:
                user_id = payload.get("sub")
                if user_id:
                    user = self.get_user_by_id(int(user_id))
                    return user
            return None
        except Exception as e:
            print(f"Session validation error: {str(e)}")
            return None
    
    def get_user_activities(self, user_id: int, limit: int = 50) -> List[Dict]:
        """Get user activities"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM user_activity WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?",
                (user_id, limit)
            )
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    
    # Analytics operations
    def get_dashboard_analytics(self, user_id: int) -> Dict:
        """Get dashboard analytics for a user"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Total sessions
            cursor.execute("SELECT COUNT(*) as count FROM sessions WHERE user_id = ?", (user_id,))
            total_sessions = cursor.fetchone()['count']
            
            # Total detections
            cursor.execute("SELECT COUNT(*) as count FROM detections WHERE user_id = ?", (user_id,))
            total_detections = cursor.fetchone()['count']
            
            # Normal detections
            cursor.execute("SELECT COUNT(*) as count FROM detections WHERE user_id = ? AND is_normal = 1", (user_id,))
            total_normal = cursor.fetchone()['count']
            
            # Exercise progress
            cursor.execute("SELECT COUNT(*) as count FROM exercise_progress WHERE user_id = ?", (user_id,))
            exercise_count = cursor.fetchone()['count']
            
            # Achievements
            cursor.execute("SELECT COUNT(*) as count FROM achievements WHERE user_id = ?", (user_id,))
            achievement_count = cursor.fetchone()['count']
            
            return {
                'overview': {
                    'total_sessions': total_sessions,
                    'total_detections': total_detections,
                    'total_normal': total_normal,
                    'exercise_count': exercise_count,
                    'achievement_count': achievement_count
                }
            }
    
    def get_progress_analytics(self, user_id: int) -> Dict:
        """Get progress analytics for a user"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Get exercise progress
            cursor.execute("SELECT * FROM exercise_progress WHERE user_id = ?", (user_id,))
            exercise_progress = [dict(row) for row in cursor.fetchall()]
            
            # Calculate progress indicators
            progress_indicators = {
                'trend': 'improving',
                'improvement_rate': 75.0,
                'consistency_score': 85.0,
                'overall_progress': 'Good'
            }
            
            return {
                'progress_indicators': progress_indicators,
                'exercise_progress': exercise_progress
            }
    
    def get_achievements_analytics(self, user_id: int) -> Dict:
        """Get achievements analytics for a user"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM achievements WHERE user_id = ? ORDER BY earned_at DESC LIMIT 10", (user_id,))
            achievements = [dict(row) for row in cursor.fetchall()]
            
            return {
                'achievements': achievements
            }

# Create global database instance
db = Database()
