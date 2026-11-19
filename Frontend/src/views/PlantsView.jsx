import React, { useState, useEffect } from 'react';
import {
  Building2,
  Cpu,
  MapPin,
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
import { plantsApi, machinesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function PlantsView() {
  const { hasRole, user, assignedPlantId } = useAuth();
  const isAdmin = hasRole('ADMIN') || user?.role === 'ADMIN';
  const isOperator = (user?.role || '').toUpperCase() === 'OPERATOR';

  const [plants, setPlants] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [toast, setToast] = useState(null);

  // Modal state for Create Plant (Single entry point in Visual Grid)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', location: '', active: true });

  // Modal state for Update / Edit
  const [editingPlant, setEditingPlant] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', location: '', active: true });
  const [actionLoading, setActionLoading] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const getStatusOverrides = () => {
    try {
      return JSON.parse(localStorage.getItem('kynexis_plant_status') || '{}');
    } catch {
      return {};
    }
  };

  const saveStatusOverride = (id, active) => {
    try {
      const overrides = getStatusOverrides();
      overrides[id] = active;
      localStorage.setItem('kynexis_plant_status', JSON.stringify(overrides));
    } catch (e) {
      console.error('Failed to save status override', e);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [plantsData, machinesData] = await Promise.all([
        plantsApi.getAll().catch(() => []),
        machinesApi.getAll().catch(() => [])
      ]);
      const rawPlants = Array.isArray(plantsData) ? plantsData : (plantsData?.content || []);
      const overrides = getStatusOverrides();

      // Apply persistent status overrides
      const reconciledPlants = rawPlants.map((p) => {
        if (overrides[p.id] !== undefined) {
          return { ...p, active: overrides[p.id] };
        }
        return p;
      });

      setPlants(reconciledPlants);
      setMachines(Array.isArray(machinesData) ? machinesData : (machinesData?.content || []));
    } catch (e) {
      showToast('Error syncing with Plant Service (:8082)', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 1. CREATE PLANT SUBMIT
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast('Permission Denied: Only Administrator (ROLE_ADMIN) can create facilities', 'error');
      return;
    }
    if (!createForm.name.trim() || !createForm.location.trim()) {
      showToast('Facility Name and Location are required', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const created = await plantsApi.create({
        name: createForm.name.trim(),
        location: createForm.location.trim(),
        active: createForm.active
      });
      if (created?.id) {
        saveStatusOverride(created.id, createForm.active);
      }
      showToast(`Facility '${createForm.name}' created successfully.`);
      setShowCreateModal(false);
      setCreateForm({ name: '', location: '', active: true });
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to create facility', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 2. OPEN EDIT MODAL
  const handleOpenEdit = (plant) => {
    if (!isAdmin) {
      showToast('Permission Denied: Only Administrator (ROLE_ADMIN) can update facilities', 'error');
      return;
    }
    setEditingPlant(plant);
    setEditForm({
      name: plant.name || '',
      location: plant.location || '',
      active: plant.active !== false
    });
  };

  // 3. UPDATE PLANT SUBMIT
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingPlant) return;
    if (!isAdmin) {
      showToast('Permission Denied: Only Administrator (ROLE_ADMIN) can update facilities', 'error');
      return;
    }
    if (!editForm.name.trim() || !editForm.location.trim()) {
      showToast('Facility Name and Location are required', 'error');
      return;
    }

    setActionLoading(true);
    try {
      saveStatusOverride(editingPlant.id, editForm.active);
      // Optimistic state update
      setPlants((prev) =>
        prev.map((p) =>
          p.id === editingPlant.id
            ? { ...p, name: editForm.name.trim(), location: editForm.location.trim(), active: editForm.active }
            : p
        )
      );

      await plantsApi.update(editingPlant.id, {
        name: editForm.name.trim(),
        location: editForm.location.trim(),
        active: editForm.active
      });

      showToast(`Facility '${editForm.name}' updated successfully.`);
      setEditingPlant(null);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to update facility', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 4. QUICK TOGGLE STATUS (Guaranteed OFFLINE / ONLINE)
  const handleToggleStatus = async (plant) => {
    if (!isAdmin) {
      showToast('Permission Denied: Only Administrator (ROLE_ADMIN) can change facility status', 'error');
      return;
    }
    const nextActive = plant.active === false;

    // 1. Persist override immediately
    saveStatusOverride(plant.id, nextActive);

    // 2. Optimistic instant UI update
    setPlants((prev) =>
      prev.map((p) => (p.id === plant.id ? { ...p, active: nextActive } : p))
    );

    showToast(`Facility '${plant.name}' marked ${nextActive ? 'ONLINE' : 'OFFLINE'}.`);

    // 3. Dispatch to backend API
    try {
      await plantsApi.update(plant.id, {
        name: plant.name,
        location: plant.location,
        active: nextActive
      });
      fetchData();
    } catch (err) {
      showToast(err.message || 'Backend sync failed', 'error');
    }
  };

  // 5. DELETE PLANT
  const handleDelete = async (plant) => {
    if (!isAdmin) {
      showToast('Permission Denied: Only Administrator (ROLE_ADMIN) can delete facilities', 'error');
      return;
    }
    if (!window.confirm(`Are you sure you want to permanently delete facility '${plant.name}' (ID: ${plant.id})?`)) {
      return;
    }

    try {
      // Remove status override
      try {
        const overrides = getStatusOverrides();
        delete overrides[plant.id];
        localStorage.setItem('kynexis_plant_status', JSON.stringify(overrides));
      } catch { }

      await plantsApi.delete(plant.id);
      showToast(`Facility '${plant.name}' deleted.`);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to delete facility', 'error');
    }
  };

  const operatorPlantMatch = plants.filter(p => Number(p.id) === Number(assignedPlantId));
  const visiblePlants = isOperator
    ? (operatorPlantMatch.length > 0 ? operatorPlantMatch : plants.slice(0, 1))
    : plants;

  const filteredPlants = visiblePlants.filter(p => {
    const query = (searchTerm || '').trim().toLowerCase();
    const facCode = `fac-${String(p.id).padStart(3, '0')}`.toLowerCase();
    const name = (p.name || '').toLowerCase();
    const loc = (p.location || '').toLowerCase();
    const id = String(p.id || '');
    const status = p.active !== false ? 'online' : 'offline';

    const matchesSearch = !query ||
      name.includes(query) ||
      loc.includes(query) ||
      facCode.includes(query) ||
      id === query ||
      status.includes(query);

    if (statusFilter === 'ONLINE') return matchesSearch && p.active !== false;
    if (statusFilter === 'OFFLINE') return matchesSearch && p.active === false;
    return matchesSearch;
  });

  const onlineCount = plants.filter(p => p.active !== false).length;
  const offlineCount = plants.filter(p => p.active === false).length;

  return (
    <div className="pbi-admin-container">
      {/* Toast Notification */}
      {toast && (
        <div className={`pbi-toast-notification ${toast.type === 'error' ? 'pbi-toast-error' : 'pbi-toast-success'}`}>
          {toast.type === 'error' ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Visual Header */}
      <div className="pbi-admin-top-banner">
        <div className="pbi-admin-top-left">
          <div className="pbi-admin-top-icon" style={{ color: '#10B981', background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
            <Building2 size={24} />
          </div>
          <div>
            <div className="pbi-admin-top-title">Manufacturing Plants &amp; Facilities</div>
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
            style={{ height: '34px', paddingLeft: '32px', paddingRight: searchTerm ? '30px' : '10px', fontSize: '12px', width: '100%' }}
            placeholder="Search facility name, location, or FAC-001..."
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
              <span className="pbi-slicer-badge">{plants.length}</span>
            </button>

            <button
              type="button"
              className={`pbi-slicer-pill pbi-slicer-pill-online ${statusFilter === 'ONLINE' ? 'active' : ''}`}
              onClick={() => setStatusFilter('ONLINE')}
            >
              <span className="pbi-slicer-dot pbi-slicer-dot-online" />
              <span>ONLINE</span>
              <span className="pbi-slicer-badge">{onlineCount}</span>
            </button>

            <button
              type="button"
              className={`pbi-slicer-pill pbi-slicer-pill-offline ${statusFilter === 'OFFLINE' ? 'active' : ''}`}
              onClick={() => setStatusFilter('OFFLINE')}
            >
              <span className="pbi-slicer-dot pbi-slicer-dot-offline" />
              <span>OFFLINE</span>
              <span className="pbi-slicer-badge">{offlineCount}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Facilities Master Grid Matrix Card */}
      <div className="pbi-visual-card" style={{ width: '100%', boxSizing: 'border-box' }}>
        <div className="pbi-visual-header">
          <div>
            <div className="pbi-visual-title">Facilities Master Grid</div>
          </div>

          {/* SINGLE CREATE PLANT BUTTON */}
          {isAdmin && (
            <div className="pbi-visual-actions">
              <button
                type="button"
                className="pbi-btn-action-sm pbi-btn-action-gold"
                onClick={() => setShowCreateModal(true)}
                style={{ height: '30px', padding: '0 14px' }}
              >
                <Plus size={14} />
                <span>Create Plant</span>
              </button>
            </div>
          )}
        </div>

        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table className="pbi-matrix-table" style={{ width: '100%', tableLayout: 'auto' }}>
            <thead>
              <tr>
                <th style={{ width: '76px', padding: '10px 8px' }}>Facility ID</th>
                <th style={{ padding: '10px 10px' }}>Facility &amp; Location</th>
                <th style={{ padding: '10px 10px', width: '180px' }}>Fleet Utilization</th>
                <th style={{ width: '100px', padding: '10px 8px', textAlign: isAdmin ? 'left' : 'right' }}>Status</th>
                {isAdmin && (
                  <th style={{ width: '215px', textAlign: 'right', padding: '10px 14px', whiteSpace: 'nowrap' }}>Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredPlants.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} style={{ textAlign: 'center', padding: '36px', color: '#94A3B8' }}>
                    No manufacturing facilities found matching the current search/filter.
                  </td>
                </tr>
              )}
              {filteredPlants.map((plant) => {
                const assigned = machines.filter(m => Number(m.plantId) === plant.id || Number(m.plant?.id) === plant.id);
                const running = assigned.filter(m => m.status === 'RUNNING').length;
                const utilPct = assigned.length > 0 ? Math.round((running / assigned.length) * 100) : 0;
                const isOnline = plant.active !== false;

                return (
                  <tr key={plant.id}>
                    {/* Column 1: ID */}
                    <td style={{ padding: '10px 8px', fontFamily: 'var(--pbi-font-mono)', color: '#94A3B8', fontWeight: 600, fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                      FAC-{String(plant.id).padStart(3, '0')}
                    </td>

                    {/* Column 2: Facility & Location */}
                    <td style={{ padding: '10px 10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          background: isOnline ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          border: `1px solid ${isOnline ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: isOnline ? '#10B981' : '#EF4444',
                          flexShrink: 0
                        }}>
                          <Building2 size={14} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '13px', color: '#FFFFFF', letterSpacing: '-0.01em' }}>
                            {plant.name}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                            <MapPin size={10} color="#00BCF2" />
                            <span>{plant.location}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Column 3: Machine Fleet & Utilization Bar */}
                    <td style={{ padding: '10px 10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxWidth: '170px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                          <span style={{ color: '#E2E8F0' }}>
                            <strong style={{ color: '#FFFFFF' }}>{assigned.length}</strong> mach
                            <span style={{ color: '#94A3B8', marginLeft: '4px' }}>({running} run)</span>
                          </span>
                          <span style={{ fontWeight: 700, fontSize: '10.5px', color: isOnline ? '#10B981' : '#64748B' }}>
                            {utilPct}%
                          </span>
                        </div>
                        <div className="pbi-cell-bar-track" style={{ height: '5px', background: '#0E1422', borderRadius: '3px' }}>
                          <div
                            className="pbi-cell-bar-fill"
                            style={{
                              width: `${utilPct}%`,
                              background: isOnline ? 'linear-gradient(90deg, #10B981, #00BCF2)' : '#64748B',
                              borderRadius: '3px'
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Column 4: Operational Status */}
                    <td style={{ padding: isAdmin ? '10px 8px' : '10px 14px', whiteSpace: 'nowrap', textAlign: isAdmin ? 'left' : 'right' }}>
                      <span className={`pbi-status-pill ${isOnline ? 'pbi-status-online' : 'pbi-status-offline'}`}>
                        <span className="pbi-status-dot" />
                        <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
                      </span>
                    </td>

                    {/* Column 5: Authorizations & Actions - Admin Only */}
                    {isAdmin && (
                      <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '5px', flexWrap: 'nowrap' }}>
                          {/* Status Toggle Button - Make Offline / Make Online */}
                          <button
                            type="button"
                            className={`pbi-btn-action-sm ${isOnline ? 'pbi-btn-toggle-offline' : 'pbi-btn-toggle-online'}`}
                            onClick={() => handleToggleStatus(plant)}
                            title={isOnline ? 'Make facility offline' : 'Make facility online'}
                          >
                            <Power size={11} />
                            <span>{isOnline ? 'Make Offline' : 'Make Online'}</span>
                          </button>

                          {/* Edit Button */}
                          <button
                            type="button"
                            className="pbi-btn-action-sm pbi-btn-action-primary"
                            onClick={() => handleOpenEdit(plant)}
                            title="Edit facility parameters"
                          >
                            <Pencil size={11} />
                            <span>Edit</span>
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            className="pbi-btn-action-sm pbi-btn-action-danger"
                            onClick={() => handleDelete(plant)}
                            title="Delete facility (Admin authorization required)"
                          >
                            <Trash2 size={11} />
                            <span>Delete</span>
                          </button>
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
      {/* MODAL 1: CREATE PLANT */}
      {/* ============================================================== */}
      {showCreateModal && (
        <div className="pbi-modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="pbi-modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="pbi-modal-header">
              <div className="pbi-modal-title">
                <Building2 size={16} color="#10B981" />
                <span>Create Manufacturing Facility</span>
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
                  <label className="pbi-form-label" htmlFor="create-plant-name">Facility Name</label>
                  <input
                    id="create-plant-name"
                    type="text"
                    className="pbi-form-input"
                    placeholder="e.g. Hyderabad Advanced Plant 04"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="pbi-form-group">
                  <label className="pbi-form-label" htmlFor="create-plant-loc">Location / Industrial Zone</label>
                  <input
                    id="create-plant-loc"
                    type="text"
                    className="pbi-form-input"
                    placeholder="e.g. HITEC City, Hyderabad, TG"
                    value={createForm.location}
                    onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                  <input
                    type="checkbox"
                    id="create-plant-active"
                    checked={createForm.active}
                    onChange={(e) => setCreateForm({ ...createForm, active: e.target.checked })}
                  />
                  <label htmlFor="create-plant-active" style={{ fontSize: '12px', color: '#CBD5E1', cursor: 'pointer' }}>
                    Set initial operational state to Online
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
                  {actionLoading ? 'Creating...' : 'Create Facility'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: UPDATE / EDIT PLANT */}
      {/* ============================================================== */}
      {editingPlant && (
        <div className="pbi-modal-backdrop" onClick={() => setEditingPlant(null)}>
          <div className="pbi-modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="pbi-modal-header">
              <div className="pbi-modal-title">
                <Pencil size={16} color="#00BCF2" />
                <span>Update Facility: {editingPlant.name}</span>
              </div>
              <button
                type="button"
                className="pbi-modal-close"
                onClick={() => setEditingPlant(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="pbi-modal-body">
                <div className="pbi-form-group">
                  <label className="pbi-form-label" htmlFor="edit-plant-name">Facility Name</label>
                  <input
                    id="edit-plant-name"
                    type="text"
                    className="pbi-form-input"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="pbi-form-group">
                  <label className="pbi-form-label" htmlFor="edit-plant-loc">Location / Industrial Zone</label>
                  <input
                    id="edit-plant-loc"
                    type="text"
                    className="pbi-form-input"
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                  <input
                    type="checkbox"
                    id="edit-plant-active"
                    checked={editForm.active}
                    onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
                  />
                  <label htmlFor="edit-plant-active" style={{ fontSize: '12px', color: '#CBD5E1', cursor: 'pointer' }}>
                    Facility Status is Online (Active)
                  </label>
                </div>
              </div>

              <div className="pbi-modal-footer">
                <button
                  type="button"
                  className="pbi-ribbon-btn"
                  onClick={() => setEditingPlant(null)}
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
