import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function EmotionCharacter({ emotion }) {
  const avatarRef = useRef(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!avatarRef.current || prefersReducedMotion) return;

    gsap.killTweensOf(avatarRef.current);

    if (emotion === 'happy') {
      gsap.to(avatarRef.current, {
        y: -12,
        duration: 0.4,
        repeat: 3,
        yoyo: true,
        ease: 'bounce.out'
      });
    } else if (emotion === 'sad') {
      gsap.to(avatarRef.current, {
        rotation: -8,
        duration: 1.2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });
    } else if (emotion === 'angry') {
      gsap.to(avatarRef.current, {
        x: 'random(-4, 4)',
        duration: 0.08,
        repeat: 8,
        yoyo: true
      });
    } else if (emotion === 'fear') {
      gsap.to(avatarRef.current, {
        scale: 0.9,
        duration: 0.2,
        repeat: 5,
        yoyo: true
      });
    }

    return () => {
      if (avatarRef.current) gsap.killTweensOf(avatarRef.current);
    };
  }, [emotion]);

  const getEmoji = () => {
    switch (emotion) {
      case 'happy': return '😸';
      case 'sad': return '🌧️';
      case 'angry': return '🦁';
      case 'fear': return '🐿️';
      default: return '🐻';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div
        ref={avatarRef}
        className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-brand-600 to-pink-600 flex items-center justify-center text-4xl shadow-xl shadow-brand-500/20"
        aria-label={`Character reacting with ${emotion || 'neutral'} emotion`}
      >
        {getEmoji()}
      </div>
      <span className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-300">
        Mood Pal: {emotion || 'Neutral'}
      </span>
    </div>
  );
}
