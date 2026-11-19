import React, { useState, useEffect } from 'react';
import { useAuth, SEED_USERS } from './context/AuthContext';
import { alertsApi, plantsApi } from './services/api';
import LoadingSpinner from './components/LoadingSpinner';
import Sidebar from './components/Sidebar';
import LoginView from './views/LoginView';
import AdminView from './views/AdminView';
import ManagerDashboardView from './views/ManagerDashboardView';
import EngineerDashboardView from './views/EngineerDashboardView';
import OperatorDashboardView from './views/OperatorDashboardView';
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
  manager: { title: 'Manager Dashboard', icon: BarChart3, color: '#A855F7' },
  engineer: { title: 'Engineer Dashboard', icon: Cpu, color: '#00BCF2' },
  operator: { title: 'Operator Dashboard', icon: HardHat, color: '#10B981' },
  plants: { title: 'Manufacturing Plants & Facilities Master', icon: Building2, color: '#10B981' },
  machines: { title: 'Machine Fleet & Asset Diagnostics', icon: Cpu, color: '#00BCF2' },
  production: { title: 'Production Batches & Yield Analytics', icon: Layers, color: '#A855F7' },
  energy: { title: 'Energy & Electrical Demand Analytics', icon: Zap, color: '#EAB308' },
  maintenance: { title: 'Maintenance & Machine Health Diagnostics', icon: Wrench, color: '#EC4899' },
  alerts: { title: 'System Alerts', icon: AlertTriangle, color: '#EF4444' },
  telemetry: { title: 'Real-Time Sensor Telemetry Feeds', icon: Activity, color: '#38BDF8' },
  sensors: { title: 'Sensor Calibration & Threshold Matrix', icon: Gauge, color: '#F59E0B' }
};

function getDefaultPageForRole(role) {
  const normalized = (role || 'ADMIN').toUpperCase();
  if (normalized === 'MANAGER') return 'manager';
  if (normalized === 'ENGINEER') return 'engineer';
  if (normalized === 'OPERATOR') return 'operator';
  return 'admin';
}

const ROLE_HOME_PAGES = new Set(['admin', 'manager', 'engineer', 'operator']);

export default function App() {
  const { user, loading, logout, switchDemoUser, assignedPlantId, setOperatorPlantAssignment } = useAuth();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [activePage, setActivePage] = useState(() => getDefaultPageForRole(user?.role));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [unresolvedAlertsCount, setUnresolvedAlertsCount] = useState(0);
  const [allPlants, setAllPlants] = useState([]);

  // Fetch plants for Operator Plant selector inside Switch Role menu
  useEffect(() => {
    if (!user) return;
    plantsApi.getAll()
      .then(res => setAllPlants(Array.isArray(res) ? res : (res?.content || [])))
      .catch(() => { });
  }, [user]);

  // Automatically route to role-appropriate home dashboard on login or role switch
  useEffect(() => {
    if (!user?.role) return;
    const expectedHome = getDefaultPageForRole(user.role);
    if (ROLE_HOME_PAGES.has(activePage) && activePage !== expectedHome) {
      setActivePage(expectedHome);
    }
  }, [user?.role]);

  // Sync alerts badge
  useEffect(() => {
    if (!user) return;
    const refreshBadge = () => {
      alertsApi.getUnresolved()
        .then(res => {
          const count = Array.isArray(res) ? res.length : (res?.content?.length || 0);
          setUnresolvedAlertsCount(count);
        })
        .catch(() => { });
    };
    refreshBadge();
    window.addEventListener('kynexis-alerts-updated', refreshBadge);
    return () => window.removeEventListener('kynexis-alerts-updated', refreshBadge);
  }, [user, activePage]);

  // If user is not authenticated, display the Power BI Login View
  if (!user) {
    return <LoginView />;
  }

  const roleKey = (user.role || 'ADMIN').toUpperCase();
  const roleTheme = ROLE_THEMES[roleKey] || ROLE_THEMES.ADMIN;
  const RoleIcon = roleTheme.icon;
  const currentPageInfo = PAGE_METADATA[activePage] || PAGE_METADATA[getDefaultPageForRole(roleKey)];

  const roleThemeClass = roleKey === 'MANAGER'
    ? 'theme-manager'
    : roleKey === 'ENGINEER'
      ? 'theme-engineer'
      : roleKey === 'OPERATOR'
        ? 'theme-operator'
        : '';

  const visiblePageTabs = Object.entries(PAGE_METADATA).filter(([key]) => {
    if (key === 'admin') return roleKey === 'ADMIN';
    if (key === 'manager') return roleKey === 'MANAGER';
    if (key === 'engineer') return roleKey === 'ENGINEER';
    if (key === 'operator') return roleKey === 'OPERATOR';
    return true;
  });

  return (
    <div className={`pbi-report-layout ${roleThemeClass}`}>
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

                {allPlants.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--pbi-border)', marginTop: '6px', paddingTop: '8px', paddingLeft: '8px', paddingRight: '8px', paddingBottom: '4px' }}>
                    <div style={{ fontSize: '10px', color: '#34D399', fontWeight: 700, textTransform: 'uppercase', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Building2 size={11} />
                      <span>Operator Assigned Plant</span>
                    </div>
                    <select
                      aria-label="Select assigned plant for Floor Operator persona"
                      value={String(assignedPlantId)}
                      onChange={async (e) => {
                        const pid = Number(e.target.value);
                        setOperatorPlantAssignment('operator', pid);
                        if (roleKey === 'OPERATOR') {
                          setOperatorPlantAssignment(user.username, pid);
                        } else {
                          setRoleMenuOpen(false);
                          try {
                            await switchDemoUser('OPERATOR', pid);
                          } catch (err) {
                            console.error('Failed to switch operator plant:', err);
                          }
                        }
                      }}
                      style={{
                        width: '100%',
                        background: '#0E1422',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        color: '#E2E8F0',
                        borderRadius: '4px',
                        padding: '5px 8px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'inherit'
                      }}
                    >
                      {allPlants.map(p => (
                        <option key={p.id} value={String(p.id)}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
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
          {activePage === 'manager' && <ManagerDashboardView />}
          {activePage === 'engineer' && <EngineerDashboardView />}
          {activePage === 'operator' && <OperatorDashboardView />}
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
        {visiblePageTabs.map(([key, meta]) => {
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
