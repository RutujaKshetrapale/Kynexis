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
  ShieldCheck,
  Layers
} from 'lucide-react';

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard, badge: null },
  { id: 'plants', label: 'Plants & Sites', icon: Factory, badge: '3' },
  { id: 'machines', label: 'Machines & Fleet', icon: Cpu, badge: '5' },
  { id: 'sensors', label: 'IoT Sensor Catalog', icon: Radio, badge: '5' },
  { id: 'telemetry', label: 'Live Telemetry', icon: Activity, badge: 'LIVE' },
  { id: 'alerts', label: 'Alarms & Events', icon: AlertTriangle, badge: '1 CRIT' },
  { id: 'maintenance', label: 'Work Orders & AI', icon: Wrench, badge: null },
  { id: 'production', label: 'Production Yield', icon: Boxes, badge: null },
  { id: 'energy', label: 'Energy Consumption', icon: Zap, badge: 'kWh' },
  { id: 'profile', label: 'Gateway & Architecture', icon: ShieldCheck, badge: null },
];

export default function Sidebar({ activeTab, setActiveTab }) {
  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      background: 'rgba(8, 11, 18, 0.95)',
      backdropFilter: 'blur(20px)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 101
    }}>
      {/* Brand Header */}
      <div style={{
        height: 'var(--header-height)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 1.5rem',
        borderBottom: '1px solid var(--border-subtle)',
        gap: '0.75rem'
      }}>
        <div style={{
          width: 38,
          height: 38,
          borderRadius: 'var(--radius-md)',
          background: 'var(--grad-cyan-blue)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 16px rgba(0, 242, 254, 0.4)'
        }}>
          <Layers size={22} color="#06080e" strokeWidth={2.5} />
        </div>
        <div>
          <div style={{
            fontSize: '1.2rem',
            fontWeight: 900,
            letterSpacing: '0.05em',
            background: 'linear-gradient(90deg, #ffffff 0%, #00f2fe 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            KYNEXIS
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Connected Industrial Intelligence
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav style={{
        flex: 1,
        padding: '1.25rem 0.75rem',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem'
      }}>
        <div style={{
          fontSize: '0.675rem',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--text-muted)',
          padding: '0.5rem 0.75rem',
          fontWeight: 700
        }}>
          Operations & Monitoring
        </div>

        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                background: isActive ? 'rgba(0, 242, 254, 0.12)' : 'transparent',
                border: 'none',
                borderLeft: isActive ? '3px solid var(--neon-cyan)' : '3px solid transparent',
                color: isActive ? 'var(--neon-cyan)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: isActive ? 600 : 500,
                textAlign: 'left',
                width: '100%',
                transition: 'all 0.15s ease',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              <Icon size={18} style={{ color: isActive ? 'var(--neon-cyan)' : 'inherit', flexShrink: 0 }} />
              <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.label}
              </span>
              {item.badge && (
                <span style={{
                  fontSize: '0.65rem',
                  padding: '0.15rem 0.45rem',
                  borderRadius: 'var(--radius-full)',
                  background: item.badge.includes('CRIT') 
                    ? 'rgba(239, 68, 68, 0.2)' 
                    : item.badge === 'LIVE' 
                    ? 'rgba(16, 185, 129, 0.2)' 
                    : 'rgba(255, 255, 255, 0.08)',
                  color: item.badge.includes('CRIT') 
                    ? '#f87171' 
                    : item.badge === 'LIVE' 
                    ? '#34d399' 
                    : 'var(--text-secondary)',
                  fontWeight: 700,
                  border: item.badge.includes('CRIT') ? '1px solid rgba(239, 68, 68, 0.4)' : 'none'
                }}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div style={{
        padding: '1rem 1.25rem',
        borderTop: '1px solid var(--border-subtle)',
        background: 'rgba(0, 0, 0, 0.2)',
        fontSize: '0.725rem',
        color: 'var(--text-muted)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
          <span>10 Microservices</span>
          <span style={{ color: 'var(--neon-emerald)' }}>● All Healthy</span>
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.675rem' }}>
          v2.4-STABLE / JDK 21
        </div>
      </div>
    </aside>
  );
}
