import React, { useState } from 'react';
import { useAuth, SEED_USERS } from '../context/AuthContext';
import { 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Zap, 
  ArrowRight
} from 'lucide-react';

export default function LoginView() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin@123');
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        await register({ username, email, password });
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
    setPassword(seed.password || 'Admin@123');
    setError('');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#05070B',
      padding: '2rem'
    }}>
      <div style={{
        width: '100%',
        maxWidth: 1040,
        height: '620px',
        background: '#0B0F17',
        borderRadius: '16px',
        border: '1px solid var(--border)',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 102, 255, 0.12)',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        overflow: 'hidden'
      }}>
        {/* Left Side: Industrial Hero Visual Showcase matching master image */}
        <div style={{
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '3rem',
          background: '#070A0F'
        }}>
          {/* Background Factory Night Photo */}
          <img 
            src="/images/smart_factory_hero.jpg" 
            alt="Smart Factory Campus" 
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'brightness(0.65) contrast(1.15)',
              zIndex: 1
            }} 
          />
          {/* Deep Navy/Black Gradient Overlay */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(8, 11, 17, 0.82) 0%, rgba(8, 11, 17, 0.45) 50%, rgba(8, 11, 17, 0.95) 100%)',
            zIndex: 2
          }} />

          {/* Top Logo */}
          <div style={{ position: 'relative', zIndex: 3, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: '#0066FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              boxShadow: '0 0 12px rgba(0, 102, 255, 0.6)'
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.04em', color: '#FFFFFF' }}>
              KYNEXIS
            </span>
          </div>

          {/* Bottom Heading & Subtitle matching master image */}
          <div style={{ position: 'relative', zIndex: 3 }}>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: 800,
              lineHeight: 1.25,
              color: '#FFFFFF',
              marginBottom: '0.75rem',
              letterSpacing: '-0.02em'
            }}>
              Smarter Factories.<br />Greater Tomorrow.
            </h1>
            <p style={{
              fontSize: '0.85rem',
              color: '#94A3B8',
              lineHeight: 1.55,
              margin: 0,
              maxWidth: 360
            }}>
              AI-powered intelligence for smarter, safer and more efficient manufacturing operations.
            </p>
          </div>
        </div>

        {/* Right Side: Welcome Back Sign In Form matching master image */}
        <div style={{
          padding: '2.75rem 3rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#0B0F17'
        }}>
          <div>
            <div style={{ marginBottom: '1.75rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '0.35rem' }}>
                Welcome Back
              </h2>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', margin: 0 }}>
                Sign in to your KYNEXIS account
              </p>
            </div>

            {error && (
              <div style={{
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#EF4444',
                fontSize: '0.8rem',
                marginBottom: '1rem'
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Email or Username</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ background: '#0E141E', borderColor: 'var(--border)', padding: '10px 12px' }}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your email or username"
                  required
                />
              </div>

              {isRegister && (
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Corporate Email</label>
                  <input
                    type="email"
                    className="form-input"
                    style={{ background: '#0E141E', borderColor: 'var(--border)', padding: '10px 12px' }}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter corporate email"
                    required
                  />
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '6px' }}>
                <label className="form-label" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    style={{ background: '#0E141E', borderColor: 'var(--border)', padding: '10px 36px 10px 12px' }}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: 2
                    }}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div style={{ textAlign: 'right', marginBottom: '16px' }}>
                <a href="#forgot" style={{ fontSize: '11px', color: 'var(--text-muted)', textDecoration: 'none' }}>
                  Forgot password?
                </a>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ width: '100%', padding: '10px', fontSize: '13px', fontWeight: 600, borderRadius: 'var(--radius-sm)' }}
              >
                {loading ? 'Signing in...' : isRegister ? 'Register' : 'Sign In'}
              </button>
            </form>

            {/* "or" Divider */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              margin: '14px 0',
              color: 'var(--text-muted)',
              fontSize: '11px'
            }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
              <span style={{ padding: '0 10px' }}>or</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            </div>

            {/* Sign in with SSO Button */}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => login('admin', 'Admin@123')}
              style={{ width: '100%', padding: '9px', fontSize: '12.5px', borderRadius: 'var(--radius-sm)', gap: '8px' }}
            >
              <ShieldCheck size={15} style={{ color: '#0066FF' }} />
              <span>Sign in with SSO</span>
            </button>

            {/* Demo Personas Quick Select */}
            <div style={{ marginTop: '12px', display: 'flex', gap: '6px', justifyContent: 'center' }}>
              {SEED_USERS.map((seed) => (
                <button
                  key={seed.username}
                  type="button"
                  onClick={() => handleSelectSeedUser(seed)}
                  style={{
                    background: username === seed.username ? 'rgba(0, 102, 255, 0.2)' : 'transparent',
                    border: username === seed.username ? '1px solid #0066FF' : '1px solid var(--border)',
                    color: username === seed.username ? '#FFFFFF' : 'var(--text-muted)',
                    borderRadius: '4px',
                    padding: '3px 8px',
                    fontSize: '10px',
                    cursor: 'pointer'
                  }}
                  title={seed.label}
                >
                  {seed.username}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Security Badges matching master image */}
          <div style={{
            textAlign: 'center',
            fontSize: '11px',
            color: 'var(--text-muted)',
            paddingTop: '12px',
            borderTop: '1px solid var(--border-subtle)'
          }}>
            Secure • Reliable • Enterprise Grade
          </div>
        </div>
      </div>
    </div>
  );
}
