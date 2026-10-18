import React, { useState } from 'react';
import { useAuth, SEED_USERS } from '../context/AuthContext';
import { Layers, Shield, KeyRound, User, Mail, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';

export default function LoginView() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Password123!');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registeredSuccess, setRegisteredSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        await register({ username, email, password });
        setRegisteredSuccess(true);
        setIsRegister(false);
      } else {
        await login(username, password);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSeedUser = (seed) => {
    setUsername(seed.username);
    setPassword('Password123!');
    setError('');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      position: 'relative'
    }}>
      <div style={{
        width: '100%',
        maxWidth: 480,
        background: 'var(--bg-card)',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '2.5rem',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Top glow border */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: 'var(--grad-cyan-blue)'
        }} />

        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 'var(--radius-md)',
            background: 'var(--grad-cyan-blue)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 24px rgba(0, 242, 254, 0.45)',
            marginBottom: '1rem'
          }}>
            <Layers size={32} color="#06080e" strokeWidth={2.5} />
          </div>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            letterSpacing: '0.04em',
            background: 'linear-gradient(90deg, #ffffff 0%, #00f2fe 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            KYNEXIS
          </h1>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Connected Industrial Intelligence Platform
          </p>
        </div>

        {registeredSuccess && (
          <div style={{
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#34d399',
            fontSize: '0.825rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1.25rem'
          }}>
            <CheckCircle2 size={16} />
            <span>Registration successful! Sign in with your new credentials.</span>
          </div>
        )}

        {error && (
          <div style={{
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            fontSize: '0.825rem',
            marginBottom: '1.25rem'
          }}>
            {error}
          </div>
        )}

        {/* Quick Seed User Switcher */}
        {!isRegister && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{
              fontSize: '0.7rem',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontWeight: 700,
              marginBottom: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}>
              <Zap size={13} style={{ color: 'var(--neon-amber)' }} />
              Quick-Select Development Persona
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
              {SEED_USERS.map((seed) => {
                const isSelected = username === seed.username;
                return (
                  <button
                    key={seed.username}
                    type="button"
                    onClick={() => handleSelectSeedUser(seed)}
                    style={{
                      padding: '0.45rem 0.6rem',
                      borderRadius: 'var(--radius-sm)',
                      background: isSelected ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      border: isSelected ? '1px solid var(--neon-cyan)' : '1px solid var(--border-subtle)',
                      color: isSelected ? 'var(--neon-cyan)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      textAlign: 'left',
                      fontWeight: 600,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div>{seed.label}</div>
                    <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                      {seed.username}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="auth-username">Username</label>
            <div style={{ position: 'relative' }}>
              <input
                id="auth-username"
                type="text"
                className="form-input"
                style={{ width: '100%', paddingLeft: '2.4rem' }}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Enter username"
              />
              <User size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          {isRegister && (
            <div className="form-group">
              <label className="form-label" htmlFor="auth-email">Corporate Email</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="auth-email"
                  type="email"
                  className="form-input"
                  style={{ width: '100%', paddingLeft: '2.4rem' }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@kynexis.industrial.com"
                />
                <Mail size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="auth-password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="auth-password"
                type="password"
                className="form-input"
                style={{ width: '100%', paddingLeft: '2.4rem' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter password"
              />
              <KeyRound size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: '0.75rem', padding: '0.75rem' }}
          >
            {loading ? 'Authenticating...' : isRegister ? 'Register Account' : 'Authenticate to Smart Factory'}
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Toggle Register/Login */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
          {isRegister ? (
            <span>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => { setIsRegister(false); setError(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--neon-cyan)', cursor: 'pointer', fontWeight: 600 }}
              >
                Sign In
              </button>
            </span>
          ) : (
            <span>
              Need a factory account?{' '}
              <button
                type="button"
                onClick={() => { setIsRegister(true); setError(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--neon-cyan)', cursor: 'pointer', fontWeight: 600 }}
              >
                Register
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
