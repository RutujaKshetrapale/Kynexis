import React, { useState, useEffect } from 'react';
import { plantsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { Factory, Plus, Search, Edit2, Trash2, MapPin, CheckCircle, XCircle } from 'lucide-react';

export default function PlantsView() {
  const { hasRole } = useAuth();
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState('ALL');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlant, setEditingPlant] = useState(null);
  const [formData, setFormData] = useState({ name: '', location: '', active: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchPlants = async () => {
    try {
      const data = await plantsApi.getAll();
      setPlants(data || []);
    } catch (err) {
      console.error('Failed to load plants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlants();
  }, []);

  const handleOpenCreate = () => {
    setEditingPlant(null);
    setFormData({ name: '', location: '', active: true });
    setError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (plant) => {
    setEditingPlant(plant);
    setFormData({ name: plant.name, location: plant.location, active: plant.active });
    setError('');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.location.trim()) {
      setError('Both plant name and location are required.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (editingPlant) {
        await plantsApi.update(editingPlant.id, formData);
      } else {
        await plantsApi.create(formData);
      }
      setModalOpen(false);
      await fetchPlants();
    } catch (err) {
      setError(err.message || 'Operation failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Are you sure you want to delete Plant #${id}? This action requires ADMIN privileges.`)) {
      return;
    }
    try {
      await plantsApi.delete(id);
      await fetchPlants();
    } catch (err) {
      alert(`Deletion failed: ${err.message}`);
    }
  };

  const filteredPlants = plants.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.location.toLowerCase().includes(searchTerm.toLowerCase());
    if (filterActive === 'ACTIVE') return matchesSearch && p.active;
    if (filterActive === 'INACTIVE') return matchesSearch && !p.active;
    return matchesSearch;
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Factory style={{ color: 'var(--neon-cyan)' }} />
            Manufacturing Plants & Facilities
          </h1>
          <p className="page-description">
            Global production network management, facility geolocation, and operational statuses
          </p>
        </div>
        {hasRole(['ADMIN', 'ENGINEER']) && (
          <button type="button" className="btn btn-primary" onClick={handleOpenCreate}>
            <Plus size={16} />
            Register New Plant
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
            placeholder="Search plant by name or location (e.g. Pune, Munich, Detroit)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['ALL', 'ACTIVE', 'INACTIVE'].map((status) => (
            <button
              key={status}
              type="button"
              className={`btn btn-sm ${filterActive === status ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilterActive(status)}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Retrieving manufacturing facilities from Plant Service (:8082)..." />
      ) : filteredPlants.length === 0 ? (
        <EmptyState 
          icon={Factory}
          title="No Manufacturing Plants Found"
          description="No plants match your search criteria. Try modifying your search or register a new plant."
          actionLabel={hasRole(['ADMIN', 'ENGINEER']) ? 'Register First Plant' : undefined}
          onAction={handleOpenCreate}
        />
      ) : (
        <div className="table-wrap">
          <table className="industrial-table">
            <thead>
              <tr>
                <th>Plant ID</th>
                <th>Facility Name</th>
                <th>Location / Hub</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlants.map((plant) => (
                <tr key={plant.id}>
                  <td style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: 'var(--neon-cyan)' }}>
                    PLT-00{plant.id}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{plant.name}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                      <MapPin size={14} style={{ color: 'var(--neon-blue)', flexShrink: 0 }} />
                      <span>{plant.location}</span>
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={plant.active ? 'ACTIVE' : 'INACTIVE'} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                      {hasRole(['ADMIN', 'ENGINEER']) && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleOpenEdit(plant)}
                          title="Edit Plant"
                        >
                          <Edit2 size={14} />
                        </button>
                      )}
                      {hasRole('ADMIN') && (
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(plant.id)}
                          title="Delete Plant (Admin Only)"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Plant Modal (Create / Edit) */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingPlant ? `Edit Plant: ${editingPlant.name}` : 'Register New Manufacturing Plant'}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editingPlant ? 'Update Plant' : 'Create Facility'}
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
            <label className="form-label" htmlFor="plant-name">Plant / Facility Name</label>
            <input
              id="plant-name"
              type="text"
              className="form-input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Pune Automotive Hub"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="plant-location">Location / Region</label>
            <input
              id="plant-location"
              type="text"
              className="form-input"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g. Pune, Maharashtra, India"
              required
            />
          </div>

          <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem' }}>
            <div>
              <div className="form-label">Operational Status</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Enable or disable live telemetry routing for this facility
              </div>
            </div>
            <input
              type="checkbox"
              style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--neon-cyan)' }}
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
