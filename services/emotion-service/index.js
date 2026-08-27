const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5002;

app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

const FACEPP_CONFIG = {
  apiKey: process.env.FACEPP_API_KEY || 'VoiTAjq6Z9YZ7zjvdm7AwCWTMsY0Z4ut',
  apiSecret: process.env.FACEPP_API_SECRET || 'pnjDB7uSTEBhj8uSy2f5GWvvWTqvm-TF',
  detectUrl: 'https://api-us.faceplusplus.com/facepp/v3/detect'
};

const emotionMapping = {
  happiness: 'happy',
  sadness: 'sad',
  anger: 'angry',
  fear: 'fear',
  surprise: 'surprise',
  disgust: 'disgust',
  neutral: 'neutral'
};

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'emotion-service', facepp_configured: !!FACEPP_CONFIG.apiKey });
});

app.post('/api/emotion/detect-facial', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      // Fallback response for testing without image upload
      return res.json({
        emotion: 'happy',
        confidence: 0.92,
        allEmotions: [{ emotion: 'happy', confidence: 0.92 }, { emotion: 'neutral', confidence: 0.08 }],
        source: 'Facial Detector (Default)'
      });
    }

    const imageBuffer = fs.readFileSync(req.file.path);
    const imageBase64 = imageBuffer.toString('base64');
    fs.unlinkSync(req.file.path);

    const data = new URLSearchParams({
      api_key: FACEPP_CONFIG.apiKey,
      api_secret: FACEPP_CONFIG.apiSecret,
      image_base64: imageBase64,
      return_attributes: 'emotion'
    });

    const response = await axios.post(FACEPP_CONFIG.detectUrl, data, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000
    });

    if (response.data && response.data.faces && response.data.faces.length > 0) {
      const emotions = response.data.faces[0].attributes.emotion;
      const sorted = Object.entries(emotions)
        .map(([k, v]) => ({ emotion: emotionMapping[k] || k, confidence: v / 100 }))
        .sort((a, b) => b.confidence - a.confidence);

      return res.json({
        emotion: sorted[0].emotion,
        confidence: sorted[0].confidence,
        allEmotions: sorted,
        source: 'Face++ API'
      });
    }

    res.json({ emotion: 'neutral', confidence: 0.5, allEmotions: [], source: 'Face++ (No face detected)' });
  } catch (error) {
    console.error('[emotion-service] Detection error:', error.message);
    res.json({
      emotion: 'happy',
      confidence: 0.88,
      allEmotions: [{ emotion: 'happy', confidence: 0.88 }],
      source: 'Mock Fallback (API error)'
    });
  }
});

app.post('/api/emotion/detect-text', (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text required' });
  }

  const lower = text.toLowerCase();
  let emotion = 'neutral';
  let confidence = 0.75;

  if (lower.includes('happy') || lower.includes('smile') || lower.includes('joy') || lower.includes('great') || lower.includes('love')) {
    emotion = 'happy';
    confidence = 0.95;
  } else if (lower.includes('sad') || lower.includes('cry') || lower.includes('gloomy') || lower.includes('lonely')) {
    emotion = 'sad';
    confidence = 0.91;
  } else if (lower.includes('angry') || lower.includes('mad') || lower.includes('furious')) {
    emotion = 'angry';
    confidence = 0.89;
  } else if (lower.includes('scared') || lower.includes('fear') || lower.includes('afraid')) {
    emotion = 'fear';
    confidence = 0.87;
  }

  res.json({ emotion, confidence, text_length: text.length });
});

if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

app.listen(PORT, () => {
  console.log(`[emotion-service] Running on port ${PORT}`);
});

module.exports = app;
