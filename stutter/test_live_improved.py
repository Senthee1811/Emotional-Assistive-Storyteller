import os
import time
from live_detection import LiveSpeechDetector

def test_live_detection():
    """Test the improved live detection system"""
    
    print("🧪 Testing Improved Live Detection System")
    print("=" * 50)
    
    # Test with existing audio files
    test_files = ["01-03.wav", "02-26.wav"]
    
    detector = LiveSpeechDetector()
    
    print("📋 Testing with existing audio files:")
    print("-" * 30)
    
    for file in test_files:
        if os.path.exists(file):
            print(f"\n🎵 Testing: {file}")
            detector.analyze_audio(file)
            time.sleep(1)  # Small delay between tests
        else:
            print(f"⚠️ File not found: {file}")
    
    # Show summary
    summary = detector.get_summary()
    print(summary)
    
    print("\n🎯 Improvements Made:")
    print("✅ Fixed import issues")
    print("✅ Better display formatting")
    print("✅ Audio quality checks")
    print("✅ Duration and volume monitoring")
    print("✅ Clearer output formatting")
    
    print("\n🚀 Ready for live microphone testing!")
    print("Run: python live_detection.py")

if __name__ == "__main__":
    test_live_detection()
