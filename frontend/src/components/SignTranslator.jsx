import React, { useState } from 'react';
import axios from 'axios';
import { Hand, Sparkles, Send } from 'lucide-react';

export default function SignTranslator({ gatewayUrl }) {
  const [inputText, setInputText] = useState('');
  const [translation, setTranslation] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    try {
      const res = await axios.post(`${gatewayUrl}/api/sign/translate`, { text: inputText });
      setTranslation(res.data);
    } catch (err) {
      console.error('Sign translation error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto glass-panel p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
          <Hand className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">Sign Language Gesture Translator</h3>
          <p className="text-sm text-slate-400">Microservice Route: <code className="text-purple-400">/api/sign/translate</code></p>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <input
          type="text"
          className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
          placeholder="Enter word or phrase (e.g., hello, thank you, happy bear)..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleTranslate()}
        />
        <button
          onClick={handleTranslate}
          disabled={loading}
          className="bg-gradient-to-r from-brand-600 to-pink-600 text-white font-semibold px-5 py-3 rounded-xl flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? <Sparkles className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          Translate
        </button>
      </div>

      {translation && (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Translated Gesture Sequence</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {translation.translated_sequence.map((item, idx) => (
              <div key={idx} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-brand-400 uppercase tracking-wide">Word #{idx + 1}</span>
                  <h5 className="text-lg font-bold text-white capitalize mt-1">{item.word}</h5>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800">
                  {item.found ? (
                    <div>
                      <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                        3D Gesture Match
                      </span>
                      <p className="text-xs text-slate-400 mt-2">Actions: {item.gestures?.join(', ')}</p>
                    </div>
                  ) : (
                    <div>
                      <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full font-medium">
                        Fingerspelling
                      </span>
                      <p className="text-xs text-slate-400 mt-2">Letters: {item.fingerspell?.join(' - ')}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
