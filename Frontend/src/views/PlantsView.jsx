import React, { useState, useEffect } from 'react';
import { plantsApi, getOfflinePlantIds, setPlantOfflineState } from '../services/api';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2,
  Power
} from 'lucide-react';

const PLANT_IMAGES = [
  '/images/plant_campus_exterior.jpg',
  '/images/smart_factory_hero.jpg',
  '/images/cnc_machine_showcase.jpg',
  '/images/plant_campus_exterior.jpg',
  '/images/smart_factory_hero.jpg'
];

const SEED_PLANTS = [
  { id: 1, name: 'Pune Manufacturing Facility', location: 'Pune, Maharashtra, India', active: true },
  { id: 2, name: 'Bengaluru Precision Works', location: 'Bengaluru, Karnataka, India', active: true },
  { id: 3, name: 'Chennai Assembly Campus', location: 'Chennai, Tamil Nadu, India', active: false },
  { id: 4, name: 'Gujarat Advanced Tech Hub', location: 'Ahmedabad, Gujarat, India', active: true }
];

export default function PlantsView() {
  const [offlinePlantIds, setOfflinePlantIds] = useState(() => getOfflinePlantIds());
  const [plants, setPlants] = useState(() => {
    const offIds = getOfflinePlantIds().map(Number);
    return SEED_PLANTS.map(p => ({
      ...p,
      active: offIds.includes(Number(p.id)) ? false : (p.active !== false)
    }));
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlant, setEditingPlant] = useState(null);
  const [formData, setFormData] = useState({ name: '', location: '', active: true });
  const [saving, setSaving] = useState(false);

  const fetchPlants = async () => {
    setError('');
    try {
      const data = await plantsApi.getAll();
      if (Array.isArray(data) && data.length > 0) {
        const offIds = getOfflinePlantIds().map(Number);
        setPlants(data.map(p => ({
          ...p,
          active: offIds.includes(Number(p.id)) ? false : (p.active !== false)
        })));
      }
    } catch (err) {
      console.warn('Plant fetch error, using active plants state:', err);
    }
  };

  useEffect(() => {
    fetchPlants();
    const handleStatusChange = () => {
      setOfflinePlantIds(getOfflinePlantIds());
    };
    window.addEventListener('kynexis-plant-status-change', handleStatusChange);
    return () => window.removeEventListener('kynexis-plant-status-change', handleStatusChange);
  }, []);

  const handleOpenCreate = () => {
    setEditingPlant(null);
    setFormData({ name: '', location: '', active: true });
    setModalOpen(true);
  };

  const handleToggleStatus = async (plant) => {
    const currentlyOnline = plant.active !== false && !offlinePlantIds.includes(Number(plant.id));
    const newActive = !currentlyOnline;
    // Broadcast offline status change so machines & sensors immediately cascade
    setPlantOfflineState(plant.id, !newActive);
    setOfflinePlantIds(getOfflinePlantIds());

    // Optimistic UI update immediately
    setPlants(prev => prev.map(p => p.id === plant.id ? { ...p, active: newActive } : p));
    try {
      await plantsApi.update(plant.id, {
        name: plant.name,
        location: plant.location,
        active: newActive
      });
    } catch (err) {
      console.warn('Backend update failed, keeping optimistic status:', err);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingPlant) {
        setPlantOfflineState(editingPlant.id, !formData.active);
        await plantsApi.update(editingPlant.id, formData);
        setPlants(prev => prev.map(p => p.id === editingPlant.id ? { ...p, ...formData } : p));
      } else {
        const res = await plantsApi.create(formData);
        const newPlant = res?.id ? res : { id: Date.now(), ...formData };
        if (formData.active === false) {
          setPlantOfflineState(newPlant.id, true);
        }
        setPlants(prev => [newPlant, ...prev]);
      }
      setOfflinePlantIds(getOfflinePlantIds());
      setModalOpen(false);
    } catch (err) {
      console.warn('Save failed, updating locally:', err);
      if (editingPlant) {
        setPlantOfflineState(editingPlant.id, !formData.active);
        setPlants(prev => prev.map(p => p.id === editingPlant.id ? { ...p, ...formData } : p));
      } else {
        const newId = Date.now();
        if (formData.active === false) {
          setPlantOfflineState(newId, true);
        }
        setPlants(prev => [{ id: newId, ...formData }, ...prev]);
      }
      setOfflinePlantIds(getOfflinePlantIds());
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await plantsApi.delete(id);
      setPlants(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.warn('Delete failed, removing locally:', err);
      setPlants(prev => prev.filter(p => p.id !== id));
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

      {/* Top Action Bar with Guaranteed Search Padding */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <div className="search-box" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)', pointerEvents: 'none', zIndex: 2 }} />
          <input
            type="text"
            placeholder="Search plants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '38px', width: '240px' }}
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
          {filtered.map((plant, idx) => {
            const isOnline = plant.active !== false && !offlinePlantIds.includes(Number(plant.id));
            return (
              <div key={plant.id} className="plant-card">
                {/* Image Wrap - Clean, no overlay badge */}
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                    <div>
                      <h3 className="plant-card-title" style={{ margin: 0 }}>{plant.name}</h3>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {plant.location}
                      </div>
                    </div>
                    <span className={`badge ${isOnline ? 'badge-online' : 'badge-offline'}`} style={{ flexShrink: 0 }}>
                      <span className="badge-dot" />
                      <span>{isOnline ? 'Online' : 'Offline'}</span>
                    </span>
                  </div>

                  <div className="plant-card-metrics">
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Status: </span>
                      <strong style={{ color: isOnline ? '#10B981' : '#EF4444', fontFamily: 'var(--font-mono)' }}>
                        {isOnline ? 'Operational' : 'Offline (Standby)'}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Facility ID: </span>
                      <strong style={{ color: '#FFFFFF', fontFamily: 'var(--font-mono)' }}>#{plant.id}</strong>
                    </div>
                  </div>

                  {/* Status Badge & Actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', marginTop: '8px' }}>
                    {/* Online / Offline Quick Toggle Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(plant)}
                      title={isOnline ? 'Click to take plant Offline' : 'Click to bring plant Online'}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        background: isOnline ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.14)',
                        border: `1px solid ${isOnline ? 'rgba(239, 68, 68, 0.35)' : 'rgba(16, 185, 129, 0.4)'}`,
                        color: isOnline ? '#EF4444' : '#10B981',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: 600,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Power size={11} />
                      <span>{isOnline ? 'Turn Offline' : 'Bring Online'}</span>
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPlant(plant);
                          setFormData({ name: plant.name, location: plant.location, active: isOnline });
                          setModalOpen(true);
                        }}
                        style={{ 
                          background: 'rgba(255, 255, 255, 0.05)', 
                          border: '1px solid var(--border)', 
                          color: 'var(--text-secondary)', 
                          cursor: 'pointer', 
                          padding: '5px 8px',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px'
                        }}
                        title="Edit Facility"
                      >
                        <Edit2 size={12} />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(plant.id, plant.name)}
                        style={{ 
                          background: 'rgba(239, 68, 68, 0.1)', 
                          border: '1px solid rgba(239, 68, 68, 0.3)', 
                          color: '#EF4444', 
                          cursor: 'pointer', 
                          padding: '5px 8px',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title="Delete Facility"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal with Operational Status Toggle */}
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

            {/* Operational Status Toggle in Modal */}
            <div className="form-group" style={{ 
              marginTop: '14px', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '10px 12px', 
              background: 'var(--surface-elevated)', 
              borderRadius: '6px', 
              border: '1px solid var(--border-subtle)' 
            }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>Operational Status</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Set facility as Online (Active) or Offline (Maintenance/Standby)</div>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, active: !formData.active })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  borderRadius: '20px',
                  background: formData.active ? 'rgba(16, 185, 129, 0.18)' : 'rgba(239, 68, 68, 0.18)',
                  border: `1px solid ${formData.active ? '#10B981' : '#EF4444'}`,
                  color: formData.active ? '#10B981' : '#EF4444',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 700
                }}
              >
                <Power size={12} />
                <span>{formData.active ? 'Online' : 'Offline'}</span>
              </button>
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
