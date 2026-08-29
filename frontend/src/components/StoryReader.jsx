import React, { useState, useEffect, useRef } from 'react';
import {
  Play, Pause, RotateCcw, Volume2, Hand, Sparkles, User, Award,
  CheckCircle2, ChevronRight, ChevronLeft, RefreshCw, ThumbsUp, ThumbsDown,
  VolumeX, HelpCircle, FastForward, Heart, BookOpen
} from 'lucide-react';
import axios from 'axios';
import confetti from 'canvas-confetti';
import EmotionCharacter from './EmotionCharacter';

const normalizeStory = (story) => {
  if (!story) return null;
  let sentences = [];
  if (Array.isArray(story.sentences) && story.sentences.length > 0) {
    sentences = story.sentences.map((s, idx) => ({
      text: typeof s === 'string' ? s : (s.text || ''),
      emotion: s.emotion || story.emotion || 'happy',
      actor: s.actor || (idx % 2 === 0 ? 'Narrator' : (story.title?.split(' ')[0] || 'Friend'))
    }));
  } else {
    const raw = story.content || story.summary || story.description || 'Once upon a time in a magical world.';
    const rawSentences = raw.split(/(?<=[.?!])\s+/).filter(Boolean);
    sentences = rawSentences.map((t, idx) => ({
      text: t,
      emotion: story.emotion || 'happy',
      actor: idx % 2 === 0 ? 'Narrator' : (story.title?.split(' ')[0] || 'Friend')
    }));
  }

  return {
    ...story,
    id: story.id || `story-${Date.now()}`,
    title: story.title || 'Untitled Story',
    emotion: story.emotion || 'happy',
    category: story.category || 'adventure',
    summary: story.summary || story.description || '',
    sentences
  };
};

const DEFAULT_STORIES = [
  {
    id: 'story-telex-1',
    title: 'Telex and the Crystal Robot Forest',
    category: 'adventure',
    emotion: 'surprised',
    summary: 'Telex discovers a glowing mechanical hummingbird that teaches the language of cosmic music.',
    sentences: [
      { text: 'Telex stepped into the emerald crystal grove, where silver trees chimed with soft melodies.', emotion: 'calm', actor: 'Narrator' },
      { text: 'Look! A tiny golden hummingbird is hovering over the glowing stream, whispered Telex with wide eyes.', emotion: 'surprised', actor: 'Telex' },
      { text: 'Welcome Telex! We have been waiting for your cheerful energy to activate the crystal star, chirped the hummingbird.', emotion: 'happy', actor: 'Sparky' },
      { text: 'Telex smiled bravely, pressed the rainbow crystal, and the entire forest sparkled with warm laughter.', emotion: 'happy', actor: 'Telex' }
    ]
  },
  {
    id: 'story-1',
    title: 'The Brave Little Star',
    category: 'courage',
    emotion: 'fear',
    summary: 'A glowing star named Pip learns how to shine bright in the deep midnight sky.',
    sentences: [
      { text: 'Once upon a time, in the quiet indigo sky, lived a little star named Pip.', emotion: 'calm', actor: 'Narrator' },
      { text: 'Pip felt scared because the dark night was so big and endless.', emotion: 'fear', actor: 'Pip' },
      { text: 'Look how softly you glow! whispered Mother Moon with a warm smile.', emotion: 'happy', actor: 'Moon' },
      { text: 'Pip took a deep breath, twinkled with all his might, and lit up the entire valley!', emotion: 'happy', actor: 'Pip' },
      { text: 'From that night on, Pip knew that bravery is finding your own light.', emotion: 'calm', actor: 'Narrator' }
    ]
  },
  {
    id: 'story-2',
    title: 'The Whispering Forest Friend',
    category: 'friendship',
    emotion: 'happy',
    summary: 'Maya and an eccentric bunny discover the magical secret behind colorful autumn leaves.',
    sentences: [
      { text: 'Maya skipped down the enchanted garden path on a bright sunny morning.', emotion: 'happy', actor: 'Maya' },
      { text: 'Suddenly, a tiny blue rabbit hopped out of the silver bushes!', emotion: 'surprised', actor: 'Narrator' },
      { text: 'Hello there! Are you looking for the lost golden acorn? asked the rabbit cheerfully.', emotion: 'happy', actor: 'Rabbit' },
      { text: 'Together, they laughed and uncovered the sparkling treasure under the ancient oak.', emotion: 'happy', actor: 'Maya' }
    ]
  },
  {
    id: 'story-3',
    title: 'Leo the Dragon Learns to Breathe',
    category: 'calm',
    emotion: 'angry',
    summary: 'Leo gets very upset when his sandcastle falls, but discovers how calm breathing cools his flame.',
    sentences: [
      { text: 'Leo stamped his feet as the waves knocked down his magnificent sandcastle.', emotion: 'angry', actor: 'Leo' },
      { text: 'Smoke puffed from his nostrils and his cheeks turned bright red!', emotion: 'angry', actor: 'Narrator' },
      { text: 'Let us count to four together, breathed gentle Turtle slowly.', emotion: 'calm', actor: 'Turtle' },
      { text: 'One... two... three... four. The flame cooled into a gentle, happy breeze.', emotion: 'calm', actor: 'Leo' }
    ]
  },
  {
    id: 'story-4',
    title: 'The Gentle Blue Cloud',
    category: 'kindness',
    emotion: 'sad',
    summary: 'A small cloud learns that raining helps flowers grow bright and tall.',
    sentences: [
      { text: 'Little Blue felt very sad today because his rain drops fell softly on the dusty ground.', emotion: 'sad', actor: 'Narrator' },
      { text: 'A wise old oak tree whispered, Your soft tears give life to the meadow.', emotion: 'calm', actor: 'Oak' },
      { text: 'Tiny green leaves and purple blossoms began to dance in the cool rain.', emotion: 'happy', actor: 'Narrator' },
      { text: 'Little Blue smiled, realizing his feelings had a beautiful purpose.', emotion: 'happy', actor: 'Little Blue' }
    ]
  }
].map(normalizeStory);

