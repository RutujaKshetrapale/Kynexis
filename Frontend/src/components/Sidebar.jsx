import React from 'react';
import {
  Shield,
  Building2,
  Cpu,
  Layers,
  Zap,
  Wrench,
  AlertTriangle,
  Activity,
  Gauge,
  ChevronLeft,
  ChevronRight,
  Menu,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  {
    group: 'Governance',
    items: [
      { id: 'admin', label: 'Admin Console', icon: Shield, color: '#F2C811', roleReq: 'ADMIN' }
    ]
  },
  {
    group: 'Manufacturing Topology',
    items: [
      { id: 'plants', label: 'Plants & Facilities', icon: Building2, color: '#10B981' },
      { id: 'machines', label: 'Machine Fleet', icon: Cpu, color: '#00BCF2' },
      { id: 'sensors', label: 'Sensor Matrix', icon: Gauge, color: '#F59E0B' }
    ]
  },
  {
    group: 'Real-Time Operations',
    items: [
      { id: 'telemetry', label: 'Live Telemetry', icon: Activity, color: '#38BDF8' },
      { id: 'alerts', label: 'System Alerts', icon: AlertTriangle, color: '#EF4444', hasBadge: true }
    ]
  },
  {
    group: 'Industrial Analytics',
    items: [
      { id: 'production', label: 'Production Batches', icon: Layers, color: '#A855F7' },
      { id: 'energy', label: 'Energy & Power', icon: Zap, color: '#EAB308' },
      { id: 'maintenance', label: 'Maintenance & Health', icon: Wrench, color: '#EC4899' }
    ]
  }
];

export default function Sidebar({
  activeView,
  onSelectView,
  collapsed,
  onToggleCollapse,
  unresolvedAlertsCount = 0
}) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  return (
    <aside className={`pbi-sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Workspace Header */}
      <div className="pbi-sidebar-header">
        {!collapsed && (
          <div className="pbi-sidebar-workspace-label" title="KYNEXIS Intelligence Hub">
            <Sparkles size={13} color="#F2C811" />
            <span>Workspace</span>
          </div>
        )}
        <button
          type="button"
          className="pbi-sidebar-toggle-btn"
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="pbi-sidebar-nav">
        {NAV_ITEMS.map((section, idx) => (
          <div key={idx}>
            {!collapsed && (
              <div className="pbi-sidebar-section">
                <span className="pbi-sidebar-section-title">{section.group}</span>
              </div>
            )}

            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              const isLocked = item.roleReq && !isAdmin;

              return (
                <button
                  key={item.id}
                  type="button"
                  className={`pbi-sidebar-item ${isActive ? 'active' : ''}`}
                  onClick={() => onSelectView(item.id)}
                  title={collapsed ? item.label : undefined}
                >
                  <span
                    className="pbi-sidebar-icon"
                    style={{ color: isActive ? '#FFFFFF' : item.color }}
                  >
                    <Icon size={16} />
                  </span>

                  {!collapsed && (
                    <span className="pbi-sidebar-label">
                      {item.label}
                    </span>
                  )}

                  {!collapsed && item.hasBadge && unresolvedAlertsCount > 0 && (
                    <span className="pbi-sidebar-badge">
                      {unresolvedAlertsCount}
                    </span>
                  )}

                  {!collapsed && isLocked && (
                    <span style={{ fontSize: '9px', color: '#64748B', fontFamily: 'var(--pbi-font-mono)' }}>
                      🔒
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Sidebar Footer */}
      {!collapsed && (
        <div className="pbi-sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#94A3B8' }}>
            <span>Reports Hub</span>
            <span style={{ color: '#F2C811', fontWeight: 700 }}>DirectQuery</span>
          </div>
        </div>
      )}
    </aside>
  );
}

