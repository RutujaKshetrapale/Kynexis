import React from 'react';
import { 
  X, 
  Cpu, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Wrench, 
  Boxes, 
  Zap, 
  SlidersHorizontal,
  ExternalLink,
  Target
} from 'lucide-react';
import MachineStatusIndicator from './MachineStatusIndicator';

export default function MachineDetailModal({
  isOpen,
  machine,
  plant,
  telemetry,
  alerts = [],
  production,
  maintenance,
  onClose,
  onSimulateOutage,
  onFocus3D
}) {
  if (!isOpen || !machine) return null;

  const hasAlert = alerts.some(a => !a.resolved);
  const tempVal = telemetry?.temperature ?? null;
  const vibVal = telemetry?.vibration ?? null;
  const psiVal = telemetry?.pressure ?? null;
  const rpmVal = telemetry?.rpm ?? null;

  const qtyProduced = production?.quantityProduced || 0;
  const qtyRejected = production?.quantityRejected || 0;
  const totalUnits = qtyProduced + qtyRejected;
  const yieldPct = totalUnits > 0 ? ((qtyProduced / totalUnits) * 100).toFixed(1) : '100.0';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(5, 7, 11, 0.78)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1.5rem'
    }}
    onClick={onClose}
    >
      <div 
        className="card"
        style={{
          width: '100%',
          maxWidth: '680px',
          background: 'var(--surface, #0E141E)',
          border: '1px solid var(--border-strong, #334155)',
          borderRadius: 'var(--radius-xl, 16px)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.85), 0 0 25px rgba(0, 242, 254, 0.15)',
          padding: '1.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
              <span style={{ 
                fontFamily: 'var(--font-mono)', 
                fontSize: '0.75rem', 
                color: 'var(--neon-cyan, #00f2fe)', 
                fontWeight: 800,
                background: 'rgba(0, 242, 254, 0.1)',
                padding: '0.15rem 0.5rem',
                borderRadius: '4px'
              }}>
                #{String(machine.id).padStart(3, '0')}
              </span>
              <span className="badge badge-inactive" style={{ fontSize: '0.7rem' }}>
                {machine.type || 'Equipment Asset'}
              </span>
              <MachineStatusIndicator status={machine.status} hasAlert={hasAlert} size="sm" />
            </div>

            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              {machine.name}
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              {plant?.name || `Assigned to Plant Facility #${machine.plantId}`}
            </p>
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            style={{ padding: '0.4rem', color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Live Telemetry Sensors Grid */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
            <span style={{ fontSize: '0.775rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Activity size={14} style={{ color: 'var(--neon-cyan, #00f2fe)' }} />
              <span>Real-Time Sensor Telemetry HUD</span>
            </span>
            {telemetry?.timestamp && (
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Observed: {new Date(telemetry.timestamp).toLocaleTimeString()}
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
            {/* Temp */}
            <div style={{ padding: '0.85rem', borderRadius: 'var(--radius-sm)', background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Thermal Spindle</div>
              <div style={{ 
                fontSize: '1.35rem', 
                fontWeight: 800, 
                fontFamily: 'var(--font-mono)', 
                color: tempVal && tempVal > 80 ? 'var(--danger)' : 'var(--text-primary)',
                marginTop: '0.2rem'
              }}>
                {tempVal != null ? `${tempVal.toFixed(1)}°C` : '—'}
              </div>
              <div style={{ fontSize: '0.65rem', color: tempVal && tempVal > 80 ? 'var(--danger)' : 'var(--success)' }}>
                {tempVal && tempVal > 80 ? '⚠ Overheating Hazard' : 'Nominal (<80°C)'}
              </div>
            </div>

            {/* Vibration */}
            <div style={{ padding: '0.85rem', borderRadius: 'var(--radius-sm)', background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Vibration Axis-Z</div>
              <div style={{ 
                fontSize: '1.35rem', 
                fontWeight: 800, 
                fontFamily: 'var(--font-mono)', 
                color: vibVal && vibVal > 4.5 ? 'var(--warning)' : 'var(--text-primary)',
                marginTop: '0.2rem'
              }}>
                {vibVal != null ? `${vibVal.toFixed(2)}` : '—'}
              </div>
              <div style={{ fontSize: '0.65rem', color: vibVal && vibVal > 4.5 ? 'var(--warning)' : 'var(--success)' }}>
                {vibVal && vibVal > 4.5 ? 'Threshold Peak' : 'ISO Class II'}
              </div>
            </div>

            {/* Pressure */}
            <div style={{ padding: '0.85rem', borderRadius: 'var(--radius-sm)', background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Hydraulic PSI</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                {psiVal != null ? `${psiVal.toFixed(1)}` : '—'}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Circuit Pressure</div>
            </div>

            {/* RPM */}
            <div style={{ padding: '0.85rem', borderRadius: 'var(--radius-sm)', background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Drive Speed</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                {rpmVal != null ? Math.round(rpmVal) : '0'}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>RPM Velocity</div>
            </div>
          </div>
        </div>

        {/* Batch Production Context */}
        {production && (
          <div style={{
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Active Production Batch
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                {production.productName || 'Batch Run'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', textAlign: 'right' }}>
              <div>
                <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)', display: 'block' }}>Produced</span>
                <strong style={{ fontSize: '1.1rem', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{qtyProduced}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)', display: 'block' }}>Rejected</span>
                <strong style={{ fontSize: '1.1rem', fontFamily: 'var(--font-mono)', color: qtyRejected > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>{qtyRejected}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)', display: 'block' }}>Yield</span>
                <strong style={{ fontSize: '1.1rem', fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>{yieldPct}%</strong>
              </div>
            </div>
          </div>
        )}

        {/* Alerts / Maintenance status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
            Active Maintenance & Alarm Records
          </div>

          {alerts.length === 0 ? (
            <div style={{ padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', background: 'var(--surface-elevated)', border: '1px solid var(--border-subtle)', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={14} style={{ color: 'var(--success)' }} />
              <span>Zero active alarms recorded. Hardware health envelope nominal.</span>
            </div>
          ) : (
            alerts.map(a => (
              <div key={a.id} style={{
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                background: a.resolved ? 'var(--surface-elevated)' : 'rgba(239, 68, 68, 0.12)',
                border: a.resolved ? '1px solid var(--border-subtle)' : '1px solid rgba(239, 68, 68, 0.35)',
                fontSize: '0.75rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: a.resolved ? 'var(--text-secondary)' : 'var(--danger)' }}>
                  <span>{a.type}</span>
                  <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>{a.resolved ? 'RESOLVED' : 'ACTIVE'}</span>
                </div>
                <div style={{ color: 'var(--text-muted)', marginTop: '0.15rem', fontSize: '0.7rem' }}>
                  {a.message}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginTop: 'auto' }}>
          {onFocus3D && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                onFocus3D(machine.id);
                onClose();
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.775rem' }}
            >
              <Target size={14} />
              <span>Focus in 3D Scene</span>
            </button>
          )}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {onSimulateOutage && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  onClose();
                  onSimulateOutage(machine);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.775rem', fontWeight: 700 }}
              >
                <SlidersHorizontal size={14} />
                <span>Simulate Machine Outage</span>
              </button>
            )}

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onClose}
              style={{ fontSize: '0.775rem' }}
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
