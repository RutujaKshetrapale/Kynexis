import React, { useState, useEffect } from 'react';
import { useAuth, SEED_USERS } from '../context/AuthContext';
import { useBackendStatus, plantsApi } from '../services/api';
import { 
  ChevronDown, 
  Bell, 
  Check, 
  LogOut,
  Database,
  SlidersHorizontal
} from 'lucide-react';

export default function Navbar({ selectedPlant, setSelectedPlant, activeTab }) {
  const { user, logout, switchDemoUser } = useAuth();
  const { isLive, isDemo, setDemoMode } = useBackendStatus();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showPlantMenu, setShowPlantMenu] = useState(false);
  const [plantsList, setPlantsList] = useState([
    { id: '1', name: 'Pune Manufacturing Plant' },
    { id: '2', name: 'Mumbai Industrial Plant' },
    { id: '3', name: 'Nashik Production Plant' },
    { id: '4', name: 'Bangalore Smart Factory' },
    { id: '5', name: 'Chennai Manufacturing Plant' }
  ]);

  useEffect(() => {
    async function loadPlants() {
      try {
        const livePlants = await plantsApi.getAll();
        if (Array.isArray(livePlants) && livePlants.length > 0) {
          setPlantsList(livePlants.map(p => ({ id: String(p.id), name: p.name })));
        }
      } catch (e) {
        console.warn('Navbar load plants:', e);
      }
    }
    loadPlants();
  }, [isDemo]);

  const allPlantOptions = [
    ...plantsList,
    { id: 'ALL', name: 'All Facilities' }
  ];

  const currentPlant = allPlantOptions.find(p => p.id === (selectedPlant || '1')) || allPlantOptions[0];

  const pageMeta = {
    dashboard: { title: 'Dashboard', sub: 'Factory Overview' },
    'digital-twin': { title: 'AI Digital Twin', sub: 'Interactive 3D factory layout, real-time telemetry and what-if simulation' },
    plants: { title: 'Plants', sub: 'Manage and monitor all your facilities' },
    machines: { title: 'Machines', sub: 'All machines across selected plant' },
    sensors: { title: 'Sensors', sub: 'Live sensor data and conditions' },
    telemetry: { title: 'Telemetry', sub: 'Real-time and historical sensor data' },
    alerts: { title: 'Alerts', sub: 'Monitor and manage all alerts' },
    maintenance: { title: 'Maintenance', sub: 'Work orders and maintenance schedule' },
    production: { title: 'Production', sub: 'Batch throughput and first-pass yield' },
    energy: { title: 'Energy', sub: 'Continuous electric load and power metrics' },
    profile: { title: 'Settings', sub: 'System architecture, RBAC and mesh configuration' }
  };

  const currentMeta = pageMeta[activeTab] || pageMeta.dashboard;

  return (
    <header className="kynexis-header">
      {/* Page Title & Subtitle */}
      <div className="header-title-wrap">
        <h1 className="header-title">{currentMeta.title}</h1>
        <p className="header-subtitle">{currentMeta.sub}</p>
      </div>

      {/* Header Controls: Plant Selector, Online Status, Date/Time, Alerts, Avatar */}
      <div className="header-actions">
        {/* Plant Selector Dropdown Pill */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="header-plant-selector"
            onClick={() => {
              setShowPlantMenu(!showPlantMenu);
              setShowRoleMenu(false);
            }}
          >
            <span>{currentPlant.name}</span>
            <ChevronDown size={12} style={{ color: 'var(--text-muted)' }} />
          </button>

          {showPlantMenu && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              right: 0,
              width: '230px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              boxShadow: 'var(--shadow-dropdown)',
              padding: '6px',
              zIndex: 110
            }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '4px 8px' }}>
                Select Active Facility
              </div>
              {allPlantOptions.map((p) => {
                const isSelected = (selectedPlant || '1') === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      if (setSelectedPlant) setSelectedPlant(p.id);
                      setShowPlantMenu(false);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '7px 8px',
                      background: isSelected ? 'var(--surface-elevated)' : 'transparent',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12px',
                      color: isSelected ? '#FFFFFF' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <span>{p.name}</span>
                    {isSelected && <Check size={13} style={{ color: 'var(--accent)' }} />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Explicit Live Database vs Demo Mode Status Badge */}
        <button
          type="button"
          onClick={() => setDemoMode(!isDemo)}
          className="header-status-badge"
          title={isDemo ? 'Currently showing synthetic mock fixtures. Click to switch to Live Database.' : (isLive ? 'Connected to live MySQL smart_factory_db via API Gateway (:8080). Click to toggle Demo mode.' : 'Connecting to API Gateway. Click to toggle Demo mode.')}
          style={{
            cursor: 'pointer',
            border: isDemo ? '1px solid rgba(245, 158, 11, 0.45)' : (isLive ? '1px solid rgba(16, 185, 129, 0.45)' : '1px solid rgba(239, 68, 68, 0.45)'),
            background: isDemo ? 'rgba(245, 158, 11, 0.12)' : (isLive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)'),
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: 600,
            color: isDemo ? '#F59E0B' : (isLive ? '#10B981' : '#EF4444'),
            transition: 'all 0.15s ease'
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: isDemo ? '#F59E0B' : (isLive ? '#10B981' : '#EF4444'),
              boxShadow: isDemo ? '0 0 6px #F59E0B' : (isLive ? '0 0 6px #10B981' : '0 0 6px #EF4444')
            }}
          />
          <span>{isDemo ? 'Demo Mode (Mock)' : (isLive ? 'Live Database Connected' : 'Database Offline')}</span>
        </button>

        {/* Current local date/time */}
        <div className="header-datetime">
          {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
        </div>

        {/* Notification Bell */}
        <button
          type="button"
          className="header-icon-btn"
          onClick={() => {
            setShowRoleMenu(!showRoleMenu);
            setShowPlantMenu(false);
          }}
          title="Notifications & Role Switcher"
        >
          <Bell size={15} />
          <span className="header-notification-dot" />
        </button>

        {/* User Avatar & Menu */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="header-avatar"
            onClick={() => {
              setShowRoleMenu(!showRoleMenu);
              setShowPlantMenu(false);
            }}
            title="User Profile & Personas"
          >
            {user?.username ? user.username.charAt(0).toUpperCase() : 'A'}
          </button>

          {showRoleMenu && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              right: 0,
              width: '240px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              boxShadow: 'var(--shadow-dropdown)',
              padding: '8px',
              zIndex: 110
            }}>
              <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '6px' }}>
                <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {user?.username}
                </div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Role: {user?.role || 'ADMIN'}</div>
              </div>

              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '4px 8px' }}>
                Switch Persona
              </div>

              {SEED_USERS.map((seed) => {
                const isSelected = user?.username === seed.username;
                return (
                  <button
                    key={seed.username}
                    type="button"
                    onClick={() => {
                      switchDemoUser(seed.role);
                      setShowRoleMenu(false);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 8px',
                      background: isSelected ? 'var(--surface-elevated)' : 'transparent',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '11.5px',
                      color: isSelected ? '#FFFFFF' : 'var(--text-secondary)',
                      cursor: 'pointer'
                    }}
                  >
                    <span>{seed.label} ({seed.username})</span>
                    {isSelected && <Check size={13} style={{ color: 'var(--accent)' }} />}
                  </button>
                );
              })}

              <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '6px', paddingTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowRoleMenu(false);
                    logout();
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 8px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '11.5px',
                    color: 'var(--danger)',
                    cursor: 'pointer'
                  }}
                >
                  <LogOut size={13} />
                  <span>Sign Out Session</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
