import React from 'react';
import { Volume2, Hand, Sparkles, Check, ArrowRight } from 'lucide-react';

export default function DeliveryModeModal({ isOpen, onClose, currentMode, onSelectMode }) {
  if (!isOpen) return null;

  const handleSelect = (mode) => {
    onSelectMode(mode);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 8, 15, 0.85)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        className="glass-card"
        style={{
          maxWidth: '560px',
          width: '100%',
          padding: '36px',
          textAlign: 'center',
          border: '1.5px solid var(--border-glass-focus)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.7), 0 0 35px var(--primary-glow)'
        }}
      >
        {/* Header Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            marginBottom: '16px',
            color: '#C7D2FE',
            fontSize: '0.85rem',
            fontWeight: 600
          }}
        >
          <Sparkles size={16} color="var(--primary-light)" />
          <span>Story Delivery Preference</span>
        </div>

        <h2 id="modal-title" className="fun-font" style={{ fontSize: '1.85rem', marginBottom: '8px' }}>
          Choose Your Story Experience 🌈
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginBottom: '28px' }}>
          Select how you want our AI reader to deliver your stories. We'll remember your choice for your next adventures!
        </p>

        {/* Options Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          {/* TTS Mode Card */}
          <button
            type="button"
            onClick={() => handleSelect('tts')}
            style={{
              padding: '24px 20px',
              borderRadius: 'var(--radius-lg)',
              background: currentMode === 'tts' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.03)',
              border: `2px solid ${currentMode === 'tts' ? 'var(--primary-light)' : 'var(--border-glass)'}`,
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.25s ease',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: currentMode === 'tts' ? '0 0 25px var(--primary-glow)' : 'none'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Volume2 color="var(--primary-light)" size={24} />
                </div>
                {currentMode === 'tts' && (
                  <span className="badge badge-primary" style={{ padding: '4px 8px' }}>
                    <Check size={12} /> Active
                  </span>
                )}
              </div>
              <h3 style={{ fontSize: '1.15rem', color: '#FFFFFF', marginBottom: '6px' }}>
                🎧 TTS Voice Narration
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                Multi-actor voice acting with emotional pacing, speed controls & audio waves.
              </p>
            </div>

            <div style={{ marginTop: '16px', fontSize: '0.8rem', color: 'var(--primary-light)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>Select Voice Mode</span>
              <ArrowRight size={14} />
            </div>
          </button>

          {/* Sign Language Mode Card */}
          <button
            type="button"
            onClick={() => handleSelect('sign')}
            style={{
              padding: '24px 20px',
              borderRadius: 'var(--radius-lg)',
              background: currentMode === 'sign' ? 'rgba(236, 72, 153, 0.2)' : 'rgba(255, 255, 255, 0.03)',
              border: `2px solid ${currentMode === 'sign' ? 'var(--secondary)' : 'var(--border-glass)'}`,
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.25s ease',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: currentMode === 'sign' ? '0 0 25px var(--secondary-glow)' : 'none'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(236,72,153,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Hand color="var(--secondary)" size={24} />
                </div>
                {currentMode === 'sign' && (
                  <span className="badge" style={{ background: 'rgba(236,72,153,0.2)', color: '#F472B6', border: '1px solid #EC4899', padding: '4px 8px' }}>
                    <Check size={12} /> Active
                  </span>
                )}
              </div>
              <h3 style={{ fontSize: '1.15rem', color: '#FFFFFF', marginBottom: '6px' }}>
                🤟 Sign Language Mode
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                Visual Indian Sign Language gestures, fingerspelling cards & deaf-friendly reading.
              </p>
            </div>

            <div style={{ marginTop: '16px', fontSize: '0.8rem', color: 'var(--secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>Select Sign Mode</span>
              <ArrowRight size={14} />
            </div>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="btn-secondary"
          style={{ width: '100%', padding: '12px', fontSize: '0.9rem' }}
        >
          Continue with Current Choice ({currentMode === 'sign' ? '🤟 Sign Language' : '🎧 TTS Audio'})
        </button>
      </div>
    </div>
  );
}
