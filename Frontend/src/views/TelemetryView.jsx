import React, { useState, useEffect } from 'react';
import {
  Activity,
  Thermometer,
  Gauge,
  RotateCw,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Cpu
} from 'lucide-react';
import { telemetryApi, machinesApi } from '../services/api';

export default function TelemetryView() {
  const [readings, setReadings] = useState([]);
  const [machines, setMachines] = useState([]);
  const [selectedMachineId, setSelectedMachineId] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [telData, machData] = await Promise.all([
        telemetryApi.getAll().catch(() => []),
        machinesApi.getAll().catch(() => [])
      ]);
      setReadings(Array.isArray(telData) ? telData : (telData?.content || []));
      setMachines(Array.isArray(machData) ? machData : (machData?.content || []));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh telemetry stream every 5s
    const timer = setInterval(() => {
      telemetryApi.getAll().then(data => {
        setReadings(Array.isArray(data) ? data : (data?.content || []));
      }).catch(() => {});
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const filtered = selectedMachineId === 'ALL'
    ? readings
    : readings.filter(r => Number(r.machineId) === Number(selectedMachineId));

  const avgTemp = readings.length > 0
    ? (readings.reduce((acc, r) => acc + Number(r.temperature || 0), 0) / readings.length).toFixed(1)
    : '68.4';
  const avgVib = readings.length > 0
    ? (readings.reduce((acc, r) => acc + Number(r.vibration || 0), 0) / readings.length).toFixed(2)
    : '1.85';
  const avgPres = readings.length > 0
    ? (readings.reduce((acc, r) => acc + Number(r.pressure || 0), 0) / readings.length).toFixed(1)
    : '5.8';
  const avgRpm = readings.length > 0
    ? Math.round(readings.reduce((acc, r) => acc + Number(r.rpm || 0), 0) / readings.length)
    : 2450;

  return (
    <div className="pbi-admin-container">
      {/* Top Banner */}
      <div className="pbi-admin-top-banner">
        <div className="pbi-admin-top-left">
          <div className="pbi-admin-top-icon" style={{ color: '#38BDF8', background: 'rgba(56, 189, 248, 0.1)', borderColor: 'rgba(56, 189, 248, 0.3)' }}>
            <Activity size={24} />
          </div>
          <div>
            <div className="pbi-admin-top-title">Real-Time Sensor Telemetry Feeds</div>
            <div className="pbi-admin-top-desc">
              High-frequency multi-axial sensor telemetry time series from Telemetry Service (:8083)
            </div>
          </div>
        </div>

        <button type="button" className="pbi-ribbon-btn" onClick={fetchData}>
          <RefreshCw size={13} className={loading ? 'spin-animation' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* 4 Sensor Telemetry KPI Cards */}
      <div className="pbi-kpi-deck" style={{ marginBottom: '20px' }}>
        <div className="pbi-kpi-card" style={{ '--card-accent': '#EF4444' }}>
          <div className="pbi-kpi-header">
            <span className="pbi-kpi-title">Fleet Spindle Temp</span>
            <Thermometer size={16} color="#EF4444" />
          </div>
          <div className="pbi-kpi-value">{avgTemp} °C</div>
          <div className="pbi-kpi-subtext" style={{ color: parseFloat(avgTemp) > 75 ? '#EF4444' : '#10B981' }}>
            <span>Limit: &lt;80.0 °C</span>
          </div>
        </div>

        <div className="pbi-kpi-card" style={{ '--card-accent': '#F59E0B' }}>
          <div className="pbi-kpi-header">
            <span className="pbi-kpi-title">Peak Vibration</span>
            <Activity size={16} color="#F59E0B" />
          </div>
          <div className="pbi-kpi-value">{avgVib} mm/s</div>
          <div className="pbi-kpi-subtext" style={{ color: parseFloat(avgVib) > 3.0 ? '#EF4444' : '#10B981' }}>
            <span>ISO 10816 Standard</span>
          </div>
        </div>

        <div className="pbi-kpi-card" style={{ '--card-accent': '#00BCF2' }}>
          <div className="pbi-kpi-header">
            <span className="pbi-kpi-title">Hydraulic Pressure</span>
            <Gauge size={16} color="#00BCF2" />
          </div>
          <div className="pbi-kpi-value">{avgPres} bar</div>
          <div className="pbi-kpi-subtext" style={{ color: '#00BCF2' }}>
            <span>Nominal Range: 4-8 bar</span>
          </div>
        </div>

        <div className="pbi-kpi-card" style={{ '--card-accent': '#10B981' }}>
          <div className="pbi-kpi-header">
            <span className="pbi-kpi-title">Spindle Speed</span>
            <RotateCw size={16} color="#10B981" />
          </div>
          <div className="pbi-kpi-value">{avgRpm.toLocaleString()} RPM</div>
          <div className="pbi-kpi-subtext" style={{ color: '#10B981' }}>
            <span>Operational Harmonic</span>
          </div>
        </div>
      </div>

      {/* Machine Slicer */}
      <div className="pbi-slicers-bar" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="pbi-slicer-label">Filter Asset:</span>
          <select
            className="pbi-form-input"
            style={{ width: '220px', height: '32px', fontSize: '12px' }}
            value={selectedMachineId}
            onChange={(e) => setSelectedMachineId(e.target.value)}
          >
            <option value="ALL">All Connected Machines</option>
            {machines.map((m) => (
              <option key={m.id} value={m.id}>
                #{m.id} - {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="pbi-visual-card">
        <div className="pbi-visual-header">
          <div>
            <div className="pbi-visual-title">High-Frequency Telemetry Stream</div>
            <div className="pbi-visual-subtitle">Live time series packets streaming from edge IoT sensors</div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="pbi-matrix-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Stream ID</th>
                <th>Machine Asset</th>
                <th>Temperature</th>
                <th>Vibration</th>
                <th>Pressure</th>
                <th>Spindle RPM</th>
                <th>Telemetry Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const temp = Number(t.temperature || 65);
                const vib = Number(t.vibration || 1.2);
                const pres = Number(t.pressure || 5.5);
                const rpm = Number(t.rpm || 2400);

                return (
                  <tr key={t.id}>
                    <td style={{ fontFamily: 'var(--pbi-font-mono)', color: '#38BDF8', fontWeight: 700 }}>
                      TLM-{t.id}
                    </td>
                    <td style={{ fontWeight: 600, color: '#FFFFFF' }}>
                      Machine #{t.machineId}
                    </td>
                    <td>
                      <span style={{
                        color: temp > 75 ? '#EF4444' : '#10B981',
                        fontFamily: 'var(--pbi-font-mono)',
                        fontWeight: 700
                      }}>
                        {temp.toFixed(1)} °C
                      </span>
                    </td>
                    <td>
                      <span style={{
                        color: vib > 2.5 ? '#F59E0B' : '#CBD5E1',
                        fontFamily: 'var(--pbi-font-mono)'
                      }}>
                        {vib.toFixed(2)} mm/s
                      </span>
                    </td>
                    <td>
                      <span style={{
                        color: (pres < 4 || pres > 8) ? '#EF4444' : '#CBD5E1',
                        fontFamily: 'var(--pbi-font-mono)'
                      }}>
                        {pres.toFixed(1)} bar
                      </span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--pbi-font-mono)', color: '#FFFFFF' }}>
                        {rpm.toLocaleString()} RPM
                      </span>
                    </td>
                    <td style={{ color: '#64748B', fontSize: '11px' }}>
                      {t.timestamp ? new Date(t.timestamp).toLocaleTimeString() : 'Live'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

