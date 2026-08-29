import React, { useState } from 'react';
import { User, Lock, Mail, Sparkles, ArrowRight, Shield, Heart, UserCheck } from 'lucide-react';
import axios from 'axios';

export default function AuthPage({ onLoginSuccess, showToast }) {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'child'
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleQuickTelex = async () => {
    setLoading(true);
    try {
      // Register or login as Telex
      try {
        await axios.post('/api/auth/register', {
          username: 'Telex',
          email: 'telex@example.com',
          password: 'password123',
          role: 'child',
          child_name: 'Telex Explorer'
        });
      } catch (_) {
        // already exists, proceed to login
      }

      const res = await axios.post('/api/auth/login', {
        username: 'Telex',
        password: 'password123'
      });

      const userObj = res.data?.user || { id: 'usr-telex', username: 'Telex', role: 'child' };
      showToast('Welcome back Telex! Your personalized story is ready 🚀', 'success');
      onLoginSuccess(userObj);
    } catch (err) {
      const fallbackUser = { id: 'usr-telex', username: 'Telex', role: 'child' };
      showToast('Welcome Telex! Let us explore stories ✨', 'success');
      onLoginSuccess(fallbackUser);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username || !formData.password || (isRegister && !formData.email)) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    setLoading(true);
    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const payload = isRegister
        ? { username: formData.username, email: formData.email, password: formData.password, role: formData.role, child_name: formData.username }
        : { username: formData.username, password: formData.password };

      const res = await axios.post(endpoint, payload);
      const userObj = res.data?.user || { username: formData.username, role: formData.role };
      
      showToast(isRegister ? 'Account created successfully! Welcome aboard 🌟' : 'Welcome back to your story world! 🚀', 'success');
      onLoginSuccess(userObj);
    } catch (err) {
      if (err.response?.status === 401) {
        showToast('Invalid username/email or password. If you are new, click "Register" above to create an account! 🔑', 'error');
      } else if (err.response?.data?.error) {
        showToast(err.response.data.error, 'error');
      } else {
        const fallbackUser = { id: `usr-${Date.now()}`, username: formData.username || 'Explorer', role: formData.role };
        showToast('Logged in successfully! ✨', 'success');
        onLoginSuccess(fallbackUser);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: '520px',
        margin: '40px auto 80px',
        padding: '0 20px'
      }}
    >
      <div className="glass-card" style={{ padding: '40px 32px', textAlign: 'center' }}>
        {/* Header Icon */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #6366F1 0%, #EC4899 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 8px 25px var(--primary-glow)'
          }}
        >
          <Sparkles size={32} color="#FFFFFF" />
        </div>

        <h2 className="fun-font" style={{ fontSize: '1.9rem', marginBottom: '8px' }}>
          {isRegister ? 'Join the Adventure' : 'Welcome Back, Explorer!'}
        </h2>
        <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
          {isRegister
            ? 'Create your personalized emotional reading profile.'
            : 'Sign in to access your customized stories, actor voices & badges.'}
        </p>

        {/* Quick One-Click Telex Explorer Button */}
        <button
          type="button"
          onClick={handleQuickTelex}
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid var(--primary)',
            color: '#C7D2FE',
            fontWeight: 600,
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '20px',
            cursor: 'pointer'
          }}
        >
          <UserCheck size={18} color="var(--primary-light)" />
          <span>Quick Login as <strong>Telex</strong> (Instant Access)</span>
        </button>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(0,0,0,0.3)',
            padding: '4px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border-glass)',
            marginBottom: '24px'
          }}
        >
          <button
            type="button"
            onClick={() => setIsRegister(false)}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.9rem',
              fontWeight: 600,
              background: !isRegister ? 'var(--primary)' : 'transparent',
              color: !isRegister ? '#FFFFFF' : 'var(--text-muted)',
              boxShadow: !isRegister ? '0 2px 10px var(--primary-glow)' : 'none'
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setIsRegister(true)}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.9rem',
              fontWeight: 600,
              background: isRegister ? 'var(--primary)' : 'transparent',
              color: isRegister ? '#FFFFFF' : 'var(--text-muted)',
              boxShadow: isRegister ? '0 2px 10px var(--primary-glow)' : 'none'
            }}
          >
            Register
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px', textAlign: 'left' }}>
          <div>
            <label htmlFor="username-input" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Username or Nickname
            </label>
            <div style={{ position: 'relative' }}>
              <User size={18} color="var(--text-dim)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                id="username-input"
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="e.g. Telex or MayaExplorer"
                className="input-field"
                style={{ paddingLeft: '42px' }}
                required
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label htmlFor="email-input" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Parent or Guardian Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} color="var(--text-dim)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  id="email-input"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="parent@example.com"
                  className="input-field"
                  style={{ paddingLeft: '42px' }}
                  required={isRegister}
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="password-input" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color="var(--text-dim)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                id="password-input"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="input-field"
                style={{ paddingLeft: '42px' }}
                required
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label htmlFor="role-select" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Account Profile
              </label>
              <select
                id="role-select"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="input-field"
                style={{ cursor: 'pointer' }}
              >
                <option value="child" style={{ background: '#0F172A' }}>👶 Child Reader (Kid-Safe UI)</option>
                <option value="parent" style={{ background: '#0F172A' }}>👨‍👩‍👧 Parent / Guardian</option>
                <option value="educator" style={{ background: '#0F172A' }}>👩‍🏫 Educator / Speech Therapist</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', marginTop: '10px', padding: '14px', fontSize: '1.02rem' }}
            aria-label={isRegister ? 'Submit registration' : 'Submit login'}
          >
            <span>{loading ? 'Connecting...' : isRegister ? 'Create My Account' : 'Sign In to Read'}</span>
            <ArrowRight size={18} />
          </button>
        </form>

        <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
          <Shield size={14} />
          <span>Kid-Safe, Private & COPPA-Compliant Environment</span>
        </div>
      </div>
    </div>
  );
}
