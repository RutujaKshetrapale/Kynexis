import React from 'react';
import { 
  X, 
  Cpu, 
  Activity, 
  AlertTriangle, 
  Boxes, 
  Wrench, 
  Clock, 
  Zap, 
  Sliders, 
  CheckCircle2, 
  ExternalLink,
  Target
} from 'lucide-react';
import MachineStatusIndicator from './MachineStatusIndicator';

export default function MachineDetailPanel({
  machine,
  plant,
  telemetry,
  alerts = [],
  production,
  maintenance,
  onClose,
  onFocus3D,
  onSimulateOutage,
  onNavigate
}) {
  if (!machine) return null;

  const hasAlert = alerts.some(a => !a.resolved);
  const tempVal = telemetry?.temperature ?? null;
  const vibVal = telemetry?.vibration ?? null;
  const psiVal = telemetry?.pressure ?? null;
  const rpmVal = telemetry?.rpm ?? null;

  // Calculate yield
  const qtyProduced = production?.quantityProduced || 0;
  const qtyRejected = production?.quantityRejected || 0;
  const totalUnits = qtyProduced + qtyRejected;
  const yieldPct = totalUnits > 0 ? ((qtyProduced / totalUnits) * 100).toFixed(1) : '100.0';

  return (
    <aside className="machine-detail-panel card" style={{
      width: '100%',
      maxWidth: '380px',
      height: '100%',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      padding: '1.25rem',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg, 12px)',
      boxShadow: 'var(--shadow-lg)'
    }}>
      {/* Panel Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.85rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ 
              fontFamily: 'var(--font-mono)', 
              fontSize: '0.725rem', 
              color: 'var(--neon-cyan, #00f2fe)', 
              fontWeight: 800,
              background: 'rgba(0, 242, 254, 0.08)',
              padding: '0.1rem 0.4rem',
              borderRadius: '4px'
            }}>
              #{String(machine.id).padStart(3, '0')}
            </span>
            <span className="badge badge-inactive" style={{ fontSize: '0.675rem' }}>
              {machine.type || 'Industrial Asset'}
            </span>
          </div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }}>
            {machine.name}
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            {plant?.name || `Plant Facility #${machine.plantId}`}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="btn btn-ghost btn-sm"
          style={{ padding: '0.35rem', color: 'var(--text-muted)' }}
          title="Close details panel"
          aria-label="Close details panel"
        >
          <X size={16} />
        </button>
      </div>

      {/* Operational State Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 0.9rem',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--surface-elevated)',
        border: '1px solid var(--border)'
      }}>
        <div>
          <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
            Operational Status
          </div>
          <div style={{ marginTop: '0.3rem' }}>
            <MachineStatusIndicator status={machine.status} hasAlert={hasAlert} size="md" />
          </div>
        </div>

        {onFocus3D && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onFocus3D(machine.id)}
            style={{ fontSize: '0.7rem', padding: '0.3rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            title="Focus camera on this machine in 3D scene"
          >
            <Target size={12} />
            <span>Focus 3D</span>
          </button>
        )}
      </div>

      {/* Live Telemetry Gauges / Metrics */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Activity size={14} style={{ color: 'var(--neon-cyan, #00f2fe)' }} />
            <span>Sensors & Telemetry</span>
          </div>
          {telemetry?.timestamp && (
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {new Date(telemetry.timestamp).toLocaleTimeString()}
            </span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.6rem' }}>
          {/* Temperature */}
          <div style={{ padding: '0.65rem', borderRadius: 'var(--radius-sm)', background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>Temperature</div>
            <div style={{ 
              fontSize: '1.25rem', 
              fontWeight: 800, 
              fontFamily: 'var(--font-mono)',
              color: tempVal && tempVal > 80 ? 'var(--danger)' : 'var(--text-primary)',
              marginTop: '0.15rem'
            }}>
              {tempVal != null ? `${tempVal.toFixed(1)}°C` : '—'}
            </div>
            <div style={{ fontSize: '0.625rem', color: tempVal && tempVal > 80 ? 'var(--danger)' : 'var(--success)' }}>
              {tempVal && tempVal > 80 ? '⚠ Thermal Overheat' : 'Nominal (<80°C)'}
            </div>
          </div>

          {/* Vibration */}
          <div style={{ padding: '0.65rem', borderRadius: 'var(--radius-sm)', background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>Vibration</div>
            <div style={{ 
              fontSize: '1.25rem', 
              fontWeight: 800, 
              fontFamily: 'var(--font-mono)',
              color: vibVal && vibVal > 4.5 ? 'var(--warning)' : 'var(--text-primary)',
              marginTop: '0.15rem'
            }}>
              {vibVal != null ? `${vibVal.toFixed(2)} mm/s` : '—'}
            </div>
            <div style={{ fontSize: '0.625rem', color: vibVal && vibVal > 4.5 ? 'var(--warning)' : 'var(--success)' }}>
              {vibVal && vibVal > 4.5 ? 'High Vibration' : 'ISO Class II Nominal'}
            </div>
          </div>

          {/* Hydraulic Pressure */}
          <div style={{ padding: '0.65rem', borderRadius: 'var(--radius-sm)', background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>Pressure</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginTop: '0.15rem' }}>
              {psiVal != null ? `${psiVal.toFixed(1)} PSI` : '—'}
            </div>
            <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>Hydraulic baseline</div>
          </div>

          {/* Motor / Spindle RPM */}
          <div style={{ padding: '0.65rem', borderRadius: 'var(--radius-sm)', background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>Motor Velocity</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginTop: '0.15rem' }}>
              {rpmVal != null ? `${Math.round(rpmVal)} RPM` : '0 RPM'}
            </div>
            <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>Drive Spindle</div>
          </div>
        </div>
      </div>

      {/* Recent Alerts Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <AlertTriangle size={14} style={{ color: hasAlert ? 'var(--danger)' : 'var(--text-muted)' }} />
          <span>Active & Recent Alerts ({alerts.length})</span>
        </div>

        {alerts.length === 0 ? (
          <div style={{ padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-sm)', background: 'var(--surface-elevated)', border: '1px solid var(--border-subtle)', fontSize: '0.725rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <CheckCircle2 size={13} style={{ color: 'var(--success)' }} />
            <span>Equipment operating within nominal thresholds.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {alerts.slice(0, 3).map(a => (
              <div key={a.id} style={{
                padding: '0.55rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                background: a.resolved ? 'var(--surface-elevated)' : 'rgba(239, 68, 68, 0.1)',
                border: a.resolved ? '1px solid var(--border-subtle)' : '1px solid rgba(239, 68, 68, 0.35)',
                fontSize: '0.725rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                  <span style={{ fontWeight: 700, color: a.resolved ? 'var(--text-secondary)' : 'var(--danger)' }}>
                    {a.type || 'ALERT'}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    {a.resolved ? 'Resolved' : 'Active Hazard'}
                  </span>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                  {a.message}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Production Batch Context */}
      {production && (
        <div style={{
          padding: '0.75rem 0.85rem',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--surface-elevated)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Boxes size={13} style={{ color: 'var(--neon-purple, #a855f7)' }} />
              <span>Production Batch</span>
            </span>
            <span className="badge badge-active" style={{ fontSize: '0.65rem' }}>
              {production.status || 'IN_PROGRESS'}
            </span>
          </div>
          <div style={{ fontSize: '0.775rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {production.productName || 'Standard Production Run'}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            <span>Produced: <strong style={{ color: 'var(--text-primary)' }}>{qtyProduced}</strong></span>
            <span>Rejected: <strong style={{ color: qtyRejected > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>{qtyRejected}</strong></span>
            <span>Yield: <strong style={{ color: 'var(--success)' }}>{yieldPct}%</strong></span>
          </div>
        </div>
      )}

      {/* Maintenance Status Context */}
      {maintenance && (
        <div style={{
          padding: '0.65rem 0.85rem',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--surface-elevated)',
          border: '1px solid var(--border-subtle)',
          fontSize: '0.7rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Wrench size={13} style={{ color: 'var(--warning)' }} />
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {maintenance.type} Maintenance ({maintenance.status})
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>
                Tech: {maintenance.technician || 'Assigned Lead'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tactical Quick Actions */}
      <div style={{ marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '0.5rem' }}>
        {onSimulateOutage && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => onSimulateOutage(machine)}
            style={{ flex: 1, fontSize: '0.725rem', padding: '0.4rem 0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
          >
            <Sliders size={13} />
            <span>Simulate Outage</span>
          </button>
        )}

        {onNavigate && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onNavigate('machines')}
            style={{ fontSize: '0.725rem', padding: '0.4rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            title="Open complete Machine Registry view"
          >
            <span>Inspect</span>
            <ExternalLink size={12} />
          </button>
        )}
      </div>
    </aside>
  );
}
