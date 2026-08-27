import React, { useState } from 'react';
import axios from 'axios';
import { showToast } from './Toast';
import { X, LogIn, UserPlus } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, gatewayUrl, onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [childName, setChildName] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = isRegister ? 'register' : 'login';
      const payload = isRegister ? { email, password, child_name: childName } : { email, password };
      const res = await axios.post(`${gatewayUrl}/api/auth/${endpoint}`, payload);
      localStorage.setItem('token', res.data.token);
      onLoginSuccess(res.data.user);
      onClose();
      showToast(isRegister ? 'Account created!' : 'Logged in!', 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Authentication failed.', 'error');
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24
    }} onClick={onClose}>
      <div className="glass-card-elevated animate-fade-in" style={{
        width: '100%', maxWidth: 420, padding: '32px'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '1.25rem', color: 'white' }}>
            {isRegister ? 'Create Account' : 'Sign In'}
          </h3>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="parent@example.com" required />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          {isRegister && (
            <div>
              <label className="label">Child's Name</label>
              <input className="input" type="text" value={childName} onChange={e => setChildName(e.target.value)} placeholder="Alex" />
            </div>
          )}
          <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ width: '100%' }}>
            {isRegister ? <UserPlus size={16} /> : <LogIn size={16} />}
            {loading ? 'Processing...' : isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: '#64748b', marginTop: 16 }}>
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button onClick={() => setIsRegister(!isRegister)} style={{
            background: 'none', border: 'none', color: 'var(--brand-400)', cursor: 'pointer', fontWeight: 600, fontSize: '0.8125rem'
          }}>
            {isRegister ? 'Sign In' : 'Register'}
          </button>
        </p>
      </div>
    </div>
  );
}
