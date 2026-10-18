import React, { useState, useEffect } from 'react';
import { sensorsApi, machinesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { Radio, Plus, Search, Edit2, Trash2, Cpu } from 'lucide-react';

export default function SensorsView() {
  const { hasRole } = useAuth();
  const [sensors, setSensors] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSensor, setEditingSensor] = useState(null);
  const [formData, setFormData] = useState({ name: '', type: 'Temperature', unit: '°C', machineId: '', active: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      const [sensList, machList] = await Promise.all([
        sensorsApi.getAll(),
        machinesApi.getAll()
      ]);
      setSensors(sensList || []);
      setMachines(machList || []);
    } catch (err) {
      console.error('Failed to load sensor catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreate = () => {
    setEditingSensor(null);
    setFormData({
      name: '',
      type: 'Temperature',
      unit: '°C',
      machineId: machines.length > 0 ? String(machines[0].id) : '1',
      active: true
    });
    setError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (sensor) => {
    setEditingSensor(sensor);
    setFormData({
      name: sensor.name,
      type: sensor.type,
      unit: sensor.unit,
      machineId: String(sensor.machineId),
      active: sensor.active
    });
    setError('');
    setModalOpen(true);
  };

  const handleTypeChange = (newType) => {
    let unit = '°C';
    if (newType === 'Vibration') unit = 'mm/s';
    else if (newType === 'Pressure') unit = 'PSI';
    else if (newType === 'RPM') unit = 'RPM';
    setFormData({ ...formData, type: newType, unit });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.machineId) {
      setError('Sensor name and target machine are required.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        name: formData.name,
        type: formData.type,
        unit: formData.unit,
        machineId: Number(formData.machineId),
        active: formData.active
      };

      if (editingSensor) {
        await sensorsApi.update(editingSensor.id, payload);
      } else {
        await sensorsApi.create(payload);
      }
      setModalOpen(false);
      await fetchData();
    } catch (err) {
      setError(err.message || 'Operation failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Delete Sensor #${id}? Requires ADMIN privileges.`)) return;
    try {
      await sensorsApi.delete(id);
      await fetchData();
    } catch (err) {
      alert(`Deletion failed: ${err.message}`);
    }
  };

  const filteredSensors = sensors.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.type.toLowerCase().includes(searchTerm.toLowerCase());
    if (typeFilter !== 'ALL') {
      return matchesSearch && s.type.toLowerCase() === typeFilter.toLowerCase();
    }
    return matchesSearch;
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Radio style={{ color: 'var(--neon-emerald)' }} />
            IoT Sensor Catalog & Node Configuration
          </h1>
          <p className="page-description">
            Configured telemetry endpoints, sensor metric types, hardware units, and machine associations
          </p>
        </div>
        {hasRole(['ADMIN', 'ENGINEER']) && (
          <button type="button" className="btn btn-primary" onClick={handleOpenCreate}>
            <Plus size={16} />
            Add Sensor Node
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="form-input"
            placeholder="Search sensor by name (e.g. Thermal, Vibration, Tachometer)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['ALL', 'Temperature', 'Vibration', 'Pressure', 'RPM'].map((t) => (
            <button
              key={t}
              type="button"
              className={`btn btn-sm ${typeFilter.toLowerCase() === t.toLowerCase() ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setTypeFilter(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Retrieving sensor catalog from Sensor Service (:8089)..." />
      ) : filteredSensors.length === 0 ? (
        <EmptyState
          icon={Radio}
          title="No IoT Sensors Configured"
          description="No telemetry sensor nodes match your active filter."
          actionLabel={hasRole(['ADMIN', 'ENGINEER']) ? 'Configure First Sensor' : undefined}
          onAction={handleOpenCreate}
        />
      ) : (
        <div className="table-wrap">
          <table className="industrial-table">
            <thead>
              <tr>
                <th>Node ID</th>
                <th>Sensor Label</th>
                <th>Physical Metric</th>
                <th>Unit</th>
                <th>Assigned Machine</th>
                <th>Channel State</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSensors.map((sensor) => {
                const machine = machines.find(m => m.id === sensor.machineId);
                return (
                  <tr key={sensor.id}>
                    <td style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: 'var(--neon-emerald)' }}>
                      SNS-00{sensor.id}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{sensor.name}</div>
                    </td>
                    <td>
                      <span className="badge badge-idle" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        {sensor.type}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--neon-cyan)', fontWeight: 600 }}>
                        {sensor.unit}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                        <Cpu size={14} style={{ color: 'var(--neon-purple)' }} />
                        <span>{machine ? machine.name : `Machine #${sensor.machineId}`}</span>
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={sensor.active ? 'ACTIVE' : 'INACTIVE'} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        {hasRole(['ADMIN', 'ENGINEER']) && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleOpenEdit(sensor)}
                            title="Edit Sensor Configuration"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                        {hasRole('ADMIN') && (
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(sensor.id)}
                            title="Delete Sensor (Admin Only)"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Sensor Modal (Create / Edit) */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSensor ? `Edit Sensor Node: ${editingSensor.name}` : 'Configure New IoT Sensor Node'}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editingSensor ? 'Update Sensor' : 'Register Sensor'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSave}>
          {error && (
            <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(239,68,68,0.15)', color: '#f87171', fontSize: '0.825rem', marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="sensor-name">Sensor Name / Tag</label>
            <input
              id="sensor-name"
              type="text"
              className="form-input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Spindle Thermal Sensor"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="sensor-type">Metric Type</label>
            <select
              id="sensor-type"
              className="form-select"
              value={formData.type}
              onChange={(e) => handleTypeChange(e.target.value)}
            >
              <option value="Temperature">Temperature (°C)</option>
              <option value="Vibration">Vibration (mm/s)</option>
              <option value="Pressure">Pressure (PSI)</option>
              <option value="RPM">RPM (Rotations/min)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="sensor-unit">Unit of Measure</label>
            <input
              id="sensor-unit"
              type="text"
              className="form-input"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="sensor-machine">Assigned Machine</label>
            <select
              id="sensor-machine"
              className="form-select"
              value={formData.machineId}
              onChange={(e) => setFormData({ ...formData, machineId: e.target.value })}
              required
            >
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.type})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem' }}>
            <div>
              <div className="form-label">Active Channel</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Enable data ingestion for this sensor channel
              </div>
            </div>
            <input
              type="checkbox"
              style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--neon-emerald)' }}
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
