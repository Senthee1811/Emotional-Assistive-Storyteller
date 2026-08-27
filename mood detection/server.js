const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:8080', 'http://127.0.0.1:8080', 'http://localhost:8081'],
  methods: ['GET', 'POST', 'OPTIONS'],
}));
app.use(express.json());
app.options('*', cors());

// Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Face++ API configuration
const FACEPP_CONFIG = {
  apiKey: process.env.FACEPP_API_KEY || 'VoiTAjq6Z9YZ7zjvdm7AwCWTMsY0Z4ut',
  apiSecret: process.env.FACEPP_API_SECRET || 'pnjDB7uSTEBhj8uSy2f5GWvvWTqvm-TF',
  detectUrl: 'https://api-us.faceplusplus.com/facepp/v3/detect'
};

// Emotion mapping
const emotionMapping = {
  'happiness': 'happy',
  'neutral': 'neutral',
  'sadness': 'sad',
  'anger': 'angry',
  'fear': 'fear',
  'surprise': 'surprise',
  'disgust': 'disgust',
  'contempt': 'neutral',
  'happy': 'happy',
  'sad': 'sad',
  'angry': 'angry',
  'fearful': 'fear',
  'surprised': 'surprise',
  'disgusted': 'disgust'
};

// Convert image to base64
const imageToBase64 = (imagePath) => {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    return imageBuffer.toString('base64');
  } catch (error) {
    console.error('Error reading image:', error);
    throw error;
  }
};

// Detect emotion using Face++ API
const detectEmotionFacePlus = async (imageBase64) => {
  try {
    console.log('🔍 Sending request to Face++ API...');
    
    const data = new URLSearchParams({
      api_key: FACEPP_CONFIG.apiKey,
      api_secret: FACEPP_CONFIG.apiSecret,
      image_base64: imageBase64,
      return_attributes: 'emotion,gender,age,ethnicity,facequality',
      beautify: '0',
      face_quality_threshold: '0.01'
    });

    const response = await axios.post(FACEPP_CONFIG.detectUrl, data, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000
    });

    console.log('Face++ API response status:', response.status);
    
    if (response.status === 200 && response.data.faces && response.data.faces.length > 0) {
      const faceData = response.data.faces[0];
      
      if (faceData.attributes && faceData.attributes.emotion) {
        const emotions = faceData.attributes.emotion;
        console.log('Raw emotions from Face++:', emotions);
        
        // Process emotions
        const emotionScores = [];
        for (const [emotionName, confidence] of Object.entries(emotions)) {
          if (emotionMapping[emotionName]) {
            const mappedEmotion = emotionMapping[emotionName];
            const normalizedConfidence = confidence / 100.0;
            emotionScores.push({
              emotion: mappedEmotion,
              confidence: normalizedConfidence,
              originalEmotion: emotionName
            });
          }
        }
        
        // Sort by confidence
        emotionScores.sort((a, b) => b.confidence - a.confidence);
        
        if (emotionScores.length > 0) {
          const bestEmotion = emotionScores[0];
          
          if (bestEmotion.confidence >= 0.1) {
            console.log(`✅ Face++ detected: ${bestEmotion.originalEmotion} -> ${bestEmotion.emotion} (${bestEmotion.confidence.toFixed(3)})`);
            
            return {
              emotion: bestEmotion.emotion,
              confidence: bestEmotion.confidence,
              allEmotions: emotionScores,
              source: 'Face++ API',
              faceQuality: faceData.attributes?.facequality || null
            };
          } else {
            console.log(`⚠️ Low confidence: ${bestEmotion.confidence.toFixed(3)} for ${bestEmotion.emotion}`);
            return {
              emotion: bestEmotion.emotion,
              confidence: bestEmotion.confidence,
              allEmotions: emotionScores,
              source: 'Face++ API (low confidence)',
              faceQuality: faceData.attributes?.facequality || null
            };
          }
        }
      }
    }
    
    return {
      emotion: 'neutral',
      confidence: 0.0,
      allEmotions: [],
      source: 'No valid emotion data',
      faceQuality: null
    };
    
  } catch (error) {
    console.error('Face++ API error:', error.message);
    return {
      emotion: 'neutral',
      confidence: 0.0,
      allEmotions: [],
      source: `API Error: ${error.message}`,
      faceQuality: null
    };
  }
};

// Routes
app.post('/api/detect-emotion', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    console.log('📸 Processing uploaded image:', req.file.originalname);
    
    // Convert image to base64
    const imageBase64 = imageToBase64(req.file.path);
    
    // Detect emotion
    const result = await detectEmotionFacePlus(imageBase64);
    
    // Clean up uploaded file with error handling
    try {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    } catch (cleanupError) {
      console.warn('Warning: Could not clean up uploaded file:', cleanupError.message);
    }
    
    res.json(result);
    
  } catch (error) {
    console.error('Error processing image:', error);
    
    // Clean up uploaded file if it exists with error handling
    if (req.file && req.file.path) {
      try {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      } catch (cleanupError) {
        console.warn('Warning: Could not clean up uploaded file in error handler:', cleanupError.message);
      }
    }
    
    res.status(500).json({ 
      error: 'Failed to process image',
      details: error.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    facepp_configured: !!(FACEPP_CONFIG.apiKey && FACEPP_CONFIG.apiSecret),
    port: Number(PORT)
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Emotion detection server running on port ${PORT}`);
  console.log(`📡 Face++ API configured: ${!!(FACEPP_CONFIG.apiKey && FACEPP_CONFIG.apiSecret)}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}
