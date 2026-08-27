# 📊 Data Storage

## 📁 Overview
This folder contains all data files including training datasets, user uploads, and application data for the Emotional Reader system.

## 📂 File Structure
```
data/
├── 🧠 Training Datasets
│   └── Dataset/
│       ├── train/              # Face emotion training images
│       │   ├── angry/          # 3,995 images
│       │   ├── disgusted/      # 436 images
│       │   ├── fearful/        # 4,097 images
│       │   ├── happy/          # 7,215 images
│       │   ├── neutral/        # 4,965 images
│       │   ├── sad/            # 4,830 images
│       │   └── surprised/      # 3,171 images
│       └── test/               # Validation images
│
├── 📖 User Generated Content
│   └── uploaded_stories/
│       ├── [uuid].pdf          # User uploaded PDFs
│       ├── [uuid].jpg          # User uploaded images
│       └── story_metadata.json # Story analysis results
│
└── 📋 Application Data
    ├── story_metadata.json     # Story library metadata
    ├── user_preferences.json   # User settings
    └── analytics.json          # Usage statistics
```

## 🧠 Face Emotion Dataset

### Dataset Source
- **Origin**: FER2013 and custom collected images
- **Format**: PNG grayscale images
- **Size**: 48x48 pixels (original), resized to 64x64
- **Total Samples**: 28,709 training images

### Class Distribution
```
Emotion      | Count   | Percentage
-------------|---------|----------
Happy        | 7,215   | 25.1%
Neutral      | 4,965   | 17.3%
Sad          | 4,830   | 16.8%
Fearful      | 4,097   | 14.3%
Angry        | 3,995   | 13.9%
Surprised    | 3,171   | 11.0%
Disgusted    | 436     | 1.5%
```

### Data Preprocessing
- **Grayscale Conversion**: RGB → Single channel
- **Resizing**: 48x48 → 64x64 pixels
- **Normalization**: Mean=[0.5], Std=[0.5]
- **Data Augmentation**: Random flip, rotation (training only)

### File Naming Convention
```
im0.png, im1.png, im2.png, ..., im6999.png
```

## 📖 User Uploaded Stories

### Supported Formats
- **PDF Documents**: `.pdf` files with text content
- **Image Files**: `.jpg`, `.png`, `.jpeg` (OCR processed)

### File Organization
```
uploaded_stories/
├── e1ebd7a1-0dbd-4f1a-901a-e8ddeeb5036a.pdf
├── a2f8c9b3-4e5d-6a7b-8c9d-0e1f2a3b4c5d.jpg
└── story_metadata.json
```

### Metadata Structure
```json
{
  "id": "uuid-string",
  "filename": "original_filename.pdf",
  "title": "Extracted/Generated Title",
  "content": "Full text content",
  "emotion": "detected_emotion",
  "confidence": 0.85,
  "upload_date": "2025-12-30T13:59:00.674472",
  "file_type": "pdf",
  "purpose": "emotional_therapy"
}
```

## 📋 Application Data

### Story Library Metadata
```json
{
  "total_stories": 15,
  "emotions": {
    "Happy": 5,
    "Sad": 3,
    "Angry": 2,
    "Fear": 3,
    "Neutral": 2
  },
  "last_updated": "2025-12-30T13:59:00.674472"
}
```

### User Preferences
```json
{
  "theme": "all",
  "strategy": "therapeutic",
  "camera_quality": "high",
  "auto_detect": true,
  "notifications": true
}
```

### Usage Analytics
```json
{
  "total_detections": 1250,
  "emotion_counts": {
    "Happy": 450,
    "Sad": 280,
    "Neutral": 220,
    "Angry": 150,
    "Fear": 100,
    "Surprise": 50
  },
  "popular_stories": [
    {"id": "uuid1", "views": 45},
    {"id": "uuid2", "views": 32}
  ]
}
```

## 🔧 Data Management

### Data Cleaning
- **Duplicate Removal**: Automatic duplicate detection
- **Validation**: File format and size validation
- **Backup**: Regular data backups to cloud storage

### Storage Requirements
- **Training Dataset**: ~500MB
- **User Uploads**: Variable (16MB per file limit)
- **Metadata**: ~1MB
- **Total Recommended**: 2GB minimum

### Data Privacy
- **User Data**: Local storage only
- **No Cloud Upload**: All data remains on device
- **Temporary Files**: Automatic cleanup after processing
- **OCR Privacy**: Text processing done locally

## 📈 Data Statistics

### Training Data Quality
- **Image Quality**: Mixed (some low-quality samples)
- **Label Accuracy**: Human-verified
- **Balance Issues**: Addressed with weighted sampling
- **Augmentation**: Applied to improve generalization

### User Content Analysis
- **Upload Frequency**: ~5-10 stories per day
- **Popular Emotions**: Happy and Sad most common
- **File Types**: 70% PDF, 30% images
- **Content Length**: Average 500-2000 words

## 🔄 Data Pipeline

### Training Pipeline
```
Raw Images → Preprocessing → Augmentation → Balanced Sampling → Model Training
```

### Inference Pipeline
```
Camera Feed → Face Detection → Emotion Prediction → Story Recommendation
```

### Upload Pipeline
```
File Upload → Text Extraction → Emotion Analysis → Metadata Storage → Library Display
```

## 🚀 Data Optimization

### Compression
- **Images**: JPEG compression for uploads
- **Text**: JSON compression for metadata
- **Models**: Quantized model files (future)

### Caching
- **Model Loading**: In-memory caching
- **Story Content**: LRU cache for frequent access
- **User Preferences**: Session-based caching

### Backup Strategy
- **Local Backup**: Daily automatic backups
- **Export**: JSON export functionality
- **Recovery**: Data restoration from backups
