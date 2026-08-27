import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import axios from 'axios';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import EmotionScanner from './components/EmotionScanner';
import StoryReader from './components/StoryReader';
import StutterAnalyzer from './components/StutterAnalyzer';
import SignTranslator from './components/SignTranslator';
import TtsPlayer from './components/TtsPlayer';
import ToastContainer, { showToast } from './components/Toast';
import './index.css';

const GATEWAY_URL = (typeof process !== 'undefined' && process.env?.REACT_APP_GATEWAY_URL) ||
  import.meta.env?.VITE_GATEWAY_URL ||
  'http://localhost:4000';

export default function App() {
  const [activeTab, setActiveTab] = useState('stories');
  const [user, setUser] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [activeEmotion, setActiveEmotion] = useState('happy');
  const [ttsText, setTtsText] = useState('');
  const [ttsEmotion, setTtsEmotion] = useState('happy');
  const contentRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.get(`${GATEWAY_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setUser(res.data.user))
        .catch(() => localStorage.removeItem('token'));
    }
  }, []);

  // GSAP page transition
  useEffect(() => {
    if (contentRef.current) {
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!prefersReduced) {
        gsap.fromTo(contentRef.current,
          { opacity: 0, y: 8 },
          { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
        );
      }
    }
  }, [activeTab]);

  const handleSynthesizeStory = (content, emotion) => {
    setTtsText(content);
    setTtsEmotion(emotion || 'happy');
    setActiveTab('tts');
    showToast('Ready to synthesize story audio.', 'info');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <ToastContainer />

      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={() => {
          localStorage.removeItem('token');
          setUser(null);
          showToast('Logged out successfully.', 'info');
        }}
      />

      <main className="page-container">
        {/* Hero Banner */}
        <div className="glass-card" style={{
          padding: '28px 32px',
          marginBottom: '28px',
          background: 'linear-gradient(135deg, rgba(92,124,250,0.08), rgba(214,51,108,0.06), rgba(15,23,42,0.6))',
          border: '1px solid rgba(92,124,250,0.12)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px'
        }}>
          <div>
            <span className="badge badge-brand" style={{ marginBottom: 8, display: 'inline-block' }}>
              Microservice Architecture
            </span>
            <h1 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: '1.75rem', color: 'white', letterSpacing: '-0.02em', marginTop: 4 }}>
              StoryPal Interactive Reader
            </h1>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: 4 }}>
              Gateway: <code style={{ color: 'var(--brand-400)', fontSize: '0.75rem' }}>{GATEWAY_URL}</code> — Auth • Emotion • Story • Stutter • Sign • TTS
            </p>
          </div>
          {activeEmotion && (
            <div className={`badge badge-${activeEmotion}`} style={{ fontSize: '0.75rem', padding: '6px 14px' }}>
              Active Mood: {activeEmotion}
            </div>
          )}
        </div>

        {/* Tab Content */}
        <div ref={contentRef}>
          {activeTab === 'emotion' && (
            <EmotionScanner
              gatewayUrl={GATEWAY_URL}
              onSelectEmotion={(emo) => { setActiveEmotion(emo); setActiveTab('stories'); }}
            />
          )}
          {activeTab === 'stories' && (
            <StoryReader
              gatewayUrl={GATEWAY_URL}
              activeEmotion={activeEmotion}
              onSynthesizeStory={handleSynthesizeStory}
            />
          )}
          {activeTab === 'stutter' && <StutterAnalyzer gatewayUrl={GATEWAY_URL} />}
          {activeTab === 'sign' && <SignTranslator gatewayUrl={GATEWAY_URL} />}
          {activeTab === 'tts' && (
            <TtsPlayer
              gatewayUrl={GATEWAY_URL}
              textToSynthesize={ttsText}
              emotionToSynthesize={ttsEmotion}
            />
          )}
        </div>
      </main>

      <footer style={{
        borderTop: '1px solid rgba(148,163,184,0.06)',
        padding: '20px 0',
        textAlign: 'center',
        fontSize: '0.75rem',
        color: '#475569'
      }}>
        StoryPal — EmotionalChildReader Microservice Platform • 2026
      </footer>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        gatewayUrl={GATEWAY_URL}
        onLoginSuccess={(u) => { setUser(u); showToast(`Welcome, ${u.child_name || u.email}!`, 'success'); }}
      />
    </div>
  );
}
