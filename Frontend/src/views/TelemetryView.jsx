import React, { useState, useEffect } from 'react';
import {
  Activity,
  RefreshCw
} from 'lucide-react';
import { telemetryApi, machinesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function TelemetryView() {
  const { user, assignedPlantId } = useAuth();
  const isOperator = (user?.role || '').toUpperCase() === 'OPERATOR';

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
      }).catch(() => { });
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const visibleMachines = isOperator
    ? machines.filter(m => Number(m.plantId || m.plant?.id || 1) === Number(assignedPlantId))
    : machines;
  const visibleMachineIds = new Set(visibleMachines.map(m => Number(m.id)));
  const roleScopedReadings = isOperator
    ? readings.filter(r => visibleMachineIds.has(Number(r.machineId)))
    : readings;

  const filtered = selectedMachineId === 'ALL'
    ? roleScopedReadings
    : roleScopedReadings.filter(r => Number(r.machineId) === Number(selectedMachineId));

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
          </div>
        </div>

        <button type="button" className="pbi-ribbon-btn" onClick={fetchData}>
          <RefreshCw size={13} className={loading ? 'spin-animation' : ''} />
          <span>Refresh</span>
        </button>
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
            {visibleMachines.map((m) => (
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

