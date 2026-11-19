import React, { useState, useEffect } from 'react';
import {
  Gauge,
  Cpu,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Plus,
  Pencil,
  Trash2,
  Power,
  X
} from 'lucide-react';
import { sensorsApi, machinesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const SENSOR_MODALITIES = [
  { value: 'TEMPERATURE', label: 'Temperature Transducer (°C)', defaultUnit: '°C' },
  { value: 'VIBRATION', label: 'Vibration Accelerometer (mm/s)', defaultUnit: 'mm/s' },
  { value: 'PRESSURE', label: 'Hydraulic / Pneumatic Pressure (bar)', defaultUnit: 'bar' },
  { value: 'RPM', label: 'Rotational Velocity Tachometer (RPM)', defaultUnit: 'RPM' },
  { value: 'POWER', label: 'Active Power Meter (kW)', defaultUnit: 'kW' },
  { value: 'FLOW', label: 'Coolant Flow Transducer (L/min)', defaultUnit: 'L/min' }
];

export default function SensorsView() {
  const { hasRole, user, assignedPlantId } = useAuth();
  const isAdmin = hasRole('ADMIN') || hasRole('ENGINEER') || user?.role === 'ADMIN' || user?.role === 'ENGINEER';
  const canDelete = hasRole('ADMIN') || user?.role === 'ADMIN';
  const isOperator = (user?.role || '').toUpperCase() === 'OPERATOR';

  const [sensors, setSensors] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [machineFilter, setMachineFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState(null);

  // Modal states for Create Sensor
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    type: 'TEMPERATURE',
    unit: '°C',
    machineId: '1',
    active: true
  });

  // Modal states for Update / Edit Sensor
  const [editingSensor, setEditingSensor] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    type: 'TEMPERATURE',
    unit: '°C',
    machineId: '1',
    active: true
  });

  const [actionLoading, setActionLoading] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [senData, machData] = await Promise.all([
        sensorsApi.getAll().catch(() => []),
        machinesApi.getAll().catch(() => [])
      ]);
      const sensorList = Array.isArray(senData) ? senData : (senData?.content || []);
      const machineList = Array.isArray(machData) ? machData : (machData?.content || []);
      setSensors(sensorList);
      setMachines(machineList);

      if (machineList.length > 0 && createForm.machineId === '1') {
        setCreateForm(prev => ({ ...prev, machineId: String(machineList[0].id) }));
      }
    } catch (e) {
      showToast('Error syncing with Sensor Service (:8089)', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 1. CREATE SENSOR
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast('Permission Denied: Admin or Engineer role required to provision sensors', 'error');
      return;
    }
    if (!createForm.name.trim()) {
      showToast('Sensor Label is required', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const created = await sensorsApi.create({
        name: createForm.name.trim(),
        type: createForm.type,
        unit: createForm.unit || '°C',
        machineId: Number(createForm.machineId) || 1,
        active: createForm.active
      });
      showToast(`Sensor '${created.name || createForm.name}' provisioned successfully.`);
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        type: 'TEMPERATURE',
        unit: '°C',
        machineId: machines.length > 0 ? String(machines[0].id) : '1',
        active: true
      });
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to provision sensor', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 2. OPEN EDIT MODAL
  const handleOpenEdit = (sensor) => {
    if (!isAdmin) {
      showToast('Permission Denied: Admin or Engineer role required to edit sensors', 'error');
      return;
    }
    setEditingSensor(sensor);
    setEditForm({
      name: sensor.name || '',
      type: sensor.type || 'TEMPERATURE',
      unit: sensor.unit || '°C',
      machineId: String(sensor.machineId || sensor.machine?.id || '1'),
      active: sensor.active !== false
    });
  };

  // 3. UPDATE SENSOR
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingSensor) return;
    if (!isAdmin) {
      showToast('Permission Denied: Admin or Engineer role required to edit sensors', 'error');
      return;
    }
    if (!editForm.name.trim()) {
      showToast('Sensor Label is required', 'error');
      return;
    }

    setActionLoading(true);
    try {
      // Optimistic update
      setSensors(prev =>
        prev.map(s =>
          s.id === editingSensor.id
            ? {
              ...s,
              name: editForm.name.trim(),
              type: editForm.type,
              unit: editForm.unit,
              machineId: Number(editForm.machineId),
              active: editForm.active
            }
            : s
        )
      );

      await sensorsApi.update(editingSensor.id, {
        name: editForm.name.trim(),
        type: editForm.type,
        unit: editForm.unit,
        machineId: Number(editForm.machineId) || 1,
        active: editForm.active
      });

      showToast(`Sensor '${editForm.name}' updated successfully.`);
      setEditingSensor(null);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to update sensor', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 4. QUICK CALIBRATION STATUS TOGGLE (Calibrated / Standby)
  const handleToggleStatus = async (sensor) => {
    if (!isAdmin) {
      showToast('Permission Denied: Admin or Engineer role required to toggle sensor state', 'error');
      return;
    }
    const nextActive = sensor.active === false;

    // Optimistic instant state update
    setSensors(prev =>
      prev.map(s => (s.id === sensor.id ? { ...s, active: nextActive } : s))
    );

    showToast(`Sensor '${sensor.name}' marked ${nextActive ? 'CALIBRATED' : 'STANDBY'}.`);

    try {
      await sensorsApi.update(sensor.id, {
        name: sensor.name,
        type: sensor.type,
        unit: sensor.unit,
        machineId: Number(sensor.machineId) || Number(sensor.machine?.id) || 1,
        active: nextActive
      });
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to toggle calibration status', 'error');
    }
  };

  // 5. DELETE SENSOR
  const handleDelete = async (sensor) => {
    if (!isAdmin) {
      showToast('Permission Denied: Admin role required to decommission sensors', 'error');
      return;
    }
    if (!window.confirm(`Are you sure you want to permanently decommission sensor '${sensor.name}' (ID: ${sensor.id})?`)) {
      return;
    }

    try {
      await sensorsApi.delete(sensor.id);
      showToast(`Sensor '${sensor.name}' decommissioned and removed.`);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to delete sensor', 'error');
    }
  };

  const filteredSensors = sensors.filter(s => {
    const query = (searchTerm || '').trim().toLowerCase();
    const assignedMach = machines.find(m => m.id === (Number(s.machineId) || Number(s.machine?.id)));
    const machName = (assignedMach?.name || '').toLowerCase();
    const senCode = `sen-${String(s.id).padStart(3, '0')}`.toLowerCase();
    const name = (s.name || '').toLowerCase();
    const type = (s.type || '').toLowerCase();
    const unit = (s.unit || '').toLowerCase();
    const id = String(s.id || '');
    const status = s.active !== false ? 'calibrated' : 'standby';
    const machId = String(s.machineId || s.machine?.id || '');

    const matchesSearch = !query ||
      name.includes(query) ||
      type.includes(query) ||
      unit.includes(query) ||
      senCode.includes(query) ||
      id === query ||
      machName.includes(query) ||
      status.includes(query);

    const matchesType = typeFilter === 'ALL' || (s.type || '').toUpperCase() === typeFilter;
    const matchesMachine = machineFilter === 'ALL' || machId === String(machineFilter);
    const matchesOperatorScope = !isOperator || (assignedMach && Number(assignedMach.plantId || assignedMach.plant?.id || 1) === Number(assignedPlantId));

    return matchesSearch && matchesType && matchesMachine && matchesOperatorScope;
  });

  return (
    <div className="pbi-admin-container">
      {/* Toast Notification */}
      {toast && (
        <div className={`pbi-toast-notification ${toast.type === 'error' ? 'pbi-toast-error' : 'pbi-toast-success'}`}>
          {toast.type === 'error' ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Banner - Clean Title Without Subtitle */}
      <div className="pbi-admin-top-banner">
        <div className="pbi-admin-top-left">
          <div className="pbi-admin-top-icon" style={{ color: '#F59E0B', background: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)' }}>
            <Gauge size={24} />
          </div>
          <div>
            <div className="pbi-admin-top-title">Sensor Calibration &amp; Threshold Matrix</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button type="button" className="pbi-ribbon-btn" onClick={fetchData}>
            <RefreshCw size={13} className={loading ? 'spin-animation' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Slicers & Functional Search */}
      <div className="pbi-slicers-bar" style={{ marginBottom: '16px' }}>
        {/* Search Box */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1, minWidth: '240px', maxWidth: '320px' }}>
          <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '10px', pointerEvents: 'none' }} />
          <input
            type="text"
            className="pbi-form-input"
            style={{ height: '34px', paddingLeft: '32px', paddingRight: searchTerm ? '30px' : '10px', fontSize: '12px', width: '100%' }}
            placeholder="Search sensor name, SEN-001, machine..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              style={{
                position: 'absolute',
                right: '8px',
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '3px',
                borderRadius: '50%'
              }}
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Machine Asset Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="pbi-slicer-label">Asset:</span>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Cpu size={13} color="#00BCF2" style={{ position: 'absolute', left: '10px', pointerEvents: 'none' }} />
            <select
              className="pbi-form-input"
              style={{
                height: '34px',
                paddingLeft: '30px',
                paddingRight: '14px',
                fontSize: '11.5px',
                fontWeight: 600,
                color: machineFilter === 'ALL' ? '#CBD5E1' : '#38BDF8',
                borderColor: machineFilter === 'ALL' ? 'var(--pbi-border)' : '#00BCF2',
                background: machineFilter === 'ALL' ? '#0E1422' : 'rgba(0, 188, 242, 0.12)',
                boxShadow: machineFilter === 'ALL' ? 'none' : '0 0 10px rgba(0, 188, 242, 0.25)',
                cursor: 'pointer',
                borderRadius: '20px'
              }}
              value={machineFilter}
              onChange={(e) => setMachineFilter(e.target.value)}
            >
              <option value="ALL">All Machines ({machines.length})</option>
              {machines.map(m => {
                const count = sensors.filter(s => Number(s.machineId) === m.id || Number(s.machine?.id) === m.id).length;
                return (
                  <option key={m.id} value={String(m.id)}>
                    {m.name} ({count} sensors)
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Modality Chiclets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="pbi-slicer-label">Modality:</span>
          <div className="pbi-slicer-pill-container">
            {['ALL', 'TEMPERATURE', 'VIBRATION', 'PRESSURE', 'RPM'].map((mod) => (
              <button
                key={mod}
                type="button"
                className={`pbi-slicer-pill ${typeFilter === mod ? 'active' : ''}`}
                onClick={() => setTypeFilter(mod)}
              >
                <span>{mod}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Visual Card with Single Provision Sensor Button */}
      <div className="pbi-visual-card" style={{ width: '100%', boxSizing: 'border-box' }}>
        <div className="pbi-visual-header">
          <div>
            <div className="pbi-visual-title">Transducer Configuration &amp; Threshold Limits</div>
          </div>

          {/* SINGLE CREATE SENSOR BUTTON */}
          {isAdmin && (
            <div className="pbi-visual-actions">
              <button
                type="button"
                className="pbi-btn-action-sm pbi-btn-action-gold"
                onClick={() => setShowCreateModal(true)}
                style={{ height: '30px', padding: '0 14px' }}
              >
                <Plus size={14} />
                <span>Provision Sensor</span>
              </button>
            </div>
          )}
        </div>

        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table className="pbi-matrix-table" style={{ width: '100%', tableLayout: 'auto' }}>
            <thead>
              <tr>
                <th style={{ width: '76px', padding: '10px 8px' }}>Sensor ID</th>
                <th style={{ padding: '10px 10px' }}>Sensor &amp; Modality</th>
                <th style={{ padding: '10px 10px' }}>Bound Asset</th>
                <th style={{ width: '68px', padding: '10px 8px', textAlign: 'center' }}>Unit</th>
                <th style={{ width: '110px', padding: isAdmin ? '10px 8px' : '10px 14px', textAlign: isAdmin ? 'left' : 'right' }}>Calibration</th>
                {isAdmin && (
                  <th style={{ width: '195px', textAlign: 'right', padding: '10px 14px', whiteSpace: 'nowrap' }}>Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredSensors.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} style={{ textAlign: 'center', padding: '36px', color: '#94A3B8' }}>
                    No transducer sensors found matching the selected filters.
                    <button
                      type="button"
                      className="pbi-ribbon-btn"
                      style={{ marginLeft: '12px', display: 'inline-flex', verticalAlign: 'middle', border: '1px solid var(--pbi-border)' }}
                      onClick={() => { setSearchTerm(''); setTypeFilter('ALL'); setMachineFilter('ALL'); }}
                    >
                      Reset All Filters
                    </button>
                  </td>
                </tr>
              )}
              {filteredSensors.map((s) => {
                const assignedMach = machines.find(m => m.id === (Number(s.machineId) || Number(s.machine?.id)));
                const isActive = s.active !== false;

                return (
                  <tr key={s.id}>
                    {/* Column 1: ID */}
                    <td style={{ padding: '10px 8px', fontFamily: 'var(--pbi-font-mono)', color: '#F59E0B', fontWeight: 700, fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                      SEN-{String(s.id).padStart(3, '0')}
                    </td>

                    {/* Column 2: Sensor Label */}
                    <td style={{ padding: '10px 10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          background: isActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          border: `1px solid ${isActive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: isActive ? '#10B981' : '#EF4444',
                          flexShrink: 0
                        }}>
                          <Gauge size={14} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '13px', color: '#FFFFFF', letterSpacing: '-0.01em' }}>
                            {s.name || `${s.type} Sensor #${s.id}`}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                            <span style={{
                              fontFamily: 'var(--pbi-font-mono)',
                              fontSize: '10px',
                              fontWeight: 700,
                              color: '#F59E0B',
                              background: 'rgba(245, 158, 11, 0.12)',
                              border: '1px solid rgba(245, 158, 11, 0.3)',
                              padding: '1px 5px',
                              borderRadius: '3px'
                            }}>
                              {s.type}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Column 3: Bound Machine Asset */}
                    <td style={{ padding: '10px 10px', color: '#CBD5E1' }}>
                      <div
                        onClick={() => setMachineFilter(machineFilter === String(assignedMach?.id || s.machineId) ? 'ALL' : String(assignedMach?.id || s.machineId))}
                        style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                        title="Click to filter sensors for this machine"
                      >
                        <Cpu size={12} color="#00BCF2" style={{ flexShrink: 0 }} />
                        <span style={{
                          fontWeight: 600,
                          fontSize: '12.5px',
                          color: '#FFFFFF',
                          textDecoration: machineFilter === String(assignedMach?.id || s.machineId) ? 'underline' : 'none'
                        }}>
                          {assignedMach ? assignedMach.name : `Machine #${s.machineId || 1}`}
                        </span>
                      </div>
                    </td>

                    {/* Column 4: Unit & Modality */}
                    <td style={{ padding: '10px 8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <span style={{
                        fontFamily: 'var(--pbi-font-mono)',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        color: '#38BDF8',
                        background: 'rgba(56, 189, 248, 0.1)',
                        padding: '2px 7px',
                        borderRadius: '4px',
                        border: '1px solid rgba(56, 189, 248, 0.25)'
                      }}>
                        {s.unit || '°C'}
                      </span>
                    </td>

                    {/* Column 5: Calibration State */}
                    <td style={{ padding: isAdmin ? '10px 8px' : '10px 14px', whiteSpace: 'nowrap', textAlign: isAdmin ? 'left' : 'right' }}>
                      <span className={`pbi-status-pill ${isActive ? 'pbi-status-online' : 'pbi-status-offline'}`}>
                        <span className="pbi-status-dot" />
                        <span>{isActive ? 'CALIBRATED' : 'STANDBY'}</span>
                      </span>
                    </td>

                    {/* Column 6: Authorizations & Actions - Admin/Engineer Only */}
                    {isAdmin && (
                      <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '5px', flexWrap: 'nowrap' }}>
                          {/* Status Toggle Button */}
                          <button
                            type="button"
                            className={`pbi-btn-action-sm ${isActive ? 'pbi-btn-toggle-offline' : 'pbi-btn-toggle-online'}`}
                            onClick={() => handleToggleStatus(s)}
                            title={isActive ? 'Take sensor into standby mode' : 'Calibrate sensor for telemetry stream'}
                          >
                            <Power size={11} />
                            <span>{isActive ? 'Standby' : 'Calibrate'}</span>
                          </button>

                          {/* Edit Button */}
                          <button
                            type="button"
                            className="pbi-btn-action-sm pbi-btn-action-primary"
                            onClick={() => handleOpenEdit(s)}
                            title="Edit sensor transducer parameters"
                          >
                            <Pencil size={11} />
                            <span>Edit</span>
                          </button>

                          {/* Delete Button (Admin Only) */}
                          {canDelete && (
                            <button
                              type="button"
                              className="pbi-btn-action-sm pbi-btn-action-danger"
                              onClick={() => handleDelete(s)}
                              title="Decommission sensor (Admin authorization required)"
                            >
                              <Trash2 size={11} />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: PROVISION SENSOR */}
      {/* ============================================================== */}
      {showCreateModal && (
        <div className="pbi-modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="pbi-modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="pbi-modal-header">
              <div className="pbi-modal-title">
                <Gauge size={16} color="#F59E0B" />
                <span>Provision IoT Transducer Sensor</span>
              </div>
              <button
                type="button"
                className="pbi-modal-close"
                onClick={() => setShowCreateModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="pbi-modal-body">
                <div className="pbi-form-group">
                  <label className="pbi-form-label" htmlFor="create-sensor-name">Sensor Transducer Label</label>
                  <input
                    id="create-sensor-name"
                    type="text"
                    className="pbi-form-input"
                    placeholder="e.g. Spindle Vibration Sensor #04"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="pbi-form-group">
                  <label className="pbi-form-label" htmlFor="create-sensor-type">Sensor Modality</label>
                  <select
                    id="create-sensor-type"
                    className="pbi-form-input"
                    value={createForm.type}
                    onChange={(e) => {
                      const selected = SENSOR_MODALITIES.find(m => m.value === e.target.value);
                      setCreateForm({
                        ...createForm,
                        type: e.target.value,
                        unit: selected?.defaultUnit || createForm.unit
                      });
                    }}
                  >
                    {SENSOR_MODALITIES.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>

                <div className="pbi-form-group">
                  <label className="pbi-form-label" htmlFor="create-sensor-unit">Measurement Unit</label>
                  <input
                    id="create-sensor-unit"
                    type="text"
                    className="pbi-form-input"
                    placeholder="e.g. °C, mm/s, bar, RPM, kW"
                    value={createForm.unit}
                    onChange={(e) => setCreateForm({ ...createForm, unit: e.target.value })}
                    required
                  />
                </div>

                <div className="pbi-form-group">
                  <label className="pbi-form-label" htmlFor="create-sensor-machine">Bound Machine Asset</label>
                  <select
                    id="create-sensor-machine"
                    className="pbi-form-input"
                    value={createForm.machineId}
                    onChange={(e) => setCreateForm({ ...createForm, machineId: e.target.value })}
                  >
                    {machines.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.type || 'CNC'})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                  <input
                    type="checkbox"
                    id="create-sensor-active"
                    checked={createForm.active}
                    onChange={(e) => setCreateForm({ ...createForm, active: e.target.checked })}
                  />
                  <label htmlFor="create-sensor-active" style={{ fontSize: '12px', color: '#CBD5E1', cursor: 'pointer' }}>
                    Sensor is Calibrated and Active (Online Stream)
                  </label>
                </div>
              </div>

              <div className="pbi-modal-footer">
                <button
                  type="button"
                  className="pbi-ribbon-btn"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="pbi-btn-action-sm pbi-btn-action-gold"
                  style={{ height: '32px', padding: '0 16px' }}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Provisioning...' : 'Provision Sensor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: UPDATE / EDIT SENSOR */}
      {/* ============================================================== */}
      {editingSensor && (
        <div className="pbi-modal-backdrop" onClick={() => setEditingSensor(null)}>
          <div className="pbi-modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="pbi-modal-header">
              <div className="pbi-modal-title">
                <Pencil size={16} color="#00BCF2" />
                <span>Update Sensor: {editingSensor.name}</span>
              </div>
              <button
                type="button"
                className="pbi-modal-close"
                onClick={() => setEditingSensor(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="pbi-modal-body">
                <div className="pbi-form-group">
                  <label className="pbi-form-label" htmlFor="edit-sensor-name">Sensor Transducer Label</label>
                  <input
                    id="edit-sensor-name"
                    type="text"
                    className="pbi-form-input"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="pbi-form-group">
                  <label className="pbi-form-label" htmlFor="edit-sensor-type">Sensor Modality</label>
                  <select
                    id="edit-sensor-type"
                    className="pbi-form-input"
                    value={editForm.type}
                    onChange={(e) => {
                      const selected = SENSOR_MODALITIES.find(m => m.value === e.target.value);
                      setEditForm({
                        ...editForm,
                        type: e.target.value,
                        unit: selected?.defaultUnit || editForm.unit
                      });
                    }}
                  >
                    {SENSOR_MODALITIES.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>

                <div className="pbi-form-group">
                  <label className="pbi-form-label" htmlFor="edit-sensor-unit">Measurement Unit</label>
                  <input
                    id="edit-sensor-unit"
                    type="text"
                    className="pbi-form-input"
                    value={editForm.unit}
                    onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                    required
                  />
                </div>

                <div className="pbi-form-group">
                  <label className="pbi-form-label" htmlFor="edit-sensor-machine">Bound Machine Asset</label>
                  <select
                    id="edit-sensor-machine"
                    className="pbi-form-input"
                    value={editForm.machineId}
                    onChange={(e) => setEditForm({ ...editForm, machineId: e.target.value })}
                  >
                    {machines.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.type || 'CNC'})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                  <input
                    type="checkbox"
                    id="edit-sensor-active"
                    checked={editForm.active}
                    onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
                  />
                  <label htmlFor="edit-sensor-active" style={{ fontSize: '12px', color: '#CBD5E1', cursor: 'pointer' }}>
                    Sensor is Calibrated and Active (Online Stream)
                  </label>
                </div>
              </div>

              <div className="pbi-modal-footer">
                <button
                  type="button"
                  className="pbi-ribbon-btn"
                  onClick={() => setEditingSensor(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="pbi-btn-action-sm pbi-btn-action-gold"
                  style={{ height: '32px', padding: '0 16px' }}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
