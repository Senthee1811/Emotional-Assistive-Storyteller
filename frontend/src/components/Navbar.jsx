import React from 'react';

export default function Navbar({ activeTab, setActiveTab, user, onOpenAuth, onLogout }) {
  return (
    <nav style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 32px',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      background: 'rgba(15, 23, 42, 0.8)',
      backdropFilter: 'blur(12px)',
      sticky: 'top'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          fontSize: '1.2rem'
        }}>📖</div>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800' }}>StoryPal</h2>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Emotional Child Reader Microservices</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        {[
          { id: 'emotion', label: '😊 Emotion Reader' },
          { id: 'stories', label: '📚 Story Hub' },
          { id: 'stutter', label: '🎙️ Speech Helper' },
          { id: 'sign', label: '🤟 Sign Language' },
          { id: 'tts', label: '🔊 TTS Synthesizer' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}
            style={{ fontSize: '0.85rem' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div>
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>👋 {user.child_name || user.email}</span>
            <button onClick={onLogout} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Logout</button>
          </div>
        ) : (
          <button onClick={onOpenAuth} className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>Login / Register</button>
        )}
      </div>
    </nav>
  );
}
