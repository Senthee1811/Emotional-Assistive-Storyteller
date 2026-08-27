import React, { useState } from 'react';
import axios from 'axios';
import { X, Lock, Mail, User } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, gatewayUrl, onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [childName, setChildName] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const endpoint = isRegister ? `${gatewayUrl}/api/auth/register` : `${gatewayUrl}/api/auth/login`;
    const payload = isRegister ? { email, password, child_name: childName } : { email, password };

    try {
      const res = await axios.post(endpoint, payload);
      if (res.data.token) {
        localStorage.setItem('token', res.data.token);
        onLoginSuccess(res.data.user);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-md glass-panel p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-2xl font-bold text-white mb-1">
          {isRegister ? 'Create StoryPal Account' : 'Welcome Back'}
        </h3>
        <p className="text-sm text-slate-400 mb-6">
          Microservice Auth Route: <code className="text-brand-400">/api/auth/*</code>
        </p>

        {error && (
          <div className="p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Child's Name:</label>
              <div className="relative">
                <User className="w-5 h-5 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  placeholder="Alex"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Email Address:</label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3 top-3 text-slate-500" />
              <input
                type="email"
                required
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                placeholder="parent@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Password:</label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3 top-3 text-slate-500" />
              <input
                type="password"
                required
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-r from-brand-600 to-pink-600 text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : isRegister ? 'Register Account' : 'Sign In'}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-slate-800 text-center">
          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            className="text-xs text-brand-400 hover:underline"
          >
            {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Register here"}
          </button>
        </div>
      </div>
    </div>
  );
}
