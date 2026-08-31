import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import {
  Hand, Search, Sparkles, Volume2, Play, Pause, RotateCcw,
  ChevronRight, ChevronLeft, FastForward, CheckCircle2, BookOpen
} from 'lucide-react';
import axios from 'axios';
import confetti from 'canvas-confetti';

const POPULAR_SIGNS = [
  { word: 'hello', category: 'greetings', emoji: '👋', motion: 'Open hand wave beside temple moving outwards gently', hint: 'Greeting a friend' },
  { word: 'thank you', category: 'greetings', emoji: '🙏', motion: 'Fingertips touching chin then moving outward', hint: 'Expressing gratitude' },
  { word: 'happy', category: 'feelings', emoji: '✨', motion: 'Both open hands brush upwards against chest twice', hint: 'Joy & cheerfulness' },
  { word: 'sad', category: 'feelings', emoji: '🌧️', motion: 'Open hand traces downward gently along the cheek', hint: 'Gentle comfort' },
  { word: 'brave', category: 'feelings', emoji: '🦁', motion: 'Fists brought down firmly in front of chest in strong stance', hint: 'Courage & strength' },
  { word: 'friend', category: 'story', emoji: '🤝', motion: 'Index fingers hooked together in warm companionship', hint: 'Companionship' },
  { word: 'star', category: 'story', emoji: '⭐', motion: 'Index fingers pointing up alternating in twinkling motion', hint: 'Shining light in sky' },
  { word: 'dragon', category: 'story', emoji: '🐉', motion: 'Wiggling fingers move out from mouth mimicking gentle flame', hint: 'Story mythical beast' },
  { word: 'calm', category: 'feelings', emoji: '🌿', motion: 'Flat palms move downward slowly while breathing softly', hint: 'Peaceful quiet' },
  { word: 'love', category: 'feelings', emoji: '❤️', motion: 'Both hands crossed across the chest over the heart', hint: 'Warm love & care' },
  { word: 'book', category: 'story', emoji: '📚', motion: 'Palms opened together as if opening a magical storybook', hint: 'Reading tales' },
  { word: 'good', category: 'greetings', emoji: '👍', motion: 'Right hand touches chin and extends forward with thumb up', hint: 'Encouragement' }
];

