import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

let toastListener = null;

export const showToast = (message, type = 'info') => {
  if (toastListener) toastListener({ id: Date.now(), message, type });
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  const [ariaMsg, setAriaMsg] = useState('');

  useEffect(() => {
    toastListener = (t) => {
      setToasts((prev) => [...prev.slice(-4), t]);
      setAriaMsg(`${t.type === 'error' ? 'Alert' : 'Notice'}: ${t.message}`);
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 4000);
    };
    return () => { toastListener = null; };
  }, []);

  const getStyles = (type) => {
    if (type === 'error') return { background: 'rgba(127,29,29,0.9)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' };
    if (type === 'success') return { background: 'rgba(6,78,59,0.9)', border: '1px solid rgba(16,185,129,0.3)', color: '#6ee7b7' };
    return { background: 'rgba(15,23,42,0.92)', border: '1px solid rgba(92,124,250,0.2)', color: '#e2e8f0' };
  };

  const getIcon = (type) => {
    if (type === 'error') return <AlertCircle size={18} color="#f87171" />;
    if (type === 'success') return <CheckCircle size={18} color="#34d399" />;
    return <Info size={18} color="var(--brand-400)" />;
  };

  return (
    <>
      <div className="sr-only" aria-live="polite" aria-atomic="true" role="status">{ariaMsg}</div>
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 380, width: '100%', pointerEvents: 'none'
      }}>
        {toasts.map((t) => (
          <div key={t.id} className="animate-fade-in" style={{
            pointerEvents: 'auto', padding: '14px 16px', borderRadius: 'var(--radius-lg)',
            backdropFilter: 'blur(12px)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            ...getStyles(t.type)
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {getIcon(t.type)}
              <span style={{ fontSize: '0.8125rem', fontWeight: 500, lineHeight: 1.4 }}>{t.message}</span>
            </div>
            <button onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))}
              style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4 }}
              aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
