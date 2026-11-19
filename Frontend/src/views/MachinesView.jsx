import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Building2,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Search,
  Plus,
  Pencil,
  Trash2,
  Power,
  X
} from 'lucide-react';
import { machinesApi, plantsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const MACHINE_TYPES = [
  { value: 'CNC', label: 'CNC Machining Center' },
  { value: 'ROBOTIC', label: 'Robotic Assembly Arm' },
  { value: 'PRESS', label: 'Hydraulic Stamping Press' },
  { value: 'LATHE', label: 'High-Precision CNC Lathe' },
  { value: 'PACKAGING', label: 'Automated Packaging Line' },
  { value: 'SENSOR_ARRAY', label: 'Telemetry Sensor Array' }
];

const MACHINE_STATUSES = [
  { value: 'RUNNING', label: 'RUNNING - Production Active' },
  { value: 'IDLE', label: 'IDLE - Standby Mode' },
  { value: 'MAINTENANCE', label: 'MAINTENANCE - Calibration' }
];

export default function MachinesView() {
  const { hasRole, user, assignedPlantId } = useAuth();
  const isAdmin = hasRole('ADMIN') || hasRole('ENGINEER') || user?.role === 'ADMIN' || user?.role === 'ENGINEER';
  const canDelete = hasRole('ADMIN') || user?.role === 'ADMIN';
  const isOperator = (user?.role || '').toUpperCase() === 'OPERATOR';

  const [machines, setMachines] = useState([]);
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [plantFilter, setPlantFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);

  // Modal states for Create Machine
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    type: 'CNC',
    status: 'RUNNING',
    plantId: '1'
  });

  // Modal states for Update / Edit Machine
  const [editingMachine, setEditingMachine] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    type: 'CNC',
    status: 'RUNNING',
    plantId: '1'
  });

  const [actionLoading, setActionLoading] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [machs, plts] = await Promise.all([
        machinesApi.getAll().catch(() => []),
        plantsApi.getAll().catch(() => [])
      ]);
      const machineList = Array.isArray(machs) ? machs : (machs?.content || []);
      const plantList = Array.isArray(plts) ? plts : (plts?.content || []);
      setMachines(machineList);
      setPlants(plantList);

      if (plantList.length > 0 && createForm.plantId === '1') {
        setCreateForm(prev => ({ ...prev, plantId: String(plantList[0].id) }));
      }
    } catch (e) {
      showToast('Error syncing with Machine Service (:8088)', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const machinesByPlant = plantFilter === 'ALL'
    ? machines
    : machines.filter(m => String(m.plantId || m.plant?.id || '') === String(plantFilter));

  const runningCount = machinesByPlant.filter(m => m.status === 'RUNNING').length;
  const idleCount = machinesByPlant.filter(m => m.status === 'IDLE').length;
  const maintCount = machinesByPlant.filter(m => m.status === 'MAINTENANCE').length;

  // 1. CREATE MACHINE
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast('Permission Denied: Admin or Engineer role required to provision machines', 'error');
      return;
    }
    if (!createForm.name.trim()) {
      showToast('Machine Asset Name is required', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const created = await machinesApi.create({
        name: createForm.name.trim(),
        type: createForm.type,
        status: createForm.status,
        plantId: Number(createForm.plantId) || 1
      });
      showToast(`Machine '${created.name || createForm.name}' provisioned successfully.`);
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        type: 'CNC',
        status: 'RUNNING',
        plantId: plants.length > 0 ? String(plants[0].id) : '1'
      });
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to provision machine', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 2. OPEN EDIT MODAL
  const handleOpenEdit = (machine) => {
    if (!isAdmin) {
      showToast('Permission Denied: Admin or Engineer role required to edit machines', 'error');
      return;
    }
    setEditingMachine(machine);
    setEditForm({
      name: machine.name || '',
      type: machine.type || 'CNC',
      status: machine.status || 'RUNNING',
      plantId: String(machine.plantId || machine.plant?.id || '1')
    });
  };

  // 3. UPDATE MACHINE
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingMachine) return;
    if (!isAdmin) {
      showToast('Permission Denied: Admin or Engineer role required to edit machines', 'error');
      return;
    }
    if (!editForm.name.trim()) {
      showToast('Machine Asset Name is required', 'error');
      return;
    }

    setActionLoading(true);
    try {
      // Optimistic update
      setMachines(prev =>
        prev.map(m =>
          m.id === editingMachine.id
            ? {
              ...m,
              name: editForm.name.trim(),
              type: editForm.type,
              status: editForm.status,
              plantId: Number(editForm.plantId)
            }
            : m
        )
      );

      await machinesApi.update(editingMachine.id, {
        name: editForm.name.trim(),
        type: editForm.type,
        status: editForm.status,
        plantId: Number(editForm.plantId) || 1
      });

      showToast(`Machine '${editForm.name}' updated successfully.`);
      setEditingMachine(null);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to update machine', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 4. QUICK TOGGLE STATUS (Running <-> Idle)
  const handleToggleStatus = async (machine) => {
    if (!isAdmin) {
      showToast('Permission Denied: Admin or Engineer role required to toggle machine state', 'error');
      return;
    }
    const nextStatus = machine.status === 'RUNNING' ? 'IDLE' : 'RUNNING';

    // Optimistic instant state update
    setMachines(prev =>
      prev.map(m => (m.id === machine.id ? { ...m, status: nextStatus } : m))
    );

    showToast(`Machine '${machine.name}' marked ${nextStatus}.`);

    try {
      await machinesApi.update(machine.id, {
        name: machine.name,
        type: machine.type || 'CNC',
        status: nextStatus,
        plantId: Number(machine.plantId) || Number(machine.plant?.id) || 1
      });
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to toggle status', 'error');
    }
  };

  // 5. DELETE MACHINE
  const handleDelete = async (machine) => {
    if (!isAdmin) {
      showToast('Permission Denied: Admin role required to decommission machines', 'error');
      return;
    }
    if (!window.confirm(`Are you sure you want to permanently decommission and delete machine '${machine.name}' (ID: ${machine.id})?`)) {
      return;
    }

    try {
      await machinesApi.delete(machine.id);
      showToast(`Machine '${machine.name}' decommissioned and removed.`);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to delete machine', 'error');
    }
  };

  const filteredMachines = machines.filter(m => {
    const query = (search || '').trim().toLowerCase();
    const assignedPlant = plants.find(p => p.id === (Number(m.plantId) || Number(m.plant?.id)));
    const plantName = (assignedPlant?.name || '').toLowerCase();
    const plantLoc = (assignedPlant?.location || '').toLowerCase();
    const mchCode = `mch-${String(m.id).padStart(3, '0')}`.toLowerCase();
    const name = (m.name || '').toLowerCase();
    const type = (m.type || '').toLowerCase();
    const status = (m.status || '').toLowerCase();
    const id = String(m.id || '');

    const matchesSearch = !query ||
      name.includes(query) ||
      type.includes(query) ||
      mchCode.includes(query) ||
      id === query ||
      plantName.includes(query) ||
      plantLoc.includes(query) ||
      status.includes(query);

    const matchesStatus = statusFilter === 'ALL' || m.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || (m.type || '').toUpperCase() === typeFilter;
    const plantId = String(m.plantId || m.plant?.id || '');
    const matchesOperatorScope = !isOperator || plantId === String(assignedPlantId);
    const matchesPlant = plantFilter === 'ALL' || plantId === String(plantFilter);

    return matchesSearch && matchesStatus && matchesType && matchesPlant && matchesOperatorScope;
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

      {/* Top Banner - Clean title without subtitle */}
      <div className="pbi-admin-top-banner">
        <div className="pbi-admin-top-left">
          <div className="pbi-admin-top-icon" style={{ color: '#00BCF2', background: 'rgba(0, 188, 242, 0.1)', borderColor: 'rgba(0, 188, 242, 0.3)' }}>
            <Cpu size={24} />
          </div>
          <div>
            <div className="pbi-admin-top-title">Machine Fleet &amp; Asset Diagnostics</div>
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
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1, maxWidth: '340px' }}>
          <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '10px', pointerEvents: 'none' }} />
          <input
            type="text"
            className="pbi-form-input"
            style={{ height: '34px', paddingLeft: '32px', paddingRight: search ? '30px' : '10px', fontSize: '12px', width: '100%' }}
            placeholder="Search name, code (MCH-001), plant, type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
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

        {/* Facility Slicer Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="pbi-slicer-label">Facility:</span>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Building2 size={13} color="#10B981" style={{ position: 'absolute', left: '10px', pointerEvents: 'none' }} />
            <select
              className="pbi-form-input"
              style={{
                height: '34px',
                paddingLeft: '30px',
                paddingRight: '14px',
                fontSize: '11.5px',
                fontWeight: 600,
                color: plantFilter === 'ALL' ? '#CBD5E1' : '#34D399',
                borderColor: plantFilter === 'ALL' ? 'var(--pbi-border)' : '#10B981',
                background: plantFilter === 'ALL' ? '#0E1422' : 'rgba(16, 185, 129, 0.12)',
                boxShadow: plantFilter === 'ALL' ? 'none' : '0 0 10px rgba(16, 185, 129, 0.25)',
                cursor: 'pointer',
                borderRadius: '20px'
              }}
              value={plantFilter}
              onChange={(e) => setPlantFilter(e.target.value)}
            >
              <option value="ALL">All Facilities ({plants.length})</option>
              {plants.map(p => {
                const count = machines.filter(m => Number(m.plantId) === p.id || Number(m.plant?.id) === p.id).length;
                return (
                  <option key={p.id} value={String(p.id)}>
                    {p.name} ({count} machines)
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="pbi-slicer-label">Status Slicer:</span>
          <div className="pbi-slicer-pill-container">
            <button
              type="button"
              className={`pbi-slicer-pill pbi-slicer-pill-all ${statusFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setStatusFilter('ALL')}
            >
              <span className="pbi-slicer-dot pbi-slicer-dot-all" />
              <span>ALL</span>
              <span className="pbi-slicer-badge">{machinesByPlant.length}</span>
            </button>

            <button
              type="button"
              className={`pbi-slicer-pill pbi-slicer-pill-online ${statusFilter === 'RUNNING' ? 'active' : ''}`}
              onClick={() => setStatusFilter('RUNNING')}
            >
              <span className="pbi-slicer-dot pbi-slicer-dot-online" />
              <span>RUNNING</span>
              <span className="pbi-slicer-badge">{runningCount}</span>
            </button>

            <button
              type="button"
              className={`pbi-slicer-pill ${statusFilter === 'IDLE' ? 'active' : ''}`}
              onClick={() => setStatusFilter('IDLE')}
              style={{
                color: statusFilter === 'IDLE' ? '#FBBF24' : undefined,
                borderColor: statusFilter === 'IDLE' ? '#F59E0B' : undefined,
                boxShadow: statusFilter === 'IDLE' ? '0 0 12px rgba(245, 158, 11, 0.35)' : undefined
              }}
            >
              <span className="pbi-slicer-dot" style={{ background: '#F59E0B', boxShadow: '0 0 6px #F59E0B' }} />
              <span>IDLE</span>
              <span className="pbi-slicer-badge">{idleCount}</span>
            </button>

            <button
              type="button"
              className={`pbi-slicer-pill pbi-slicer-pill-offline ${statusFilter === 'MAINTENANCE' ? 'active' : ''}`}
              onClick={() => setStatusFilter('MAINTENANCE')}
            >
              <span className="pbi-slicer-dot pbi-slicer-dot-offline" />
              <span>MAINTENANCE</span>
              <span className="pbi-slicer-badge">{maintCount}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Fleet Assets Matrix Card with Single Create Machine Button */}
      <div className="pbi-visual-card" style={{ width: '100%', boxSizing: 'border-box' }}>
        <div className="pbi-visual-header">
          <div>
            <div className="pbi-visual-title">Fleet Assets Detailed Matrix</div>
          </div>

          {/* SINGLE CREATE MACHINE BUTTON */}
          {isAdmin && (
            <div className="pbi-visual-actions">
              <button
                type="button"
                className="pbi-btn-action-sm pbi-btn-action-gold"
                onClick={() => setShowCreateModal(true)}
                style={{ height: '30px', padding: '0 14px' }}
              >
                <Plus size={14} />
                <span>Provision Machine</span>
              </button>
            </div>
          )}
        </div>

        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table className="pbi-matrix-table" style={{ width: '100%', tableLayout: 'auto' }}>
            <thead>
              <tr>
                <th style={{ width: '76px', padding: '10px 8px' }}>Asset ID</th>
                <th style={{ padding: '10px 10px' }}>Machine Asset &amp; Type</th>
                <th style={{ padding: '10px 10px' }}>Allocated Facility</th>
                <th style={{ width: '105px', padding: '10px 8px' }}>Status</th>
                <th style={{ width: '92px', padding: isAdmin ? '10px 8px' : '10px 14px' }}>Health</th>
                {isAdmin && (
                  <th style={{ width: '190px', textAlign: 'right', padding: '10px 14px', whiteSpace: 'nowrap' }}>Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredMachines.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} style={{ textAlign: 'center', padding: '36px', color: '#94A3B8' }}>
                    No machine assets found matching the selected filters.
                    <button
                      type="button"
                      className="pbi-ribbon-btn"
                      style={{ marginLeft: '12px', display: 'inline-flex', verticalAlign: 'middle', border: '1px solid var(--pbi-border)' }}
                      onClick={() => { setSearch(''); setStatusFilter('ALL'); setPlantFilter('ALL'); }}
                    >
                      Reset All Filters
                    </button>
                  </td>
                </tr>
              )}
              {filteredMachines.map((m) => {
                const assignedPlant = plants.find(p => p.id === (Number(m.plantId) || Number(m.plant?.id)));
                const isRunning = m.status === 'RUNNING';
                const isMaint = m.status === 'MAINTENANCE';
                const statusClass = isRunning ? 'pbi-status-running' : (m.status === 'IDLE' ? 'pbi-status-idle' : 'pbi-status-maintenance');
                const healthScore = isRunning ? 94 : (m.status === 'IDLE' ? 82 : 45);

                return (
                  <tr key={m.id}>
                    {/* Column 1: ID */}
                    <td style={{ padding: '10px 8px', fontFamily: 'var(--pbi-font-mono)', color: '#94A3B8', fontWeight: 600, fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                      MCH-{String(m.id).padStart(3, '0')}
                    </td>

                    {/* Column 2: Machine Asset & Classification */}
                    <td style={{ padding: '10px 10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          background: isRunning ? 'rgba(16, 185, 129, 0.12)' : (isMaint ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)'),
                          border: `1px solid ${isRunning ? 'rgba(16, 185, 129, 0.3)' : (isMaint ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)')}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: isRunning ? '#10B981' : (isMaint ? '#EF4444' : '#F59E0B'),
                          flexShrink: 0
                        }}>
                          <Cpu size={14} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '13px', color: '#FFFFFF', letterSpacing: '-0.01em' }}>
                            {m.name}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                            <span style={{
                              fontFamily: 'var(--pbi-font-mono)',
                              fontSize: '10px',
                              fontWeight: 700,
                              color: '#00BCF2',
                              background: 'rgba(0,188,242,0.12)',
                              border: '1px solid rgba(0,188,242,0.3)',
                              padding: '1px 5px',
                              borderRadius: '3px'
                            }}>
                              {m.type || 'CNC'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Column 3: Allocated Facility */}
                    <td style={{ padding: '10px 10px', color: '#CBD5E1' }}>
                      <div
                        onClick={() => setPlantFilter(plantFilter === String(assignedPlant?.id || m.plantId) ? 'ALL' : String(assignedPlant?.id || m.plantId))}
                        style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                        title="Click to filter machines by this facility"
                      >
                        <Building2 size={12} color="#10B981" style={{ flexShrink: 0 }} />
                        <span style={{
                          fontWeight: 600,
                          fontSize: '12.5px',
                          color: '#FFFFFF',
                          textDecoration: plantFilter === String(assignedPlant?.id || m.plantId) ? 'underline' : 'none'
                        }}>
                          {assignedPlant ? assignedPlant.name : `Plant #${m.plantId || 1}`}
                        </span>
                      </div>
                      {assignedPlant?.location && (
                        <div style={{ fontSize: '10.5px', color: '#94A3B8', marginTop: '2px', paddingLeft: '17px' }}>
                          {assignedPlant.location}
                        </div>
                      )}
                    </td>

                    {/* Column 4: Operating Status */}
                    <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>
                      <span className={`pbi-status-pill ${statusClass}`}>
                        <span className="pbi-status-dot" />
                        <span>{m.status}</span>
                      </span>
                    </td>

                    {/* Column 5: Health Score (Compact Inline) */}
                    <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div className="pbi-cell-bar-track" style={{ width: '44px', height: '5px', background: '#0E1422', borderRadius: '3px', flexShrink: 0 }}>
                          <div
                            className="pbi-cell-bar-fill"
                            style={{
                              width: `${healthScore}%`,
                              background: healthScore > 80 ? '#10B981' : (healthScore > 50 ? '#F59E0B' : '#EF4444'),
                              borderRadius: '3px'
                            }}
                          />
                        </div>
                        <span style={{ fontWeight: 700, fontSize: '11px', fontFamily: 'var(--pbi-font-mono)', color: healthScore > 80 ? '#10B981' : (healthScore > 50 ? '#F59E0B' : '#EF4444') }}>
                          {healthScore}%
                        </span>
                      </div>
                    </td>

                    {/* Column 6: Authorizations & Actions - Admin/Engineer Only */}
                    {isAdmin && (
                      <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '5px', flexWrap: 'nowrap' }}>
                          {/* Quick Status Toggle Button */}
                          <button
                            type="button"
                            className={`pbi-btn-action-sm ${isRunning ? 'pbi-btn-toggle-offline' : 'pbi-btn-toggle-online'}`}
                            onClick={() => handleToggleStatus(m)}
                            title={isRunning ? 'Mark machine as IDLE' : 'Start machine production (RUNNING)'}
                          >
                            <Power size={11} />
                            <span>{isRunning ? 'Idle' : 'Start'}</span>
                          </button>

                          {/* Edit Button */}
                          <button
                            type="button"
                            className="pbi-btn-action-sm pbi-btn-action-primary"
                            onClick={() => handleOpenEdit(m)}
                            title="Edit machine parameters"
                          >
                            <Pencil size={11} />
                            <span>Edit</span>
                          </button>

                          {/* Delete Button (Admin Only) */}
                          {canDelete && (
                            <button
                              type="button"
                              className="pbi-btn-action-sm pbi-btn-action-danger"
                              onClick={() => handleDelete(m)}
                              title="Decommission machine (Admin authorization required)"
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
      {/* MODAL 1: PROVISION / CREATE MACHINE */}
      {/* ============================================================== */}
      {showCreateModal && (
        <div className="pbi-modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="pbi-modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="pbi-modal-header">
              <div className="pbi-modal-title">
                <Cpu size={16} color="#00BCF2" />
                <span>Provision Machine Fleet Asset</span>
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
                  <label className="pbi-form-label" htmlFor="create-machine-name">Machine Asset Name</label>
                  <input
                    id="create-machine-name"
                    type="text"
                    className="pbi-form-input"
                    placeholder="e.g. 5-Axis Precision CNC Miller #03"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="pbi-form-group">
                  <label className="pbi-form-label" htmlFor="create-machine-type">Asset Classification / Type</label>
                  <select
                    id="create-machine-type"
                    className="pbi-form-input"
                    value={createForm.type}
                    onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}
                  >
                    {MACHINE_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div className="pbi-form-group">
                  <label className="pbi-form-label" htmlFor="create-machine-plant">Allocated Manufacturing Facility</label>
                  <select
                    id="create-machine-plant"
                    className="pbi-form-input"
                    value={createForm.plantId}
                    onChange={(e) => setCreateForm({ ...createForm, plantId: e.target.value })}
                  >
                    {plants.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.location})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pbi-form-group">
                  <label className="pbi-form-label" htmlFor="create-machine-status">Initial Operating Status</label>
                  <select
                    id="create-machine-status"
                    className="pbi-form-input"
                    value={createForm.status}
                    onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
                  >
                    {MACHINE_STATUSES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
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
                  {actionLoading ? 'Provisioning...' : 'Provision Machine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: UPDATE / EDIT MACHINE */}
      {/* ============================================================== */}
      {editingMachine && (
        <div className="pbi-modal-backdrop" onClick={() => setEditingMachine(null)}>
          <div className="pbi-modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="pbi-modal-header">
              <div className="pbi-modal-title">
                <Pencil size={16} color="#00BCF2" />
                <span>Update Machine: {editingMachine.name}</span>
              </div>
              <button
                type="button"
                className="pbi-modal-close"
                onClick={() => setEditingMachine(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="pbi-modal-body">
                <div className="pbi-form-group">
                  <label className="pbi-form-label" htmlFor="edit-machine-name">Machine Asset Name</label>
                  <input
                    id="edit-machine-name"
                    type="text"
                    className="pbi-form-input"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="pbi-form-group">
                  <label className="pbi-form-label" htmlFor="edit-machine-type">Asset Classification / Type</label>
                  <select
                    id="edit-machine-type"
                    className="pbi-form-input"
                    value={editForm.type}
                    onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                  >
                    {MACHINE_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div className="pbi-form-group">
                  <label className="pbi-form-label" htmlFor="edit-machine-plant">Allocated Manufacturing Facility</label>
                  <select
                    id="edit-machine-plant"
                    className="pbi-form-input"
                    value={editForm.plantId}
                    onChange={(e) => setEditForm({ ...editForm, plantId: e.target.value })}
                  >
                    {plants.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.location})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pbi-form-group">
                  <label className="pbi-form-label" htmlFor="edit-machine-status">Operating Status</label>
                  <select
                    id="edit-machine-status"
                    className="pbi-form-input"
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  >
                    {MACHINE_STATUSES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pbi-modal-footer">
                <button
                  type="button"
                  className="pbi-ribbon-btn"
                  onClick={() => setEditingMachine(null)}
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
