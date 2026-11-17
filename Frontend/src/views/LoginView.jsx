import React, { useState } from 'react';
import {
  Shield,
  BarChart3,
  Cpu,
  HardHat,
  Check,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Database,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBackendStatus } from '../services/api';

const ROLES = [
  {
    id: 'ADMIN',
    username: 'admin',
    label: 'Admin',
    title: 'System Administrator',
    icon: Shield,
    accent: '#F2C811',
    glow: 'rgba(242, 200, 17, 0.25)',
    bgSoft: 'rgba(242, 200, 17, 0.1)',
    border: 'rgba(242, 200, 17, 0.35)',
    description: 'Full governance, microservice configs, deletion & node provisioning authority.',
    permissions: ['All Plant & Machine CRUD', 'User & Security Governance', 'Alert Resolution & Dismissal', 'DirectQuery Database Administration']
  },
  {
    id: 'MANAGER',
    username: 'manager',
    label: 'Manager',
    title: 'Plant & Production Manager',
    icon: BarChart3,
    accent: '#A855F7',
    glow: 'rgba(168, 85, 247, 0.25)',
    bgSoft: 'rgba(168, 85, 247, 0.1)',
    border: 'rgba(168, 85, 247, 0.35)',
    description: 'Executive KPI analytics, fleet OEE targets, shift productivity & energy audits.',
    permissions: ['Executive BI Dashboards', 'Production Targets & Scheduling', 'Energy Demand Analytics', 'Cross-Facility OEE Audits']
  },
  {
    id: 'ENGINEER',
    username: 'engineer',
    label: 'Engineer',
    title: 'Lead Systems & Reliability Engineer',
    icon: Cpu,
    accent: '#00BCF2',
    glow: 'rgba(0, 188, 242, 0.25)',
    bgSoft: 'rgba(0, 188, 242, 0.1)',
    border: 'rgba(0, 188, 242, 0.35)',
    description: 'Sensor calibration thresholds, machine health diagnostics & predictive maintenance.',
    permissions: ['High-Frequency Telemetry Feeds', 'Sensor Calibration & Thresholds', 'Machine Health Indexing', 'Maintenance Work Order Dispatch']
  },
  {
    id: 'OPERATOR',
    username: 'operator',
    label: 'Operator',
    title: 'Floor Operations Technician',
    icon: HardHat,
    accent: '#10B981',
    glow: 'rgba(16, 185, 129, 0.25)',
    bgSoft: 'rgba(16, 185, 129, 0.1)',
    border: 'rgba(16, 185, 129, 0.35)',
    description: 'Workstation machine execution, live batch progress logging & incident flagging.',
    permissions: ['Floor Workstation Monitoring', 'Shift Batch Progress Logging', 'Live Telemetry Inspection', 'Maintenance Incident Flagging']
  }
];

const RBAC_MATRIX = [
  {
    feature: 'Executive Operations Dashboard',
    admin: 'Full Access',
    manager: 'Full Access',
    engineer: 'Read-Only',
    operator: 'Limited Summary'
  },
  {
    feature: 'Plant & Facilities Provisioning',
    admin: 'Create / Edit / Delete',
    manager: 'Read-Only Audits',
    engineer: 'Read-Only',
    operator: 'Assigned Plant Only'
  },
  {
    feature: 'Machine Fleet Configuration',
    admin: 'Full Provisioning',
    manager: 'Capacity Planning',
    engineer: 'Calibration & Health',
    operator: 'Status & Run Log'
  },
  {
    feature: 'Sensors & Telemetry Feeds',
    admin: 'Manage Thresholds',
    manager: 'Aggregate Metrics',
    engineer: 'Full Diagnostics',
    operator: 'Live Stream View'
  },
  {
    feature: 'Alerts & Anomalies',
    admin: 'Acknowledge & Clear',
    manager: 'SLA Escalation',
    engineer: 'Root-Cause Analysis',
    operator: 'Floor Incident Log'
  },
  {
    feature: 'Production Batches & Yield',
    admin: 'Full Audit Rights',
    manager: 'Schedule & Targets',
    engineer: 'Scrap Rate Tuning',
    operator: 'Log Actual Output'
  },
  {
    feature: 'Energy & Electrical Demand',
    admin: 'Peak Tariff Control',
    manager: 'Cost Analytics',
    engineer: 'Harmonic Load Analysis',
    operator: 'None'
  },
  {
    feature: 'Security & User Governance',
    admin: 'Full RBAC Authority',
    manager: 'Shift Delegation',
    engineer: 'None',
    operator: 'None'
  }
];

