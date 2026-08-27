const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());

const TARGETS = {
  auth: process.env.AUTH_SERVICE_URL || 'http://127.0.0.1:5001',
  emotion: process.env.EMOTION_SERVICE_URL || 'http://127.0.0.1:5002',
  story: process.env.STORY_SERVICE_URL || 'http://127.0.0.1:5003',
  stutter: process.env.STUTTER_SERVICE_URL || 'http://127.0.0.1:5004',
  sign: process.env.SIGN_SERVICE_URL || 'http://127.0.0.1:5005',
  tts: process.env.TTS_SERVICE_URL || 'http://127.0.0.1:5006'
};

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    gateway: 'API Gateway / BFF',
    timestamp: new Date().toISOString(),
    services: TARGETS
  });
});

const makeProxy = (targetUrl, name) => {
  return createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    timeout: 30000,
    proxyTimeout: 30000,
    onError: (err, req, res) => {
      console.error(`[Gateway Proxy Error] Target '${name}' (${targetUrl}): ${err.message}`);
      res.status(503).json({
        error: 'service_degraded',
        service: name,
        message: `Downstream service '${name}' is currently unreachable.`,
        fallback_available: true
      });
    }
  });
};

app.use('/api/auth', makeProxy(TARGETS.auth, 'auth-service'));
app.use('/api/emotion', makeProxy(TARGETS.emotion, 'emotion-service'));
app.use('/api/stories', makeProxy(TARGETS.story, 'story-service'));
app.use('/api/stutter', makeProxy(TARGETS.stutter, 'stutter-service'));
app.use('/api/sign', makeProxy(TARGETS.sign, 'sign-service'));
app.use('/api/tts', makeProxy(TARGETS.tts, 'tts-service'));

app.listen(PORT, () => {
  console.log(`🚀 API Gateway / BFF listening on port ${PORT}`);
  console.log(`📡 Connected to microservices:`, TARGETS);
});

module.exports = app;
