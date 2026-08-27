import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = 'http://localhost:5000';

const emotions = {
  happy: { emoji: '😊', color: '#FFD700', label: 'Happy' },
  sad: { emoji: '😢', color: '#4169E1', label: 'Sad' },
  angry: { emoji: '😠', color: '#FF4444', label: 'Angry' },
  fear: { emoji: '😨', color: '#9370DB', label: 'Fear' },
  surprise: { emoji: '😲', color: '#FF69B4', label: 'Surprise' },
  disgust: { emoji: '🤢', color: '#8B4513', label: 'Disgust' },
  neutral: { emoji: '😐', color: '#808080', label: 'Neutral' }
};

function App() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const [confidence, setConfidence] = useState(0);
  const [allEmotions, setAllEmotions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [serverStatus, setServerStatus] = useState('checking');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);

  // Check server status on mount
  useEffect(() => {
    checkServerStatus();
    return () => {
      stopStreaming();
    };
  }, []);

  const checkServerStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/health`);
      setServerStatus(response.data.facepp_configured ? 'ready' : 'misconfigured');
    } catch (error) {
      setServerStatus('offline');
      console.error('Server status check failed:', error);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
      return true;
    } catch (error) {
      console.error('Camera access error:', error);
      setError('Unable to access camera. Please ensure camera permissions are granted.');
      return false;
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return null;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    return new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.8);
    });
  };

  const detectEmotion = async () => {
    if (!videoRef.current || isLoading) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const blob = await captureFrame();
      if (!blob) {
        throw new Error('Failed to capture frame');
      }
      
      const formData = new FormData();
      formData.append('image', blob, 'emotion_frame.jpg');
      
      const response = await axios.post(`${API_URL}/api/detect-emotion`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 15000
      });
      
      const result = response.data;
      setCurrentEmotion(result.emotion);
      setConfidence(result.confidence);
      setAllEmotions(result.allEmotions || []);
      
      console.log('Emotion detection result:', result);
      
    } catch (error) {
      console.error('Emotion detection error:', error);
      setError(error.response?.data?.error || error.message || 'Failed to detect emotion');
      setCurrentEmotion('neutral');
      setConfidence(0);
    } finally {
      setIsLoading(false);
    }
  };

  const startStreaming = async () => {
    const cameraStarted = await startCamera();
    if (!cameraStarted) return;
    
    setIsStreaming(true);
    
    // Detect emotion every 2 seconds
    intervalRef.current = setInterval(() => {
      detectEmotion();
    }, 2000);
    
    // Initial detection
    setTimeout(detectEmotion, 1000);
  };

  const stopStreaming = () => {
    setIsStreaming(false);
    stopCamera();
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const getConfidenceColor = (conf) => {
    if (conf >= 0.7) return '#4CAF50';
    if (conf >= 0.4) return '#FF9800';
    return '#F44336';
  };

  const getServerStatusColor = () => {
    switch (serverStatus) {
      case 'ready': return '#4CAF50';
      case 'misconfigured': return '#FF9800';
      case 'offline': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getServerStatusText = () => {
    switch (serverStatus) {
      case 'ready': return 'Server Ready';
      case 'misconfigured': return 'API Misconfigured';
      case 'offline': return 'Server Offline';
      case 'checking': return 'Checking...';
      default: return 'Unknown';
    }
  };

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <h1>🎭 Real-time Emotion Detection</h1>
          <div className="server-status" style={{ color: getServerStatusColor() }}>
            {getServerStatusText()}
          </div>
        </header>

        <main className="main-content">
          <div className="video-section">
            <div className="video-container">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`video-feed ${isStreaming ? 'active' : ''}`}
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              
              {!isStreaming && (
                <div className="video-placeholder">
                  <div className="placeholder-icon">📸</div>
                  <p>Click "Start Detection" to begin</p>
                </div>
              )}
              
              {isLoading && (
                <div className="loading-overlay">
                  <div className="spinner"></div>
                  <p>Analyzing...</p>
                </div>
              )}
            </div>

            <div className="controls">
              <button
                onClick={isStreaming ? stopStreaming : startStreaming}
                disabled={serverStatus !== 'ready'}
                className={`control-btn ${isStreaming ? 'stop' : 'start'}`}
              >
                {isStreaming ? '⏹️ Stop Detection' : '▶️ Start Detection'}
              </button>
              
              <button
                onClick={checkServerStatus}
                className="control-btn refresh"
              >
                🔄 Refresh Status
              </button>
            </div>
          </div>

          <div className="emotion-section">
            <div className="current-emotion">
              <div className="emotion-display">
                <div className="emotion-emoji" style={{ color: emotions[currentEmotion]?.color }}>
                  {emotions[currentEmotion]?.emoji}
                </div>
                <div className="emotion-info">
                  <h2>{emotions[currentEmotion]?.label}</h2>
                  <div className="confidence-bar">
                    <div 
                      className="confidence-fill"
                      style={{ 
                        width: `${confidence * 100}%`,
                        backgroundColor: getConfidenceColor(confidence)
                      }}
                    />
                    <span className="confidence-text">
                      {(confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {allEmotions.length > 0 && (
              <div className="all-emotions">
                <h3>All Emotions</h3>
                <div className="emotion-list">
                  {allEmotions.slice(0, 5).map((emotion, index) => (
                    <div key={index} className="emotion-item">
                      <span className="emotion-icon">
                        {emotions[emotion.emotion]?.emoji}
                      </span>
                      <span className="emotion-name">
                        {emotions[emotion.emotion]?.label}
                      </span>
                      <span className="emotion-confidence">
                        {(emotion.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                <span>{error}</span>
              </div>
            )}
          </div>
        </main>

        <footer className="footer">
          <p>Powered by Face++ API • Real-time emotion detection</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
