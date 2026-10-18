import React, { useState, useEffect } from 'react';
import { useAuth, SEED_USERS } from '../context/AuthContext';
import { backendStatus } from '../services/api';
import { 
  Activity, 
  Shield, 
  LogOut, 
  ChevronDown, 
  Server, 
  CheckCircle2 
} from 'lucide-react';

export default function Navbar() {
  const { user, logout, switchDemoUser } = useAuth();
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header style={{
      height: 'var(--header-height)',
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(10, 14, 23, 0.85)',
      backdropFilter: 'blur(16px)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 2rem'
    }}>
      {/* Left: System Health & Clock */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.35rem 0.75rem',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(0, 242, 254, 0.08)',
            border: '1px solid rgba(0, 242, 254, 0.25)',
            fontSize: '0.75rem',
            color: 'var(--neon-cyan)',
            fontWeight: 600
          }}>
            <Server size={14} />
            <span>PORT 8080 GATEWAY</span>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
          fontFamily: "'JetBrains Mono', monospace"
        }}>
          <Activity size={14} style={{ color: 'var(--neon-emerald)' }} />
          <span>{time} UTC</span>
        </div>
      </div>

      {/* Right: User Role Switcher & Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Role Quick-Switcher Menu */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Shield size={14} style={{ color: 'var(--neon-blue)' }} />
            <span>Role: <strong>{user?.role}</strong></span>
            <ChevronDown size={14} />
          </button>

          {showRoleMenu && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: 250,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-card)',
              padding: '0.5rem',
              zIndex: 200
            }}>
              <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Switch Seed Persona
              </div>
              {SEED_USERS.map((seed) => {
                const isActive = user?.role === seed.role;
                return (
                  <button
                    key={seed.role}
                    type="button"
                    onClick={() => {
                      switchDemoUser(seed.role);
                      setShowRoleMenu(false);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      textAlign: 'left',
                      padding: '0.5rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      background: isActive ? 'rgba(0, 242, 254, 0.1)' : 'transparent',
                      border: 'none',
                      color: isActive ? 'var(--neon-cyan)' : 'var(--text-primary)',
                      cursor: 'pointer',
                      transition: 'background 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 600, fontSize: '0.825rem' }}>
                      <span>{seed.label} ({seed.role})</span>
                      {isActive && <CheckCircle2 size={14} />}
                    </div>
                    <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>{seed.desc}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* User Card */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          paddingLeft: '0.75rem',
          borderLeft: '1px solid var(--border-subtle)'
        }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #00f2fe 0%, #a855f7 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#06080e',
            fontWeight: 700,
            fontSize: '0.875rem'
          }}>
            {user?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.825rem', fontWeight: 600, lineHeight: 1.2 }}>
              {user?.username}
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              JWT Authenticated
            </span>
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={logout}
            title="Log Out Session"
            style={{ padding: '0.4rem', color: '#f87171' }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
