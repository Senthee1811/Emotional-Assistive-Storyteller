import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import gsap from 'gsap';
import { showToast } from './Toast';
import AudioWaveform from './AudioWaveform';
import EmotionCharacter from './EmotionCharacter';
import { Volume2, Play, Pause, RotateCcw, UserCheck, Sparkles, ThumbsUp, ThumbsDown, CheckCircle } from 'lucide-react';

const ACTORS = [
  { id: 1, name: 'Uncle Sunny ☀️', gender: 'male', desc: 'Warm & Friendly' },
  { id: 2, name: 'Auntie Bella 🌸', gender: 'female', desc: 'Calm & Gentle' },
  { id: 3, name: 'Uncle Coco 🐻', gender: 'male', desc: 'Bouncy & Energetic' },
  { id: 4, name: 'Auntie Lily 🦋', gender: 'female', desc: 'Soft & Soothing' },
  { id: 5, name: 'Uncle Milo 🦊', gender: 'male', desc: 'Playful & Adventurous' },
  { id: 6, name: 'Auntie Rosie 🌹', gender: 'female', desc: 'Cheerful Storyteller' }
];

export default function TtsPlayer({ gatewayUrl, textToSynthesize, emotionToSynthesize }) {
  const [text, setText] = useState(textToSynthesize || 'Once upon a time, a brave little bear went on an exciting adventure! Suddenly, a mystery appeared.');
  const [selectedActor, setSelectedActor] = useState(1);
  const [targetEmotion, setTargetEmotion] = useState(emotionToSynthesize || 'happy');
  const [playlist, setPlaylist] = useState([]);
  const [currentSentenceIdx, setCurrentSentenceIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    if (textToSynthesize) setText(textToSynthesize);
    if (emotionToSynthesize) setTargetEmotion(emotionToSynthesize);
  }, [textToSynthesize, emotionToSynthesize]);

  const handleSynthesizeStoryNarrative = async () => {
    if (!text.trim()) {
      showToast('Please enter story text for narrative synthesis.', 'info');
      return;
    }
    setLoading(true);
    setPlaylist([]);
    setCurrentSentenceIdx(0);
    showToast('Synthesizing sentence-level emotion narrative...', 'info');

    try {
      const res = await axios.post(`${gatewayUrl}/api/tts/synthesize`, {
        text,
        actor_id: selectedActor,
        emotion: targetEmotion,
        gender: ACTORS.find(a => a.id === selectedActor)?.gender || 'male'
      });

      if (res.data.playlist && res.data.playlist.length > 0) {
        setPlaylist(res.data.playlist);
        showToast(`Sentence narrative ready! ${res.data.playlist.length} sentences generated.`, 'success');
      } else {
        showToast('Narrative generated. Ready to play audio.', 'info');
      }
    } catch (err) {
      console.error('Synthesis error:', err);
      showToast('TTS narrative service degraded.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePlaySentence = (idx) => {
    if (!playlist || idx >= playlist.length) {
      setIsPlaying(false);
      setCurrentSentenceIdx(0);
      return;
    }
    setCurrentSentenceIdx(idx);
    setIsPlaying(true);

    const item = playlist[idx];
    const src = `${gatewayUrl}${item.audio_url}`;

    if (audioRef.current) {
      audioRef.current.src = src;
      audioRef.current.play().catch((err) => {
        console.warn('HTML5 Audio play failed, falling back to Web Speech API:', err);
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(item.sentence);
          utterance.onend = () => handleAudioEnded();
          window.speechSynthesis.speak(utterance);
        } else {
          showToast('Audio playback failed in browser context.', 'error');
          setIsPlaying(false);
        }
      });
    }
  };

  const handleAudioEnded = () => {
    if (currentSentenceIdx + 1 < playlist.length) {
      handlePlaySentence(currentSentenceIdx + 1);
    } else {
      setIsPlaying(false);
      showToast('Story narrative completed!', 'success');
    }
  };

  const handleSendFeedback = async (liked) => {
    try {
      await axios.post(`${gatewayUrl}/api/tts/feedback`, {
        actor_id: selectedActor,
        liked
      });
      showToast(liked ? 'Voice preference saved! 👍' : 'Voice reset for child profile. 👎', 'info');
    } catch (e) {
      console.error('Feedback error:', e);
    }
  };

  return (
    <div className="max-w-4xl mx-auto glass-panel p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-800/80 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-pink-500/20">
            <Volume2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-2xl font-extrabold text-white">Coqui XTTS Voice & Actor Studio</h3>
            <p className="text-sm text-slate-400">Sentence-Level Emotion Narrative & Actor Selection</p>
          </div>
        </div>

        <AudioWaveform isPlaying={isPlaying} isGenerating={loading} />
      </div>

      {/* Actor Selection Grid (21st.dev card style) */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-brand-400" /> Select Storyteller Actor (Voice Character):
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {ACTORS.map((actor) => (
            <button
              key={actor.id}
              onClick={() => setSelectedActor(actor.id)}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                selectedActor === actor.id
                  ? 'bg-gradient-to-r from-brand-600/30 to-purple-600/30 border-brand-500 text-white shadow-lg shadow-brand-500/20 ring-1 ring-brand-500'
                  : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="font-bold text-sm">{actor.name}</div>
              <div className="text-xs text-slate-400 mt-0.5">{actor.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Input Text & Emotion */}
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Story Text for Sentence Narrative:</label>
          <textarea
            rows={3}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-4 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="w-48">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Base Mood:</label>
            <select
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-500"
              value={targetEmotion}
              onChange={(e) => setTargetEmotion(e.target.value)}
            >
              <option value="happy">Happy 😊</option>
              <option value="sad">Sad 😢</option>
              <option value="fear">Fear 😨</option>
              <option value="angry">Angry 😡</option>
            </select>
          </div>

          <button
            onClick={handleSynthesizeStoryNarrative}
            disabled={loading}
            className="bg-gradient-to-r from-brand-600 to-pink-600 text-white font-bold px-8 py-3.5 rounded-xl flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 shadow-xl shadow-brand-500/25"
          >
            {loading ? <Sparkles className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
            Generate Sentence Narrative
          </button>
        </div>
      </div>

      {/* Sentence Playlist & Active Character Reaction */}
      {playlist.length > 0 && (
        <div className="space-y-4 border-t border-slate-800/80 pt-6">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <h4 className="text-lg font-bold text-white flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              Sentence-Level Emotion Narrative ({playlist.length} Sentences)
            </h4>
            <div className="flex gap-2">
              <button
                onClick={() => handleSendFeedback(true)}
                className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 text-emerald-400 p-2 rounded-xl flex items-center gap-1.5 text-xs font-semibold"
              >
                <ThumbsUp className="w-4 h-4" /> Like Voice
              </button>
              <button
                onClick={() => handleSendFeedback(false)}
                className="bg-slate-900 border border-slate-800 hover:border-red-500/50 text-red-400 p-2 rounded-xl flex items-center gap-1.5 text-xs font-semibold"
              >
                <ThumbsDown className="w-4 h-4" /> Dislike Voice
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
            <div className="md:col-span-3 space-y-2 max-h-64 overflow-y-auto pr-2">
              {playlist.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => handlePlaySentence(idx)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-4 ${
                    currentSentenceIdx === idx && isPlaying
                      ? 'bg-brand-500/20 border-brand-500 text-white ring-1 ring-brand-500'
                      : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-xs font-bold flex items-center justify-center text-slate-400 shrink-0">
                      {idx + 1}
                    </span>
                    <p className="text-sm font-medium leading-snug">{item.sentence}</p>
                  </div>
                  <span className="text-xs font-bold uppercase px-2.5 py-1 rounded-full bg-slate-800 text-brand-300 border border-slate-700 shrink-0">
                    {item.emotion}
                  </span>
                </div>
              ))}
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center">
              <EmotionCharacter emotion={playlist[currentSentenceIdx]?.emotion?.toLowerCase() || 'happy'} />
            </div>
          </div>

          <audio
            ref={audioRef}
            onEnded={handleAudioEnded}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
}
