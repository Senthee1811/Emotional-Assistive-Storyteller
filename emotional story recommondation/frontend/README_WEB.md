# Emotional Reader - Web Frontend

A modern web interface for the Emotional Reader AI-powered storytelling application.

## Features

### 🎭 Real-time Emotion Detection
- Live webcam feed with face detection
- Real-time emotion classification using trained CNN
- Emotion timeline visualization (15-second buffer)
- Confidence scores for each prediction

### 📚 Intelligent Story Recommendations
- Personalized story suggestions based on detected emotions
- Integration with existing PDF story library
- Fallback to curated sample stories
- Story rating and saving functionality

### 🎨 Modern UI/UX Design
- Responsive design for mobile and desktop
- Beautiful gradient backgrounds and animations
- Dark mode support
- Smooth transitions and micro-interactions

### ⚙️ Customizable Settings
- Adjustable detection intervals
- Configurable emotion buffer duration
- Story theme preferences
- Local storage for user preferences

## Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Train Models (if not already done)
```bash
# Train face emotion model
python train.py

# Train story classification model
cd Story_Classfication
python Train.py
```

### 3. Run the Web Application
```bash
python app.py
```

### 4. Open in Browser
Navigate to: http://localhost:5005

## File Structure

```
├── app.py                    # Flask backend server
├── requirements.txt          # Python dependencies
├── templates/
│   └── index.html           # Main web interface
├── static/
│   ├── css/
│   │   └── style.css        # Custom styling
│   └── js/
│       └── app.js           # Frontend JavaScript
└── [existing project files]
```

## API Endpoints

### POST /api/detect-emotion
Detects emotion from face image data.

**Request:**
```json
{
    "image": "base64_encoded_image_data"
}
```

**Response:**
```json
{
    "emotion": "Happy",
    "confidence": 0.85,
    "timestamp": "2024-01-01T12:00:00"
}
```

### POST /api/recommend-story
Recommends a story based on detected emotion.

**Request:**
```json
{
    "emotion": "Happy",
    "theme": "all"
}
```

**Response:**
```json
{
    "title": "The Joyful Sunrise",
    "content": "Story content here...",
    "emotion": "Happy",
    "source": "pdf"
}
```

### POST /api/rate-story
Records user feedback on recommended stories.

**Request:**
```json
{
    "title": "Story Title",
    "rating": "like",
    "emotion": "Happy"
}
```

## Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

## Security Notes

- Camera access requires user permission
- All processing happens locally (no cloud uploads)
- Images are processed in memory only
- No personal data is stored permanently

## Troubleshooting

### Camera Not Working
1. Check browser permissions for camera access
2. Ensure no other application is using the camera
3. Try refreshing the page and granting permissions again

### Model Loading Errors
1. Ensure `model.pth` exists in the project root
2. Check that all dependencies are installed
3. Verify the story classification models are trained

### Story Recommendations Not Working
1. Check that PDF files exist in `Story_Classfication/test_pdfs/`
2. Ensure story classification models are trained
3. Verify the backend server is running

## Customization

### Adding New Stories
1. Place PDF files in `Story_Classfication/test_pdfs/`
2. Retrain the story classification model
3. Stories will be automatically detected and classified

### Modifying Emotion Classes
1. Update `EMOTION_CLASSES` in `config.py`
2. Retrain the face emotion model
3. Update the frontend emotion colors in `style.css`

### Changing UI Theme
1. Modify color variables in `static/css/style.css`
2. Update gradient backgrounds
3. Adjust dark mode styles if needed

## Performance Tips

- Use Chrome for best performance
- Ensure good lighting for accurate emotion detection
- Position camera at eye level for optimal results
- Close unnecessary browser tabs for better performance

## Future Enhancements

- [ ] Voice emotion detection
- [ ] Multi-language support
- [ ] User authentication and profiles
- [ ] Cloud-based model serving
- [ ] Mobile app version
- [ ] Social sharing features
- [ ] Advanced analytics dashboard

## License

This project is part of the Emotional Reader research project.
