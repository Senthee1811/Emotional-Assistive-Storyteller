import joblib
from features import get_features
import numpy as np
import random
import pyaudio
import wave
import threading
import time
import os

# Test the live detection system with existing audio files
def test_live_detection():
    """Test live detection system with existing audio files"""
    print("🧪 Testing Live Detection System...")
    print("=" * 50)
    
    # Test with a few existing audio files
    test_files = ["01-03.wav", "02-26.wav"]
    
    for audio_file in test_files:
        if os.path.exists(audio_file):
            print(f"\n🎵 Testing with {audio_file}:")
            print("-" * 30)
            
            try:
                # Import the prediction function from live_detection
                import sys
                sys.path.append('.')
                from live_detection import predict_emotion
                
                result = predict_emotion(audio_file)
                
                print(f"🎯 Prediction: {result['prediction']}")
                print(f"📊 Confidence: {result['disorder_percentage']}%")
                
                if result['severity']:
                    print(f"⚠️  Severity: {result['severity']}")
                    print(f"💡 Exercise: {result['exercise_suggestion']}")
                else:
                    print(f"✅ Normal speech detected")
                    
            except Exception as e:
                print(f"❌ Error: {e}")
        else:
            print(f"⚠️  File {audio_file} not found")
    
    print("\n" + "=" * 50)
    print("✅ Live Detection System Test Complete!")
    print("\n📋 To start live microphone detection:")
    print("   python live_detection.py")

if __name__ == "__main__":
    test_live_detection()
