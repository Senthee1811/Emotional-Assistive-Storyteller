import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

let toastListener = null;

export const showToast = (message, type = 'info') => {
  if (toastListener) {
    toastListener({ id: Date.now(), message, type });
  }
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  const [ariaMessage, setAriaMessage] = useState('');

  useEffect(() => {
    toastListener = (newToast) => {
      setToasts((prev) => [...prev.slice(-4), newToast]);
      setAriaMessage(`${newToast.type === 'error' ? 'Alert' : 'Notice'}: ${newToast.message}`);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 4000);
    };

    return () => {
      toastListener = null;
    };
  }, []);

  return (
    <>
      {/* Screen Reader ARIA Live Region */}
      <div
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
        role="status"
      >
        {ariaMessage}
      </div>

      {/* Visual Toast Notifications Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-xl border backdrop-blur-md shadow-2xl flex items-center justify-between gap-3 transition-all duration-300 transform translate-y-0 ${
              toast.type === 'error'
                ? 'bg-red-950/90 border-red-500/40 text-red-200'
                : toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
                : 'bg-slate-900/90 border-brand-500/40 text-slate-100'
            }`}
          >
            <div className="flex items-center gap-3">
              {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />}
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-brand-400 shrink-0" />}
              <span className="text-sm font-medium leading-snug">{toast.message}</span>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-slate-400 hover:text-white p-1 rounded-lg"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
