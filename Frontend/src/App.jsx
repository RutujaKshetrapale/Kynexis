import React, { useState } from 'react';
import { useAuth, SEED_USERS } from './context/AuthContext';
import { useBackendStatus } from './services/api';
import LoadingSpinner from './components/LoadingSpinner';
import LoginView from './views/LoginView';
import { LogOut, User, RefreshCw, Shield, BarChart3, Cpu, HardHat, Check } from 'lucide-react';

const ROLE_THEMES = {
  ADMIN: { color: '#F2C811', bg: 'rgba(242, 200, 17, 0.12)', border: 'rgba(242, 200, 17, 0.35)', icon: Shield },
  MANAGER: { color: '#A855F7', bg: 'rgba(168, 85, 247, 0.12)', border: 'rgba(168, 85, 247, 0.35)', icon: BarChart3 },
  ENGINEER: { color: '#00BCF2', bg: 'rgba(0, 188, 242, 0.12)', border: 'rgba(0, 188, 242, 0.35)', icon: Cpu },
  OPERATOR: { color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.35)', icon: HardHat }
};

export default function App() {
  const { user, loading, logout, switchDemoUser } = useAuth();
  const { isLive } = useBackendStatus();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  // If user is not authenticated, display the Power BI Login View
  if (!user) {
    return <LoginView />;
  }

  const roleKey = (user.role || 'ADMIN').toUpperCase();
  const roleTheme = ROLE_THEMES[roleKey] || ROLE_THEMES.ADMIN;
  const RoleIcon = roleTheme.icon;

  return (
    <div className="pbi-report-layout">
      {/* Power BI Service Action Ribbon */}
      <header className="pbi-ribbon">
        <div className="pbi-ribbon-left">
          <div className="pbi-logo-badge">
            <div className="pbi-logo-icon" title="Power BI Report Canvas">
              <span className="pbi-logo-bar" style={{ width: '3px', height: '7px' }} />
              <span className="pbi-logo-bar" style={{ width: '3px', height: '14px' }} />
              <span className="pbi-logo-bar" style={{ width: '3px', height: '10px' }} />
            </div>
            <div className="pbi-report-info">
              <span className="pbi-report-title">KYNEXIS Intelligence</span>
              <div className="pbi-report-breadcrumb">
                <span>Manufacturing Analytics</span>
                <span>&gt;</span>
                <span style={{ color: '#FFFFFF', fontWeight: 600 }}>Active Session</span>
              </div>
            </div>
          </div>

          <div
            className="pbi-status-pill"
            style={{ border: isLive ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(245, 158, 11, 0.4)' }}
          >
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: isLive ? '#10B981' : '#F59E0B',
              boxShadow: `0 0 6px ${isLive ? '#10B981' : '#F59E0B'}`
            }} />
            <span>{isLive ? 'DirectQuery • MySQL Live (:8080)' : 'DirectQuery Gateway Connecting'}</span>
          </div>
        </div>

        <div className="pbi-ribbon-actions" style={{ position: 'relative' }}>
          {/* Active User Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#131A28',
              border: `1px solid ${roleTheme.border}`,
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px'
            }}
          >
            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: roleTheme.bg,
                color: roleTheme.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <RoleIcon size={12} />
            </div>
            <span style={{ color: '#FFFFFF', fontWeight: 600 }}>{user.username}</span>
            <span
              style={{
                background: roleTheme.bg,
                color: roleTheme.color,
                border: `1px solid ${roleTheme.border}`,
                padding: '1px 6px',
                borderRadius: '10px',
                fontSize: '10px',
                fontWeight: 700
              }}
            >
              {roleKey}
            </span>
          </div>

          {/* Switch Role Dropdown Button */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="pbi-ribbon-btn"
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              title="Switch between RBAC personas"
            >
              <RefreshCw size={12} />
              <span>Switch Role</span>
            </button>

            {roleMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '6px',
                  width: '220px',
                  background: '#182030',
                  border: '1px solid var(--pbi-border)',
                  borderRadius: '6px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  padding: '6px',
                  zIndex: 1000
                }}
              >
                <div style={{ fontSize: '10.5px', color: '#94A3B8', fontWeight: 700, padding: '4px 8px', textTransform: 'uppercase' }}>
                  Switch Operational Role
                </div>
                {SEED_USERS.map((su) => {
                  const isCurrent = (user.role || '').toUpperCase() === su.role;
                  const cfg = ROLE_THEMES[su.role] || ROLE_THEMES.ADMIN;
                  const Icon = cfg.icon;

                  return (
                    <button
                      key={su.role}
                      type="button"
                      onClick={async () => {
                        setRoleMenuOpen(false);
                        try {
                          await switchDemoUser(su.role);
                        } catch (e) {
                          console.error('Failed to switch user:', e);
                        }
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        background: isCurrent ? 'rgba(255,255,255,0.06)' : 'transparent',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#FFFFFF',
                        fontSize: '12px',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Icon size={14} color={cfg.color} />
                        <div>
                          <div style={{ fontWeight: 600 }}>{su.label}</div>
                          <div style={{ fontSize: '10px', color: '#94A3B8' }}>@{su.username}</div>
                        </div>
                      </div>
                      {isCurrent && <Check size={14} color="#10B981" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sign Out Button */}
          <button
            type="button"
            className="pbi-ribbon-btn"
            onClick={logout}
            title="Sign out and return to Login page"
            style={{ color: '#FF7B60', borderColor: 'rgba(216, 59, 1, 0.3)' }}
          >
            <LogOut size={13} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Report Canvas */}
      <main className="pbi-canvas-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          maxWidth: '680px',
          width: '100%',
          background: 'var(--pbi-visual-bg)',
          border: '1px solid var(--pbi-border)',
          borderRadius: '8px',
          padding: '36px 32px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          textAlign: 'center'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '12px',
            background: roleTheme.bg,
            border: `1px solid ${roleTheme.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            color: roleTheme.color,
            fontSize: '26px'
          }}>
            <RoleIcon size={28} />
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '3px 10px',
            borderRadius: '12px',
            background: roleTheme.bg,
            color: roleTheme.color,
            border: `1px solid ${roleTheme.border}`,
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            marginBottom: '10px'
          }}>
            Active Role: {roleKey}
          </div>

          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#FFFFFF', marginBottom: '8px' }}>
            Authenticated as {user.username}
          </h1>

          <p style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.6, marginBottom: '24px' }}>
            Login successfully validated against the Spring Boot Gateway (:8080) and MySQL database with active JWT token.
          </p>

          <div style={{
            background: '#0E1422',
            border: '1px solid var(--pbi-border)',
            borderRadius: '6px',
            padding: '16px 20px',
            fontSize: '12.5px',
            color: '#CBD5E1',
            textAlign: 'left',
            lineHeight: 1.7
          }}>
            <div style={{ fontWeight: 700, color: roleTheme.color, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Role Permissions &amp; Next Step:</span>
            </div>
            <div>
              {roleKey === 'ADMIN' && '👑 You have full governance authority across all 10 microservices, plants, and machines.'}
              {roleKey === 'MANAGER' && '📊 You have access to executive OEE dashboards, production scheduling, and energy metrics.'}
              {roleKey === 'ENGINEER' && '⚙️ You have access to live sensor calibration, telemetry diagnostics, and machine health.'}
              {roleKey === 'OPERATOR' && '🏭 You have access to shop floor workstation execution, batch logs, and incident reporting.'}
            </div>

            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11.5px', color: '#94A3B8' }}>Test another persona?</span>
              <button
                type="button"
                className="pbi-ribbon-btn"
                onClick={logout}
                style={{ fontSize: '11px', padding: '3px 10px' }}
              >
                Sign Out to Role Picker
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
