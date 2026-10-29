import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard,
  Home,
  Factory,
  Cpu, 
  Radio,
  Activity,
  BarChart3, 
  AlertTriangle, 
  Wrench, 
  Zap, 
  Settings,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { alertsApi } from '../services/api';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'digital-twin', label: 'Factory View', icon: Home, badge: 'Live' },
  { id: 'plants', label: 'Plants', icon: Factory },
  { id: 'machines', label: 'Machines', icon: Cpu },
  { id: 'sensors', label: 'Sensors', icon: Radio },
  { id: 'telemetry', label: 'Telemetry', icon: Activity },
  { id: 'production', label: 'Production', icon: BarChart3 },
  { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  { id: 'energy', label: 'Energy', icon: Zap },
  { id: 'profile', label: 'Settings', icon: Settings },
];

export default function Sidebar({ activeTab, setActiveTab, collapsed }) {
  const { user } = useAuth();
  const [unresolvedCount, setUnresolvedCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    const fetchCount = async () => {
      try {
        const res = await alertsApi.getUnresolved();
        if (mounted && Array.isArray(res)) {
          setUnresolvedCount(res.length);
        }
      } catch (err) {
        console.warn('Sidebar alert count sync notice:', err);
      }
    };

    fetchCount();

    const handleUpdate = () => {
      fetchCount();
    };

    window.addEventListener('kynexis-alerts-updated', handleUpdate);
    window.addEventListener('kynexis-plant-status-change', handleUpdate);
    const interval = setInterval(fetchCount, 15000);

    return () => {
      mounted = false;
      window.removeEventListener('kynexis-alerts-updated', handleUpdate);
      window.removeEventListener('kynexis-plant-status-change', handleUpdate);
      clearInterval(interval);
    };
  }, []);

  return (
    <aside className={`kynexis-sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Brand Header */}
      <div 
        className="sidebar-brand"
        onClick={() => setActiveTab('digital-twin')}
        title="KYNEXIS Smart Factory Platform"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '3px',
          padding: '4px 6px 14px 6px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="sidebar-logo-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="sidebar-brand-name">KYNEXIS</span>
        </div>
        {!collapsed && (
          <div style={{
            fontSize: '8px',
            fontWeight: 700,
            letterSpacing: '0.12em',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            paddingLeft: '2px',
            marginTop: '2px'
          }}>
            AI POWERED FACTORY INTELLIGENCE
          </div>
        )}
      </div>

      {/* Navigation List */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`sidebar-nav-btn ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
              title={item.label}
              style={{
                position: 'relative'
              }}
            >
              <Icon size={17} style={{ flexShrink: 0 }} />
              <span>{item.label}</span>
              {item.badge && !collapsed && (
                <span style={{
                  marginLeft: 'auto',
                  background: 'rgba(0, 242, 254, 0.15)',
                  color: 'var(--neon-cyan, #00f2fe)',
                  border: '1px solid rgba(0, 242, 254, 0.35)',
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  padding: '0.1rem 0.35rem',
                  borderRadius: '9999px',
                  lineHeight: 1
                }}>
                  {item.badge}
                </span>
              )}
              {item.id === 'alerts' && unresolvedCount > 0 && !collapsed && (
                <span style={{
                  marginLeft: 'auto',
                  background: 'var(--danger, #EF4444)',
                  color: '#ffffff',
                  fontSize: '0.625rem',
                  fontWeight: 800,
                  padding: '0.1rem 0.45rem',
                  borderRadius: '9999px',
                  lineHeight: 1.2,
                  boxShadow: '0 0 8px rgba(239, 68, 68, 0.4)'
                }}>
                  {unresolvedCount}
                </span>
              )}
              {item.id !== 'alerts' && item.count && !collapsed && (
                <span style={{
                  marginLeft: 'auto',
                  background: 'var(--danger, #EF4444)',
                  color: '#ffffff',
                  fontSize: '0.625rem',
                  fontWeight: 800,
                  padding: '0.1rem 0.4rem',
                  borderRadius: '9999px',
                  lineHeight: 1
                }}>
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Footer Profile */}
      <div 
        className="sidebar-user-footer"
        onClick={() => setActiveTab('profile')}
        title="View Security & Profile Settings"
      >
        <div className="sidebar-user-info">
          <div className="sidebar-user-avatar">
            {user?.username ? user.username.charAt(0).toUpperCase() : 'R'}
          </div>
          <div>
            <div className="sidebar-user-name">
              {user?.username === 'admin' ? 'Rutuja K.' : (user?.username || 'Rutuja K.')}
            </div>
            <div className="sidebar-user-role">
              {user?.role === 'ADMIN' ? 'Plant Manager' : (user?.role || 'Plant Manager')}
            </div>
          </div>
        </div>
        <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
      </div>
    </aside>
  );
}
