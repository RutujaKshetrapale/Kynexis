import React, { useState, useEffect } from 'react';
import { machinesApi, plantsApi } from '../services/api';
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
  Cpu
} from 'lucide-react';

export default function MachinesView({ selectedPlant }) {
  const [machines, setMachines] = useState([]);
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [plantFilter, setPlantFilter] = useState(selectedPlant || 'ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showPlantMenu, setShowPlantMenu] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState(null);
  const [formData, setFormData] = useState({ name: '', type: 'CNC', status: 'RUNNING', plantId: 1 });
  const [saving, setSaving] = useState(false);

  const fetchMachines = async () => {
    setLoading(true);
    setError('');
    try {
      const [machData, plantData] = await Promise.all([
        machinesApi.getAll(),
        plantsApi.getAll()
      ]);
      setMachines(Array.isArray(machData) ? machData : []);
      setPlants(Array.isArray(plantData) ? plantData : []);
    } catch (err) {
      console.warn('Machine fetch error:', err);
      setError(err.message || 'Failed to load machines from database');
      setMachines([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMachines();
  }, []);

  const handleOpenCreate = () => {
    setEditingMachine(null);
    setFormData({ name: '', type: 'CNC', status: 'RUNNING', plantId: plants[0]?.id || 1 });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingMachine) {
        await machinesApi.update(editingMachine.id, formData);
      } else {
        await machinesApi.create(formData);
      }
      setModalOpen(false);
      await fetchMachines();
    } catch (err) {
      setError(err.message || 'Failed to save machine');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete machine "${name}"?`)) return;
    try {
      await machinesApi.delete(id);
      await fetchMachines();
    } catch (err) {
      setError(err.message || 'Failed to delete machine');
    }
  };

  const filtered = machines.filter(m => {
    const matchSearch = (m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                        `#00${m.id}`.includes(searchTerm) ||
                        (m.type || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchStatus = true;
    if (statusFilter !== 'ALL') {
      const s = (m.status || '').toUpperCase();
      if (statusFilter === 'RUNNING') matchStatus = s === 'RUNNING' || s === 'ACTIVE';
      else if (statusFilter === 'IDLE') matchStatus = s === 'IDLE' || s === 'STOPPED';
      else if (statusFilter === 'MAINTENANCE') matchStatus = s === 'MAINTENANCE';
    }

    const matchPlant = plantFilter === 'ALL' || String(m.plantId) === String(plantFilter);
    return matchSearch && matchStatus && matchPlant;
  });

  const getStatusBadge = (status) => {
    const s = (status || '').toUpperCase();
    if (s === 'RUNNING' || s === 'ACTIVE') {
      return (
        <span className="badge badge-online">
          <span className="badge-dot" />
          <span>Running</span>
        </span>
      );
    }
    if (s === 'MAINTENANCE') {
      return (
        <span className="badge badge-maintenance">
          <span className="badge-dot" />
          <span>Maintenance</span>
        </span>
      );
    }
    return (
      <span className="badge" style={{ background: 'rgba(100, 116, 139, 0.12)', color: '#94A3B8', border: '1px solid rgba(100, 116, 139, 0.3)' }}>
        <span className="badge-dot" style={{ background: '#94A3B8' }} />
        <span>Idle</span>
      </span>
    );
  };

  const getPlantName = (plantId) => {
    const found = plants.find(p => String(p.id) === String(plantId));
    return found ? found.name : `Plant #${plantId}`;
  };

  return (
    <div className="page-container">
      {/* Error Alert */}
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
            onClick={fetchMachines}
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

      {/* Top Filter Bar matching reference */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {/* Plant Filter Dropdown */}
        <div style={{ position: 'relative' }}>
          <button 
            type="button" 
            className="filter-dropdown-btn"
            onClick={() => { setShowPlantMenu(!showPlantMenu); setShowStatusMenu(false); }}
          >
            <span>{plantFilter === 'ALL' ? 'All Facilities' : getPlantName(plantFilter)}</span>
            <ChevronDown size={12} style={{ color: 'var(--text-muted)' }} />
          </button>

          {showPlantMenu && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              right: 0,
              width: '210px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              boxShadow: 'var(--shadow-dropdown)',
              padding: '6px',
              zIndex: 100
            }}>
              <button
                type="button"
                onClick={() => { setPlantFilter('ALL'); setShowPlantMenu(false); }}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  background: plantFilter === 'ALL' ? 'var(--surface-elevated)' : 'transparent',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '11.5px',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                All Facilities
              </button>
              {plants.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { setPlantFilter(String(p.id)); setShowPlantMenu(false); }}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    background: plantFilter === String(p.id) ? 'var(--surface-elevated)' : 'transparent',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '11.5px',
                    color: plantFilter === String(p.id) ? '#FFFFFF' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Status Filter Dropdown */}
        <div style={{ position: 'relative' }}>
          <button 
            type="button" 
            className="filter-dropdown-btn"
            onClick={() => { setShowStatusMenu(!showStatusMenu); setShowPlantMenu(false); }}
          >
            <span>Status: {statusFilter}</span>
            <ChevronDown size={12} style={{ color: 'var(--text-muted)' }} />
          </button>

          {showStatusMenu && (
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
              {['ALL', 'RUNNING', 'IDLE', 'MAINTENANCE'].map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => { setStatusFilter(st); setShowStatusMenu(false); }}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    background: statusFilter === st ? 'var(--surface-elevated)' : 'transparent',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '11.5px',
                    color: statusFilter === st ? '#FFFFFF' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  {st}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="search-box">
          <Search size={14} />
          <input
            type="text"
            placeholder="Search machines..."
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
          <span>Add Machine</span>
        </button>
      </div>

      {/* Machine Data Table */}
      {loading ? (
        <div style={{ minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LoadingSpinner message="Querying Machines from Database..." />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No Machines Found"
          description={searchTerm ? `No machines matched "${searchTerm}"` : "No machines registered in database."}
          actionLabel="Register Machine"
          onAction={handleOpenCreate}
        />
      ) : (
        <div className="table-container">
          <table className="kyn-table">
            <thead>
              <tr>
                <th>Machine ID</th>
                <th>Name</th>
                <th>Type</th>
                <th>Facility</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent)' }}>
                    {`#00${m.id}`}
                  </td>
                  <td style={{ color: '#FFFFFF', fontWeight: 500 }}>
                    {m.name}
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {m.type || 'CNC'}
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {getPlantName(m.plantId)}
                  </td>
                  <td>
                    {getStatusBadge(m.status)}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingMachine(m);
                          setFormData({ name: m.name, type: m.type || 'CNC', status: m.status || 'RUNNING', plantId: m.plantId || 1 });
                          setModalOpen(true);
                        }}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 3 }}
                        title="Edit Machine"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(m.id, m.name)}
                        style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 3 }}
                        title="Delete Machine"
                      >
                        <Trash2 size={13} />
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
          title={editingMachine ? `Edit ${editingMachine.name}` : 'Register New Machine'}
        >
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label className="form-label">Machine Name</label>
              <input
                type="text"
                className="form-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. CNC Machine 04"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Machine Type</label>
              <select
                className="form-input"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="CNC">CNC Milling Center</option>
                <option value="ROBOT">Robotic Arm</option>
                <option value="ASSEMBLY">Assembly Line</option>
                <option value="LATHE">Lathe Station</option>
                <option value="PRESS">Industrial Press</option>
                <option value="WELDING">Welding Cell</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Plant Facility</label>
              <select
                className="form-input"
                value={formData.plantId}
                onChange={(e) => setFormData({ ...formData, plantId: Number(e.target.value) })}
              >
                {plants.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Operational Status</label>
              <select
                className="form-input"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="RUNNING">RUNNING (Active)</option>
                <option value="IDLE">IDLE (Standby)</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : editingMachine ? 'Update Machine' : 'Register Machine'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
