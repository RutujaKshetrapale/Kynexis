import React from 'react';
import { 
  LayoutDashboard, 
  Factory, 
  Cpu, 
  Radio, 
  Activity, 
  AlertTriangle, 
  Wrench, 
  Boxes, 
  Zap, 
  Settings, 
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'plants', label: 'Plants', icon: Factory },
  { id: 'machines', label: 'Machines', icon: Cpu },
  { id: 'sensors', label: 'Sensors', icon: Radio },
  { id: 'telemetry', label: 'Telemetry', icon: Activity },
  { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  { id: 'production', label: 'Production', icon: Boxes },
  { id: 'energy', label: 'Energy', icon: Zap },
  { id: 'profile', label: 'Settings', icon: Settings },
];

export default function Sidebar({ activeTab, setActiveTab, collapsed }) {
  const { user } = useAuth();

  return (
    <aside className={`kynexis-sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Brand Header */}
      <div 
        className="sidebar-brand"
        onClick={() => setActiveTab('dashboard')}
        title="KYNEXIS Smart Factory Platform"
      >
        <div className="sidebar-logo-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <span className="sidebar-brand-name">KYNEXIS</span>
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
            >
              <Icon size={17} style={{ flexShrink: 0 }} />
              <span>{item.label}</span>
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
