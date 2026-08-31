import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import AuthPage from './components/AuthPage';
import StoryReader from './components/StoryReader';
import EmotionScanner from './components/EmotionScanner';
import StutterAnalyzer from './components/StutterAnalyzer';
import SignTranslator from './components/SignTranslator';
import DeliveryModeModal from './components/DeliveryModeModal';
import Toast from './components/Toast';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [activeEmotion, setActiveEmotion] = useState('happy');
  const [user, setUser] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [deliveryMode, setDeliveryMode] = useState(() => {
    return localStorage.getItem('storyDeliveryMode') || 'tts';
  });
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const mainContentRef = useRef(null);

  const showToast = (message, type = 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const handleDismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleLoginSuccess = (userObj) => {
    setUser(userObj);
    setIsDeliveryModalOpen(true);
    setActiveTab('stories');
  };

  const handleSelectDeliveryMode = (mode) => {
    setDeliveryMode(mode);
    localStorage.setItem('storyDeliveryMode', mode);
    showToast(
      mode === 'sign'
        ? 'Story mode set to 🤟 Indian Sign Language (Saved for all future sessions)'
        : 'Story mode set to 🎧 Text-to-Speech Voice Narration',
      'success'
    );
  };

  const handleLogout = () => {
    setUser(null);
    showToast('You have been logged out. See you next time! 👋', 'info');
    setActiveTab('home');
  };

  const handleStartReading = () => {
    if (!localStorage.getItem('storyDeliveryMode')) {
      setIsDeliveryModalOpen(true);
    }
    setActiveTab('stories');
  };

  // GSAP tab switch animation
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (mainContentRef.current) {
      gsap.fromTo(
        mainContentRef.current,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
      );
    }
  }, [activeTab]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Accessible Live Toast System */}
      <Toast toasts={toasts} onDismiss={handleDismissToast} />

      {/* Story Delivery Mode Selection Modal */}
      <DeliveryModeModal
        isOpen={isDeliveryModalOpen}
        onClose={() => setIsDeliveryModalOpen(false)}
        currentMode={deliveryMode}
        onSelectMode={handleSelectDeliveryMode}
      />

      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeEmotion={activeEmotion}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main View Router with GSAP smooth transitions */}
      <main ref={mainContentRef} style={{ flex: 1, width: '100%' }}>
        {activeTab === 'home' && (
          <Hero
            onStartReading={handleStartReading}
            onScanEmotion={() => setActiveTab('emotion')}
            activeEmotion={activeEmotion}
            setActiveEmotion={setActiveEmotion}
          />
        )}

        {activeTab === 'login' && (
          <AuthPage
            onLoginSuccess={handleLoginSuccess}
            showToast={showToast}
          />
        )}

        {activeTab === 'stories' && (
          <StoryReader
            activeEmotion={activeEmotion}
            user={user}
            deliveryMode={deliveryMode}
            onToggleDeliveryMode={handleSelectDeliveryMode}
            showToast={showToast}
          />
        )}

        {activeTab === 'emotion' && (
          <EmotionScanner
            activeEmotion={activeEmotion}
            setActiveEmotion={setActiveEmotion}
            onSelectStory={() => setActiveTab('stories')}
            showToast={showToast}
          />
        )}

        {activeTab === 'stutter' && (
          <StutterAnalyzer
            showToast={showToast}
          />
        )}

        {activeTab === 'sign' && (
          <SignTranslator
            showToast={showToast}
          />
        )}
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border-glass)',
          background: 'rgba(11, 15, 25, 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          padding: '28px 24px',
          textAlign: 'center',
          fontSize: '0.85rem',
          color: 'var(--text-dim)',
          marginTop: 'auto'
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            ✨ <strong>EmotionalChildReader</strong> • Multi-Sensory Inclusive Storytelling AI
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => setIsDeliveryModalOpen(true)}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--border-glass)',
                color: '#C7D2FE',
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)';
                e.currentTarget.style.borderColor = 'var(--primary-light)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                e.currentTarget.style.borderColor = 'var(--border-glass)';
              }}
            >
              ⚙️ Delivery: {deliveryMode === 'sign' ? '🤟 Sign Language' : '🎧 TTS Audio'}
            </button>
            <span>•</span>
            <span>Microservices Architecture</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
