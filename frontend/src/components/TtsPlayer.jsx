import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { showToast } from './Toast';
import AudioWaveform from './AudioWaveform';
import { Volume2, Loader2, Play, CheckCircle, RotateCcw } from 'lucide-react';

export default function TtsPlayer({ gatewayUrl, textToSynthesize, emotionToSynthesize }) {
  const [text, setText] = useState(textToSynthesize || 'Once upon a time, a little bear danced under the starry sky.');
  const [emotion, setEmotion] = useState(emotionToSynthesize || 'happy');
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

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
            showToast('Your story voice is ready to play!', 'success');
            clearInterval(interval);
          } else if (res.data.status === 'failed') {
            setJobStatus('failed');
            setLoading(false);
            showToast('Speech synthesis failed. Please try again.', 'error');
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
    if (!text.trim()) {
      showToast('Please enter text to synthesize into speech.', 'info');
      return;
    }
    setLoading(true);
    setAudioUrl(null);
    setJobStatus('processing');
    showToast('Generating your story\'s voice using XTTS model...', 'info');

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
      showToast('TTS service unavailable or offline.', 'error');
    }
  };

  const handleReplayAudio = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setIsPlaying(true);
      showToast('Replaying story audio.', 'info');
    }
  };

  return (
    <div className="max-w-3xl mx-auto glass-panel p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Coqui XTTS Speech Synthesizer</h3>
            <p className="text-sm text-slate-400">Microservice Route: <code className="text-pink-400">/api/tts/synthesize</code></p>
          </div>
        </div>

        <AudioWaveform isPlaying={isPlaying} isGenerating={loading} />
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Text to Synthesize into Speech:</label>
          <textarea
            rows={3}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-4 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
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
          <div className="flex items-end gap-3">
            <button
              onClick={handleStartSynthesis}
              disabled={loading}
              className="bg-gradient-to-r from-brand-600 to-pink-600 text-white font-semibold px-6 py-2.5 rounded-xl flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg shadow-brand-500/20"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
              Synthesize Audio
            </button>

            {audioUrl && (
              <button
                onClick={handleReplayAudio}
                className="bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-200 font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors"
                aria-label="Replay audio"
              >
                <RotateCcw className="w-4 h-4 text-brand-400" />
                Replay
              </button>
            )}
          </div>
        </div>
      </div>

      {loading && (
        <div className="p-4 bg-brand-500/10 border border-brand-500/20 rounded-xl flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />
          <span className="text-sm text-brand-200">Synthesizing voice in background job queue (Job ID: {jobId})...</span>
        </div>
      )}

      {audioUrl && (
        <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
              <CheckCircle className="w-5 h-5" />
              Audio Synthesized & Ready!
            </div>
            <button
              onClick={handleReplayAudio}
              className="text-xs font-semibold text-brand-400 hover:underline flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Single-Tap Replay
            </button>
          </div>

          <audio
            ref={audioRef}
            controls
            src={audioUrl}
            className="w-full rounded-lg"
            autoPlay
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
          />
        </div>
      )}
    </div>
  );
}
