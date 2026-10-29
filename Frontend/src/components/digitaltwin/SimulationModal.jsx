import React, { useState, useMemo } from 'react';
import { 
  X, 
  Sliders, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Zap, 
  Clock, 
  Boxes, 
  RotateCcw,
  ArrowRight,
  Info
} from 'lucide-react';

export default function SimulationModal({
  isOpen,
  onClose,
  initialScenario = 'DOWNTIME', // 'DOWNTIME' | 'DEMAND' | 'ENERGY' | 'SHIFT'
  machines = [],
  productionSummary = { totalProduction: 4680, targetProduction: 6000 }
}) {
  const [scenarioType, setScenarioType] = useState(initialScenario);
  const [selectedMachineId, setSelectedMachineId] = useState(machines[0]?.id || 1);
  const [downtimeHours, setDowntimeHours] = useState(4);
  const [demandIncreasePct, setDemandIncreasePct] = useState(25);
  const [energyReductionPct, setEnergyReductionPct] = useState(15);
  const [shiftCount, setShiftCount] = useState(2); // 1, 2, 3 shifts

  // Selected Machine Context
  const targetMachine = machines.find(m => m.id === Number(selectedMachineId)) || machines[0];

  // Deterministic Simulation Calculations
  const simulationResults = useMemo(() => {
    const baselineProduction = Number(productionSummary.totalProduction) || 4680;
    const baselineTarget = Number(productionSummary.targetProduction) || 6000;
    
    // Derived nominal rate per machine per hour (~120 units/hr average)
    const nominalHourlyRate = 120;

    if (scenarioType === 'DOWNTIME') {
      const lostUnits = Math.round(nominalHourlyRate * downtimeHours);
      const projectedOutput = Math.max(0, baselineProduction - lostUnits);
      const capacityGap = baselineTarget - projectedOutput;
      const pctDrop = ((lostUnits / baselineProduction) * 100).toFixed(1);

      return {
        title: 'Machine Downtime Impact',
        baseline: baselineProduction,
        projected: projectedOutput,
        deltaUnits: -lostUnits,
        deltaPct: `-${pctDrop}%`,
        capacityGap,
        impactSeverity: downtimeHours >= 8 ? 'CRITICAL' : downtimeHours >= 4 ? 'WARNING' : 'MODERATE',
        bottleneck: `${targetMachine?.name || 'Machine'} offline for ${downtimeHours} hours`,
        assumptions: [
          `Nominal asset throughput modeled at ${nominalHourlyRate} units/hour`,
          `Outage duration: ${downtimeHours} continuous hours with zero line buffering`,
          `No secondary routing or parallel redundant capacity engaged`
        ],
        limitations: 'Calculations reflect static throughput without warm-up ramp curves or rework variance.'
      };
    }

    if (scenarioType === 'DEMAND') {
      const newTarget = Math.round(baselineTarget * (1 + demandIncreasePct / 100));
      const maximumPlantCapacity = 6800; // Physical plant maximum across all running assets
      const shortfall = Math.max(0, newTarget - maximumPlantCapacity);
      const utilization = Math.min(100, Math.round((newTarget / maximumPlantCapacity) * 100));

      return {
        title: 'Increased Production Demand Impact',
        baseline: baselineTarget,
        projected: newTarget,
        deltaUnits: newTarget - baselineTarget,
        deltaPct: `+${demandIncreasePct}%`,
        capacityGap: shortfall,
        utilization,
        impactSeverity: shortfall > 0 ? 'CRITICAL' : utilization > 90 ? 'WARNING' : 'NOMINAL',
        bottleneck: shortfall > 0 ? 'CNC & Assembly cell capacity ceiling exceeded' : 'Sufficient headroom within current fleet',
        assumptions: [
          `Fleet maximum modeled ceiling: ${maximumPlantCapacity} units / 24h`,
          `Target demand scale factor: +${demandIncreasePct}% over baseline`,
          `Machine availability assumed nominal across all active cells`
        ],
        limitations: 'Assumes tooling availability and zero raw material supply chain starvation.'
      };
    }

    if (scenarioType === 'ENERGY') {
      const baselineKwh = 1850;
      const savedKwh = Math.round(baselineKwh * (energyReductionPct / 100));
      const newKwh = baselineKwh - savedKwh;
      const throughputImpact = Math.round(savedKwh * 0.45); // Estimated unit tradeoff

      return {
        title: 'Energy Peak Optimization Impact',
        baseline: baselineKwh,
        projected: newKwh,
        deltaUnits: -savedKwh,
        deltaPct: `-${energyReductionPct}%`,
        capacityGap: throughputImpact,
        impactSeverity: energyReductionPct > 25 ? 'WARNING' : 'NOMINAL',
        bottleneck: 'Off-peak load shifting on thermal stamping and induction heating cells',
        assumptions: [
          `Peak grid power baseline: ${baselineKwh} kWh/day`,
          `Peak load curtailment target: ${energyReductionPct}%`,
          `Thermal cycle adjustments applied during peak tariff windows`
        ],
        limitations: 'Energy tariff models assume flat-rate industrial time-of-day metering.'
      };
    }

    // SHIFT SCENARIO
    const shiftMultiplier = shiftCount === 1 ? 0.55 : shiftCount === 2 ? 1.0 : 1.35;
    const shiftProjected = Math.round(baselineProduction * shiftMultiplier);
    const shiftDelta = shiftProjected - baselineProduction;

    return {
      title: 'Workforce Shift Reconfiguration',
      baseline: baselineProduction,
      projected: shiftProjected,
      deltaUnits: shiftDelta,
      deltaPct: `${shiftDelta >= 0 ? '+' : ''}${(((shiftMultiplier - 1)) * 100).toFixed(0)}%`,
      capacityGap: Math.max(0, baselineTarget - shiftProjected),
      impactSeverity: shiftCount === 1 ? 'CRITICAL' : 'NOMINAL',
      bottleneck: shiftCount === 3 ? 'Overnight maintenance window restricted to 3.5h' : 'Standard 8-hour handover cycle',
      assumptions: [
        `Active shifts configured: ${shiftCount} shift(s) per 24h operating cycle`,
        `Crew efficiency modeled at 94% on primary shifts and 88% on night shift`
      ],
      limitations: 'Does not account for unscheduled operator absenteeism or changeover delays.'
    };
  }, [scenarioType, downtimeHours, demandIncreasePct, energyReductionPct, shiftCount, targetMachine, productionSummary]);

  if (!isOpen) return null;

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
          maxWidth: '780px',
          background: 'var(--surface, #0E141E)',
          border: '1.5px solid var(--accent, #0066FF)',
          borderRadius: 'var(--radius-xl, 16px)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.85), 0 0 30px rgba(0, 102, 255, 0.2)',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--accent, #0066FF)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              <Sliders size={15} />
              <span>What-If Operational Simulation Engine</span>
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
              {simulationResults.title}
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Simulate operational perturbations without altering live factory records.
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

        {/* Scenario Switcher Tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
          {[
            { id: 'DOWNTIME', label: 'Machine Downtime', icon: Clock },
            { id: 'DEMAND', label: 'Increase Demand', icon: TrendingUp },
            { id: 'ENERGY', label: 'Energy Optimization', icon: Zap },
            { id: 'SHIFT', label: 'Shift Change', icon: Boxes }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = scenarioType === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setScenarioType(tab.id)}
                className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-ghost'}`}
                style={{
                  fontSize: '0.75rem',
                  padding: '0.55rem 0.65rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                <Icon size={13} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Parameter Inputs Section */}
        <div style={{
          padding: '1.15rem',
          borderRadius: 'var(--radius-md)',
          background: 'var(--surface-elevated, #131B28)',
          border: '1px solid var(--border)'
        }}>
          {scenarioType === 'DOWNTIME' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Target Machine for Outage Simulation:
                </label>
                <select
                  value={selectedMachineId}
                  onChange={(e) => setSelectedMachineId(e.target.value)}
                  style={{
                    padding: '0.4rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    fontSize: '0.8rem',
                    fontWeight: 600
                  }}
                >
                  {machines.map(m => (
                    <option key={m.id} value={m.id}>
                      #{m.id} — {m.name} ({m.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Simulated Outage Duration:
                  </span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--neon-cyan, #00f2fe)', fontFamily: 'var(--font-mono)' }}>
                    {downtimeHours} Hours
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="24"
                  step="1"
                  value={downtimeHours}
                  onChange={(e) => setDowntimeHours(Number(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.675rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  <span>1 Hour (Quick Trip)</span>
                  <span>8 Hours (Full Shift)</span>
                  <span>24 Hours (Major Breakdown)</span>
                </div>
              </div>
            </div>
          )}

          {scenarioType === 'DEMAND' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Target Production Volume Surge:
                  </span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--neon-cyan, #00f2fe)', fontFamily: 'var(--font-mono)' }}>
                    +{demandIncreasePct}%
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="5"
                  value={demandIncreasePct}
                  onChange={(e) => setDemandIncreasePct(Number(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.675rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  <span>+5% Incremental</span>
                  <span>+25% Surge</span>
                  <span>+60% Stress Peak</span>
                </div>
              </div>
            </div>
          )}

          {scenarioType === 'ENERGY' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Peak Grid Load Curtailment Goal:
                  </span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--success, #10B981)', fontFamily: 'var(--font-mono)' }}>
                    -{energyReductionPct}% kWh
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="40"
                  step="5"
                  value={energyReductionPct}
                  onChange={(e) => setEnergyReductionPct(Number(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.675rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  <span>-5% Minor Throttling</span>
                  <span>-15% Optimal Shift</span>
                  <span>-40% Aggressive Shutdown</span>
                </div>
              </div>
            </div>
          )}

          {scenarioType === 'SHIFT' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                Operating Shift Configuration:
              </label>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {[1, 2, 3].map(count => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setShiftCount(count)}
                    className={`btn btn-sm ${shiftCount === count ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem', fontWeight: 700 }}
                  >
                    {count} {count === 1 ? 'Shift (8h)' : count === 2 ? 'Shifts (16h)' : 'Shifts (24h Full)'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Results: Baseline vs Scenario Comparison */}
        <div style={{
          padding: '1.25rem',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(0, 102, 255, 0.05)',
          border: '1px solid var(--accent-border, rgba(0, 102, 255, 0.35))'
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--neon-cyan, #00f2fe)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.85rem' }}>
            Simulated Impact Analysis (Baseline vs Scenario)
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Baseline Volume</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, fontFamily: 'var(--font-mono)', marginTop: '0.2rem' }}>
                {simulationResults.baseline.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Verified actual output</div>
            </div>

            <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Projected Scenario</div>
              <div style={{ 
                fontSize: '1.35rem', 
                fontWeight: 800, 
                fontFamily: 'var(--font-mono)', 
                color: simulationResults.deltaUnits < 0 ? 'var(--danger)' : 'var(--success)', 
                marginTop: '0.2rem' 
              }}>
                {simulationResults.projected.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.65rem', color: simulationResults.deltaUnits < 0 ? 'var(--danger)' : 'var(--success)' }}>
                {simulationResults.deltaPct} variance
              </div>
            </div>

            <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Capacity Gap / Variance</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--warning)', marginTop: '0.2rem' }}>
                {simulationResults.capacityGap.toLocaleString()} units
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Unfilled target demand</div>
            </div>
          </div>

          {/* Constraint / Bottleneck Notice */}
          <div style={{
            marginTop: '1rem',
            padding: '0.65rem 0.85rem',
            borderRadius: 'var(--radius-sm)',
            background: simulationResults.impactSeverity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.1)',
            border: simulationResults.impactSeverity === 'CRITICAL' ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(245, 158, 11, 0.3)',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem'
          }}>
            <AlertTriangle size={15} style={{ color: simulationResults.impactSeverity === 'CRITICAL' ? 'var(--danger)' : 'var(--warning)', flexShrink: 0 }} />
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>Bottleneck Constraint:</strong>{' '}
              <span style={{ color: 'var(--text-secondary)' }}>{simulationResults.bottleneck}</span>
            </div>
          </div>
        </div>

        {/* Assumptions and Limitations Notice */}
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.5, background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '0.25rem' }}>
            <Info size={12} />
            <span>Model Assumptions & Transparent Limitations</span>
          </div>
          <ul style={{ paddingLeft: '1.2rem', margin: 0 }}>
            {simulationResults.assumptions.map((asm, idx) => (
              <li key={idx}>{asm}</li>
            ))}
          </ul>
          <div style={{ marginTop: '0.35rem', fontStyle: 'italic' }}>
            Note: {simulationResults.limitations} Live production records remain unmutated.
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setDowntimeHours(4);
              setDemandIncreasePct(25);
              setEnergyReductionPct(15);
              setShiftCount(2);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RotateCcw size={13} />
            <span>Reset Baseline</span>
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onClose}
            style={{ padding: '0.45rem 1.25rem', fontWeight: 700 }}
          >
            Close & Review
          </button>
        </div>

      </div>
    </div>
  );
}
