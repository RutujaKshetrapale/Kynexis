import React, { useState, useEffect } from 'react';
import { telemetryApi, machinesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import { 
  Activity, 
  Plus, 
  Cpu, 
  Thermometer, 
  Gauge, 
  Zap, 
  Clock, 
  Send, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';

export default function TelemetryView() {
  const { hasRole } = useAuth();
  const [telemetry, setTelemetry] = useState([]);
  const [machines, setMachines] = useState([]);
  const [selectedMachineId, setSelectedMachineId] = useState('1');
  const [loading, setLoading] = useState(true);

  // Ingestion Simulator Form State
  const [simModalOpen, setSimModalOpen] = useState(false);
  const [simForm, setSimForm] = useState({
    machineId: '1',
    temperature: 75.0,
    vibration: 2.1,
    pressure: 46.0,
    rpm: 3200
  });
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);

  const fetchData = async (machineId) => {
    try {
      const [machList, telemList] = await Promise.all([
        machinesApi.getAll(),
        machineId ? telemetryApi.getByMachine(machineId) : telemetryApi.getAll()
      ]);
      setMachines(machList || []);
      setTelemetry(Array.isArray(telemList) ? telemList : []);
    } catch (err) {
      console.error('Failed to load telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedMachineId);
  }, [selectedMachineId]);

  const handleSimulateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setNotice(null);

    try {
      const payload = {
        machineId: Number(simForm.machineId),
        temperature: Number(simForm.temperature),
        vibration: Number(simForm.vibration),
        pressure: Number(simForm.pressure),
        rpm: Number(simForm.rpm),
        timestamp: new Date().toISOString().slice(0, 19)
      };

      await telemetryApi.create(payload);
      
      let message = 'Telemetry reading successfully ingested and routed to Alert Engine.';
      let isCritical = false;
      if (payload.temperature > 85) {
        message = '⚠️ CRITICAL ALERT TRIGGERED: Spindle temperature exceeded 85°C limit!';
        isCritical = true;
      }

      setNotice({ text: message, isCritical });
      setSimModalOpen(false);
      await fetchData(selectedMachineId);
    } catch (err) {
      alert(`Ingestion failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to render an SVG Sparkline chart
  const renderSparkline = (dataKey, color, unit, threshold = null) => {
    if (telemetry.length < 2) {
      return (
        <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          Insufficient data points for trend chart
        </div>
      );
    }

    const values = telemetry.map(t => Number(t[dataKey]) || 0);
    const min = Math.min(...values) * 0.9;
    const max = Math.max(...values, threshold || 0) * 1.1 || 100;
    const width = 500;
    const height = 140;

    const points = values.map((val, idx) => {
      const x = (idx / (values.length - 1)) * width;
      const y = height - ((val - min) / (max - min)) * (height - 30) - 15;
      return `${x},${y}`;
    }).join(' ');

    const latest = values[values.length - 1];

    let thresholdY = null;
    if (threshold !== null) {
      thresholdY = height - ((threshold - min) / (max - min)) * (height - 30) - 15;
    }

    return (
      <div style={{ position: 'relative', marginTop: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color }}>
            {latest} {unit}
          </span>
          {threshold && (
            <span style={{ fontSize: '0.7rem', color: '#f87171', fontWeight: 600 }}>
              Threshold: {threshold} {unit}
            </span>
          )}
        </div>

        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height, overflow: 'visible' }}>
          {/* Threshold Line */}
          {thresholdY !== null && (
            <line
              x1="0"
              y1={thresholdY}
              x2={width}
              y2={thresholdY}
              stroke="#ef4444"
              strokeDasharray="4 4"
              strokeWidth="1.5"
              opacity="0.8"
            />
          )}

          {/* Area gradient */}
          <defs>
            <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <polygon
            points={`0,${height} ${points} ${width},${height}`}
            fill={`url(#grad-${dataKey})`}
          />

          {/* Polyline */}
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />

          {/* Data Points */}
          {values.map((val, idx) => {
            const x = (idx / (values.length - 1)) * width;
            const y = height - ((val - min) / (max - min)) * (height - 30) - 15;
            return (
              <circle
                key={idx}
                cx={x}
                cy={y}
                r={idx === values.length - 1 ? 5 : 3.5}
                fill={idx === values.length - 1 ? '#ffffff' : color}
                stroke={color}
                strokeWidth="2"
              />
            );
          })}
        </svg>
      </div>
    );
  };

  const selectedMachine = machines.find(m => m.id === Number(selectedMachineId));

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Activity style={{ color: 'var(--neon-cyan)' }} />
            Real-Time IoT Telemetry Stream & Diagnostics
          </h1>
          <p className="page-description">
            Sub-second sensor data ingestion, multi-metric time-series curves, and edge threshold triggers
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {/* Machine Filter Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Cpu size={16} style={{ color: 'var(--neon-purple)' }} />
            <select
              className="form-select"
              style={{ padding: '0.5rem 0.75rem', fontSize: '0.825rem' }}
              value={selectedMachineId}
              onChange={(e) => setSelectedMachineId(e.target.value)}
            >
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} (#{m.id})
                </option>
              ))}
            </select>
          </div>

          {hasRole(['ADMIN', 'ENGINEER', 'OPERATOR']) && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setSimModalOpen(true)}
            >
              <Send size={15} />
              Simulate Ingestion
            </button>
          )}
        </div>
      </div>

      {notice && (
        <div style={{
          padding: '0.85rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          background: notice.isCritical ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
          border: `1px solid ${notice.isCritical ? 'rgba(239, 68, 68, 0.35)' : 'rgba(16, 185, 129, 0.35)'}`,
          color: notice.isCritical ? '#f87171' : '#34d399',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          marginBottom: '1.5rem'
        }}>
          {notice.isCritical ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{notice.text}</span>
        </div>
      )}

      {loading ? (
        <LoadingSpinner message="Querying telemetry time-series from Telemetry Service (:8083)..." />
      ) : (
        <>
          {/* 4 Interactive Real-time Telemetry Trend Cards */}
          <div className="grid-cols-2" style={{ marginBottom: '2rem' }}>
            {/* Temperature Curve */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                  <Thermometer size={18} style={{ color: '#f87171' }} />
                  <span>Spindle Temperature (°C)</span>
                </div>
                <span className="badge badge-critical" style={{ fontSize: '0.675rem' }}>LIMIT: 85°C</span>
              </div>
              {renderSparkline('temperature', '#f87171', '°C', 85.0)}
            </div>

            {/* Vibration Curve */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                  <Activity size={18} style={{ color: '#fbbf24' }} />
                  <span>Harmonic Vibration (mm/s)</span>
                </div>
                <span className="badge badge-warning" style={{ fontSize: '0.675rem' }}>LIMIT: 6.0 mm/s</span>
              </div>
              {renderSparkline('vibration', '#fbbf24', 'mm/s', 6.0)}
            </div>

            {/* Pressure Curve */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                  <Gauge size={18} style={{ color: 'var(--neon-blue)' }} />
                  <span>Hydraulic Pressure (PSI)</span>
                </div>
                <span className="badge badge-healthy" style={{ fontSize: '0.675rem' }}>NORMAL ENVELOPE</span>
              </div>
              {renderSparkline('pressure', '#38bdf8', 'PSI')}
            </div>

            {/* RPM Curve */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                  <Zap size={18} style={{ color: 'var(--neon-cyan)' }} />
                  <span>Spindle Tachometer (RPM)</span>
                </div>
                <span className="badge badge-active" style={{ fontSize: '0.675rem' }}>CONTINUOUS</span>
              </div>
              {renderSparkline('rpm', '#00f2fe', 'RPM')}
            </div>
          </div>

          {/* Historical Telemetry Readings Table */}
          <div className="card">
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} style={{ color: 'var(--neon-cyan)' }} />
              Ingested Telemetry Packets: {selectedMachine?.name || `Machine #${selectedMachineId}`}
            </h2>

            <div className="table-wrap">
              <table className="industrial-table">
                <thead>
                  <tr>
                    <th>Reading ID</th>
                    <th>Ingest Timestamp</th>
                    <th>Temperature</th>
                    <th>Vibration</th>
                    <th>Pressure</th>
                    <th>RPM</th>
                    <th>Safety Assessment</th>
                  </tr>
                </thead>
                <tbody>
                  {telemetry.map((t) => {
                    const isOverheat = t.temperature > 85;
                    const isVibWarn = t.vibration > 4;
                    return (
                      <tr key={t.id}>
                        <td style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: 'var(--neon-cyan)' }}>
                          TLM-{String(t.id).padStart(5, '0')}
                        </td>
                        <td>
                          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {new Date(t.timestamp).toLocaleString()}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: isOverheat ? '#f87171' : 'var(--text-primary)' }}>
                            {t.temperature}°C
                          </span>
                        </td>
                        <td>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: isVibWarn ? '#fbbf24' : 'var(--text-primary)' }}>
                            {t.vibration} mm/s
                          </span>
                        </td>
                        <td>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            {t.pressure} PSI
                          </span>
                        </td>
                        <td>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--neon-cyan)', fontWeight: 600 }}>
                            {t.rpm} RPM
                          </span>
                        </td>
                        <td>
                          {isOverheat ? (
                            <span className="badge badge-critical">CRITICAL OVERHEAT</span>
                          ) : isVibWarn ? (
                            <span className="badge badge-warning">ELEVATED VIBRATION</span>
                          ) : (
                            <span className="badge badge-healthy">NOMINAL</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Simulator Modal */}
      <Modal
        isOpen={simModalOpen}
        onClose={() => setSimModalOpen(false)}
        title="Simulate Edge Sensor Ingestion (POST /api/telemetry)"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setSimModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSimulateSubmit} disabled={submitting}>
              {submitting ? 'Streaming Packet...' : 'Transmit Ingest Packet'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSimulateSubmit}>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Simulate an edge gateway transmitting high-frequency industrial IoT measurements. Exceeding 85°C will automatically trigger an automated Overheating Alert.
          </p>

          <div className="form-group">
            <label className="form-label" htmlFor="sim-machine">Target Machine</label>
            <select
              id="sim-machine"
              className="form-select"
              value={simForm.machineId}
              onChange={(e) => setSimForm({ ...simForm, machineId: e.target.value })}
            >
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} (#{m.id})
                </option>
              ))}
            </select>
          </div>

          <div className="grid-cols-2" style={{ gap: '0.75rem', marginBottom: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="sim-temp">Temperature (°C)</label>
              <input
                id="sim-temp"
                type="number"
                step="0.1"
                className="form-input"
                value={simForm.temperature}
                onChange={(e) => setSimForm({ ...simForm, temperature: e.target.value })}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="sim-vib">Vibration (mm/s)</label>
              <input
                id="sim-vib"
                type="number"
                step="0.1"
                className="form-input"
                value={simForm.vibration}
                onChange={(e) => setSimForm({ ...simForm, vibration: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid-cols-2" style={{ gap: '0.75rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="sim-pressure">Pressure (PSI)</label>
              <input
                id="sim-pressure"
                type="number"
                step="0.1"
                className="form-input"
                value={simForm.pressure}
                onChange={(e) => setSimForm({ ...simForm, pressure: e.target.value })}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="sim-rpm">RPM Speed</label>
              <input
                id="sim-rpm"
                type="number"
                step="10"
                className="form-input"
                value={simForm.rpm}
                onChange={(e) => setSimForm({ ...simForm, rpm: e.target.value })}
                required
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
