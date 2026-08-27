import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import EmotionScanner from './components/EmotionScanner';
import StoryReader from './components/StoryReader';
import StutterAnalyzer from './components/StutterAnalyzer';
import SignTranslator from './components/SignTranslator';
import TtsPlayer from './components/TtsPlayer';

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

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.get(`${GATEWAY_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => setUser(res.data.user))
      .catch(() => localStorage.removeItem('token'));
    }
  }, []);

  const handleSynthesizeStory = (content, emotion) => {
    setTtsText(content);
    setTtsEmotion(emotion || 'happy');
    setActiveTab('tts');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={() => {
          localStorage.removeItem('token');
          setUser(null);
        }}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">
        {/* Banner */}
        <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-brand-900/60 via-purple-900/40 to-slate-900 border border-brand-500/20 flex justify-between items-center">
          <div>
            <span className="text-xs font-bold text-brand-400 uppercase tracking-widest bg-brand-500/10 border border-brand-500/20 px-3 py-1 rounded-full">
              Microservices Architecture
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-2">
              StoryPal Interactive Child Reader
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              API Gateway (<code className="text-brand-300">{GATEWAY_URL}</code>) routing to Auth, Emotion, Story, Stutter, Sign & TTS services.
            </p>
          </div>
          {activeEmotion && (
            <div className="hidden sm:flex items-center gap-2 bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400">Current Emotion State:</span>
              <span className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded-full ${
                activeEmotion === 'happy' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                activeEmotion === 'sad' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                'bg-purple-500/20 text-purple-400 border border-purple-500/30'
              }`}>
                {activeEmotion}
              </span>
            </div>
          )}
        </div>

        {/* Tab Content Routing */}
        {activeTab === 'emotion' && (
          <EmotionScanner
            gatewayUrl={GATEWAY_URL}
            onSelectEmotion={(emo) => {
              setActiveEmotion(emo);
              setActiveTab('stories');
            }}
          />
        )}

        {activeTab === 'stories' && (
          <StoryReader
            gatewayUrl={GATEWAY_URL}
            activeEmotion={activeEmotion}
            onSynthesizeStory={handleSynthesizeStory}
          />
        )}

        {activeTab === 'stutter' && (
          <StutterAnalyzer gatewayUrl={GATEWAY_URL} />
        )}

        {activeTab === 'sign' && (
          <SignTranslator gatewayUrl={GATEWAY_URL} />
        )}

        {activeTab === 'tts' && (
          <TtsPlayer
            gatewayUrl={GATEWAY_URL}
            textToSynthesize={ttsText}
            emotionToSynthesize={ttsEmotion}
          />
        )}
      </main>

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        EmotionalChildReader Microservice Platform • API Gateway BFF • 2026 Production Build
      </footer>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        gatewayUrl={GATEWAY_URL}
        onLoginSuccess={(u) => setUser(u)}
      />
    </div>
  );
}
