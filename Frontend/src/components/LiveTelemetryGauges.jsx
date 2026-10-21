import React from 'react';
import { Thermometer, Activity, Gauge, Zap } from 'lucide-react';

export default function LiveTelemetryGauges({ telemetry, machineId = 1, compact = false }) {
  const current = telemetry || {
    temperature: 72.4,
    vibration: 2.1,
    pressure: 46.5,
    rpm: 3250
  };

  // Helper to calculate SVG circular arc dashoffset
  const calculateStroke = (value, min, max, circumference = 251.2) => {
    const clamped = Math.min(Math.max(value, min), max);
    const percentage = (clamped - min) / (max - min);
    return circumference - percentage * circumference;
  };

  const isTempCritical = current.temperature > 85;
  const isVibCritical = current.vibration > 4.5;
  const isPressureCritical = current.pressure > 90 || current.pressure < 25;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: compact ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(130px, 1fr))',
      gap: '1rem',
      width: '100%'
    }}>
      {/* 1. Temperature Gauge */}
      <div className="gauge-card">
        <div className="gauge-header">
          <Thermometer size={14} style={{ color: isTempCritical ? 'var(--neon-crimson)' : 'var(--neon-cyan)' }} />
          <span>Thermal Core</span>
        </div>
        <div className="gauge-svg-wrap">
          <svg viewBox="0 0 100 100" className="gauge-svg">
            <circle cx="50" cy="50" r="40" className="gauge-track" />
            <circle
              cx="50"
              cy="50"
              r="40"
              className="gauge-value-arc"
              style={{
                stroke: isTempCritical ? 'var(--neon-crimson)' : 'var(--neon-cyan)',
                strokeDashoffset: calculateStroke(current.temperature, 20, 120),
                filter: isTempCritical ? 'drop-shadow(0 0 6px rgba(239, 68, 68, 0.8))' : 'drop-shadow(0 0 6px rgba(0, 242, 254, 0.6))'
              }}
            />
          </svg>
          <div className="gauge-content">
            <span className="gauge-number" style={{ color: isTempCritical ? '#f87171' : 'var(--text-primary)' }}>
              {Math.round(current.temperature * 10) / 10}
            </span>
            <span className="gauge-unit">°C</span>
          </div>
        </div>
        <div className="gauge-footer" style={{ color: isTempCritical ? '#f87171' : 'var(--text-muted)' }}>
          {isTempCritical ? 'OVERHEAT HAZARD' : 'Nominal Temp'}
        </div>
      </div>

      {/* 2. Vibration Gauge */}
      <div className="gauge-card">
        <div className="gauge-header">
          <Activity size={14} style={{ color: isVibCritical ? 'var(--neon-amber)' : 'var(--neon-emerald)' }} />
          <span>Axis-Z Vibration</span>
        </div>
        <div className="gauge-svg-wrap">
          <svg viewBox="0 0 100 100" className="gauge-svg">
            <circle cx="50" cy="50" r="40" className="gauge-track" />
            <circle
              cx="50"
              cy="50"
              r="40"
              className="gauge-value-arc"
              style={{
                stroke: isVibCritical ? 'var(--neon-amber)' : 'var(--neon-emerald)',
                strokeDashoffset: calculateStroke(current.vibration, 0, 10),
                filter: isVibCritical ? 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.8))' : 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.6))'
              }}
            />
          </svg>
          <div className="gauge-content">
            <span className="gauge-number" style={{ color: isVibCritical ? '#fbbf24' : 'var(--text-primary)' }}>
              {Math.round(current.vibration * 10) / 10}
            </span>
            <span className="gauge-unit">mm/s</span>
          </div>
        </div>
        <div className="gauge-footer" style={{ color: isVibCritical ? '#fbbf24' : 'var(--text-muted)' }}>
          {isVibCritical ? 'HARMONIC WARNING' : 'Harmonic Balance'}
        </div>
      </div>

      {/* 3. Hydraulic Pressure Gauge */}
      <div className="gauge-card">
        <div className="gauge-header">
          <Gauge size={14} style={{ color: isPressureCritical ? 'var(--neon-purple)' : 'var(--neon-blue)' }} />
          <span>Hydraulic PSI</span>
        </div>
        <div className="gauge-svg-wrap">
          <svg viewBox="0 0 100 100" className="gauge-svg">
            <circle cx="50" cy="50" r="40" className="gauge-track" />
            <circle
              cx="50"
              cy="50"
              r="40"
              className="gauge-value-arc"
              style={{
                stroke: 'var(--neon-blue)',
                strokeDashoffset: calculateStroke(current.pressure, 0, 150),
                filter: 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.6))'
              }}
            />
          </svg>
          <div className="gauge-content">
            <span className="gauge-number">
              {Math.round(current.pressure)}
            </span>
            <span className="gauge-unit">PSI</span>
          </div>
        </div>
        <div className="gauge-footer" style={{ color: 'var(--text-muted)' }}>
          System Pressure
        </div>
      </div>

      {/* 4. Spindle RPM Speedometer */}
      <div className="gauge-card">
        <div className="gauge-header">
          <Zap size={14} style={{ color: 'var(--neon-purple)' }} />
          <span>Spindle RPM</span>
        </div>
        <div className="gauge-svg-wrap">
          <svg viewBox="0 0 100 100" className="gauge-svg">
            <circle cx="50" cy="50" r="40" className="gauge-track" />
            <circle
              cx="50"
              cy="50"
              r="40"
              className="gauge-value-arc"
              style={{
                stroke: 'var(--neon-purple)',
                strokeDashoffset: calculateStroke(current.rpm, 0, 5000),
                filter: 'drop-shadow(0 0 6px rgba(168, 85, 247, 0.6))'
              }}
            />
          </svg>
          <div className="gauge-content">
            <span className="gauge-number" style={{ fontSize: '1.05rem' }}>
              {Math.round(current.rpm)}
            </span>
            <span className="gauge-unit">RPM</span>
          </div>
        </div>
        <div className="gauge-footer" style={{ color: 'var(--text-muted)' }}>
          Motor Velocity
        </div>
      </div>
    </div>
  );
}
