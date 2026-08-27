import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function EmotionCharacter({ emotion }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.killTweensOf(ref.current);

    if (emotion === 'happy') {
      gsap.to(ref.current, { y: -10, duration: 0.35, repeat: 3, yoyo: true, ease: 'bounce.out' });
    } else if (emotion === 'sad') {
      gsap.to(ref.current, { rotation: -6, duration: 1, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    } else if (emotion === 'angry') {
      gsap.to(ref.current, { x: 'random(-3,3)', duration: 0.07, repeat: 6, yoyo: true });
    } else if (emotion === 'fear') {
      gsap.to(ref.current, { scale: 0.92, duration: 0.15, repeat: 4, yoyo: true });
    }

    return () => { if (ref.current) gsap.killTweensOf(ref.current); };
  }, [emotion]);

  const emoji = { happy: '😸', sad: '🌧️', angry: '🦁', fear: '🐿️', surprise: '✨', neutral: '🐻' }[emotion] || '🐻';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px' }}>
      <div ref={ref} style={{
        width: 64, height: 64, borderRadius: 'var(--radius-lg)',
        background: 'linear-gradient(135deg, var(--brand-600), var(--pink-500))',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem',
        boxShadow: '0 6px 20px rgba(92,124,250,0.2)'
      }} aria-label={`Character: ${emotion || 'neutral'} mood`}>
        {emoji}
      </div>
      <span style={{
        marginTop: 10, fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.06em', color: '#94a3b8'
      }}>
        {emotion || 'Neutral'}
      </span>
    </div>
  );
}
