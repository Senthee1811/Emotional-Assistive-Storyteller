import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(__file__))

try:
    print("Testing imports...")
    
    # Test basic imports
    import asyncio
    import json
    from datetime import datetime
    print("✅ Basic imports OK")
    
    # Test FastAPI imports
    from fastapi import FastAPI, WebSocket
    from fastapi.middleware.cors import CORSMiddleware
    print("✅ FastAPI imports OK")
    
    # Test live_detection import
    import live_detection
    print("✅ Live detection import OK")
    
    # Test database import
    from database import db
    print("✅ Database import OK")
    
    # Test auth import
    from auth import auth_service
    print("✅ Auth import OK")
    
    print("🎉 All imports successful!")
    
except Exception as e:
    print(f"❌ Import error: {e}")
    import traceback
    traceback.print_exc()