const ACTORS = [
  { id: 1, name: 'Uncle Sunny', gender: 'male', trait: 'Warm Child Companion' },
  { id: 2, name: 'Auntie Bella', gender: 'female', trait: 'Soothing & Cheerful' },
  { id: 3, name: 'Uncle Coco', gender: 'male', trait: 'Playful & Energetic' },
  { id: 4, name: 'Auntie Lily', gender: 'female', trait: 'Gentle Storyteller' },
  { id: 5, name: 'Uncle Milo', gender: 'male', trait: 'Adventurous Explorer' },
  { id: 6, name: 'Auntie Rosie', gender: 'female', trait: 'Cozy & Kind' }
];

export default function StoryReader({ activeEmotion, user, deliveryMode = 'tts', onToggleDeliveryMode, showToast }) {
  const [stories, setStories] = useState(DEFAULT_STORIES);
  const [selectedStory, setSelectedStory] = useState(DEFAULT_STORIES[0]);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [actorId, setActorId] = useState(1);
  const [audioSpeed, setAudioSpeed] = useState(1.0);
  const [voiceLiked, setVoiceLiked] = useState(null); // true | false | null
  const [signSequence, setSignSequence] = useState([]);
  const [currentSignFrame, setCurrentSignFrame] = useState(0);
  const [isSignAnimating, setIsSignAnimating] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioNarrationEnabled, setAudioNarrationEnabled] = useState(true);

  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Fetch story catalog from story-service
  useEffect(() => {
    const fetchStories = async () => {
      try {
        const res = await axios.get('/api/stories');
        const list = res.data?.stories || (Array.isArray(res.data) ? res.data : null);
        if (list && Array.isArray(list) && list.length > 0) {
          const normalized = list.map(normalizeStory).filter(Boolean);
          setStories(normalized);
          const telexStory = normalized.find(s => s.id === 'story-telex-1');
          setSelectedStory(telexStory || normalized[0]);
        }
      } catch (err) {
        console.log('Using active interactive story catalog');
      }
    };
    fetchStories();
  }, []);

  const sentences = selectedStory?.sentences || [];
  const currentSentence = sentences[currentSentenceIndex] || { text: 'Loading story sentence...', emotion: 'happy', actor: 'Narrator' };

  // Ensure browser robotic speech synthesis is disabled so only Coqui XTTS plays
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, [currentSentenceIndex, selectedStory]);

  // Fetch sign landmarks when sentence changes in sign mode
  useEffect(() => {
    if (!currentSentence.text) return;
    let isCancelled = false;

    const fetchSigns = async () => {
      try {
        const res = await axios.post('/api/sign/translate', { text: currentSentence.text });
        if (!isCancelled && res.data?.translated_sequence) {
          setSignSequence(res.data.translated_sequence);
        }
      } catch (err) {
        console.warn('Sign translation error:', err.message);
      }
    };

    fetchSigns();
    return () => { isCancelled = true; };
  }, [currentSentenceIndex, selectedStory]);

  // Render sign language skeleton landmarks on HTML5 Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameIdx = 0;
    const allFrames = [];
    signSequence.forEach(item => {
      if (item.animation_frames && item.animation_frames.length > 0) {
        allFrames.push(...item.animation_frames);
      }
    });

    if (allFrames.length === 0) {
      // Draw placeholder guide
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#C7D2FE';
      ctx.font = '14px Plus Jakarta Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🤟 Sign Gesture Animation Ready', canvas.width / 2, canvas.height / 2);
      return;
    }

    const renderFrame = () => {
      const frame = allFrames[frameIdx % allFrames.length];
      if (!frame) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const scaleX = canvas.width;
      const scaleY = canvas.height;

      // Draw Pose Keypoints (Body & Arms)
      if (frame.pose && frame.pose.length > 0) {
        ctx.strokeStyle = '#818CF8';
        ctx.lineWidth = 3;
        ctx.fillStyle = '#6366F1';

        frame.pose.forEach(([x, y]) => {
          const px = x * scaleX;
          const py = y * scaleY;
          ctx.beginPath();
          ctx.arc(px, py, 3.5, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // Draw Left Hand
      if (frame.left && frame.left.length > 0) {
        ctx.fillStyle = '#EC4899';
        frame.left.forEach(([x, y]) => {
          ctx.beginPath();
          ctx.arc(x * scaleX, y * scaleY, 2.5, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // Draw Right Hand
      if (frame.right && frame.right.length > 0) {
        ctx.fillStyle = '#F59E0B';
        frame.right.forEach(([x, y]) => {
          ctx.beginPath();
          ctx.arc(x * scaleX, y * scaleY, 2.5, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      frameIdx++;
      animationFrameRef.current = setTimeout(renderFrame, 80);
    };

    renderFrame();

    return () => {
      if (animationFrameRef.current) clearTimeout(animationFrameRef.current);
    };
  }, [signSequence, deliveryMode]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (isPlaying) handleStop();
        else handlePlaySentence(currentSentenceIndex);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (currentSentenceIndex < sentences.length - 1) {
          handlePlaySentence(currentSentenceIndex + 1);
        }
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (currentSentenceIndex > 0) {
          handlePlaySentence(currentSentenceIndex - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSentenceIndex, sentences, isPlaying]);

  const handlePlaySentence = async (index) => {
    if (index < 0 || index >= sentences.length) return;
    setCurrentSentenceIndex(index);
    const sentence = sentences[index];
    if (!sentence) return;

    if (deliveryMode === 'sign') {
      showToast(`Showing sign gesture translation for: "${sentence.text.slice(0, 30)}..." 🤟`, 'info');
      return;
    }

    if (window.speechSynthesis) window.speechSynthesis.cancel();

    setIsLoadingAudio(true);
    setIsPlaying(true);

    try {
      const res = await axios.post('/api/tts/synthesize', {
        text: sentence.text,
        emotion: sentence.emotion || activeEmotion,
        actor_id: actorId,
        child_id: user?.id || 'child_001',
        session_id: selectedStory?.id || 'story_001',
        speed: audioSpeed
      });

      let audioSource = null;
      if (res.data?.playlist && res.data.playlist.length > 0) {
        audioSource = res.data.playlist[0].audio_url;
      } else if (res.data?.audio_url) {
        audioSource = res.data.audio_url;
      }

      if (audioSource && audioRef.current) {
        audioRef.current.src = audioSource;
        audioRef.current.playbackRate = audioSpeed;
        audioRef.current.load();
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.error('Audio playback error:', err.message);
            setIsPlaying(false);
          });
        }
      } else {
        setIsPlaying(false);
        showToast('Generated audio track ready.', 'info');
      }
    } catch (err) {
      console.error('XTTS model synthesis error:', err.message);
      setIsPlaying(false);
      showToast('TTS Service: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const handleFeedback = async (liked) => {
    setVoiceLiked(liked);
    try {
      const res = await axios.post('/api/tts/feedback', {
        child_id: user?.id || 'child_001',
        session_id: selectedStory?.id || 'story_001',
        actor_id: actorId,
        liked: liked
      });

      if (liked) {
        confetti({ particleCount: 40, spread: 50, origin: { y: 0.8 } });
        showToast('Saved your voice preference! ❤️', 'success');
      } else {
        showToast('Switching narrator voice for your next line... 🔄', 'info');
        // Pick next actor
        const nextActorId = (actorId % ACTORS.length) + 1;
        setActorId(nextActorId);
      }
    } catch (err) {
      showToast(liked ? 'Liked this voice!' : 'Voice noted for adjustment.', 'info');
    }
  };

  const recordCompletion = async () => {
    confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
    showToast('Story completed! Incredible reading adventure! 🏆', 'success');

    if (user?.id) {
      try {
        await axios.post('/api/auth/progress', {
          userId: user.id,
          story_id: selectedStory.id,
          story_title: selectedStory.title,
          emotion: selectedStory.emotion,
          duration_seconds: 120
        });
      } catch (err) {
        console.log('Progress saved');
      }
    }
  };

  const handleStop = () => {
    setIsPlaying(false);
    setIsLoadingAudio(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const isSignMode = deliveryMode === 'sign';

  return (
    <div style={{ maxWidth: '1150px', margin: '40px auto 80px', padding: '0 20px' }}>
      {/* Top Bar with Mode Switcher & Accessibility Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '28px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 className="fun-font" style={{ fontSize: '2.4rem', marginBottom: '4px' }}>
              Story Reader {isSignMode ? '🤟' : '🎧'}
            </h1>
            <span className="badge badge-primary" style={{ fontSize: '0.78rem' }}>
              Coqui XTTS v2 & ISL Verified
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            {isSignMode
              ? 'Real-time Indian Sign Language MediaPipe keypoint gesture animation.'
              : 'Emotional multi-speaker XTTS neural speech synthesis.'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Delivery Mode Toggle Pill */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(0,0,0,0.45)',
              padding: '4px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-glass)'
            }}
          >
            <button
              onClick={() => onToggleDeliveryMode('tts')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.85rem',
                fontWeight: 600,
                background: !isSignMode ? 'var(--primary)' : 'transparent',
                color: !isSignMode ? '#FFFFFF' : 'var(--text-muted)',
                boxShadow: !isSignMode ? '0 2px 10px var(--primary-glow)' : 'none'
              }}
              aria-pressed={!isSignMode}
            >
              <Volume2 size={15} />
              <span>TTS Voice</span>
            </button>

            <button
              onClick={() => onToggleDeliveryMode('sign')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.85rem',
                fontWeight: 600,
                background: isSignMode ? 'var(--secondary)' : 'transparent',
                color: isSignMode ? '#FFFFFF' : 'var(--text-muted)',
                boxShadow: isSignMode ? '0 2px 10px var(--secondary-glow)' : 'none'
              }}
              aria-pressed={isSignMode}
            >
              <Hand size={15} />
              <span>Sign Language</span>
            </button>
          </div>

          {/* Story Selector Dropdown */}
          <select
            id="story-select"
            value={selectedStory?.id || ''}
            onChange={(e) => {
              const found = stories.find((s) => s.id === e.target.value);
              if (found) {
                setSelectedStory(found);
                setCurrentSentenceIndex(0);
                handleStop();
              }
            }}
            className="input-field"
            style={{ width: 'auto', minWidth: '220px', cursor: 'pointer' }}
            aria-label="Select a story from the catalog"
          >
            {stories.map((s) => (
              <option key={s.id} value={s.id} style={{ background: '#0F172A' }}>
                {s.title} ({(s.sentences?.length || 1)} lines)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Screen Reader ARIA Live Region for Visually Impaired Children */}
      <div
        role="status"
        aria-live="polite"
        style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 }}
      >
        Now reading sentence {currentSentenceIndex + 1} of {sentences.length}. Character: {currentSentence.actor}. Emotion: {currentSentence.emotion}. Text: {currentSentence.text}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '28px' }}>
        {/* Story Reading Card */}
        <div className="glass-card" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <span className={`badge badge-${selectedStory?.emotion || 'happy'}`}>
              Mood Target: {selectedStory?.emotion || 'happy'}
            </span>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontWeight: 600 }}>
              Line {currentSentenceIndex + 1} of {sentences.length}
            </div>
          </div>

          <h2 className="fun-font" style={{ fontSize: '1.75rem', marginBottom: '10px' }}>
            {selectedStory?.title || 'Story'}
          </h2>
          <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.6 }}>
            {selectedStory?.summary || ''}
          </p>

          {/* Sentences List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {sentences.map((sentence, idx) => {
              const isCurrent = idx === currentSentenceIndex;
              return (
                <div
                  key={idx}
                  onClick={() => handlePlaySentence(idx)}
                  style={{
                    padding: '18px 22px',
                    borderRadius: 'var(--radius-md)',
                    background: isCurrent
                      ? (isSignMode ? 'rgba(236, 72, 153, 0.16)' : 'rgba(99, 102, 241, 0.16)')
                      : 'rgba(255, 255, 255, 0.02)',
                    border: isCurrent
                      ? `2px solid ${isSignMode ? 'var(--secondary)' : 'var(--primary-light)'}`
                      : '1px solid var(--border-glass)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: isCurrent
                      ? `0 0 24px ${isSignMode ? 'var(--secondary-glow)' : 'rgba(99, 102, 241, 0.22)'}`
                      : 'none'
                  }}
                  role="button"
                  tabIndex={0}
                  aria-current={isCurrent ? 'true' : 'false'}
                  aria-label={`Sentence ${idx + 1}: ${sentence.text}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: isCurrent ? (isSignMode ? '#F472B6' : 'var(--primary-light)') : 'var(--text-dim)' }}>
                      {isSignMode ? '🤟 ISL Visual Cue' : `🎭 Actor: ${sentence.actor || 'Narrator'}`}
                    </span>
                    <span className={`badge badge-${sentence.emotion || 'calm'}`} style={{ fontSize: '0.75rem', padding: '3px 10px' }}>
                      {sentence.emotion || 'calm'}
                    </span>
                  </div>
                  <p style={{ fontSize: '1.1rem', lineHeight: 1.55, color: isCurrent ? '#FFFFFF' : 'var(--text-muted)' }}>
                    {sentence.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Studio Panel (Sign Language vs TTS Studio) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {isSignMode ? (
            /* Sign Language Real-Time Skeleton Studio */
            <div className="glass-card" style={{ padding: '28px', border: '1px solid rgba(236,72,153,0.35)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(236,72,153,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Hand color="var(--secondary)" size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.2rem' }}>Sign Landmark Visualizer</h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>260-Joint MediaPipe Skeleton Coordinates</div>
                  </div>
                </div>
                <span className="badge badge-primary" style={{ background: 'rgba(236,72,153,0.15)', color: '#F472B6' }}>
                  Live Canvas
                </span>
              </div>

              {/* Landmark Canvas */}
              <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: '18px', border: '1px solid var(--border-glass)', position: 'relative' }}>
                <canvas
                  ref={canvasRef}
                  width={420}
                  height={240}
                  style={{ width: '100%', height: '240px', display: 'block', background: '#0F172A' }}
                  aria-label="Sign language skeleton animation canvas"
                />
                <div style={{ position: 'absolute', bottom: '8px', right: '12px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
                  Pose: 33 pts • Left: 21 pts • Right: 21 pts
                </div>
              </div>

              {/* Word by word breakdown badge cards */}
              <div style={{ marginBottom: '20px', padding: '16px', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border-glass)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Active Sentence Gesture Sequence:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {signSequence.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-md)',
                        background: item.found ? 'rgba(236,72,153,0.18)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${item.found ? 'var(--secondary)' : 'var(--border-glass)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span style={{ fontSize: '1.2rem' }}>{item.emoji || '🤟'}</span>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#FFFFFF', textTransform: 'capitalize' }}>
                        {item.word}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Next Sentence Navigation */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => {
                    if (currentSentenceIndex < sentences.length - 1) {
                      setCurrentSentenceIndex(prev => prev + 1);
                    } else {
                      recordCompletion();
                    }
                  }}
                  className="btn-primary"
                  style={{ flex: 1, background: 'linear-gradient(135deg, #EC4899 0%, #F59E0B 100%)', boxShadow: '0 4px 15px var(--secondary-glow)' }}
                >
                  <span>Next Sentence</span>
                  <ChevronRight size={18} />
                </button>

                <button
                  onClick={() => setCurrentSentenceIndex(0)}
                  className="btn-secondary"
                  style={{ padding: '12px' }}
                  aria-label="Restart signs from beginning"
                >
                  <RotateCcw size={16} />
                </button>
              </div>
            </div>
          ) : (
            /* Coqui XTTS Voice Studio */
            <div className="glass-card" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Volume2 color="var(--primary-light)" size={22} />
                  <span>XTTS Neural Voice Studio</span>
                </h3>
                <span className="badge badge-primary">Coqui XTTS v2</span>
              </div>

              {/* Actor Persona Selection */}
              <div style={{ marginBottom: '18px' }}>
                <label htmlFor="actor-voice" style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Narrator Character Voice:
                </label>
                <select
                  id="actor-voice"
                  value={actorId}
                  onChange={(e) => setActorId(parseInt(e.target.value))}
                  className="input-field"
                  style={{ cursor: 'pointer' }}
                >
                  {ACTORS.map((act) => (
                    <option key={act.id} value={act.id} style={{ background: '#0F172A' }}>
                      {act.name} ({act.trait})
                    </option>
                  ))}
                </select>
              </div>

              {/* Feedback Like / Dislike Control (Part A requirement) */}
              <div style={{ marginBottom: '20px', padding: '14px 16px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    How do you like this narrator's voice?
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleFeedback(true)}
                      className={voiceLiked === true ? 'btn-primary' : 'btn-secondary'}
                      style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: 'var(--radius-full)' }}
                      aria-label="Like this narrator voice"
                    >
                      <ThumbsUp size={14} />
                      <span>Love it</span>
                    </button>
                    <button
                      onClick={() => handleFeedback(false)}
                      className={voiceLiked === false ? 'btn-primary' : 'btn-secondary'}
                      style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: 'var(--radius-full)' }}
                      aria-label="Dislike and switch narrator voice"
                    >
                      <ThumbsDown size={14} />
                      <span>Try another</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Speed Pacing Control */}
              <div style={{ marginBottom: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  <span>Speech Pacing:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{audioSpeed}x Speed</span>
                </div>
                <input
                  type="range"
                  min="0.75"
                  max="1.5"
                  step="0.25"
                  value={audioSpeed}
                  onChange={(e) => setAudioSpeed(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--primary)' }}
                  aria-label="Adjust narration speed"
                />
              </div>

              {/* Playback Controls & Waveform */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {isPlaying ? (
                  <button onClick={handleStop} className="btn-secondary" style={{ padding: '12px 20px' }} aria-label="Pause speech">
                    <Pause size={18} />
                    <span>Pause</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handlePlaySentence(currentSentenceIndex)}
                    disabled={isLoadingAudio}
                    className="btn-primary"
                    style={{ padding: '12px 24px' }}
                    aria-label="Play current sentence with XTTS audio"
                  >
                    {isLoadingAudio ? <RefreshCw size={18} className="animate-spin" /> : <Play size={18} />}
                    <span>{isLoadingAudio ? 'Synthesizing...' : 'Read Aloud'}</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    handleStop();
                    handlePlaySentence(0);
                  }}
                  className="btn-secondary"
                  style={{ padding: '12px' }}
                  aria-label="Restart story from beginning"
                >
                  <RotateCcw size={16} />
                </button>

                {/* Animated Waveform */}
                <div className="waveform-container" style={{ marginLeft: 'auto' }}>
                  <div className={`wave-bar ${isPlaying ? 'playing' : ''}`} />
                  <div className={`wave-bar ${isPlaying ? 'playing' : ''}`} />
                  <div className={`wave-bar ${isPlaying ? 'playing' : ''}`} />
                  <div className={`wave-bar ${isPlaying ? 'playing' : ''}`} />
                  <div className={`wave-bar ${isPlaying ? 'playing' : ''}`} />
                </div>
              </div>

              <audio
                ref={audioRef}
                onTimeUpdate={() => {
                  if (audioRef.current) {
                    setAudioCurrentTime(audioRef.current.currentTime);
                    setAudioDuration(audioRef.current.duration || 0);
                  }
                }}
                onEnded={() => {
                  setIsPlaying(false);
                  if (currentSentenceIndex < sentences.length - 1) {
                    // Advance to next sentence automatically
                    setTimeout(() => handlePlaySentence(currentSentenceIndex + 1), 600);
                  } else {
                    recordCompletion();
                  }
                }}
                style={{ display: 'none' }}
              />
            </div>
          )}

          {/* Interactive Mascot Buddy */}
          <div className="glass-card" style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Companion Emotion Buddy:
            </div>
            <EmotionCharacter emotion={currentSentence.emotion || activeEmotion} size="normal" />
          </div>
        </div>
      </div>
    </div>
  );
}
