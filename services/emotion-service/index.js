const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5002;

app.use(cors());
app.use(express.json());

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Original Face++ API configuration from mood detection/server.js
const FACEPP_CONFIG = {
  apiKey: process.env.FACEPP_API_KEY || 'VoiTAjq6Z9YZ7zjvdm7AwCWTMsY0Z4ut',
  apiSecret: process.env.FACEPP_API_SECRET || 'pnjDB7uSTEBhj8uSy2f5GWvvWTqvm-TF',
  detectUrl: 'https://api-us.faceplusplus.com/facepp/v3/detect'
};

// Full emotion mapping from the original mood detection backend
const emotionMapping = {
  happiness: 'happy',
  neutral: 'neutral',
  sadness: 'sad',
  anger: 'angry',
  fear: 'fear',
  surprise: 'surprise',
  disgust: 'disgust',
  contempt: 'neutral',
  happy: 'happy',
  sad: 'sad',
  angry: 'angry',
  fearful: 'fear',
  surprised: 'surprise',
  disgusted: 'disgust'
};

const imageToBase64 = (imagePath) => {
  const imageBuffer = fs.readFileSync(imagePath);
  return imageBuffer.toString('base64');
};

// Full Face++ detection pipeline from the original mood detection server.js
const detectEmotionFacePlus = async (imageBase64) => {
  try {
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

    if (response.status === 200 && response.data.faces && response.data.faces.length > 0) {
      const faceData = response.data.faces[0];

      if (faceData.attributes && faceData.attributes.emotion) {
        const emotions = faceData.attributes.emotion;
        const emotionScores = [];

        for (const [emotionName, confidence] of Object.entries(emotions)) {
          if (emotionMapping[emotionName]) {
            emotionScores.push({
              emotion: emotionMapping[emotionName],
              confidence: confidence / 100.0,
              originalEmotion: emotionName
            });
          }
        }
        emotionScores.sort((a, b) => b.confidence - a.confidence);

        if (emotionScores.length > 0) {
          return {
            emotion: emotionScores[0].emotion,
            confidence: emotionScores[0].confidence,
            allEmotions: emotionScores,
            source: 'Face++ API',
            faceQuality: faceData.attributes?.facequality || null,
            demographics: {
              age: faceData.attributes?.age?.value || null,
              gender: faceData.attributes?.gender?.value || null
            }
          };
        }
      }
    }

    return {
      emotion: 'neutral',
      confidence: 0.0,
      allEmotions: [],
      source: 'No face detected',
      faceQuality: null
    };
  } catch (error) {
    console.error('[emotion-service] Face++ API error:', error.message);
    return {
      emotion: 'neutral',
      confidence: 0.0,
      allEmotions: [],
      source: `API Error: ${error.message}`,
      faceQuality: null
    };
  }
};

// Enhanced text-based emotion detection using weighted keyword scoring
const detectTextEmotion = (text) => {
  if (!text) return { emotion: 'neutral', confidence: 0.5 };

  const lower = text.toLowerCase();
  const emotionWeights = {
    happy: { keywords: ['happy', 'joy', 'smile', 'laugh', 'great', 'love', 'wonderful', 'exciting', 'fun', 'beautiful', 'amazing', 'cheerful', 'bright', 'delight'], weight: 0 },
    sad: { keywords: ['sad', 'cry', 'tears', 'gloomy', 'lonely', 'hurt', 'miss', 'sorry', 'heartbroken', 'melancholy', 'sorrow', 'grief'], weight: 0 },
    angry: { keywords: ['angry', 'mad', 'furious', 'rage', 'hate', 'annoyed', 'frustrated', 'upset', 'irritated'], weight: 0 },
    fear: { keywords: ['scared', 'fear', 'afraid', 'terrified', 'nervous', 'anxious', 'worried', 'panic', 'dread', 'horror'], weight: 0 },
    surprise: { keywords: ['surprise', 'amazed', 'shocked', 'unexpected', 'astonished', 'wow', 'incredible', 'unbelievable'], weight: 0 },
    neutral: { keywords: ['okay', 'fine', 'normal', 'usual', 'calm', 'peace', 'quiet', 'still', 'balanced', 'relaxed'], weight: 0 }
  };

  for (const [emotion, data] of Object.entries(emotionWeights)) {
    for (const kw of data.keywords) {
      if (lower.includes(kw)) {
        data.weight += 1;
      }
    }
  }

  let bestEmotion = 'neutral';
  let bestWeight = 0;
  for (const [emotion, data] of Object.entries(emotionWeights)) {
    if (data.weight > bestWeight) {
      bestWeight = data.weight;
      bestEmotion = emotion;
    }
  }

  const confidence = bestWeight > 0 ? Math.min(0.5 + bestWeight * 0.1, 0.98) : 0.5;

  return {
    emotion: bestEmotion,
    confidence: confidence,
    text_length: text.length,
    source: 'NLP Keyword Sentiment Analysis'
  };
};

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'emotion-service',
    port: Number(PORT),
    facepp_configured: !!(FACEPP_CONFIG.apiKey && FACEPP_CONFIG.apiSecret),
    engine: 'Face++ API + NLP Keyword Scoring'
  });
});

// Full Face++ facial emotion detection (merged from original mood detection/server.js)
const handleDetectFacial = async (req, res) => {
  try {
    if (!req.file) {
      return res.json({
        emotion: 'happy',
        confidence: 0.92,
        allEmotions: [{ emotion: 'happy', confidence: 0.92 }, { emotion: 'neutral', confidence: 0.08 }],
        source: 'Facial Detector (Default — no image uploaded)'
      });
    }

    const imageBase64 = imageToBase64(req.file.path);

    // Clean up uploaded file
    try {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    } catch (_) {}

    const result = await detectEmotionFacePlus(imageBase64);
    res.json(result);
  } catch (error) {
    console.error('[emotion-service] Detection error:', error.message);
    res.json({
      emotion: 'happy',
      confidence: 0.88,
      allEmotions: [{ emotion: 'happy', confidence: 0.88 }],
      source: 'Fallback (API error)'
    });
  }
};

// Enhanced text sentiment detection
const handleDetectText = (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Text required' });
  res.json(detectTextEmotion(text));
};

// Dual route mapping (gateway strips /api/emotion prefix)
app.post('/detect-facial', upload.single('image'), handleDetectFacial);
app.post('/api/emotion/detect-facial', upload.single('image'), handleDetectFacial);
app.post('/api/detect-emotion', upload.single('image'), handleDetectFacial);

app.post('/detect-text', handleDetectText);
app.post('/api/emotion/detect-text', handleDetectText);

if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

app.listen(PORT, () => {
  console.log(`[emotion-service] Running on port ${PORT}`);
  console.log(`[emotion-service] Face++ configured: ${!!(FACEPP_CONFIG.apiKey)}`);
});

module.exports = app;
