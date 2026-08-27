import React, { useState } from 'react';
import axios from 'axios';

export default function EmotionScanner({ gatewayUrl, onSelectEmotion }) {
  const [textInput, setTextInput] = useState('');
  const [detectedEmotion, setDetectedEmotion] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleTextScan = async () => {
    if (!textInput.trim()) return;
    setLoading(true);
    try {
      const res = await axios.post(`${gatewayUrl}/api/emotion/detect-text`, { text: textInput });
      setDetectedEmotion(res.data);
      if (onSelectEmotion) onSelectEmotion(res.data.emotion);
    } catch (err) {
      console.error('Emotion scan error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateFacial = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${gatewayUrl}/api/emotion/detect-facial`);
      setDetectedEmotion(res.data);
      if (onSelectEmotion) onSelectEmotion(res.data.emotion);
    } catch (err) {
      console.error('Facial emotion error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card" style={{ maxWidth: '650px', margin: '0 auto' }}>
      <h3 style={{ marginBottom: '12px', fontSize: '1.4rem' }}>😊 Facial & Text Emotion Scanner</h3>
      <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '20px' }}>
        Microservice Route: <code>/api/emotion/detect-*</code> via API Gateway
      </p>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: '600' }}>Enter child text / feeling:</label>
        <textarea
          rows={3}
          className="input-field"
          placeholder="e.g., I feel so happy today because we went to the park!"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <button onClick={handleTextScan} className="btn-primary" disabled={loading}>
          {loading ? 'Scanning...' : 'Detect Sentiment'}
        </button>
        <button onClick={handleSimulateFacial} className="btn-secondary" disabled={loading}>
          📸 Webcam Facial Scan (Face++)
        </button>
      </div>

      {detectedEmotion && (
        <div style={{
          padding: '16px',
          borderRadius: '12px',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '1rem', fontWeight: '700' }}>Detected State:</span>
            <span className={`badge badge-${detectedEmotion.emotion}`}>
              {detectedEmotion.emotion} ({(detectedEmotion.confidence * 100).toFixed(0)}%)
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Source Engine: {detectedEmotion.source || 'NLP Emotion Microservice'}</p>
        </div>
      )}
    </div>
  );
}
