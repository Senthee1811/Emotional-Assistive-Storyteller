# Stuttering Disorder Detection System

A comprehensive machine learning system for detecting stuttering disorders in speech using audio analysis. This project combines real-time audio processing, feature extraction, and a Random Forest classifier to provide accurate speech pattern analysis with therapeutic exercise recommendations.

## 🎯 Features

- **Real-time Speech Detection**: Live microphone analysis with 3-second audio chunks
- **Multi-format Audio Support**: WAV, OGG, MP3, FLAC, M4A compatibility
- **High Accuracy**: 95%+ accuracy with calibrated confidence scoring
- **Severity Assessment**: Mild, moderate, or severe classification
- **Therapeutic Exercises**: Personalized speech therapy recommendations
- **Web Interface**: Full-featured frontend for audio upload and analysis
- **Cross-platform**: Works on Windows, macOS, and Linux

## 🚀 Quick Start

### Prerequisites
- Python 3.7+
- Node.js 14+ (for web interface)
- Microphone (for live detection)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd stuttering-detection-system
```

2. **Install Python dependencies**
```bash
pip install librosa numpy scikit-learn pyaudio joblib flask flask-cors
```

3. **Install frontend dependencies**
```bash
cd frontend
npm install
cd ..
```

4. **Train the model** (optional - pre-trained model included)
```bash
python train.py
```

## 📊 Usage

### 1. Live Speech Detection
```bash
python live_detection.py
```
- Speak normally into your microphone
- Get real-time analysis every 3 seconds
- Press `Ctrl+C` to stop and see session summary

### 2. Single File Prediction
```bash
python predict.py
```
- Change `audio_path` in the script to your audio file
- Supports all major audio formats

### 3. Web Interface
```bash
# Start backend server
python backend/main.py

# In another terminal, start frontend
cd frontend
npm start
```
- Open `http://localhost:3000` in your browser
- Upload audio files for analysis
- View detailed results and recommendations

## 🎵 Supported Audio Formats

| Format | Extension | Use Case | Support Level |
|--------|-----------|----------|---------------|
| WAV | .wav | Training/Live recording | ✅ Primary |
| OGG | .ogg | Web/Mobile | ✅ Full |
| MP3 | .mp3 | General use | ✅ Full |
| FLAC | .flac | Archival | ✅ Full |
| M4A | .m4a | Apple devices | ✅ Full |

## 🧠 Technical Architecture

### Machine Learning Pipeline
1. **Feature Extraction**: 180-dimensional feature vectors
   - MFCC (Mel-frequency cepstral coefficients)
   - Chroma features
   - Mel-spectrogram
2. **Preprocessing**: StandardScaler normalization
3. **Classification**: Random Forest with optimized hyperparameters
4. **Confidence Calibration**: Realistic scoring (50-98%)

### Model Performance
- **Training Samples**: 1,997 audio files
- **Accuracy**: 95.00% (cross-validated)
- **Features**: 180 dimensions per sample
- **Model**: Random Forest (15 estimators, max depth 4)

### Real-time Processing
- **Sample Rate**: 16kHz
- **Audio Format**: 16-bit PCM
- **Chunk Duration**: 3 seconds
- **Processing Time**: <1 second per chunk

## 📁 Project Structure

```
stuttering-detection-system/
├── 🎵 Audio Files/
│   ├── *.wav, *.ogg, *.mp3, *.flac, *.m4a
│   └── DataSet/                    # Training dataset
├── 🐍 Python Scripts/
│   ├── train.py                    # Model training
│   ├── predict.py                  # Single file prediction
│   ├── live_detection.py          # Real-time analysis
│   ├── features.py                 # Feature extraction
│   ├── data_loader.py              # Dataset loading
│   └── augment_data.py             # Data augmentation
├── 🌐 Web Interface/
│   ├── frontend/                   # React/Vue.js application
│   │   ├── index.html
│   │   ├── script.js
│   │   └── styles.css
│   └── backend/                    # Flask API server
│       └── main.py
├── 🤖 Model Files/
│   ├── random_forest_model.pkl     # Trained classifier
│   └── scaler.pkl                  # Feature scaler
└── 📚 Documentation/
    ├── README.md                   # This file
    ├── README_LIVE.md              # Live detection guide
    └── AUDIO_FORMATS.md            # Format support details
```

## 🎯 Example Output

### Live Detection
```
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

### File Prediction
```python
{
    'prediction': 'Stuttering_Disorder',
    'disorder_percentage': 87.5,
    'severity': 'moderate',
    'exercise_suggestion': 'Syllable repetition: Practice saying multi-syllable words slowly...'
}
```

## 💡 Therapeutic Features

### Severity-Based Exercise Categories
- **Mild**: Slow reading, breathing exercises, gentle onset techniques
- **Moderate**: Syllable repetition, light articulation, continuous phonation
- **Severe**: Vowel stretching, relaxation techniques, rhythm practice

### Session Analytics
- Total detection count
- Normal vs stuttering percentages
- Confidence score trends
- Exercise effectiveness tracking

## 🔧 Configuration

### Model Parameters
```python
RandomForestClassifier(
    n_estimators=15,
    max_depth=4,
    min_samples_split=20,
    min_samples_leaf=10,
    class_weight={'Normal': 2.0, 'Stuttering_Disorder': 0.5}
)
```

### Audio Processing
- **Sample Rate**: 16000 Hz
- **Chunk Size**: 3 seconds
- **Feature Dimensions**: 180
- **Confidence Range**: 50-98%

## 🧪 Testing

### Test Live Detection
```bash
python test_live.py
```

### Test Audio Formats
```bash
python test_formats.py
```

### Debug Misclassifications
```bash
python debug_misclassification.py
```

## 📈 Performance Metrics

### Cross-Validation Results
- **Mean CV Accuracy**: 95.00%
- **Standard Deviation**: ±2.50%
- **Accuracy Range**: 92.50% - 97.50%

### Real-time Performance
- **Latency**: <1 second
- **CPU Usage**: 15-25%
- **Memory Usage**: ~100MB

## 🛠️ Development

### Adding New Features
1. Extract features using `features.py`
2. Scale with saved `scaler.pkl`
3. Predict with `random_forest_model.pkl`

### Extending Audio Formats
1. Add extension to `audio_extensions` list in `data_loader.py`
2. Test with `test_formats.py`
3. Update documentation

### Model Retraining
```bash
python train.py
```
- Automatically saves new model and scaler
- Provides cross-validation metrics
- Shows class distribution

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## ⚠️ Disclaimer

This system is designed for educational and therapeutic guidance purposes. It is not a substitute for professional medical diagnosis or treatment. Always consult with qualified healthcare professionals for medical concerns.

## 📞 Support

For questions, issues, or contributions:
- Create an issue on GitHub
- Check existing documentation
- Review test files for usage examples

---

**Built with ❤️ for speech therapy and accessibility**
