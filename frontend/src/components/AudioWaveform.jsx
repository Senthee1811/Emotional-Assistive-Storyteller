import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function AudioWaveform({ isPlaying }) {
  const barsRef = useRef([]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    if (isPlaying) {
      barsRef.current.forEach((bar, i) => {
        if (!bar) return;
        gsap.to(bar, { scaleY: 0.3 + Math.random() * 1.5, duration: 0.2 + (i % 4) * 0.04, repeat: -1, yoyo: true, ease: 'sine.inOut' });
      });
    } else {
      barsRef.current.forEach((bar) => {
        if (!bar) return;
        gsap.killTweensOf(bar);
        gsap.to(bar, { scaleY: 0.3, duration: 0.3, ease: 'power2.out' });
      });
    }

    return () => barsRef.current.forEach((bar) => bar && gsap.killTweensOf(bar));
  }, [isPlaying]);

  return (
    <div aria-hidden="true" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
      height: 40, padding: '4px 14px',
      background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.06)',
      borderRadius: 'var(--radius-md)'
    }}>
      {[...Array(9)].map((_, i) => (
        <span key={i} ref={(el) => (barsRef.current[i] = el)} style={{
          width: 4, height: 28, borderRadius: 999,
          background: isPlaying
            ? 'linear-gradient(to top, var(--brand-500), var(--pink-400))'
            : 'rgba(71,85,105,0.5)',
          transform: 'scaleY(0.3)', transformOrigin: 'bottom'
        }} />
      ))}
    </div>
  );
}
