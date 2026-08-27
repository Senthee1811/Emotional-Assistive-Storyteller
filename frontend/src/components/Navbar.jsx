import React, { useState } from 'react';
import { BookOpen, Brain, Volume2, Mic, Hand, User, LogOut, Sparkles } from 'lucide-react';

const TABS = [
  { id: 'stories', label: 'Stories', icon: BookOpen },
  { id: 'emotion', label: 'Emotion', icon: Brain },
  { id: 'tts', label: 'Voice Studio', icon: Volume2 },
  { id: 'stutter', label: 'Speech', icon: Mic },
  { id: 'sign', label: 'Sign', icon: Hand },
];

export default function Navbar({ activeTab, setActiveTab, user, onOpenAuth, onLogout }) {
  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--brand-600), var(--pink-500))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(92,124,250,0.3)'
          }}>
            <Sparkles size={18} color="white" />
          </div>
          <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '1.1rem', color: 'white', letterSpacing: '-0.02em' }}>
            StoryPal
          </span>
        </div>

        {/* Tab Navigation */}
        <div className="nav-tabs">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* User Area */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {user ? (
            <>
              <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>{user.child_name || user.email}</span>
              <button className="btn btn-ghost btn-sm" onClick={onLogout}>
                <LogOut size={14} />
              </button>
            </>
          ) : (
            <button className="btn btn-secondary btn-sm" onClick={onOpenAuth}>
              <User size={14} />
              Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
