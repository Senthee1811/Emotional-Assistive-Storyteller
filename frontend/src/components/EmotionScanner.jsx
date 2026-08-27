import React, { useState } from 'react';
import axios from 'axios';
import { showToast } from './Toast';
import EmotionCharacter from './EmotionCharacter';
import { Smile, Sparkles, Camera } from 'lucide-react';

export default function EmotionScanner({ gatewayUrl, onSelectEmotion }) {
  const [textInput, setTextInput] = useState('');
  const [detectedEmotion, setDetectedEmotion] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleTextScan = async () => {
    if (!textInput.trim()) {
      showToast('Please enter text to scan emotional tone.', 'info');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${gatewayUrl}/api/emotion/detect-text`, { text: textInput });
      setDetectedEmotion(res.data);
      showToast(`Emotion detected: ${res.data.emotion.toUpperCase()}!`, 'success');
      if (onSelectEmotion) onSelectEmotion(res.data.emotion);
    } catch (err) {
      console.error('Emotion scan error:', err);
      showToast('Emotion service is temporarily degraded. Defaulting to happy state.', 'error');
      setDetectedEmotion({ emotion: 'happy', confidence: 0.88, source: 'Fallback Engine' });
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateFacial = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${gatewayUrl}/api/emotion/detect-facial`);
      setDetectedEmotion(res.data);
      showToast(`Facial scan complete: ${res.data.emotion.toUpperCase()}`, 'success');
      if (onSelectEmotion) onSelectEmotion(res.data.emotion);
    } catch (err) {
      console.error('Facial emotion error:', err);
      showToast('Webcam facial scanner unreachable.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto glass-panel p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <Smile className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">Facial & Sentiment Emotion Scanner</h3>
          <p className="text-sm text-slate-400">Microservice Route: <code className="text-emerald-400">/api/emotion/detect-*</code></p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center mb-6">
        <div className="md:col-span-2 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">How is the child feeling today?</label>
            <textarea
              rows={3}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-4 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
              placeholder="e.g., I feel so happy today because we built a huge toy tower!"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleTextScan}
              disabled={loading}
              className="bg-gradient-to-r from-brand-600 to-pink-600 text-white font-semibold px-5 py-3 rounded-xl flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? <Sparkles className="w-5 h-5 animate-spin" /> : <Smile className="w-5 h-5" />}
              Detect Sentiment
            </button>
            <button
              onClick={handleSimulateFacial}
              disabled={loading}
              className="bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-200 font-semibold px-5 py-3 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <Camera className="w-5 h-5 text-emerald-400" />
              Webcam Facial Scan (Face++)
            </button>
          </div>
        </div>

        <div className="flex justify-center bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
          <EmotionCharacter emotion={detectedEmotion?.emotion || 'happy'} />
        </div>
      </div>

      {detectedEmotion && (
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex justify-between items-center">
          <div>
            <span className="text-xs text-slate-400">Confidence Score</span>
            <p className="text-lg font-bold text-white">{(detectedEmotion.confidence * 100).toFixed(0)}%</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400">Source Engine</span>
            <p className="text-sm font-semibold text-brand-400">{detectedEmotion.source || 'NLP Emotion Microservice'}</p>
          </div>
        </div>
      )}
    </div>
  );
}
