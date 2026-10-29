import React, { useState, useEffect } from 'react';
import { sensorsApi, machinesApi, getOfflinePlantIds } from '../services/api';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { 
  Search, 
  ChevronRight, 
  ChevronDown,
  Plus,
  Edit2,
  Trash2,
  Activity
} from 'lucide-react';

export default function SensorsView() {
  const [offlinePlantIds, setOfflinePlantIds] = useState(() => getOfflinePlantIds());
  const [sensors, setSensors] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [machineFilter, setMachineFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [showMachineMenu, setShowMachineMenu] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSensor, setEditingSensor] = useState(null);
  const [formData, setFormData] = useState({ name: '', type: 'Temperature', unit: '°C', machineId: 1, active: true });
  const [saving, setSaving] = useState(false);

  const fetchSensors = async () => {
    setLoading(true);
    setError('');
    try {
      const [sensorData, machData] = await Promise.all([
        sensorsApi.getAll(),
        machinesApi.getAll()
      ]);
      setSensors(Array.isArray(sensorData) ? sensorData : []);
      setMachines(Array.isArray(machData) ? machData : []);
    } catch (err) {
      console.warn('Sensors fetch error:', err);
      setError(err.message || 'Failed to load sensors from database');
      setSensors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSensors();
    const handleStatusChange = () => {
      setOfflinePlantIds(getOfflinePlantIds());
    };
    window.addEventListener('kynexis-plant-status-change', handleStatusChange);
    return () => window.removeEventListener('kynexis-plant-status-change', handleStatusChange);
  }, []);

  const handleOpenCreate = () => {
    setEditingSensor(null);
    setFormData({ name: '', type: 'Temperature', unit: '°C', machineId: machines[0]?.id || 1, active: true });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingSensor) {
        await sensorsApi.update(editingSensor.id, formData);
      } else {
        await sensorsApi.create(formData);
      }
      setModalOpen(false);
      await fetchSensors();
    } catch (err) {
      setError(err.message || 'Failed to save sensor');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete sensor "${name}"?`)) return;
    try {
      await sensorsApi.delete(id);
      await fetchSensors();
    } catch (err) {
      setError(err.message || 'Failed to delete sensor');
    }
  };

  const filtered = sensors.filter(s => {
    const matchSearch = (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                        `#00${s.id}`.includes(searchTerm) ||
                        (s.type || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchType = typeFilter === 'ALL' || (s.type || '').toUpperCase() === typeFilter.toUpperCase();
    const matchMachine = machineFilter === 'ALL' || String(s.machineId) === String(machineFilter);
    return matchSearch && matchType && matchMachine;
  });

  const getMachineName = (machineId) => {
    const found = machines.find(m => Number(m.id) === Number(machineId));
    return found ? found.name : `Machine #${machineId}`;
  };

  const isSensorInOfflinePlant = (sensor) => {
    const machine = machines.find(m => Number(m.id) === Number(sensor.machineId));
    if (!machine) return false;
    const plantId = Number(machine.plantId || machine.plant?.id);
    return offlinePlantIds.includes(plantId);
  };

  const isSensorActive = (sensor) => {
    if (sensor.active === false) return false;
    if (isSensorInOfflinePlant(sensor)) return false;
    return true;
  };

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
            onClick={fetchSensors}
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
            onClick={() => { setShowMachineMenu(!showMachineMenu); setShowTypeMenu(false); }}
          >
            <span>{machineFilter === 'ALL' ? 'All Machines' : getMachineName(machineFilter)}</span>
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
                onClick={() => { setMachineFilter('ALL'); setShowMachineMenu(false); }}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  background: machineFilter === 'ALL' ? 'var(--surface-elevated)' : 'transparent',
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
                  onClick={() => { setMachineFilter(String(m.id)); setShowMachineMenu(false); }}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    background: machineFilter === String(m.id) ? 'var(--surface-elevated)' : 'transparent',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '11.5px',
                    color: machineFilter === String(m.id) ? '#FFFFFF' : 'var(--text-secondary)',
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

        {/* Type Filter Dropdown */}
        <div style={{ position: 'relative' }}>
          <button 
            type="button" 
            className="filter-dropdown-btn"
            onClick={() => { setShowTypeMenu(!showTypeMenu); setShowMachineMenu(false); }}
          >
            <span>Type: {typeFilter}</span>
            <ChevronDown size={12} style={{ color: 'var(--text-muted)' }} />
          </button>

          {showTypeMenu && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              right: 0,
              width: '160px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              boxShadow: 'var(--shadow-dropdown)',
              padding: '6px',
              zIndex: 100
            }}>
              {['ALL', 'TEMPERATURE', 'VIBRATION', 'PRESSURE', 'RPM'].map(tp => (
                <button
                  key={tp}
                  type="button"
                  onClick={() => { setTypeFilter(tp); setShowTypeMenu(false); }}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    background: typeFilter === tp ? 'var(--surface-elevated)' : 'transparent',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '11.5px',
                    color: typeFilter === tp ? '#FFFFFF' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  {tp}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="search-box">
          <Search size={14} />
          <input
            type="text"
            placeholder="Search sensors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={handleOpenCreate}
        >
          <Plus size={14} />
          <span>Add Sensor</span>
        </button>
      </div>

      {/* Sensor Data Table */}
      {loading ? (
        <div style={{ minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LoadingSpinner message="Querying Sensors from Database..." />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No Sensors Found"
          description={searchTerm ? `No sensors matched "${searchTerm}"` : "No sensors registered in database."}
          actionLabel="Add Sensor"
          onAction={handleOpenCreate}
        />
      ) : (
        <div className="table-container">
          <table className="kyn-table">
            <thead>
              <tr>
                <th>Sensor ID</th>
                <th>Sensor Name</th>
                <th>Monitored Machine</th>
                <th>Type</th>
                <th>Unit</th>
                <th>Telemetry Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent)' }}>
                    {`#S-${String(s.id).padStart(3, '0')}`}
                  </td>
                  <td style={{ color: '#FFFFFF', fontWeight: 500 }}>
                    {s.name}
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {getMachineName(s.machineId)}
                  </td>
                  <td>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono)',
                      background: 'rgba(0, 102, 255, 0.1)',
                      color: 'var(--accent)',
                      border: '1px solid rgba(0, 102, 255, 0.25)'
                    }}>
                      {s.type}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {s.unit}
                  </td>
                  <td>
                    {(() => {
                      const plantOffline = isSensorInOfflinePlant(s);
                      const active = isSensorActive(s);
                      if (!active) {
                        return (
                          <span 
                            className="badge badge-offline" 
                            title={plantOffline ? 'Sensor offline: Host plant facility is offline' : 'Sensor offline'}
                          >
                            <span className="badge-dot" />
                            <span>{plantOffline ? 'Offline (Plant Offline)' : 'Offline'}</span>
                          </span>
                        );
                      }
                      return (
                        <span className="badge badge-online">
                          <span className="badge-dot" />
                          <span>Online & Streaming</span>
                        </span>
                      );
                    })()}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="action-btn-group">
                      <button
                        type="button"
                        className="action-btn action-btn-edit"
                        onClick={() => {
                          setEditingSensor(s);
                          setFormData({ name: s.name, type: s.type, unit: s.unit, machineId: s.machineId || 1, active: s.active !== false });
                          setModalOpen(true);
                        }}
                        title="Edit Sensor"
                      >
                        <Edit2 size={12} />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        className="action-btn action-btn-delete"
                        onClick={() => handleDelete(s.id, s.name)}
                        title="Delete Sensor"
                      >
                        <Trash2 size={12} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingSensor ? `Edit ${editingSensor.name}` : 'Register New Industrial Sensor'}
        >
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label className="form-label">Sensor Name</label>
              <input
                type="text"
                className="form-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Spindle Vibration Sensor"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Sensor Type</label>
              <select
                className="form-input"
                value={formData.type}
                onChange={(e) => {
                  const t = e.target.value;
                  let u = '°C';
                  if (t === 'Vibration') u = 'mm/s';
                  else if (t === 'Pressure') u = 'bar';
                  else if (t === 'RPM') u = 'RPM';
                  setFormData({ ...formData, type: t, unit: u });
                }}
              >
                <option value="Temperature">Temperature (°C)</option>
                <option value="Vibration">Vibration (mm/s)</option>
                <option value="Pressure">Pressure (bar)</option>
                <option value="RPM">Rotational Speed (RPM)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Measurement Unit</label>
              <input
                type="text"
                className="form-input"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="°C, mm/s, bar, RPM"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Monitored Machine</label>
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
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : editingSensor ? 'Update Sensor' : 'Register Sensor'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
