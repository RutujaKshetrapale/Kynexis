import React from 'react';
import { Cpu } from 'lucide-react';
import MachineStatusIndicator from './MachineStatusIndicator';

export default function AccessibleMachineList({
  machines = [],
  plants = [],
  telemetryMap = {},
  alertsMap = {},
  selectedMachineId,
  onSelectMachine,
  onSimulateOutage
}) {
  const getPlantName = (plantId) => {
    const found = plants.find(p => Number(p.id) === Number(plantId));
    return found ? found.name : `Plant #${plantId}`;
  };

  if (machines.length === 0) {
    return (
      <div className="card" style={{ padding: '3rem', textAlign: 'center', background: 'var(--surface)' }}>
        <Cpu size={36} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem', opacity: 0.5 }} />
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>No Machines Found</h3>
        <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          No industrial assets match your current plant or status filter.
        </p>
      </div>
    );
  }

  return (
    <div 
      className="accessible-machine-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '1rem',
        width: '100%'
      }}
      role="list"
      aria-label="Industrial Equipment Schematic List"
    >
      {machines.map((m) => {
        const isSelected = Number(selectedMachineId) === Number(m.id);
        const telem = telemetryMap[m.id];
        const machineAlerts = alertsMap[m.id] || [];
        const hasUnresolvedAlert = machineAlerts.some(a => !a.resolved);

        return (
          <div
            key={m.id}
            role="listitem"
            tabIndex={0}
            onClick={() => onSelectMachine(m.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectMachine(m.id);
              }
            }}
            className={`card machine-card ${isSelected ? 'selected' : ''}`}
            style={{
              cursor: 'pointer',
              padding: '1rem',
              background: isSelected ? 'rgba(0, 102, 255, 0.08)' : 'var(--surface)',
              border: isSelected ? '1.5px solid var(--accent, #0066FF)' : '1px solid var(--border)',
              borderRadius: 'var(--radius-md, 8px)',
              transition: 'var(--transition-fast)',
              outline: 'none',
              boxShadow: isSelected ? '0 0 16px rgba(0, 102, 255, 0.25)' : 'none'
            }}
          >
            {/* Header: ID & Status */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ 
                fontFamily: 'var(--font-mono)', 
                fontSize: '0.7rem', 
                color: 'var(--neon-cyan, #00f2fe)', 
                fontWeight: 800,
                background: 'rgba(0, 242, 254, 0.08)',
                padding: '0.1rem 0.35rem',
                borderRadius: '4px'
              }}>
                #{String(m.id).padStart(3, '0')}
              </span>
              <MachineStatusIndicator status={m.status} hasAlert={hasUnresolvedAlert} size="sm" />
            </div>

            {/* Title & Type */}
            <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.15rem 0' }}>
              {m.name}
            </h4>
            <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              {m.type} • {getPlantName(m.plantId)}
            </div>

            {/* Telemetry snippet */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.4rem',
              padding: '0.5rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--surface-elevated)',
              fontSize: '0.675rem',
              marginBottom: '0.75rem'
            }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block' }}>Temp</span>
                <strong style={{ 
                  fontFamily: 'var(--font-mono)', 
                  color: telem?.temperature > 80 ? 'var(--danger)' : 'var(--text-primary)' 
                }}>
                  {telem?.temperature != null ? `${telem.temperature.toFixed(0)}°C` : '—'}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block' }}>Vib</span>
                <strong style={{ 
                  fontFamily: 'var(--font-mono)', 
                  color: telem?.vibration > 4.5 ? 'var(--warning)' : 'var(--text-primary)' 
                }}>
                  {telem?.vibration != null ? `${telem.vibration.toFixed(1)}` : '—'}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block' }}>RPM</span>
                <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                  {telem?.rpm != null ? Math.round(telem.rpm) : '0'}
                </strong>
              </div>
            </div>

            {/* Card Footer Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.675rem', color: isSelected ? 'var(--accent)' : 'var(--text-muted)', fontWeight: 600 }}>
                {isSelected ? '✓ Selected Equipment' : 'Click to inspect'}
              </span>

              {onSimulateOutage && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSimulateOutage(m);
                  }}
                  style={{ fontSize: '0.675rem', padding: '0.2rem 0.45rem' }}
                  title="Simulate outage scenario for this machine"
                >
                  Simulate
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
