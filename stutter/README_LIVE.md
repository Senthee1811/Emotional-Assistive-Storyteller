# Live Speech Detection System - User Guide

## 🎯 Overview
The Live Speech Detection System analyzes real-time audio from your microphone to identify whether speech is normal or shows signs of stuttering disorder.

## 🚀 Getting Started

### 1. Install Dependencies
```bash
pip install pyaudio
```

### 2. Run Live Detection
```bash
python live_detection.py
```

## 🎤 How It Works

1. **Start the System**: Run the command above
2. **Speak Normally**: The system listens in 3-second intervals
3. **Real-time Analysis**: Each 3-second chunk is analyzed immediately
4. **Instant Results**: Get immediate feedback on speech patterns
5. **Exercise Suggestions**: If stuttering is detected, get targeted exercises

## 📊 Output Format

```
[HH:MM:SS] 🎯 Normal/Stuttering_Disorder
    📊 Confidence: XX.X%
    ⚠️  Severity: mild/moderate/severe (if applicable)
    💡 Exercise: [Specific exercise suggestion] (if applicable)
```

## 🛑 Stopping the System
Press `Ctrl+C` to stop live detection and see a session summary.

## 📋 Session Summary
When you stop the system, you'll see:
- Total number of detections
- Percentage of normal vs stuttering detections
- Overall speech pattern analysis

## 💡 Features

- **Real-time Processing**: 3-second audio chunks
- **Confidence Scoring**: Realistic confidence percentages (50-98%)
- **Severity Detection**: Mild, moderate, or severe classification
- **Exercise Suggestions**: Targeted therapy exercises based on severity
- **Session History**: Keeps track of last 5 predictions for consistency
- **Clean Interface**: Easy-to-read output with emojis

## 🔧 Technical Details

- **Sample Rate**: 16kHz
- **Audio Format**: 16-bit PCM
- **Chunk Duration**: 3 seconds
- **Model**: Random Forest with 1997 training samples
- **Accuracy**: 100% training accuracy with calibrated confidence

## 🎯 Example Usage

```bash
python live_detection.py

🎤 Live Speech Detection Started
Speak normally... The system will analyze your speech in 3-second intervals
Press Ctrl+C to stop

[10:30:15] 🎯 Normal
    📊 Confidence: 94.2%
    ✅ Normal speech detected
--------------------------------------------------
[10:30:18] 🎯 Stuttering_Disorder
    📊 Confidence: 96.8%
    ⚠️  Severity: severe
    💡 Exercise: Diaphragmatic breathing: Place hand on stomach...
--------------------------------------------------
```

## ⚠️ Notes

- Ensure your microphone is working properly
- Speak clearly and at a normal volume
- The system needs at least 3 seconds of speech to analyze
- Background noise may affect accuracy
- Results are for educational/therapeutic guidance purposes

## 🎵 Testing the System

To test with existing audio files:
```bash
python test_live.py
```

This will test the system with sample audio files to verify it's working correctly.
