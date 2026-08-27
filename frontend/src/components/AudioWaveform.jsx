import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function AudioWaveform({ isPlaying, isGenerating }) {
  const barsRef = useRef([]);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) return;

    if (isPlaying) {
      barsRef.current.forEach((bar, i) => {
        if (!bar) return;
        gsap.to(bar, {
          scaleY: 'random(0.2, 1.8)',
          duration: 0.25 + (i % 4) * 0.05,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut'
        });
      });
    } else {
      barsRef.current.forEach((bar) => {
        if (!bar) return;
        gsap.killTweensOf(bar);
        gsap.to(bar, { scaleY: 0.3, duration: 0.3, ease: 'power2.out' });
      });
    }

    return () => {
      barsRef.current.forEach((bar) => bar && gsap.killTweensOf(bar));
    };
  }, [isPlaying]);

  return (
    <div className="flex items-center justify-center gap-1.5 h-12 py-2 px-4 bg-slate-900/80 border border-slate-800 rounded-xl" aria-hidden="true">
      {[...Array(9)].map((_, i) => (
        <span
          key={i}
          ref={(el) => (barsRef.current[i] = el)}
          className={`w-1.5 h-8 rounded-full transition-colors ${
            isPlaying ? 'bg-gradient-to-t from-brand-500 to-pink-500' : 'bg-slate-700'
          }`}
          style={{ transform: 'scaleY(0.3)' }}
        />
      ))}
    </div>
  );
}
