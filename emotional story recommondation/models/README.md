# 🤖 Machine Learning Models

## 📁 Overview
This folder contains all trained machine learning models, model architectures, and model-related files for the Emotional Reader system.

## 📂 File Structure
```
models/
├── 🧠 Face Emotion Detection
│   ├── model.pth              # Trained CNN model (37.35% accuracy)
│   └── training_logs/         # Training history and metrics
│
├── 📖 Text Classification
│   └── Story_Models/
│       ├── emotion_model.pkl      # Trained text classifier
│       ├── emotion_vectorizer.pkl # TF-IDF vectorizer
│       └── emotion_labels.pkl     # Emotion mapping labels
│
└── 📊 Model Metadata
    ├── model_info.json        # Model specifications
    └── performance_metrics.json # Accuracy and performance data
```

## 🧠 Face Emotion Model (CNN)

### Architecture
```python
EmotionCNN(
  features: Sequential(
    Conv2d(1, 32, 3) → BatchNorm2d → ReLU → MaxPool2d(2)
    Conv2d(32, 32, 3) → BatchNorm2d → ReLU → MaxPool2d(2)
    Conv2d(32, 64, 3) → BatchNorm2d → ReLU → MaxPool2d(2)
    Conv2d(64, 64, 3) → BatchNorm2d → ReLU → MaxPool2d(2)
    Conv2d(64, 128, 3) → BatchNorm2d → ReLU → MaxPool2d(2)
    Conv2d(128, 128, 3) → BatchNorm2d → ReLU → MaxPool2d(2)
    Conv2d(128, 256, 3) → BatchNorm2d → ReLU → MaxPool2d(2)
  ),
  classifier: Sequential(
    Dropout(0.5) → Linear(4096, 512) → ReLU
    Dropout(0.5) → Linear(512, 256) → ReLU
    Dropout(0.3) → Linear(256, 7)
  )
)
```

### Specifications
- **Input**: 64x64 grayscale face images
- **Output**: 7 emotion classes
- **Accuracy**: 37.35% (balanced, unbiased)
- **Parameters**: ~2.5M trainable parameters
- **Framework**: PyTorch 2.0.1

### Emotion Classes
```python
EMOTION_CLASSES = [
    "Angry", "Disgust", "Fear", "Happy", "Neutral", "Sad", "Surprise"
]
```

## 📖 Text Classification Model

### Architecture
```python
TF-IDF Vectorizer (max_features=5000)
    ↓
Logistic Regression Classifier
    ↓
5 Emotion Classes
```

### Specifications
- **Input**: Text content (stories, PDFs, OCR-extracted text)
- **Features**: 5,000 TF-IDF features
- **Algorithm**: Logistic Regression
- **Accuracy**: ~85% (text classification)
- **Framework**: scikit-learn 1.3.0

### Emotion Classes
```python
TEXT_EMOTIONS = ["Happy", "Sad", "Angry", "Fear", "Neutral"]
```

## 📊 Performance Metrics

### Face Model Performance
```
Training History:
- Epoch 1: 14.36% accuracy
- Epoch 2: 19.31% accuracy  
- Epoch 3: 37.35% accuracy (final)

Class Distribution (Balanced):
- Angry: 3,995 samples
- Disgusted: 436 samples
- Fearful: 4,097 samples
- Happy: 7,215 samples
- Neutral: 4,965 samples
- Sad: 4,830 samples
- Surprised: 3,171 samples
```

### Text Model Performance
```
- Training Accuracy: ~92%
- Validation Accuracy: ~85%
- Feature Count: 5,000
- Algorithm: Logistic Regression
```

## 🔧 Model Training

### Face Model Training
```bash
cd backend
python train.py
```

### Text Model Training
```bash
cd backend/Story_Classfication
python Train.py
```

## 📋 Model Requirements

### Dependencies
- PyTorch 2.0.1
- scikit-learn 1.3.0
- NumPy 1.24.3
- OpenCV 4.8.1

### Hardware Requirements
- **RAM**: 4GB+ for model loading
- **Storage**: 500MB for all models
- **GPU**: Optional (CUDA support for faster training)

## 🔄 Model Updates

### Version History
- **v1.0**: Initial model (62.55% accuracy, biased)
- **v2.0**: Balanced model (37.35% accuracy, unbiased)

### Retraining Process
1. Collect new training data
2. Balance class distribution
3. Train with weighted sampling
4. Validate on test set
5. Update model files

## 🎯 Usage Examples

### Loading Face Model
```python
import torch
from backend.train import EmotionCNN

model = EmotionCNN()
model.load_state_dict(torch.load('models/model.pth'))
model.eval()
```

### Loading Text Model
```python
import joblib
from models.Story_Models import *

model = joblib.load('models/Story_Models/emotion_model.pkl')
vectorizer = joblib.load('models/Story_Models/emotion_vectorizer.pkl')
labels = joblib.load('models/Story_Models/emotion_labels.pkl')
```

## 🚀 Model Deployment

### Production Considerations
- **Model Optimization**: Consider TensorRT for faster inference
- **Model Versioning**: Maintain version history
- **Monitoring**: Track model performance in production
- **Retraining**: Schedule periodic model updates
