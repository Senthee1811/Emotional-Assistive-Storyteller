import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Volume2, Loader2, Play, CheckCircle } from 'lucide-react';

export default function TtsPlayer({ gatewayUrl, textToSynthesize, emotionToSynthesize }) {
  const [text, setText] = useState(textToSynthesize || 'Once upon a time, a little bear danced under the starry sky.');
  const [emotion, setEmotion] = useState(emotionToSynthesize || 'happy');
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null); // 'processing' | 'completed' | 'failed'
  const [audioUrl, setAudioUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (textToSynthesize) setText(textToSynthesize);
    if (emotionToSynthesize) setEmotion(emotionToSynthesize);
  }, [textToSynthesize, emotionToSynthesize]);

  // Polling loop for async TTS job completion
  useEffect(() => {
    let interval = null;
    if (jobId && jobStatus === 'processing') {
      interval = setInterval(async () => {
        try {
          const res = await axios.get(`${gatewayUrl}/api/tts/jobs/${jobId}`);
          if (res.data.status === 'completed') {
            setJobStatus('completed');
            setAudioUrl(`${gatewayUrl}${res.data.audio_url}`);
            setLoading(false);
            clearInterval(interval);
          } else if (res.data.status === 'failed') {
            setJobStatus('failed');
            setLoading(false);
            clearInterval(interval);
          }
        } catch (err) {
          console.error('Job status polling error:', err);
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [jobId, jobStatus, gatewayUrl]);

  const handleStartSynthesis = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setAudioUrl(null);
    setJobStatus('processing');
    try {
      const res = await axios.post(`${gatewayUrl}/api/tts/synthesize`, {
        text,
        emotion,
        speaker: 'child_voice'
      });
      setJobId(res.data.job_id);
    } catch (err) {
      console.error('TTS synthesize submit error:', err);
      setLoading(false);
      setJobStatus('failed');
    }
  };

  return (
    <div className="max-w-3xl mx-auto glass-panel p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400">
          <Volume2 className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">Asynchronous Coqui / XTTS Speech Synthesizer</h3>
          <p className="text-sm text-slate-400">Microservice Route: <code className="text-pink-400">/api/tts/synthesize</code> (Async Job Queue)</p>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Text to Synthesize into Speech:</label>
          <textarea
            rows={3}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-4 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Emotion Parameter:</label>
            <select
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-500"
              value={emotion}
              onChange={(e) => setEmotion(e.target.value)}
            >
              <option value="happy">Happy 😊</option>
              <option value="sad">Sad 😢</option>
              <option value="fear">Fearful 😨</option>
              <option value="angry">Angry 😡</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleStartSynthesis}
              disabled={loading}
              className="bg-gradient-to-r from-brand-600 to-pink-600 text-white font-semibold px-6 py-2.5 rounded-xl flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
              Synthesize Audio
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="p-4 bg-brand-500/10 border border-brand-500/20 rounded-xl flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />
          <span className="text-sm text-brand-200">Processing audio synthesis in background job queue (Job ID: {jobId})...</span>
        </div>
      )}

      {audioUrl && (
        <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
            <CheckCircle className="w-5 h-5" />
            Audio Synthesized Successfully!
          </div>
          <audio controls src={audioUrl} className="w-full rounded-lg" autoPlay />
        </div>
      )}
    </div>
  );
}
