import React, { useState, useRef } from 'react';
import axios from 'axios';
import gsap from 'gsap';
import { showToast } from './Toast';
import EmotionCharacter from './EmotionCharacter';
import { Smile, Camera, Loader2 } from 'lucide-react';

export default function EmotionScanner({ gatewayUrl, onSelectEmotion }) {
  const [textInput, setTextInput] = useState('');
  const [detectedEmotion, setDetectedEmotion] = useState(null);
  const [loading, setLoading] = useState(false);
  const resultRef = useRef(null);

  const animateResult = () => {
    if (resultRef.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.fromTo(resultRef.current, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'back.out(1.5)' });
    }
  };

  const handleTextScan = async () => {
    if (!textInput.trim()) { showToast('Enter some text to analyze emotional tone.', 'info'); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${gatewayUrl}/api/emotion/detect-text`, { text: textInput });
      setDetectedEmotion(res.data);
      animateResult();
      showToast(`Detected: ${res.data.emotion.toUpperCase()} (${(res.data.confidence * 100).toFixed(0)}%)`, 'success');
      if (onSelectEmotion) onSelectEmotion(res.data.emotion);
    } catch (err) {
      showToast('Emotion service temporarily unavailable.', 'error');
      setDetectedEmotion({ emotion: 'happy', confidence: 0.88, source: 'Fallback' });
    } finally { setLoading(false); }
  };

  const handleFacialScan = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${gatewayUrl}/api/emotion/detect-facial`);
      setDetectedEmotion(res.data);
      animateResult();
      showToast(`Facial scan: ${res.data.emotion.toUpperCase()}`, 'success');
      if (onSelectEmotion) onSelectEmotion(res.data.emotion);
    } catch (err) {
      showToast('Facial detection unavailable.', 'error');
    } finally { setLoading(false); }
  };

  return (
    <div className="glass-card" style={{ padding: '32px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{
          width: 40, height: 40, borderRadius: 'var(--radius-md)',
          background: 'rgba(32,201,151,0.15)', border: '1px solid rgba(32,201,151,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--emerald-400)'
        }}>
          <Smile size={20} />
        </div>
        <div>
          <h3 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '1.25rem', color: 'white' }}>
            Emotion Scanner
          </h3>
          <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Face++ API & NLP Sentiment Engine</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '24px', alignItems: 'start' }}>
        <div>
          <label className="label">How is the child feeling today?</label>
          <textarea
            className="input"
            rows={3}
            placeholder="e.g., I feel so happy today because we built a huge toy tower!"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
          />
          <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={handleTextScan} disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Smile size={16} />}
              Detect Sentiment
            </button>
            <button className="btn btn-secondary" onClick={handleFacialScan} disabled={loading}>
              <Camera size={16} />
              Facial Scan
            </button>
          </div>
        </div>

        <div style={{
          background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.08)',
          borderRadius: 'var(--radius-xl)', padding: '16px', minWidth: '140px'
        }}>
          <EmotionCharacter emotion={detectedEmotion?.emotion || 'happy'} />
        </div>
      </div>

      {detectedEmotion && (
        <div ref={resultRef} className="glass-card" style={{
          marginTop: '20px', padding: '16px 20px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <span style={{ fontSize: '0.6875rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confidence</span>
            <p style={{ fontSize: '1.125rem', fontWeight: 700, color: 'white' }}>{(detectedEmotion.confidence * 100).toFixed(0)}%</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.6875rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Engine</span>
            <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--brand-400)' }}>{detectedEmotion.source || 'NLP Sentiment'}</p>
          </div>
        </div>
      )}
    </div>
  );
}
