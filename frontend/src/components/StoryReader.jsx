import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import gsap from 'gsap';
import { showToast } from './Toast';
import { BookOpen, Volume2, Loader2 } from 'lucide-react';

export default function StoryReader({ gatewayUrl, activeEmotion, onSynthesizeStory }) {
  const [stories, setStories] = useState([]);
  const [selectedStory, setSelectedStory] = useState(null);
  const [loading, setLoading] = useState(false);
  const storyRef = useRef(null);

  useEffect(() => { fetchStories(); }, [activeEmotion]);

  useEffect(() => {
    if (selectedStory && storyRef.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.fromTo(storyRef.current, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: 'back.out(1.5)' });
    }
  }, [selectedStory]);

  const fetchStories = async () => {
    setLoading(true);
    try {
      if (activeEmotion) {
        const res = await axios.post(`${gatewayUrl}/api/stories/recommend`, { emotion: activeEmotion });
        setStories(res.data.recommended_stories || []);
      } else {
        const res = await axios.get(`${gatewayUrl}/api/stories/`);
        setStories(res.data.stories || []);
      }
    } catch (err) {
      showToast('Story service unavailable.', 'error');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '24px' }}>
      {/* Story List */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 'var(--radius-md)',
            background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c084fc'
          }}>
            <BookOpen size={18} />
          </div>
          <div>
            <h3 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '1rem', color: 'white' }}>Story Catalog</h3>
            <p style={{ fontSize: '0.6875rem', color: '#64748b' }}>{stories.length} stories loaded</p>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
            <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
            <p style={{ fontSize: '0.8125rem' }}>Finding stories...</p>
          </div>
        ) : stories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#475569', fontSize: '0.8125rem' }}>
            No stories found. Try a different mood.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {stories.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedStory(s)}
                style={{
                  width: '100%', textAlign: 'left', padding: '14px 16px',
                  borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  background: selectedStory?.id === s.id ? 'rgba(92,124,250,0.12)' : 'rgba(15,23,42,0.5)',
                  border: selectedStory?.id === s.id ? '1px solid rgba(92,124,250,0.35)' : '1px solid rgba(148,163,184,0.06)',
                  color: selectedStory?.id === s.id ? 'white' : '#cbd5e1',
                  transition: 'all 0.2s ease'
                }}
                aria-label={`Select story: ${s.title}`}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{s.title}</span>
                  <span className={`badge badge-${s.emotion}`}>{s.emotion}</span>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4 }}>{s.summary}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Story Detail */}
      <div className="glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {selectedStory ? (
          <div ref={storyRef}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
              <div>
                <span className="badge badge-brand" style={{ marginBottom: 6, display: 'inline-block' }}>Selected</span>
                <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '1.5rem', color: 'white', letterSpacing: '-0.01em' }}>
                  {selectedStory.title}
                </h2>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => onSynthesizeStory(selectedStory.content, selectedStory.emotion)}
              >
                <Volume2 size={16} />
                Read Aloud
              </button>
            </div>

            <div className="glass-card" style={{
              padding: '24px', fontSize: '1.0625rem', lineHeight: 1.8, color: '#e2e8f0', fontWeight: 400
            }}>
              {selectedStory.content}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{
              width: 56, height: 56, borderRadius: 'var(--radius-xl)',
              background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(148,163,184,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.75rem', margin: '0 auto 16px'
            }}>📖</div>
            <h4 style={{ fontWeight: 700, color: 'white', marginBottom: '6px' }}>Select a Story</h4>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', maxWidth: '340px', margin: '0 auto' }}>
              Choose a story from the catalog to read along or synthesize into speech.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
