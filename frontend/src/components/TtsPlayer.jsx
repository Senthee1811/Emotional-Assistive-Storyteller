import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import gsap from 'gsap';
import { showToast } from './Toast';
import AudioWaveform from './AudioWaveform';
import EmotionCharacter from './EmotionCharacter';
import { Volume2, Play, RotateCcw, UserCheck, Loader2, ThumbsUp, ThumbsDown, CheckCircle } from 'lucide-react';

const ACTORS = [
  { id: 1, name: 'Uncle Sunny', emoji: '☀️', gender: 'male', desc: 'Warm & Friendly' },
  { id: 2, name: 'Auntie Bella', emoji: '🌸', gender: 'female', desc: 'Calm & Gentle' },
  { id: 3, name: 'Uncle Coco', emoji: '🐻', gender: 'male', desc: 'Bouncy & Energetic' },
  { id: 4, name: 'Auntie Lily', emoji: '🦋', gender: 'female', desc: 'Soft & Soothing' },
  { id: 5, name: 'Uncle Milo', emoji: '🦊', gender: 'male', desc: 'Playful & Adventurous' },
  { id: 6, name: 'Auntie Rosie', emoji: '🌹', gender: 'female', desc: 'Cheerful Storyteller' }
];

export default function TtsPlayer({ gatewayUrl, textToSynthesize, emotionToSynthesize }) {
  const [text, setText] = useState(textToSynthesize || 'Once upon a time, a brave little bear went on an exciting adventure! Suddenly, a mystery appeared.');
  const [selectedActor, setSelectedActor] = useState(1);
  const [targetEmotion, setTargetEmotion] = useState(emotionToSynthesize || 'happy');
  const [playlist, setPlaylist] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    if (textToSynthesize) setText(textToSynthesize);
    if (emotionToSynthesize) setTargetEmotion(emotionToSynthesize);
  }, [textToSynthesize, emotionToSynthesize]);

  const handleSynthesize = async () => {
    if (!text.trim()) { showToast('Enter story text to synthesize.', 'info'); return; }
    setLoading(true); setPlaylist([]); setCurrentIdx(0);
    showToast('Synthesizing sentence-level emotion narrative...', 'info');

    try {
      const res = await axios.post(`${gatewayUrl}/api/tts/synthesize`, {
        text, actor_id: selectedActor, emotion: targetEmotion,
        gender: ACTORS.find(a => a.id === selectedActor)?.gender || 'male'
      });
      if (res.data.playlist?.length > 0) {
        setPlaylist(res.data.playlist);
        showToast(`${res.data.playlist.length} sentences ready!`, 'success');
      }
    } catch (err) { showToast('TTS service unavailable.', 'error'); }
    finally { setLoading(false); }
  };

  const playSentence = (idx) => {
    if (!playlist || idx >= playlist.length) { setIsPlaying(false); setCurrentIdx(0); return; }
    setCurrentIdx(idx); setIsPlaying(true);
    const item = playlist[idx];
    if (audioRef.current) {
      audioRef.current.src = `${gatewayUrl}${item.audio_url}`;
      audioRef.current.play().catch(() => {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(item.sentence);
          u.onend = () => handleEnded();
          window.speechSynthesis.speak(u);
        } else { showToast('Audio playback blocked.', 'error'); setIsPlaying(false); }
      });
    }
  };

  const handleEnded = () => {
    if (currentIdx + 1 < playlist.length) playSentence(currentIdx + 1);
    else { setIsPlaying(false); showToast('Story complete!', 'success'); }
  };

  const handleFeedback = async (liked) => {
    try {
      await axios.post(`${gatewayUrl}/api/tts/feedback`, { actor_id: selectedActor, liked });
      showToast(liked ? 'Voice preference saved!' : 'Voice reset.', 'info');
    } catch (_) {}
  };

  return (
    <div className="glass-card" style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', paddingBottom: '24px', borderBottom: '1px solid rgba(148,163,184,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, var(--pink-500), rgba(168,85,247,0.8))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
            boxShadow: '0 4px 16px rgba(240,101,149,0.25)'
          }}>
            <Volume2 size={22} />
          </div>
          <div>
            <h3 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '1.25rem', color: 'white' }}>
              XTTS Voice Studio
            </h3>
            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Sentence-Level Emotion Narrative & Actor Selection</p>
          </div>
        </div>
        <AudioWaveform isPlaying={isPlaying} isGenerating={loading} />
      </div>

      {/* Actor Grid */}
      <div style={{ marginTop: '24px' }}>
        <label className="label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <UserCheck size={14} /> Select Storyteller:
        </label>
        <div className="grid-3">
          {ACTORS.map((actor) => (
            <button
              key={actor.id}
              onClick={() => setSelectedActor(actor.id)}
              style={{
                padding: '14px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s ease',
                borderRadius: 'var(--radius-md)',
                background: selectedActor === actor.id
                  ? 'linear-gradient(135deg, rgba(92,124,250,0.15), rgba(168,85,247,0.1))'
                  : 'rgba(15,23,42,0.5)',
                border: selectedActor === actor.id
                  ? '1px solid rgba(92,124,250,0.4)'
                  : '1px solid rgba(148,163,184,0.06)',
                color: selectedActor === actor.id ? 'white' : '#94a3b8',
                boxShadow: selectedActor === actor.id ? '0 4px 16px rgba(92,124,250,0.15)' : 'none'
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{actor.emoji} {actor.name}</div>
              <div style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: 2 }}>{actor.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Text Input + Controls */}
      <div style={{ marginTop: '24px' }}>
        <label className="label">Story Text:</label>
        <textarea className="input" rows={3} value={text} onChange={(e) => setText(e.target.value)} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ width: '180px' }}>
            <label className="label">Base Mood:</label>
            <select className="input" value={targetEmotion} onChange={(e) => setTargetEmotion(e.target.value)}>
              <option value="happy">Happy 😊</option>
              <option value="sad">Sad 😢</option>
              <option value="fear">Fear 😨</option>
              <option value="angry">Angry 😡</option>
            </select>
          </div>
          <button className="btn btn-primary btn-lg" onClick={handleSynthesize} disabled={loading}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
            Generate Narrative
          </button>
        </div>
      </div>

      {/* Playlist */}
      {playlist.length > 0 && (
        <div style={{ marginTop: '28px', paddingTop: '24px', borderTop: '1px solid rgba(148,163,184,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <h4 style={{ fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle size={18} color="var(--emerald-400)" />
              {playlist.length} Sentences Generated
            </h4>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => handleFeedback(true)} style={{ color: 'var(--emerald-400)' }}>
                <ThumbsUp size={14} /> Like
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => handleFeedback(false)} style={{ color: '#f87171' }}>
                <ThumbsDown size={14} /> Dislike
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: '20px', alignItems: 'start' }}>
            <div style={{ maxHeight: '260px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {playlist.map((item, idx) => (
                <div
                  key={idx} onClick={() => playSentence(idx)}
                  style={{
                    padding: '12px 16px', cursor: 'pointer', transition: 'all 0.2s ease',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
                    background: currentIdx === idx && isPlaying ? 'rgba(92,124,250,0.12)' : 'rgba(15,23,42,0.5)',
                    border: currentIdx === idx && isPlaying ? '1px solid rgba(92,124,250,0.3)' : '1px solid rgba(148,163,184,0.04)',
                    color: currentIdx === idx && isPlaying ? 'white' : '#94a3b8'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      width: 22, height: 22, borderRadius: '50%',
                      background: 'rgba(30,41,59,0.8)', fontSize: '0.6875rem', fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', flexShrink: 0
                    }}>{idx + 1}</span>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 500, lineHeight: 1.4 }}>{item.sentence}</p>
                  </div>
                  <span className={`badge badge-${item.emotion?.toLowerCase() || 'neutral'}`}>{item.emotion}</span>
                </div>
              ))}
            </div>

            <div style={{
              background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.06)',
              borderRadius: 'var(--radius-xl)', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center'
            }}>
              <EmotionCharacter emotion={playlist[currentIdx]?.emotion?.toLowerCase() || 'happy'} />
            </div>
          </div>

          <audio ref={audioRef} onEnded={handleEnded} style={{ display: 'none' }} />
        </div>
      )}
    </div>
  );
}
