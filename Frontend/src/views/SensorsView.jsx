import React, { useState, useEffect } from 'react';
import {
  Gauge,
  Cpu,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { sensorsApi, machinesApi } from '../services/api';

export default function SensorsView() {
  const [sensors, setSensors] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [senData, machData] = await Promise.all([
        sensorsApi.getAll().catch(() => []),
        machinesApi.getAll().catch(() => [])
      ]);
      setSensors(Array.isArray(senData) ? senData : (senData?.content || []));
      setMachines(Array.isArray(machData) ? machData : (machData?.content || []));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const activeSensors = sensors.filter(s => s.active !== false).length;

  const filteredSensors = sensors.filter(s => {
    const matchesSearch = (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(s.id).includes(searchTerm);
    const matchesType = typeFilter === 'ALL' || (s.type || '').toUpperCase() === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="pbi-admin-container">
      {/* Top Banner */}
      <div className="pbi-admin-top-banner">
        <div className="pbi-admin-top-left">
          <div className="pbi-admin-top-icon" style={{ color: '#F59E0B', background: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)' }}>
            <Gauge size={24} />
          </div>
          <div>
            <div className="pbi-admin-top-title">Sensor Calibration &amp; Threshold Matrix</div>
            <div className="pbi-admin-top-desc">
              IoT transducer bindings, operational calibration limits &amp; status from Sensor Service (:8089)
            </div>
          </div>
        </div>

        <button type="button" className="pbi-ribbon-btn" onClick={fetchData}>
          <RefreshCw size={13} className={loading ? 'spin-animation' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Deck */}
      <div className="pbi-kpi-deck" style={{ marginBottom: '20px' }}>
        <div className="pbi-kpi-card" style={{ '--card-accent': '#F59E0B' }}>
          <div className="pbi-kpi-header">
            <span className="pbi-kpi-title">Installed Transducers</span>
            <Gauge size={16} color="#F59E0B" />
          </div>
          <div className="pbi-kpi-value">{sensors.length}</div>
          <div className="pbi-kpi-subtext" style={{ color: '#F59E0B' }}>
            <span>Across All Fleet Assets</span>
          </div>
        </div>

        <div className="pbi-kpi-card" style={{ '--card-accent': '#10B981' }}>
          <div className="pbi-kpi-header">
            <span className="pbi-kpi-title">Calibrated &amp; Active</span>
            <CheckCircle2 size={16} color="#10B981" />
          </div>
          <div className="pbi-kpi-value">{activeSensors}</div>
          <div className="pbi-kpi-subtext" style={{ color: '#10B981' }}>
            <span>Telemetry Certified</span>
          </div>
        </div>

        <div className="pbi-kpi-card" style={{ '--card-accent': '#00BCF2' }}>
          <div className="pbi-kpi-header">
            <span className="pbi-kpi-title">Sensor Modalities</span>
            <ShieldCheck size={16} color="#00BCF2" />
          </div>
          <div className="pbi-kpi-value">5 Types</div>
          <div className="pbi-kpi-subtext" style={{ color: '#00BCF2' }}>
            <span>Temp, Vib, Pres, RPM, Pwr</span>
          </div>
        </div>

        <div className="pbi-kpi-card" style={{ '--card-accent': '#A855F7' }}>
          <div className="pbi-kpi-header">
            <span className="pbi-kpi-title">Bound Machine Assets</span>
            <Cpu size={16} color="#A855F7" />
          </div>
          <div className="pbi-kpi-value">{machines.length}</div>
          <div className="pbi-kpi-subtext" style={{ color: '#A855F7' }}>
            <span>Telemetry Nodes</span>
          </div>
        </div>
      </div>

      {/* Slicers Bar */}
      <div className="pbi-slicers-bar" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, maxWidth: '280px' }}>
          <Search size={15} color="#94A3B8" />
          <input
            type="text"
            className="pbi-form-input"
            style={{ height: '32px', fontSize: '12px' }}
            placeholder="Search sensor name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="pbi-slicer-label">Modality:</span>
          {['ALL', 'TEMPERATURE', 'VIBRATION', 'PRESSURE', 'RPM'].map((mod) => (
            <button
              key={mod}
              type="button"
              className={`pbi-slicer-pill ${typeFilter === mod ? 'active' : ''}`}
              onClick={() => setTypeFilter(mod)}
            >
              {mod}
            </button>
          ))}
        </div>
      </div>

      {/* Matrix Table */}
      <div className="pbi-visual-card">
        <div className="pbi-visual-header">
          <div>
            <div className="pbi-visual-title">Transducer Configuration &amp; Threshold Limits</div>
            <div className="pbi-visual-subtitle">Configured safety boundaries for automated event escalation and anomaly flagging</div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="pbi-matrix-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Sensor ID</th>
                <th>Sensor Label</th>
                <th>Transducer Type</th>
                <th>Bound Machine Asset</th>
                <th>Nominal Range</th>
                <th>Critical Threshold</th>
                <th>Calibration State</th>
              </tr>
            </thead>
            <tbody>
              {filteredSensors.map((s) => {
                const assignedMach = machines.find(m => m.id === (Number(s.machineId) || Number(s.machine?.id)));
                const isActive = s.active !== false;

                return (
                  <tr key={s.id}>
                    <td style={{ fontFamily: 'var(--pbi-font-mono)', color: '#F59E0B', fontWeight: 700 }}>
                      SEN-{String(s.id).padStart(3, '0')}
                    </td>
                    <td style={{ fontWeight: 600, color: '#FFFFFF' }}>
                      {s.name || `${s.type} Sensor #${s.id}`}
                    </td>
                    <td>
                      <span style={{
                        fontFamily: 'var(--pbi-font-mono)',
                        fontSize: '11px',
                        color: '#00BCF2',
                        background: 'rgba(0,188,242,0.1)',
                        padding: '2px 7px',
                        borderRadius: '4px'
                      }}>
                        {s.type}
                      </span>
                    </td>
                    <td style={{ color: '#CBD5E1' }}>
                      {assignedMach ? assignedMach.name : `Machine #${s.machineId || 1}`}
                    </td>
                    <td style={{ fontFamily: 'var(--pbi-font-mono)', color: '#10B981' }}>
                      {s.minThreshold || 0} - {s.maxThreshold || 80}
                    </td>
                    <td style={{ fontFamily: 'var(--pbi-font-mono)', color: '#EF4444', fontWeight: 700 }}>
                      &gt; {s.criticalThreshold || (s.maxThreshold ? s.maxThreshold * 1.15 : 90).toFixed(0)}
                    </td>
                    <td>
                      <span className={`pbi-status-pill ${isActive ? 'pbi-status-running' : 'pbi-status-offline'}`}>
                        <span className="pbi-status-dot" />
                        <span>{isActive ? 'CALIBRATED' : 'STANDBY'}</span>
                      </span>
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

