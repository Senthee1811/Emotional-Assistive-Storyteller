import React from 'react';
import { BookOpen, Smile, Mic, Hand, User, Sparkles, LogOut } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, activeEmotion, user, onLogout }) {
  const navItems = [
    { id: 'home', label: 'Home', icon: Sparkles },
    { id: 'stories', label: 'Story Reader', icon: BookOpen },
    { id: 'emotion', label: 'Emotion Scanner', icon: Smile },
    { id: 'stutter', label: 'Stutter Lab', icon: Mic },
    { id: 'sign', label: 'Sign Language', icon: Hand }
  ];

  const emotionEmojis = {
    happy: '🌟 Happy',
    sad: '🌧️ Gentle',
    angry: '🔥 Fiery',
    fear: '🛡️ Brave',
    surprised: '✨ Curious',
    calm: '🌿 Calm'
  };

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: 'rgba(11, 15, 25, 0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border-glass)',
        padding: '12px 24px'
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        {/* Brand */}
        <button
          onClick={() => setActiveTab('home')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'transparent',
            color: 'inherit',
            textAlign: 'left'
          }}
          aria-label="Go to Home"
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #6366F1 0%, #EC4899 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 15px var(--primary-glow)'
            }}
          >
            <Sparkles color="#FFFFFF" size={22} />
          </div>
          <div>
            <span
              className="brand-title"
              style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                background: 'linear-gradient(90deg, #FFFFFF, #C7D2FE)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              EmotionReader
            </span>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Interactive AI Storytelling</div>
          </div>
        </button>

        {/* Navigation Tabs */}
        <nav
          aria-label="Main Navigation"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--bg-glass)',
            padding: '4px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border-glass)'
          }}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  background: isActive ? 'var(--primary)' : 'transparent',
                  color: isActive ? '#FFFFFF' : 'var(--text-muted)',
                  boxShadow: isActive ? '0 2px 10px var(--primary-glow)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right side status & Auth */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Active Emotion Pill */}
          <div
            className={`badge badge-${activeEmotion}`}
            title="Current active emotion context"
            style={{ padding: '6px 14px', fontSize: '0.85rem' }}
          >
            {emotionEmojis[activeEmotion] || activeEmotion}
          </div>

          {/* Login / User Status */}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-full)',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid var(--border-glass)',
                  fontSize: '0.85rem',
                  color: 'var(--text-main)'
                }}
              >
                <User size={15} color="var(--primary-light)" />
                <span style={{ fontWeight: 600 }}>{user.username || user.email || 'Friend'}</span>
              </div>
              <button
                onClick={onLogout}
                title="Log out"
                aria-label="Log out"
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#EF4444',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  padding: '8px',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setActiveTab('login')}
              className="btn-primary"
              style={{ padding: '8px 18px', fontSize: '0.88rem' }}
              aria-label="Go to login page"
            >
              <User size={16} />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
