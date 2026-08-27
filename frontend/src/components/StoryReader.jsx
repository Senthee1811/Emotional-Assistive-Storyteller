import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import gsap from 'gsap';
import { showToast } from './Toast';
import { BookOpen, Volume2, RotateCcw, Sparkles } from 'lucide-react';

export default function StoryReader({ gatewayUrl, activeEmotion, onSynthesizeStory }) {
  const [stories, setStories] = useState([]);
  const [selectedStory, setSelectedStory] = useState(null);
  const [loading, setLoading] = useState(false);
  const storyCardRef = useRef(null);

  useEffect(() => {
    fetchStories();
  }, [activeEmotion]);

  useEffect(() => {
    if (selectedStory && storyCardRef.current) {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!prefersReducedMotion) {
        gsap.fromTo(
          storyCardRef.current,
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.4, ease: 'back.out(1.7)' }
        );
      }
    }
  }, [selectedStory]);

  const fetchStories = async () => {
    setLoading(true);
    try {
      if (activeEmotion) {
        const res = await axios.post(`${gatewayUrl}/api/stories/recommend`, { emotion: activeEmotion });
        setStories(res.data.recommended_stories || []);
        showToast(`Loaded stories matching '${activeEmotion}' mood.`, 'info');
      } else {
        const res = await axios.get(`${gatewayUrl}/api/stories/`);
        setStories(res.data.stories || []);
      }
    } catch (err) {
      console.error('Fetch stories error:', err);
      showToast('Story service unavailable. Unable to load story catalog.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
      <div className="md:col-span-2 glass-panel p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Story Catalog</h3>
            <p className="text-sm text-slate-400">Microservice Route: <code className="text-purple-400">/api/stories/*</code></p>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-2">
            <Sparkles className="w-6 h-6 animate-spin text-brand-400" />
            <span>Finding stories...</span>
          </div>
        ) : (
          <div className="space-y-3">
            {stories.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedStory(s)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  selectedStory?.id === s.id
                    ? 'bg-brand-500/20 border-brand-500 text-white shadow-lg shadow-brand-500/10'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
                aria-label={`Select story: ${s.title}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-bold text-base leading-snug">{s.title}</span>
                  <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full border ${
                    s.emotion === 'happy' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                    s.emotion === 'sad' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                    'bg-purple-500/10 border-purple-500/30 text-purple-400'
                  }`}>
                    {s.emotion}
                  </span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2">{s.summary}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="md:col-span-3 glass-panel p-6 md:p-8 flex flex-col justify-between">
        {selectedStory ? (
          <div ref={storyCardRef} className="space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div>
                <span className="text-xs font-bold text-brand-400 uppercase tracking-widest">Selected Story</span>
                <h2 className="text-2xl font-extrabold text-white mt-1">{selectedStory.title}</h2>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onSynthesizeStory(selectedStory.content, selectedStory.emotion)}
                  className="bg-gradient-to-r from-brand-600 to-pink-600 text-white font-semibold px-5 py-2.5 rounded-xl flex items-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-brand-500/20"
                >
                  <Volume2 className="w-5 h-5" />
                  Read Aloud (Async TTS)
                </button>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 text-slate-200 leading-relaxed text-lg font-medium">
              {selectedStory.content}
            </div>
          </div>
        ) : (
          <div className="text-center py-16 px-4 my-auto">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-3xl mx-auto mb-4">
              📖
            </div>
            <h4 className="text-lg font-bold text-white mb-1">Select a Story from the Left</h4>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">
              Choose a story to read along or synthesize full audio speech using Coqui XTTS synthesis engine.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
