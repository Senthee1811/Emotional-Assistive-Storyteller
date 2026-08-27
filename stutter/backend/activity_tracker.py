import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from database import db
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ActivityTracker:
    def __init__(self):
        self.db = db
    
    def track_user_activity(self, user_id: int, activity_type: str, activity_data: Dict = None):
        """Track user activity"""
        try:
            self.db.track_activity(user_id, activity_type, activity_data)
            logger.info(f"Tracked activity: {activity_type} for user {user_id}")
        except Exception as e:
            logger.error(f"Error tracking activity: {str(e)}")
    
    def track_session_start(self, user_id: int, session_type: str) -> int:
        """Track session start"""
        try:
            session_id = self.db.create_session(user_id, session_type)
            self.track_user_activity(user_id, "session_start", {
                "session_id": session_id,
                "session_type": session_type
            })
            return session_id
        except Exception as e:
            logger.error(f"Error tracking session start: {str(e)}")
            return -1
    
    def track_session_end(self, session_id: int, user_id: int):
        """Track session end"""
        try:
            self.db.end_session(session_id)
            self.track_user_activity(user_id, "session_end", {
                "session_id": session_id
            })
        except Exception as e:
            logger.error(f"Error tracking session end: {str(e)}")
    
    def track_detection(self, user_id: int, session_id: int, prediction: str, confidence: float, is_normal: bool):
        """Track speech detection"""
        try:
            detection_id = self.db.create_detection(
                session_id, user_id, prediction, confidence, is_normal
            )
            self.track_user_activity(user_id, "speech_detection", {
                "detection_id": detection_id,
                "session_id": session_id,
                "prediction": prediction,
                "confidence": confidence,
                "is_normal": is_normal
            })
            return detection_id
        except Exception as e:
            logger.error(f"Error tracking detection: {str(e)}")
            return -1
    
    def track_exercise_completion(self, user_id: int, exercise_type: str, improvement_score: float = None):
        """Track exercise completion"""
        try:
            progress_id = self.db.update_exercise_progress(user_id, exercise_type, improvement_score)
            self.track_user_activity(user_id, "exercise_completion", {
                "exercise_type": exercise_type,
                "progress_id": progress_id,
                "improvement_score": improvement_score
            })
            return progress_id
        except Exception as e:
            logger.error(f"Error tracking exercise completion: {str(e)}")
            return -1
    
    def track_achievement(self, user_id: int, achievement_name: str, achievement_type: str, description: str = None):
        """Track achievement"""
        try:
            achievement_id = self.db.create_achievement(user_id, achievement_name, achievement_type, description)
            self.track_user_activity(user_id, "achievement_earned", {
                "achievement_id": achievement_id,
                "achievement_name": achievement_name,
                "achievement_type": achievement_type
            })
            return achievement_id
        except Exception as e:
            logger.error(f"Error tracking achievement: {str(e)}")
            return -1
    
    def get_user_activity_summary(self, user_id: int, days: int = 30) -> Dict:
        """Get user activity summary for the last N days"""
        try:
            activities = self.db.get_user_activities(user_id, limit=1000)
            
            # Filter activities by date range
            cutoff_date = datetime.now() - timedelta(days=days)
            recent_activities = [
                activity for activity in activities
                if datetime.fromisoformat(activity['timestamp']) >= cutoff_date
            ]
            
            # Count activity types
            activity_counts = {}
            for activity in recent_activities:
                activity_type = activity['activity_type']
                activity_counts[activity_type] = activity_counts.get(activity_type, 0) + 1
            
            # Get session statistics
            sessions = self.db.get_user_sessions(user_id, limit=100)
            recent_sessions = [
                session for session in sessions
                if datetime.fromisoformat(session['start_time']) >= cutoff_date
            ]
            
            total_sessions = len(recent_sessions)
            total_duration = sum(
                session.get('duration', 0) for session in recent_sessions
                if session.get('duration')
            )
            
            # Get detection statistics
            detections = self.db.get_user_detections(user_id, limit=1000)
            recent_detections = [
                detection for detection in detections
                if datetime.fromisoformat(detection['timestamp']) >= cutoff_date
            ]
            
            total_detections = len(recent_detections)
            normal_detections = sum(
                1 for detection in recent_detections
                if detection.get('is_normal')
            )
            
            normal_percentage = (normal_detections / total_detections * 100) if total_detections > 0 else 0
            
            return {
                "period_days": days,
                "total_activities": len(recent_activities),
                "activity_counts": activity_counts,
                "total_sessions": total_sessions,
                "total_duration_minutes": total_duration,
                "average_session_duration": total_duration / total_sessions if total_sessions > 0 else 0,
                "total_detections": total_detections,
                "normal_detections": normal_detections,
                "normal_percentage": round(normal_percentage, 2),
                "most_recent_activity": recent_activities[0] if recent_activities else None
            }
            
        except Exception as e:
            logger.error(f"Error getting activity summary: {str(e)}")
            return {
                "error": str(e),
                "period_days": days,
                "total_activities": 0,
                "activity_counts": {},
                "total_sessions": 0,
                "total_duration_minutes": 0,
                "average_session_duration": 0,
                "total_detections": 0,
                "normal_detections": 0,
                "normal_percentage": 0,
                "most_recent_activity": None
            }
    
    def get_user_streak(self, user_id: int) -> Dict:
        """Get user activity streak information"""
        try:
            activities = self.db.get_user_activities(user_id, limit=1000)
            
            if not activities:
                return {
                    "current_streak": 0,
                    "longest_streak": 0,
                    "last_activity_date": None
                }
            
            # Group activities by date
            activity_dates = set()
            for activity in activities:
                activity_date = datetime.fromisoformat(activity['timestamp']).date()
                activity_dates.add(activity_date)
            
            # Sort dates
            sorted_dates = sorted(activity_dates, reverse=True)
            
            # Calculate current streak
            current_streak = 0
            today = datetime.now().date()
            
            for i, date in enumerate(sorted_dates):
                expected_date = today - timedelta(days=i)
                if date == expected_date:
                    current_streak += 1
                else:
                    break
            
            # Calculate longest streak
            longest_streak = 0
            temp_streak = 1
            
            for i in range(1, len(sorted_dates)):
                if sorted_dates[i-1] - sorted_dates[i] == timedelta(days=1):
                    temp_streak += 1
                else:
                    longest_streak = max(longest_streak, temp_streak)
                    temp_streak = 1
            
            longest_streak = max(longest_streak, temp_streak)
            
            return {
                "current_streak": current_streak,
                "longest_streak": longest_streak,
                "last_activity_date": sorted_dates[0].isoformat() if sorted_dates else None,
                "total_active_days": len(sorted_dates)
            }
            
        except Exception as e:
            logger.error(f"Error calculating user streak: {str(e)}")
            return {
                "current_streak": 0,
                "longest_streak": 0,
                "last_activity_date": None,
                "error": str(e)
            }

# Create global instance
activity_tracker = ActivityTracker()