export default function LoginView() {
  const { login, loading } = useAuth();
  const { isLive } = useBackendStatus();

  // State: Role and Password
  const [selectedRoleId, setSelectedRoleId] = useState('ADMIN');
  const [password, setPassword] = useState('Admin@123');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showRbacMatrix, setShowRbacMatrix] = useState(false);

  // Active role config
  const currentRole = ROLES.find(r => r.id === selectedRoleId) || ROLES[0];
  const RoleIcon = currentRole.icon;

  const handleRoleChange = (roleId) => {
    setSelectedRoleId(roleId);
    setErrorMessage('');
  };

  const handleFillDefaultPassword = () => {
    setPassword('Admin@123');
    setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!password) {
      setErrorMessage('Please enter the password for this role.');
      return;
    }

    try {
      // Map chosen role to its username and authenticate with the backend
      await login(currentRole.username, password);
    } catch (err) {
      setErrorMessage(
        err.message ||
        `Failed to sign in as ${currentRole.label}. Check that password is correct (Default: Admin@123).`
      );
    }
  };

  return (
    <div className="pbi-login-wrapper">
      {/* Power BI Top Ribbon */}
      <header className="pbi-login-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="pbi-logo-icon" title="KYNEXIS Power BI Intelligence">
            <span className="pbi-logo-bar" style={{ width: '3px', height: '8px' }} />
            <span className="pbi-logo-bar" style={{ width: '3px', height: '16px' }} />
            <span className="pbi-logo-bar" style={{ width: '3px', height: '11px' }} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.02em' }}>
              KYNEXIS <span style={{ color: '#F2C811' }}>INTELLIGENCE</span>
            </div>
            <div style={{ fontSize: '10.5px', color: '#94A3B8' }}>
              Industrial Manufacturing Analytics Platform
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            className="pbi-status-pill"
            style={{
              border: isLive ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(245, 158, 11, 0.4)',
              background: '#131A28'
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: isLive ? '#10B981' : '#F59E0B',
                boxShadow: `0 0 6px ${isLive ? '#10B981' : '#F59E0B'}`
              }}
            />
            <span style={{ fontSize: '11px' }}>
              {isLive ? 'DirectQuery • Spring Cloud Gateway (:8080) Live' : 'DirectQuery Gateway (:8080) Connecting'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Login Center Frame */}
      <div className="pbi-login-content">
        <div className="pbi-login-hero">
          <div className="pbi-login-hero-title">
            <span>Enterprise Role Sign In</span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#F2C811',
                background: 'rgba(242, 200, 17, 0.12)',
                border: '1px solid rgba(242, 200, 17, 0.3)',
                borderRadius: '12px',
                padding: '2px 8px'
              }}
            >
              Power BI Edition
            </span>
          </div>
          <p className="pbi-login-hero-subtitle">
            Choose your role and enter the password to launch into your role-specific manufacturing analytics workspace.
          </p>
        </div>

        {/* The Role + Password Sign-In Box */}
        <div className="pbi-login-form-box" style={{ maxWidth: '580px', width: '100%' }}>
          {/* Section 1: Role Slicer / Chiclet Pills */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px'
            }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={14} color="#F2C811" />
                <span>1. Select Role</span>
              </label>
              <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                4 Operational Tiers
              </span>
            </div>

            {/* Slicer Chiclets */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px'
            }}>
              {ROLES.map((r) => {
                const isSelected = selectedRoleId === r.id;
                const Icon = r.icon;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleRoleChange(r.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '12px 6px',
                      borderRadius: '6px',
                      background: isSelected ? r.bgSoft : '#111724',
                      border: isSelected ? `2px solid ${r.accent}` : '1px solid var(--pbi-border)',
                      boxShadow: isSelected ? `0 0 16px ${r.glow}` : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      fontFamily: 'inherit'
                    }}
                  >
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      background: isSelected ? r.accent : 'rgba(255,255,255,0.05)',
                      color: isSelected ? '#0F131E' : r.accent,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '6px'
                    }}>
                      <Icon size={18} strokeWidth={2.2} />
                    </div>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: isSelected ? 800 : 600,
                      color: isSelected ? '#FFFFFF' : '#CBD5E1'
                    }}>
                      {r.label}
                    </span>
                    <span style={{
                      fontSize: '9.5px',
                      color: isSelected ? r.accent : '#64748B',
                      fontFamily: 'var(--pbi-font-mono)',
                      marginTop: '2px'
                    }}>
                      @{r.username}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Also a Select Dropdown for quick alternative or screen readers */}
            <div style={{ marginTop: '10px' }}>
              <select
                aria-label="Operational Role"
                value={selectedRoleId}
                onChange={(e) => handleRoleChange(e.target.value)}
                style={{
                  width: '100%',
                  height: '36px',
                  background: '#111724',
                  border: '1px solid var(--pbi-border)',
                  borderRadius: '6px',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  padding: '0 12px',
                  fontFamily: 'inherit',
                  cursor: 'pointer'
                }}
              >
                {ROLES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label} — {r.title} (@{r.username})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Role Feature Card */}
          <div style={{
            padding: '12px 14px',
            borderRadius: '6px',
            background: currentRole.bgSoft,
            border: `1px solid ${currentRole.border}`,
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                background: currentRole.accent,
                color: '#0F131E',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <RoleIcon size={18} />
              </div>
              <div>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#FFFFFF' }}>
                  Target Role: <span style={{ color: currentRole.accent }}>{currentRole.title}</span>
                </div>
                <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                  {currentRole.description}
                </div>
              </div>
            </div>

            <div style={{
              fontSize: '10px',
              fontFamily: 'var(--pbi-font-mono)',
              color: currentRole.accent,
              background: 'rgba(0,0,0,0.3)',
              padding: '3px 8px',
              borderRadius: '4px',
              fontWeight: 700,
              flexShrink: 0
            }}>
              ROLE_{currentRole.id}
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="pbi-login-error">
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 2: Password & Login Action */}
          <form onSubmit={handleSubmit}>
            <div className="pbi-form-group">
              <div className="pbi-form-label">
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <KeyRound size={14} color="#F2C811" />
                  <span>2. Enter Password for {currentRole.label}</span>
                </span>
                <button
                  type="button"
                  onClick={handleFillDefaultPassword}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: currentRole.accent,
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0
                  }}
                  title="Click to automatically fill default password Admin@123"
                >
                  Fill default: Admin@123
                </button>
              </div>

              <div className="pbi-form-input-wrap">
                <Lock size={16} className="pbi-form-icon" />
                <input
                  id="kynexis-password-input"
                  type={showPassword ? 'text' : 'password'}
                  className="pbi-form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={`Enter password for ${currentRole.label}`}
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="pbi-form-input-action"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="pbi-submit-btn"
              disabled={loading}
              style={{
                background: `linear-gradient(135deg, ${currentRole.accent} 0%, #D4A700 100%)`,
                boxShadow: `0 4px 16px ${currentRole.glow}`
              }}
            >
              {loading ? (
                <>
                  <span className="spin-animation">⏳</span>
                  <span>Authenticating as {currentRole.label}...</span>
                </>
              ) : (
                <>
                  <span>Sign In as {currentRole.label}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Quick Info Footer */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '16px',
            paddingTop: '14px',
            borderTop: '1px solid var(--pbi-border-subtle)',
            fontSize: '11px',
            color: '#94A3B8'
          }}>
            <span>Connected Endpoint: <strong style={{ color: '#FFFFFF' }}>/api/auth/login</strong></span>
            <span>Default Credential: <code style={{ color: '#F2C811', background: '#111724', padding: '1px 5px', borderRadius: '3px' }}>Admin@123</code></span>
          </div>
        </div>

        {/* Collapsible RBAC Security Matrix */}
        <div className="pbi-rbac-matrix-box" style={{ maxWidth: '960px' }}>
          <div
            className="pbi-rbac-matrix-header"
            onClick={() => setShowRbacMatrix(!showRbacMatrix)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={15} color="#F2C811" />
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF' }}>
                Role-Based Access Control (RBAC) Permissions Matrix
              </span>
              <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                — Click to view microservice permissions across all 4 roles
              </span>
            </div>

            <div style={{ color: '#94A3B8', display: 'flex', alignItems: 'center' }}>
              {showRbacMatrix ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </div>

          {showRbacMatrix && (
            <div style={{ overflowX: 'auto' }}>
              <table className="pbi-rbac-table">
                <thead>
                  <tr>
                    <th style={{ width: '28%' }}>Functional Domain</th>
                    <th style={{ width: '18%', color: '#F2C811' }}>👑 Admin</th>
                    <th style={{ width: '18%', color: '#A855F7' }}>📊 Manager</th>
                    <th style={{ width: '18%', color: '#00BCF2' }}>⚙️ Engineer</th>
                    <th style={{ width: '18%', color: '#10B981' }}>🏭 Operator</th>
                  </tr>
                </thead>
                <tbody>
                  {RBAC_MATRIX.map((row, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600, color: '#FFFFFF' }}>{row.feature}</td>
                      <td>
                        <span className="pbi-perm-chip pbi-perm-exec">{row.admin}</span>
                      </td>
                      <td>
                        <span className="pbi-perm-chip pbi-perm-read">{row.manager}</span>
                      </td>
                      <td>
                        <span className="pbi-perm-chip pbi-perm-read">{row.engineer}</span>
                      </td>
                      <td>
                        <span className="pbi-perm-chip pbi-perm-none">{row.operator}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
