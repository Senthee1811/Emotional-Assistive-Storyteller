import React, { useState } from 'react';
import axios from 'axios';

export default function StutterAnalyzer({ gatewayUrl }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);

  const handleRunAnalysis = async () => {
    setAnalyzing(true);
    try {
      const res = await axios.post(`${gatewayUrl}/api/stutter/analyze`);
      setResult(res.data);
    } catch (err) {
      console.error('Stutter analysis error:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="glass-card" style={{ maxWidth: '650px', margin: '0 auto' }}>
      <h3 style={{ marginBottom: '12px', fontSize: '1.4rem' }}>🎙️ Speech Stuttering Disfluency Analyzer</h3>
      <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '20px' }}>
        Microservice Route: <code>/api/stutter/analyze</code> (FastAPI + Isolated SQLite datastore)
      </p>

      <div style={{
        padding: '24px',
        borderRadius: '12px',
        background: 'rgba(15, 23, 42, 0.6)',
        textAlign: 'center',
        marginBottom: '20px'
      }}>
        <p style={{ marginBottom: '16px', color: '#cbd5e1', fontSize: '0.95rem' }}>
          Record child speech sample or run disfluency analysis.
        </p>
        <button onClick={handleRunAnalysis} className="btn-primary" disabled={analyzing}>
          {analyzing ? 'Analyzing Audio Frequencies...' : '🎙️ Run Speech Analysis'}
        </button>
      </div>

      {result && (
        <div style={{
          padding: '16px',
          borderRadius: '12px',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontWeight: '700' }}>Classification Result:</span>
            <span style={{ color: result.is_stutter ? '#f87171' : '#4ade80', fontWeight: 'bold' }}>
              {result.is_stutter ? 'Disfluency / Stutter Detected' : 'Fluent Speech'}
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '8px' }}>
            Confidence: {(result.confidence * 100).toFixed(0)}% | Pattern: {result.disfluency_type}
          </p>
          <div style={{ padding: '8px 12px', background: 'rgba(139, 92, 246, 0.15)', borderRadius: '8px', fontSize: '0.85rem' }}>
            💡 <strong>Recommendation:</strong> {result.recommendation}
          </div>
        </div>
      )}
    </div>
  );
}
