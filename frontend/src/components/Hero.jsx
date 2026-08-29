import React, { useEffect, useRef } from 'react';
import { Sparkles, BookOpen, Smile, Mic, Volume2, ShieldCheck, ArrowRight, Play } from 'lucide-react';
import gsap from 'gsap';
import EmotionCharacter from './EmotionCharacter';

export default function Hero({ onStartReading, onScanEmotion, activeEmotion, setActiveEmotion }) {
  const heroRef = useRef(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!heroRef.current) return;

    gsap.fromTo(
      heroRef.current.querySelectorAll('.hero-anim'),
      { opacity: 0, y: 25 },
      { opacity: 1, y: 0, duration: 0.7, stagger: 0.12, ease: 'power2.out' }
    );
  }, []);

  const emotionsList = [
    { id: 'happy', label: 'Happy', emoji: '🌟' },
    { id: 'sad', label: 'Gentle', emoji: '🌧️' },
    { id: 'angry', label: 'Fiery', emoji: '🔥' },
    { id: 'fear', label: 'Brave', emoji: '🛡️' },
    { id: 'surprised', label: 'Curious', emoji: '✨' },
    { id: 'calm', label: 'Peaceful', emoji: '🌿' }
  ];

  return (
    <section
      ref={heroRef}
      style={{
        padding: '60px 24px 80px',
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center'
      }}
    >
      {/* 21st.dev Top Announcement Pill */}
      <div
        className="hero-anim"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 18px',
          borderRadius: 'var(--radius-full)',
          background: 'rgba(99, 102, 241, 0.12)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          marginBottom: '24px',
          boxShadow: '0 0 20px rgba(99, 102, 241, 0.2)'
        }}
      >
        <Sparkles size={16} color="var(--primary-light)" />
        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#C7D2FE' }}>
          Next-Gen AI Emotional Storytelling & Speech Lab
        </span>
      </div>

      {/* Main Headline */}
      <h1
        className="hero-anim fun-font"
        style={{
          fontSize: 'clamp(2.4rem, 5vw, 4.2rem)',
          fontWeight: 800,
          lineHeight: 1.15,
          marginBottom: '20px',
          maxWidth: '900px'
        }}
      >
        Stories that{' '}
        <span
          style={{
            background: 'linear-gradient(135deg, #818CF8 0%, #EC4899 50%, #F59E0B 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          feel your emotions
        </span>{' '}
        and speak your heart.
      </h1>

      {/* Subtitle */}
      <p
        className="hero-anim"
        style={{
          fontSize: 'clamp(1.05rem, 2vw, 1.25rem)',
          color: 'var(--text-muted)',
          maxWidth: '720px',
          marginBottom: '36px',
          lineHeight: 1.6
        }}
      >
        An immersive, accessible reading world powered by real-time emotion detection, dynamic actor voices (XTTS), 
        stuttering fluency coaching, and Indian Sign Language animations.
      </p>

      {/* Interactive Mascot Preview & Emotion Selector */}
      <div
        className="hero-anim glass-card"
        style={{
          padding: '24px 32px',
          marginBottom: '40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          width: '100%',
          maxWidth: '680px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <EmotionCharacter emotion={activeEmotion} size="large" />
          <div style={{ textAlign: 'left', maxWidth: '340px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Current Narrative Mood
            </div>
            <h3 style={{ fontSize: '1.4rem', color: 'var(--text-main)', margin: '4px 0 8px' }}>
              Adaptive Voice & Pace Active
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              Click any mood below to test how the reader shifts its voice cadence, actor pitch, and visual character:
            </p>
          </div>
        </div>

        {/* Emotion Switcher Buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
          {emotionsList.map((e) => (
            <button
              key={e.id}
              onClick={() => setActiveEmotion(e.id)}
              className={`badge badge-${e.id}`}
              style={{
                cursor: 'pointer',
                padding: '8px 14px',
                fontSize: '0.85rem',
                borderWidth: activeEmotion === e.id ? '2px' : '1px',
                transform: activeEmotion === e.id ? 'scale(1.08)' : 'none',
                boxShadow: activeEmotion === e.id ? '0 0 15px rgba(255,255,255,0.2)' : 'none'
              }}
              aria-label={`Switch emotion mood to ${e.label}`}
            >
              <span>{e.emoji}</span>
              <span>{e.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* CTA Buttons */}
      <div
        className="hero-anim"
        style={{
          display: 'flex',
          gap: '16px',
          flexWrap: 'wrap',
          justifyContent: 'center',
          marginBottom: '60px'
        }}
      >
        <button
          onClick={onStartReading}
          className="btn-fun"
          style={{ padding: '16px 36px', fontSize: '1.15rem' }}
          aria-label="Start interactive story reader"
        >
          <BookOpen size={22} />
          <span>Start Story Adventure</span>
          <ArrowRight size={18} />
        </button>

        <button
          onClick={onScanEmotion}
          className="btn-secondary"
          style={{ padding: '16px 28px', fontSize: '1rem' }}
          aria-label="Scan or detect your mood"
        >
          <Smile size={20} color="var(--primary-light)" />
          <span>Scan My Mood</span>
        </button>
      </div>

      {/* Key Feature Cards */}
      <div
        className="hero-anim"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '20px',
          width: '100%',
          marginTop: '20px'
        }}
      >
        <div className="glass-card" style={{ padding: '24px', textAlign: 'left' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
            <Volume2 color="#818CF8" size={22} />
          </div>
          <h4 style={{ fontSize: '1.15rem', marginBottom: '6px' }}>XTTS Actor Voices</h4>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            Experience rich multi-character narration with dynamic emotion-adjusted pitch and timing.
          </p>
        </div>

        <div className="glass-card" style={{ padding: '24px', textAlign: 'left' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(236,72,153,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
            <Mic color="#F472B6" size={22} />
          </div>
          <h4 style={{ fontSize: '1.15rem', marginBottom: '6px' }}>Stutter Fluency Lab</h4>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            Real-time acoustic analysis helps children read calmly with syllable pacing guidance.
          </p>
        </div>

        <div className="glass-card" style={{ padding: '24px', textAlign: 'left' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
            <ShieldCheck color="#FBBF24" size={22} />
          </div>
          <h4 style={{ fontSize: '1.15rem', marginBottom: '6px' }}>Accessible & Inclusive</h4>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            Screen-reader ready, reduced-motion friendly, and paired with Indian Sign Language gestures.
          </p>
        </div>
      </div>
    </section>
  );
}
