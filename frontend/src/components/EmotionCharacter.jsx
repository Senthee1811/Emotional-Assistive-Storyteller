import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function EmotionCharacter({ emotion = 'happy', size = 'normal' }) {
  const characterRef = useRef(null);

  useEffect(() => {
    if (!characterRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    gsap.killTweensOf(characterRef.current);

    if (emotion === 'happy') {
      gsap.to(characterRef.current, {
        y: -12,
        duration: 0.4,
        repeat: 3,
        yoyo: true,
        ease: 'power1.inOut'
      });
    } else if (emotion === 'sad') {
      gsap.to(characterRef.current, {
        rotation: -8,
        duration: 1.2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });
    } else if (emotion === 'angry') {
      gsap.to(characterRef.current, {
        x: 'random(-4, 4)',
        duration: 0.08,
        repeat: 6,
        yoyo: true,
        ease: 'none'
      });
    } else if (emotion === 'fear') {
      gsap.to(characterRef.current, {
        scale: 0.9,
        duration: 0.15,
        repeat: 4,
        yoyo: true,
        ease: 'power2.inOut'
      });
    } else if (emotion === 'surprised') {
      gsap.fromTo(
        characterRef.current,
        { scale: 0.85, rotation: 0 },
        { scale: 1.15, rotation: 360, duration: 0.7, ease: 'back.out(1.7)' }
      );
    } else {
      // calm / neutral
      gsap.to(characterRef.current, {
        y: -4,
        duration: 1.8,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });
    }
  }, [emotion]);

  const emotionData = {
    happy: { emoji: '🌟', bg: 'rgba(16, 185, 129, 0.2)', border: '#10B981', label: 'Joyful Buddy', sound: 'Woohoo!' },
    sad: { emoji: '🌧️', bg: 'rgba(56, 189, 248, 0.2)', border: '#38BDF8', label: 'Gentle Buddy', sound: 'It gets better' },
    angry: { emoji: '🔥', bg: 'rgba(239, 68, 68, 0.2)', border: '#EF4444', label: 'Fiery Buddy', sound: 'Deep breath in!' },
    fear: { emoji: '🛡️', bg: 'rgba(168, 85, 247, 0.2)', border: '#A855F7', label: 'Brave Buddy', sound: 'You are safe!' },
    surprised: { emoji: '✨', bg: 'rgba(245, 158, 11, 0.2)', border: '#F59E0B', label: 'Curious Buddy', sound: 'Wow exciting!' },
    calm: { emoji: '🌿', bg: 'rgba(20, 184, 166, 0.2)', border: '#14B8A6', label: 'Peaceful Buddy', sound: 'Ahhh calm...' }
  };

  const curr = emotionData[emotion.toLowerCase()] || emotionData.happy;
  const isLarge = size === 'large';

  return (
    <div
      ref={characterRef}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isLarge ? '28px' : '16px',
        borderRadius: 'var(--radius-xl)',
        background: curr.bg,
        border: `2px solid ${curr.border}`,
        boxShadow: `0 10px 25px -5px ${curr.border}44`,
        transition: 'background 0.4s ease, border-color 0.4s ease',
        userSelect: 'none'
      }}
    >
      <span style={{ fontSize: isLarge ? '4rem' : '2.5rem', lineHeight: 1 }}>{curr.emoji}</span>
      <span
        style={{
          marginTop: '8px',
          fontWeight: 700,
          fontSize: isLarge ? '1rem' : '0.8rem',
          color: 'var(--text-main)',
          fontFamily: 'var(--font-display)'
        }}
      >
        {curr.label}
      </span>
      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>"{curr.sound}"</span>
    </div>
  );
}
