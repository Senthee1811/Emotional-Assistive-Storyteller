import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function StoryReader({ gatewayUrl, activeEmotion, onSynthesizeStory }) {
  const [stories, setStories] = useState([]);
  const [selectedStory, setSelectedStory] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStories();
  }, [activeEmotion]);

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
      console.error('Fetch stories error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px' }}>
      <div className="glass-card">
        <h3 style={{ marginBottom: '12px', fontSize: '1.3rem' }}>📚 Story Catalog</h3>
        <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '16px' }}>
          Microservice Route: <code>/api/stories/*</code>
        </p>

        {loading ? (
          <p style={{ color: '#94a3b8' }}>Loading stories...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {stories.map(s => (
              <div
                key={s.id}
                onClick={() => setSelectedStory(s)}
                style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: selectedStory?.id === s.id ? 'rgba(139, 92, 246, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                  border: selectedStory?.id === s.id ? '1px solid #8b5cf6' : '1px solid rgba(255, 255, 255, 0.08)',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>{s.title}</span>
                  <span className={`badge badge-${s.emotion}`}>{s.emotion}</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{s.summary}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-card">
        {selectedStory ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>{selectedStory.title}</h2>
              <button
                className="btn-primary"
                onClick={() => onSynthesizeStory(selectedStory.content, selectedStory.emotion)}
              >
                🔊 Read Aloud (Async TTS)
              </button>
            </div>
            <div style={{
              padding: '20px',
              borderRadius: '12px',
              background: 'rgba(15, 23, 42, 0.6)',
              lineHeight: '1.7',
              fontSize: '1rem',
              color: '#e2e8f0'
            }}>
              {selectedStory.content}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
            <span style={{ fontSize: '3rem' }}>📖</span>
            <h4 style={{ marginTop: '12px', color: '#f8fafc' }}>Select a story from the left to begin reading!</h4>
          </div>
        )}
      </div>
    </div>
  );
}
