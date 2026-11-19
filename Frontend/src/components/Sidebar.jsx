import React from 'react';
import {
  Shield,
  BarChart3,
  Cpu,
  HardHat,
  Building2,
  Layers,
  Zap,
  Wrench,
  AlertTriangle,
  Activity,
  Gauge,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({
  activeView,
  onSelectView,
  collapsed,
  onToggleCollapse,
  unresolvedAlertsCount = 0
}) {
  const { user } = useAuth();
  const role = (user?.role || 'ADMIN').toUpperCase();
  const isAdmin = role === 'ADMIN';
  const isManager = role === 'MANAGER';
  const isEngineer = role === 'ENGINEER';
  const isOperator = role === 'OPERATOR';

  const roleConfig = isManager
    ? { label: 'Manager Workspace', accent: '#A855F7', group: 'Executive Hub', home: { id: 'manager', label: 'Manager Dashboard', icon: BarChart3, color: '#A855F7' } }
    : isEngineer
      ? { label: 'Engineer Workspace', accent: '#00BCF2', group: 'Engineering Hub', home: { id: 'engineer', label: 'Engineer Dashboard', icon: Cpu, color: '#00BCF2' } }
      : isOperator
        ? { label: 'Floor Workspace', accent: '#10B981', group: 'Floor Operations', home: { id: 'operator', label: 'Operator Dashboard', icon: HardHat, color: '#10B981' } }
        : { label: 'Admin Workspace', accent: '#F2C811', group: 'Governance', home: { id: 'admin', label: 'Admin Console', icon: Shield, color: '#F2C811' } };

  const navSections = [
    {
      group: roleConfig.group,
      items: [roleConfig.home]
    },
    {
      group: isOperator ? 'Assigned Floor' : 'Manufacturing Topology',
      items: [
        { id: 'plants', label: isOperator ? 'Assigned Plant' : 'Plants & Facilities', icon: Building2, color: '#10B981' },
        { id: 'machines', label: isOperator ? 'Assigned Machines' : 'Machine Fleet', icon: Cpu, color: '#00BCF2' },
        { id: 'sensors', label: isOperator ? 'Machine Sensors' : 'Sensor Matrix', icon: Gauge, color: '#F59E0B' }
      ]
    },
    {
      group: 'Real-Time Operations',
      items: [
        { id: 'telemetry', label: 'Live Telemetry', icon: Activity, color: '#38BDF8' },
        { id: 'alerts', label: isOperator ? 'Floor Alerts' : 'System Alerts', icon: AlertTriangle, color: '#EF4444', hasBadge: true }
      ]
    },
    {
      group: 'Industrial Analytics',
      items: [
        { id: 'production', label: isOperator ? 'Shift Production' : 'Production Batches', icon: Layers, color: '#A855F7' },
        { id: 'energy', label: 'Energy & Power', icon: Zap, color: '#EAB308' },
        { id: 'maintenance', label: isOperator ? 'Maintenance Guide' : 'Maintenance & Health', icon: Wrench, color: '#EC4899' }
      ]
    }
  ];

  return (
    <aside className={`pbi-sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Workspace Header */}
      <div className="pbi-sidebar-header">
        {!collapsed && (
          <div className="pbi-sidebar-workspace-label" title="KYNEXIS Intelligence Hub">
            <Sparkles size={13} color={roleConfig.accent} />
            <span>{roleConfig.label}</span>
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
        {navSections.map((section, idx) => (
          <div key={idx}>
            {!collapsed && (
              <div className="pbi-sidebar-section">
                <span className="pbi-sidebar-section-title">{section.group}</span>
              </div>
            )}

            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;

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
                </button>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
