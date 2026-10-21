import React, { useState, useEffect } from 'react';
import { plantsApi } from '../services/api';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2
} from 'lucide-react';

const PLANT_IMAGES = [
  '/images/plant_campus_exterior.jpg',
  '/images/smart_factory_hero.jpg',
  '/images/cnc_machine_showcase.jpg',
  '/images/plant_campus_exterior.jpg',
  '/images/smart_factory_hero.jpg'
];

export default function PlantsView() {
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlant, setEditingPlant] = useState(null);
  const [formData, setFormData] = useState({ name: '', location: '', active: true });
  const [saving, setSaving] = useState(false);

  const fetchPlants = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await plantsApi.getAll();
      setPlants(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Plant fetch error:', err);
      setError(err.message || 'Failed to load plants from database');
      setPlants([]);
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
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingPlant) {
        await plantsApi.update(editingPlant.id, formData);
      } else {
        await plantsApi.create(formData);
      }
      setModalOpen(false);
      await fetchPlants();
    } catch (err) {
      setError(err.message || 'Failed to save facility');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await plantsApi.delete(id);
      await fetchPlants();
    } catch (err) {
      setError(err.message || 'Failed to delete facility');
    }
  };

  const filtered = plants.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.location && p.location.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
            onClick={fetchPlants}
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

      {/* Top Action Bar matching reference image */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <div className="search-box">
          <Search size={14} />
          <input
            type="text"
            placeholder="Search plants..."
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
          <span>Add Plant</span>
        </button>
      </div>

      {loading ? (
        <div style={{ minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LoadingSpinner message="Querying Plant Facilities from Database..." />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No Plant Facilities Found"
          description={searchTerm ? `No facilities matched "${searchTerm}"` : "No plants registered in database."}
          actionLabel="Add First Plant"
          onAction={handleOpenCreate}
        />
      ) : (
        /* Real Plant Cards Grid */
        <div className="plants-grid">
          {filtered.map((plant, idx) => (
            <div key={plant.id} className="plant-card">
              {/* Image Wrap */}
              <div className="plant-card-img-wrap">
                <img 
                  src={PLANT_IMAGES[idx % PLANT_IMAGES.length]} 
                  alt={plant.name} 
                  className="plant-card-img" 
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(14, 20, 30, 0.95) 100%)' }} />
              </div>

              {/* Body */}
              <div className="plant-card-body">
                <h3 className="plant-card-title">{plant.name}</h3>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  {plant.location}
                </div>

                <div className="plant-card-metrics">
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Status: </span>
                    <strong style={{ color: plant.active !== false ? '#10B981' : '#EF4444', fontFamily: 'var(--font-mono)' }}>
                      {plant.active !== false ? 'Operational' : 'Offline'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Facility ID: </span>
                    <strong style={{ color: '#FFFFFF', fontFamily: 'var(--font-mono)' }}>#{plant.id}</strong>
                  </div>
                </div>

                {/* Status Badge & Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                  <span className={`badge ${plant.active !== false ? 'badge-online' : 'badge-maintenance'}`}>
                    <span className="badge-dot" />
                    <span>{plant.active !== false ? 'Online' : 'Offline'}</span>
                  </span>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPlant(plant);
                        setFormData({ name: plant.name, location: plant.location, active: plant.active !== false });
                        setModalOpen(true);
                      }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
                      title="Edit Facility"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(plant.id, plant.name)}
                      style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 4 }}
                      title="Delete Facility"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingPlant ? `Edit ${editingPlant.name}` : 'Add New Plant Facility'}
        >
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label className="form-label">Plant Facility Name</label>
              <input
                type="text"
                className="form-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Pune Manufacturing Plant"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Geographical Location</label>
              <input
                type="text"
                className="form-input"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="City, State, Country"
                required
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : editingPlant ? 'Update Facility' : 'Create Facility'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
