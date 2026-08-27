# 🧠 Backend Core

## 📁 Overview
This folder contains all server-side logic, machine learning models, and API endpoints for the Emotional Reader application.

## 📂 File Structure
```
backend/
├── 🌐 Web Application
│   ├── app.py              # Main Flask web server
│   ├── story_manager.py    # Story CRUD operations
│   └── requirements.txt    # Python dependencies
│
├── 🤖 Machine Learning
│   ├── Mood_predict.py     # Real-time face emotion detection
│   ├── train.py            # CNN model training script
│   ├── config.py           # Global configuration
│   ├── preprocess.py       # Data preprocessing utilities
│   └── balanced_train.py   # Balanced training logic
│
└── 📖 Text Processing
    └── Story_Classfication/
        ├── Train.py        # Text emotion model training
        ├── multi_pdf.py    # PDF emotion analysis
        └── dataset/        # Training data CSVs
```

## 🚀 How to Run

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Train Models (Optional)
```bash
# Train face emotion detection
python train.py

# Train text emotion classification
cd Story_Classfication && python Train.py
```

### 3. Start Web Server
```bash
python app.py
```

## 🔧 Configuration
- **Device**: Automatically detects CUDA/CPU
- **Models**: Located in `../models/` directory
- **Data**: Located in `../data/` directory
- **Port**: 5000 (configurable)

## 📊 APIs
- `GET /` - Main emotion detection page
- `GET /library` - Story library page
- `POST /api/detect-emotion` - Face emotion detection
- `POST /api/recommend-story` - Story recommendation
- `POST /api/upload-story` - Story upload
- `GET /api/stories` - List stories
- `PUT /api/stories/<id>` - Update story
- `DELETE /api/stories/<id>` - Delete story

## 🎯 Features
- Real-time face emotion detection
- Therapeutic story recommendations
- PDF/image upload and analysis
- Story library management
- Emotion-based content filtering
