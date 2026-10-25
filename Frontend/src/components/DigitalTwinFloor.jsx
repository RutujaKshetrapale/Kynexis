import React, { useState } from 'react';
import { 
  Factory, 
  Cpu, 
  Radio, 
  AlertTriangle, 
  Activity, 
  Sliders, 
  Sparkles,
  Zap,
  CheckCircle2,
  Maximize2
} from 'lucide-react';
import LiveTelemetryGauges from './LiveTelemetryGauges';

export default function DigitalTwinFloor({ onNavigateMachine, telemetryList = [] }) {
  const [selectedMachineId, setSelectedMachineId] = useState(1);
  const [simulationMode, setSimulationMode] = useState('NORMAL'); // 'NORMAL', 'HEAT_SPIKE', 'VIBRATION'

  const plants = [
    { id: 1, name: 'Pune Automotive Hub', region: 'IN-MH', machines: [1, 2, 3] },
    { id: 2, name: 'Munich Smart Factory', region: 'DE-BY', machines: [4] },
    { id: 3, name: 'Detroit Assembly Plant', region: 'US-MI', machines: [5] }
  ];

  const machineDetails = {
    1: { name: 'CNC Milling Station Alpha', type: '5-Axis Mill', status: 'ACTIVE', plant: 'Pune Hub', defaultTemp: 72.5, defaultVib: 2.1, defaultPsi: 45, defaultRpm: 3200 },
    2: { name: 'Robotic Welding Arm W-100', type: 'Robotic Welder', status: 'ACTIVE', plant: 'Pune Hub', defaultTemp: 56.2, defaultVib: 0.9, defaultPsi: 122, defaultRpm: 0 },
    3: { name: 'Hydraulic Stamping Press P-500', type: 'Stamping Press', status: 'MAINTENANCE', plant: 'Pune Hub', defaultTemp: 45.0, defaultVib: 1.4, defaultPsi: 88, defaultRpm: 950 },
    4: { name: 'Automated Injection Molder M-40', type: 'Injection Molder', status: 'INACTIVE', plant: 'Munich Factory', defaultTemp: 24.0, defaultVib: 0.1, defaultPsi: 12, defaultRpm: 0 },
    5: { name: 'Laser Cutter Station LC-9', type: 'Laser Cutter', status: 'ACTIVE', plant: 'Detroit Assembly', defaultTemp: 64.0, defaultVib: 1.1, defaultPsi: 60, defaultRpm: 2800 }
  };

  const selectedMachine = machineDetails[selectedMachineId] || machineDetails[1];

  // Calculate simulated values based on simulationMode
  const getActiveTelemetry = () => {
    let base = {
      temperature: selectedMachine.defaultTemp,
      vibration: selectedMachine.defaultVib,
      pressure: selectedMachine.defaultPsi,
      rpm: selectedMachine.defaultRpm
    };

    if (simulationMode === 'HEAT_SPIKE' && selectedMachineId === 1) {
      base.temperature = 91.8;
      base.vibration = 6.4;
      base.rpm = 3450;
    } else if (simulationMode === 'VIBRATION' && selectedMachineId === 1) {
      base.vibration = 7.8;
      base.temperature = 84.0;
    }

    return base;
  };

  const currentTelem = getActiveTelemetry();

  return (
    <div className="card digital-twin-card" style={{ marginBottom: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span className="live-radar-dot" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Sparkles size={20} style={{ color: 'var(--neon-cyan)' }} />
              Digital Twin Factory Floor Topology
            </h2>
          </div>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Interactive cyber-physical plant network. Select equipment to stream telemetry and test anomaly simulations.
          </p>
        </div>

        {/* Tactical Simulator Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255, 255, 255, 0.03)', padding: '0.35rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', padding: '0 0.5rem', fontWeight: 700, textTransform: 'uppercase' }}>
            Test Sim:
          </span>
          <button
            type="button"
            className={`btn btn-sm ${simulationMode === 'NORMAL' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: '0.725rem', padding: '0.3rem 0.65rem' }}
            onClick={() => setSimulationMode('NORMAL')}
          >
            Nominal
          </button>
          <button
            type="button"
            className={`btn btn-sm ${simulationMode === 'HEAT_SPIKE' ? 'btn-danger' : 'btn-ghost'}`}
            style={{ fontSize: '0.725rem', padding: '0.3rem 0.65rem' }}
            onClick={() => {
              setSimulationMode('HEAT_SPIKE');
              setSelectedMachineId(1);
            }}
          >
            Spike 92°C
          </button>
          <button
            type="button"
            className={`btn btn-sm ${simulationMode === 'VIBRATION' ? 'btn-ghost' : 'btn-ghost'}`}
            style={{ 
              fontSize: '0.725rem', 
              padding: '0.3rem 0.65rem',
              color: simulationMode === 'VIBRATION' ? 'var(--neon-amber)' : 'inherit',
              borderColor: simulationMode === 'VIBRATION' ? 'var(--neon-amber)' : 'inherit'
            }}
            onClick={() => {
              setSimulationMode('VIBRATION');
              setSelectedMachineId(1);
            }}
          >
            Vib Peak
          </button>
        </div>
      </div>

      {/* Main Floor Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.4fr) minmax(300px, 1fr)', gap: '1.5rem', alignItems: 'stretch' }}>
        
        {/* Left: Plant & Machine Network Topology Map */}
        <div className="twin-schematic-wrap">
          <div className="twin-grid-overlay" />
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'relative', zIndex: 2 }}>
            {plants.map((plant) => (
              <div key={plant.id} className="plant-bay-container">
                <div className="plant-bay-title">
                  <Factory size={15} style={{ color: 'var(--neon-cyan)' }} />
                  <span>{plant.name}</span>
                  <span className="badge badge-inactive" style={{ fontSize: '0.625rem', marginLeft: 'auto' }}>{plant.region}</span>
                </div>

                <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
                  {plant.machines.map((mId) => {
                    const m = machineDetails[mId];
                    const isSelected = selectedMachineId === mId;
                    const isOverheating = simulationMode === 'HEAT_SPIKE' && mId === 1;

                    return (
                      <div
                        key={mId}
                        className={`twin-machine-node ${isSelected ? 'selected' : ''} ${isOverheating ? 'critical-alert' : ''}`}
                        onClick={() => setSelectedMachineId(mId)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', fontWeight: 800, color: 'var(--neon-cyan)' }}>
                            #{mId}
                          </span>
                          <span 
                            className="badge-dot" 
                            style={{ 
                              background: isOverheating ? 'var(--neon-crimson)' : m.status === 'ACTIVE' ? 'var(--neon-emerald)' : m.status === 'MAINTENANCE' ? 'var(--neon-purple)' : '#64748b',
                              boxShadow: isOverheating ? '0 0 10px var(--neon-crimson)' : m.status === 'ACTIVE' ? '0 0 8px var(--neon-emerald)' : 'none'
                            }} 
                          />
                        </div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {m.name.split(' ')[0]} {m.name.split(' ')[1] || ''}
                        </div>
                        <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>
                          {m.type}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Selected Equipment Telemetry Cockpit */}
        <div className="twin-cockpit-wrap">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.725rem', color: 'var(--neon-cyan)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Asset Live Telemetry HUD
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginTop: '0.15rem' }}>
                {selectedMachine.name}
              </h3>
            </div>
            <span className={`badge ${currentTelem.temperature > 85 ? 'badge-critical' : selectedMachine.status === 'ACTIVE' ? 'badge-active' : 'badge-maintenance'}`}>
              <span className="badge-dot" />
              {currentTelem.temperature > 85 ? 'CRITICAL HAZARD' : selectedMachine.status}
            </span>
          </div>

          {/* Real-Time Circular Gauges */}
          <LiveTelemetryGauges telemetry={currentTelem} machineId={selectedMachineId} />

          {/* AI Predictive Health Notice */}
          <div style={{
            marginTop: '1.25rem',
            padding: '0.85rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: currentTelem.temperature > 85 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(0, 242, 254, 0.06)',
            border: currentTelem.temperature > 85 ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(0, 242, 254, 0.2)',
            fontSize: '0.775rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem'
          }}>
            <div>
              <strong style={{ color: currentTelem.temperature > 85 ? '#f87171' : 'var(--neon-cyan)' }}>
                {currentTelem.temperature > 85 ? '⚠ Predictive Alert:' : '✓ AI Health Status:'}
              </strong>{' '}
              {currentTelem.temperature > 85 
                ? 'Thermal expansion risk on spindle bearing! MTBF reduced to 12h.' 
                : 'ISO 10816 Class II vibration envelope nominal. Health score 96/100.'}
            </div>

            {onNavigateMachine && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => onNavigateMachine('machines')}
                style={{ fontSize: '0.7rem', padding: '0.3rem 0.6rem', flexShrink: 0 }}
              >
                Inspect
                <Maximize2 size={12} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