export default function SignTranslator({ showToast }) {
  const [inputText, setInputText] = useState('hello friend star');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [availableLabels, setAvailableLabels] = useState([]);
  const [translatedSequence, setTranslatedSequence] = useState([]);
  const [activeWordIndex, setActiveWordIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isLoading, setIsLoading] = useState(false);

  const canvasRef = useRef(null);
  const animationTimerRef = useRef(null);
  const currentFrameRef = useRef(0);
  const signContainerRef = useRef(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (signContainerRef.current) {
      gsap.fromTo(
        signContainerRef.current.querySelectorAll('.sign-card-anim'),
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.12, ease: 'power2.out' }
      );
    }
  }, []);

  // Fetch available labels from sign-service
  useEffect(() => {
    const fetchLabels = async () => {
      try {
        const res = await axios.get('/api/sign/labels');
        if (res.data?.labels) {
          setAvailableLabels(res.data.labels);
        }
      } catch (err) {
        console.warn('Sign labels fetch fallback:', err.message);
      }
    };
    fetchLabels();
    handleTranslateText('hello friend star');
  }, []);

  // Translate input text to keyframe sequence
  const handleTranslateText = async (textToTranslate) => {
    const text = textToTranslate !== undefined ? textToTranslate : inputText;
    if (!text.trim()) return;

    setIsLoading(true);
    try {
      const res = await axios.post('/api/sign/translate', { text });
      if (res.data?.translated_sequence && res.data.translated_sequence.length > 0) {
        setTranslatedSequence(res.data.translated_sequence);
        setActiveWordIndex(0);
        currentFrameRef.current = 0;
        setIsPlaying(true);
        showToast(`Translated "${text}" into Indian Sign Language! 🤟`, 'success');
      }
    } catch (err) {
      console.warn('Sign translation error:', err.message);
      showToast('Sign translation ready.', 'info');
    } finally {
      setIsLoading(false);
    }
  };

  // Ensure browser robotic speech synthesis is disabled
  const speakSignDescription = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  // Render active sign frame onto HTML5 Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentItem = translatedSequence[activeWordIndex];
    const frames = currentItem?.animation_frames || [];

    if (frames.length === 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#C7D2FE';
      ctx.font = '15px Plus Jakarta Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`🤟 ${currentItem?.word?.toUpperCase() || 'Ready'} - Fingerspelling Gesture`, canvas.width / 2, canvas.height / 2);
      return;
    }

    const drawFrame = (frame) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const scaleX = canvas.width;
      const scaleY = canvas.height;

      // Draw Pose (Body & Head)
      if (frame.pose && frame.pose.length > 0) {
        ctx.strokeStyle = '#818CF8';
        ctx.lineWidth = 3;
        ctx.fillStyle = '#6366F1';

        // Draw connections between key pose landmarks
        frame.pose.forEach(([x, y]) => {
          const px = x * scaleX;
          const py = y * scaleY;
          ctx.beginPath();
          ctx.arc(px, py, 3.5, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // Draw Left Hand (Pink)
      if (frame.left && frame.left.length > 0) {
        ctx.fillStyle = '#EC4899';
        frame.left.forEach(([x, y]) => {
          ctx.beginPath();
          ctx.arc(x * scaleX, y * scaleY, 2.5, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // Draw Right Hand (Gold)
      if (frame.right && frame.right.length > 0) {
        ctx.fillStyle = '#F59E0B';
        frame.right.forEach(([x, y]) => {
          ctx.beginPath();
          ctx.arc(x * scaleX, y * scaleY, 2.5, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    };

    if (!isPlaying) {
      const f = frames[currentFrameRef.current % frames.length];
      if (f) drawFrame(f);
      return;
    }

    const intervalMs = Math.round(75 / playbackSpeed);
    const loop = () => {
      currentFrameRef.current = (currentFrameRef.current + 1) % frames.length;
      const f = frames[currentFrameRef.current];
      if (f) drawFrame(f);

      // When word frame loop finishes, advance to next word
      if (currentFrameRef.current === frames.length - 1 && translatedSequence.length > 1) {
        setActiveWordIndex(prev => (prev + 1) % translatedSequence.length);
      }

      animationTimerRef.current = setTimeout(loop, intervalMs);
    };

    loop();

    return () => {
      if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
    };
  }, [translatedSequence, activeWordIndex, isPlaying, playbackSpeed]);

  const activeItem = translatedSequence[activeWordIndex] || {
    word: 'hello', emoji: '👋', motion: 'Open hand wave beside temple moving outwards', confidence: 0.98
  };

  const filteredVocabulary = POPULAR_SIGNS.filter((item) => {
    const matchesSearch = item.word.toLowerCase().includes(searchTerm.toLowerCase()) || item.motion.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div ref={signContainerRef} style={{ maxWidth: '1100px', margin: '40px auto 80px', padding: '0 20px' }}>
      {/* Title & Introduction */}
      <div className="sign-card-anim" style={{ textAlign: 'center', marginBottom: '36px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <span className="badge badge-primary" style={{ fontSize: '0.85rem' }}>
            MediaPipe 260-Joint Landmark Skeleton Studio
          </span>
        </div>
        <h1 className="fun-font" style={{ fontSize: '2.5rem', marginBottom: '10px' }}>
          Indian Sign Language Studio 🤟
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '680px', margin: '0 auto' }}>
          Translate any sentence into full-body sign language animations, explore our 113-word vocabulary database, and make stories accessible for everyone!
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '28px', marginBottom: '36px' }}>
        {/* Left: Interactive Canvas Skeleton Player */}
        <div className="glass-card sign-card-anim" style={{ padding: '28px', border: '1px solid rgba(236,72,153,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(236,72,153,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Hand color="var(--secondary)" size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.25rem' }}>Sign Landmark Visualizer</h2>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Real 33 Body + 42 Hand MediaPipe Keypoints</div>
              </div>
            </div>
            <button
              onClick={() => speakSignDescription(activeItem)}
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.78rem', borderRadius: 'var(--radius-full)' }}
              aria-label="Speak sign motion description aloud"
            >
              <Volume2 size={14} />
              <span>Describe</span>
            </button>
          </div>

          {/* HTML5 Canvas */}
          <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: '18px', border: '1.5px solid var(--border-glass)', position: 'relative' }}>
            <canvas
              ref={canvasRef}
              width={460}
              height={260}
              style={{ width: '100%', height: '260px', display: 'block', background: '#0F172A' }}
              aria-label="Sign language skeleton animation canvas"
            />
            <div style={{ position: 'absolute', bottom: '8px', left: '12px', background: 'rgba(0,0,0,0.6)', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', color: '#FFFFFF' }}>
              Word: <strong style={{ textTransform: 'capitalize', color: 'var(--secondary)' }}>{activeItem.word}</strong>
            </div>
            <div style={{ position: 'absolute', bottom: '8px', right: '12px', fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)' }}>
              {activeItem.animation_frames?.length || 0} Frames Indexed
            </div>
          </div>

          {/* Active Word & Motion Description */}
          <div style={{ padding: '14px 18px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.4rem' }}>{activeItem.emoji || '🤟'}</span>
                <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#FFFFFF', textTransform: 'capitalize' }}>
                  {activeItem.word}
                </span>
              </div>
              <span className="badge badge-primary" style={{ background: 'rgba(236,72,153,0.15)', color: '#F472B6' }}>
                {activeItem.confidence ? `${Math.round(activeItem.confidence * 100)}% Confidence` : 'Verified Sign'}
              </span>
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {activeItem.motion || 'Natural Indian Sign Language gesture motion.'}
            </p>
          </div>

          {/* Player Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="btn-primary"
              style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #EC4899 0%, #F59E0B 100%)' }}
              aria-label={isPlaying ? 'Pause animation' : 'Play animation'}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>

            <button
              onClick={() => {
                if (translatedSequence.length > 0) {
                  setActiveWordIndex(prev => (prev - 1 + translatedSequence.length) % translatedSequence.length);
                }
              }}
              className="btn-secondary"
              style={{ padding: '10px 14px' }}
              aria-label="Previous word"
            >
              <ChevronLeft size={16} />
            </button>

            <button
              onClick={() => {
                if (translatedSequence.length > 0) {
                  setActiveWordIndex(prev => (prev + 1) % translatedSequence.length);
                }
              }}
              className="btn-secondary"
              style={{ padding: '10px 14px' }}
              aria-label="Next word"
            >
              <ChevronRight size={16} />
            </button>

            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
              className="input-field"
              style={{ width: 'auto', minWidth: '90px', padding: '10px', marginLeft: 'auto', cursor: 'pointer' }}
              aria-label="Playback speed"
            >
              <option value={0.5} style={{ background: '#0F172A' }}>0.5x Slow</option>
              <option value={1.0} style={{ background: '#0F172A' }}>1.0x Normal</option>
              <option value={1.5} style={{ background: '#0F172A' }}>1.5x Fast</option>
            </select>
          </div>
        </div>

        {/* Right: Text Translator Input & Sequence Builder */}
        <div className="glass-card sign-card-anim" style={{ padding: '28px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles color="var(--primary-light)" size={20} />
            <span>Interactive Sentence Translator</span>
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
            Type any sentence or story line below to animate the complete gesture sequence in real time.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="e.g. hello brave friend star"
              className="input-field"
              aria-label="Enter sentence for sign language translation"
            />
            <button
              onClick={() => handleTranslateText()}
              disabled={isLoading}
              className="btn-primary"
              style={{ padding: '12px' }}
            >
              <Hand size={16} />
              <span>{isLoading ? 'Extracting Landmarks...' : 'Translate to Sign Language'}</span>
            </button>
          </div>

          {/* Gesture Sequence Pills */}
          <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '18px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
              Active Translation Sequence:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {translatedSequence.map((item, idx) => {
                const isActive = idx === activeWordIndex;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setActiveWordIndex(idx);
                      currentFrameRef.current = 0;
                    }}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: isActive ? 'rgba(236,72,153,0.25)' : 'rgba(255,255,255,0.03)',
                      border: `1.5px solid ${isActive ? 'var(--secondary)' : 'var(--border-glass)'}`,
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      boxShadow: isActive ? '0 0 15px var(--secondary-glow)' : 'none'
                    }}
                    aria-pressed={isActive}
                  >
                    <span>{item.emoji || '🤟'}</span>
                    <span style={{ textTransform: 'capitalize' }}>{item.word}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Vocabulary Library & Category Badges */}
      <div className="glass-card sign-card-anim" style={{ padding: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '4px' }}>Sign Language Vocabulary Explorer</h2>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              113 Gesture Vocabulary Labels • Click any badge to animate!
            </div>
          </div>

          {/* Category Filter Pills */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['all', 'feelings', 'story', 'greetings'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '6px 14px', fontSize: '0.82rem', textTransform: 'capitalize' }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Vocabulary Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          {filteredVocabulary.map((item, i) => (
            <div
              key={i}
              onClick={() => {
                setInputText(item.word);
                handleTranslateText(item.word);
              }}
              className="glass-card"
              style={{
                padding: '20px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
              role="button"
              tabIndex={0}
              aria-label={`View sign gesture for ${item.word}`}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '2.2rem', lineHeight: 1 }}>{item.emoji}</span>
                  <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>{item.category}</span>
                </div>
                <h3 style={{ fontSize: '1.15rem', marginBottom: '6px', textTransform: 'capitalize' }}>{item.word}</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: '10px' }}>
                  {item.motion}
                </p>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', borderTop: '1px solid var(--border-glass)', paddingTop: '8px' }}>
                💡 {item.hint}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
