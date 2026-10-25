import React, { useState, useEffect } from 'react';
import { telemetryApi, machinesApi } from '../services/api';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { 
  ChevronDown, 
  Download,
  Plus,
  Activity,
  Flame,
  Gauge,
  RotateCw
} from 'lucide-react';

export default function TelemetryView() {
  const [readings, setReadings] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMachine, setSelectedMachine] = useState('ALL');
  const [timeRange, setTimeRange] = useState('All Time');
  const [showMachineMenu, setShowMachineMenu] = useState(false);
  const [showTimeMenu, setShowTimeMenu] = useState(false);

  // Record Telemetry Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ machineId: 1, temperature: 65.5, vibration: 1.4, pressure: 5.2, rpm: 1200 });
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [tData, mData] = await Promise.all([
        telemetryApi.getAll(),
        machinesApi.getAll()
      ]);
      setReadings(Array.isArray(tData) ? tData : []);
      setMachines(Array.isArray(mData) ? mData : []);
    } catch (err) {
      console.warn('Telemetry fetch error:', err);
      setError(err.message || 'Failed to query telemetry records from database');
      setReadings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRecord = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await telemetryApi.create(formData);
      setModalOpen(false);
      await fetchData();
    } catch (err) {
      setError(err.message || 'Failed to record telemetry');
    } finally {
      setSaving(false);
    }
  };

  const filtered = readings.filter(r => {
    if (selectedMachine !== 'ALL' && String(r.machineId) !== String(selectedMachine)) {
      return false;
    }
    return true;
  });

  const getMachineName = (id) => {
    const found = machines.find(m => Number(m.id) === Number(id));
    return found ? found.name : `Machine #${id}`;
  };

  // Top summary averages
  const avgTemp = filtered.length > 0 ? (filtered.reduce((acc, r) => acc + (r.temperature || 0), 0) / filtered.length).toFixed(1) : 0;
  const avgVib = filtered.length > 0 ? (filtered.reduce((acc, r) => acc + (r.vibration || 0), 0) / filtered.length).toFixed(2) : 0;
  const avgPress = filtered.length > 0 ? (filtered.reduce((acc, r) => acc + (r.pressure || 0), 0) / filtered.length).toFixed(1) : 0;
  const avgRpm = filtered.length > 0 ? Math.round(filtered.reduce((acc, r) => acc + (r.rpm || 0), 0) / filtered.length) : 0;

  return (
    <div className="page-container">
      {/* Error Alert with Retry */}
      {error && (
        <div style={{
          marginBottom: '16px',
          padding: '10px 14px',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          color: '#EF4444',
          fontSize: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{error}</span>
          <button
            type="button"
            onClick={fetchData}
            style={{
              background: '#EF4444',
              color: '#FFFFFF',
              border: 'none',
              padding: '4px 10px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 600
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Top Filter Bar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {/* Machine Filter Dropdown */}
        <div style={{ position: 'relative' }}>
          <button 
            type="button" 
            className="filter-dropdown-btn"
            onClick={() => { setShowMachineMenu(!showMachineMenu); setShowTimeMenu(false); }}
          >
            <span>{selectedMachine === 'ALL' ? 'All Machines' : getMachineName(selectedMachine)}</span>
            <ChevronDown size={12} style={{ color: 'var(--text-muted)' }} />
          </button>

          {showMachineMenu && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              right: 0,
              width: '210px',
              maxHeight: '260px',
              overflowY: 'auto',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              boxShadow: 'var(--shadow-dropdown)',
              padding: '6px',
              zIndex: 100
            }}>
              <button
                type="button"
                onClick={() => { setSelectedMachine('ALL'); setShowMachineMenu(false); }}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  background: selectedMachine === 'ALL' ? 'var(--surface-elevated)' : 'transparent',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '11.5px',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                All Machines
              </button>
              {machines.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => { setSelectedMachine(String(m.id)); setShowMachineMenu(false); }}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    background: selectedMachine === String(m.id) ? 'var(--surface-elevated)' : 'transparent',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '11.5px',
                    color: selectedMachine === String(m.id) ? '#FFFFFF' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  {m.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <button 
          type="button" 
          className="filter-dropdown-btn"
          onClick={() => setTimeRange(timeRange === 'All Time' ? 'Recent Batches' : 'All Time')}
        >
          <span>{timeRange}</span>
          <ChevronDown size={12} style={{ color: 'var(--text-muted)' }} />
        </button>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setFormData({ machineId: machines[0]?.id || 1, temperature: 68.2, vibration: 1.5, pressure: 5.3, rpm: 1250 });
            setModalOpen(true);
          }}
        >
          <Plus size={14} />
          <span>Record Telemetry</span>
        </button>
      </div>

      {/* 4 Metric Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
        <div className="kyn-card" style={{ padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '11px', marginBottom: '4px' }}>
            <span>Avg Temperature</span>
            <Flame size={14} style={{ color: '#EF4444' }} />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#FFFFFF', fontFamily: 'var(--font-mono)' }}>
            {avgTemp} °C
          </div>
        </div>

        <div className="kyn-card" style={{ padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '11px', marginBottom: '4px' }}>
            <span>Avg Vibration</span>
            <Activity size={14} style={{ color: '#F59E0B' }} />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#FFFFFF', fontFamily: 'var(--font-mono)' }}>
            {avgVib} mm/s
          </div>
        </div>

        <div className="kyn-card" style={{ padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '11px', marginBottom: '4px' }}>
            <span>Avg Pressure</span>
            <Gauge size={14} style={{ color: '#0066FF' }} />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#FFFFFF', fontFamily: 'var(--font-mono)' }}>
            {avgPress} bar
          </div>
        </div>

        <div className="kyn-card" style={{ padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '11px', marginBottom: '4px' }}>
            <span>Avg Spindle Speed</span>
            <RotateCw size={14} style={{ color: '#10B981' }} />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#FFFFFF', fontFamily: 'var(--font-mono)' }}>
            {avgRpm.toLocaleString()} RPM
          </div>
        </div>
      </div>

      {/* Main Telemetry Table */}
      {loading ? (
        <div style={{ minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LoadingSpinner message="Querying Telemetry Stream from Database..." />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No Telemetry Readings Found"
          description={selectedMachine !== 'ALL' ? `No telemetry logged for Machine #${selectedMachine}` : "No telemetry records in database."}
          actionLabel="Log Telemetry"
          onAction={() => setModalOpen(true)}
        />
      ) : (
        <div className="table-container">
          <table className="kyn-table">
            <thead>
              <tr>
                <th>Reading ID</th>
                <th>Monitored Machine</th>
                <th>Temperature</th>
                <th>Vibration</th>
                <th>Pressure</th>
                <th>Spindle RPM</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent)' }}>
                    {`#TEL-${String(t.id).padStart(4, '0')}`}
                  </td>
                  <td style={{ color: '#FFFFFF', fontWeight: 500 }}>
                    {getMachineName(t.machineId)}
                  </td>
                  <td>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 600,
                      color: t.temperature > 75 ? '#EF4444' : (t.temperature > 65 ? '#F59E0B' : '#10B981')
                    }}>
                      {t.temperature?.toFixed(1)} °C
                    </span>
                  </td>
                  <td>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      color: t.vibration > 2.0 ? '#EF4444' : 'var(--text-secondary)'
                    }}>
                      {t.vibration?.toFixed(2)} mm/s
                    </span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                    {t.pressure?.toFixed(1)} bar
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                    {Math.round(t.rpm || 0)} RPM
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                    {t.timestamp ? new Date(t.timestamp).toLocaleString() : 'Recent'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Record Telemetry Modal */}
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Record Machine Sensor Telemetry"
        >
          <form onSubmit={handleRecord}>
            <div className="form-group">
              <label className="form-label">Target Machine</label>
              <select
                className="form-input"
                value={formData.machineId}
                onChange={(e) => setFormData({ ...formData, machineId: Number(e.target.value) })}
              >
                {machines.map(m => (
                  <option key={m.id} value={m.id}>{m.name} (#{m.id})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Temperature (°C)</label>
              <input
                type="number"
                step="0.1"
                className="form-input"
                value={formData.temperature}
                onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Vibration (mm/s)</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                value={formData.vibration}
                onChange={(e) => setFormData({ ...formData, vibration: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Pressure (bar)</label>
              <input
                type="number"
                step="0.1"
                className="form-input"
                value={formData.pressure}
                onChange={(e) => setFormData({ ...formData, pressure: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Rotational Speed (RPM)</label>
              <input
                type="number"
                className="form-input"
                value={formData.rpm}
                onChange={(e) => setFormData({ ...formData, rpm: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Recording...' : 'Submit Telemetry'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
