# Real-time Emotion Detection App

A React application that uses the Face++ API to detect emotions in real-time through webcam video streaming.

## Features

- 🎭 Real-time emotion detection using Face++ API
- 📹 Live webcam feed with emotion analysis
- 🎯 Confidence scores for detected emotions
- 📊 Multiple emotion probability display
- 🎨 Beautiful, responsive UI with glassmorphism design
- ⚡ Fast API integration with error handling

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Webcam access
- Face++ API credentials (included in this demo)

## Installation

1. Clone or download the project files
2. Install dependencies:
```bash
npm install
```

## Usage

### Step 1: Start the Backend Server

The backend server handles communication with the Face++ API:

```bash
npm run server
```

The server will start on `http://localhost:5000`

### Step 2: Start the React Frontend

In a new terminal window, start the React development server:

```bash
npm start
```

The application will open in your browser at `http://localhost:3000`

### Step 3: Use the App

1. **Check Server Status**: The app will automatically check if the backend server is running and Face++ API is configured
2. **Start Detection**: Click "Start Detection" to begin webcam capture and emotion analysis
3. **View Results**: See real-time emotion detection with confidence scores
4. **Stop Detection**: Click "Stop Detection" to end the session

## API Configuration

The Face++ API credentials are included in this demo:
- API Key: `VoiTAjq6Z9YZ7zjvdm7AwCWTMsY0Z4ut`
- API Secret: `pnjDB7uSTEBhj8uSy2f5GWvvWTqvm-TF`

For production use, replace these in `server.js` with your own credentials from [Face++](https://faceplusplus.com/).

## Supported Emotions

- 😊 Happy
- 😢 Sad
- 😠 Angry
- 😨 Fear
- 😲 Surprise
- 🤢 Disgust
- 😐 Neutral

## Technical Details

### Backend (Node.js + Express)
- Express server with CORS support
- Multer for image upload handling
- Axios for Face++ API communication
- Base64 image encoding
- Error handling and timeout management

### Frontend (React)
- React hooks for state management
- WebRTC for camera access
- Canvas API for frame capture
- Axios for API requests
- CSS Grid and Flexbox for responsive layout
- Glassmorphism UI design

## API Endpoints

### POST `/api/detect-emotion`
Uploads an image and returns emotion detection results.

**Request:** `multipart/form-data` with `image` field
**Response:**
```json
{
  "emotion": "happy",
  "confidence": 0.85,
  "allEmotions": [
    {
      "emotion": "happy",
      "confidence": 0.85,
      "originalEmotion": "happiness"
    }
  ],
  "source": "Face++ API",
  "faceQuality": 0.92
}
```

### GET `/api/health`
Checks server and API configuration status.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "facepp_configured": true
}
```

## Troubleshooting

### Camera Access Issues
- Ensure camera permissions are granted in your browser
- Check if other applications are using the camera
- Try refreshing the page and re-granting permissions

### Server Connection Issues
- Verify the backend server is running on port 5000
- Check for CORS errors in browser console
- Ensure no firewall is blocking the connection

### API Rate Limits
- Face++ API has rate limits for free accounts
- If reaching limits, wait for the quota to reset
- Consider upgrading to a paid plan for higher limits

## Development

### Project Structure
```
emotion-detection-app/
├── public/
│   └── index.html
├── src/
│   ├── App.js          # Main React component
│   ├── App.css         # Styling
│   └── index.js        # React entry point
├── server.js           # Express backend server
├── package.json        # Dependencies and scripts
└── README.md           # This file
```

### Customization
- Modify emotions in `App.js` to add/remove emotions
- Update UI colors and styling in `App.css`
- Change detection interval in `App.js` (currently 2 seconds)
- Add additional APIs by extending `server.js`

## License

This project is for educational purposes. Please ensure compliance with Face++ API terms of service and privacy regulations when processing user data.

## Privacy Note

This application processes webcam frames for emotion detection. No images are stored permanently - they are only temporarily processed and immediately discarded. Ensure you have appropriate consent when using this application with others.
