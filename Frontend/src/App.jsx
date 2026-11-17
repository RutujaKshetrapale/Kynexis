import React, { useState, useEffect } from 'react';
import { useAuth, SEED_USERS } from './context/AuthContext';
import { useBackendStatus, alertsApi } from './services/api';
import LoadingSpinner from './components/LoadingSpinner';
import Sidebar from './components/Sidebar';
import LoginView from './views/LoginView';
import AdminView from './views/AdminView';
import PlantsView from './views/PlantsView';
import MachinesView from './views/MachinesView';
import ProductionView from './views/ProductionView';
import EnergyView from './views/EnergyView';
import MaintenanceView from './views/MaintenanceView';
import AlertsView from './views/AlertsView';
import TelemetryView from './views/TelemetryView';
import SensorsView from './views/SensorsView';
import {
  LogOut,
  RefreshCw,
  Shield,
  BarChart3,
  Cpu,
  HardHat,
  Check,
  Building2,
  Layers,
  Zap,
  Wrench,
  AlertTriangle,
  Activity,
  Gauge
} from 'lucide-react';

const ROLE_THEMES = {
  ADMIN: { color: '#F2C811', bg: 'rgba(242, 200, 17, 0.12)', border: 'rgba(242, 200, 17, 0.35)', icon: Shield },
  MANAGER: { color: '#A855F7', bg: 'rgba(168, 85, 247, 0.12)', border: 'rgba(168, 85, 247, 0.35)', icon: BarChart3 },
  ENGINEER: { color: '#00BCF2', bg: 'rgba(0, 188, 242, 0.12)', border: 'rgba(0, 188, 242, 0.35)', icon: Cpu },
  OPERATOR: { color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.35)', icon: HardHat }
};

const PAGE_METADATA = {
  admin: { title: 'Administration Console', icon: Shield, color: '#F2C811' },
  plants: { title: 'Manufacturing Plants & Facilities Master', icon: Building2, color: '#10B981' },
  machines: { title: 'Machine Fleet & Asset Diagnostics', icon: Cpu, color: '#00BCF2' },
  production: { title: 'Production Batches & Yield Analytics', icon: Layers, color: '#A855F7' },
  energy: { title: 'Energy & Electrical Demand Analytics', icon: Zap, color: '#EAB308' },
  maintenance: { title: 'Maintenance & Machine Health Diagnostics', icon: Wrench, color: '#EC4899' },
  alerts: { title: 'System Alerts', icon: AlertTriangle, color: '#EF4444' },
  telemetry: { title: 'Real-Time Sensor Telemetry Feeds', icon: Activity, color: '#38BDF8' },
  sensors: { title: 'Sensor Calibration & Threshold Matrix', icon: Gauge, color: '#F59E0B' }
};

export default function App() {
  const { user, loading, logout, switchDemoUser } = useAuth();
  const { isLive } = useBackendStatus();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [activePage, setActivePage] = useState('admin');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [unresolvedAlertsCount, setUnresolvedAlertsCount] = useState(0);

  // Sync alerts badge
  useEffect(() => {
    if (!user) return;
    alertsApi.getUnresolved()
      .then(res => {
        const count = Array.isArray(res) ? res.length : (res?.content?.length || 0);
        setUnresolvedAlertsCount(count);
      })
      .catch(() => {});
  }, [user, activePage]);

  // If user is not authenticated, display the Power BI Login View
  if (!user) {
    return <LoginView />;
  }

  const roleKey = (user.role || 'ADMIN').toUpperCase();
  const roleTheme = ROLE_THEMES[roleKey] || ROLE_THEMES.ADMIN;
  const RoleIcon = roleTheme.icon;
  const currentPageInfo = PAGE_METADATA[activePage] || PAGE_METADATA.admin;

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
                <span style={{ color: '#FFFFFF', fontWeight: 600 }}>
                  {currentPageInfo.title}
                </span>
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
                  width: '240px',
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

      {/* Main Layout Body: Sidebar + Main Content */}
      <div className="pbi-layout-body">
        {/* Navigation Sidebar */}
        <Sidebar
          activeView={activePage}
          onSelectView={setActivePage}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          unresolvedAlertsCount={unresolvedAlertsCount}
        />

        {/* Dynamic Report View */}
        <main className="pbi-canvas-main" style={{ overflowY: 'auto', flex: 1 }}>
          {activePage === 'admin' && <AdminView />}
          {activePage === 'plants' && <PlantsView />}
          {activePage === 'machines' && <MachinesView />}
          {activePage === 'production' && <ProductionView />}
          {activePage === 'energy' && <EnergyView />}
          {activePage === 'maintenance' && <MaintenanceView />}
          {activePage === 'alerts' && <AlertsView />}
          {activePage === 'telemetry' && <TelemetryView />}
          {activePage === 'sensors' && <SensorsView />}
        </main>
      </div>

      {/* Bottom Power BI Page Tabs Bar */}
      <footer className="pbi-page-tabs-bar">
        {Object.entries(PAGE_METADATA).map(([key, meta]) => {
          const TabIcon = meta.icon;
          const isActive = activePage === key;
          return (
            <button
              key={key}
              type="button"
              className={`pbi-page-tab ${isActive ? 'active' : ''}`}
              onClick={() => setActivePage(key)}
            >
              <TabIcon size={13} color={meta.color} />
              <span>{meta.title.split(' ')[0]} {meta.title.split(' ')[1]}</span>
            </button>
          );
        })}
      </footer>
    </div>
  );
}
