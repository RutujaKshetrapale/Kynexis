import React, { useState, useEffect } from 'react';
import { machinesApi, plantsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { 
  Cpu, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Sparkles, 
  Factory, 
  Thermometer, 
  Gauge, 
  Zap, 
  Activity 
} from 'lucide-react';

export default function MachinesView() {
  const { hasRole } = useAuth();
  const [machines, setMachines] = useState([]);
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Machine Form Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState(null);
  const [formData, setFormData] = useState({ name: '', type: '', status: 'ACTIVE', plantId: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Diagnostics Modal State
  const [healthModalOpen, setHealthModalOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [healthData, setHealthData] = useState(null);
  const [assessmentData, setAssessmentData] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(false);

  const fetchData = async () => {
    try {
      const [machList, plantList] = await Promise.all([
        machinesApi.getAll(),
        plantsApi.getAll()
      ]);
      setMachines(machList || []);
      setPlants(plantList || []);
    } catch (err) {
      console.error('Failed to load machine data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreate = () => {
    setEditingMachine(null);
    setFormData({
      name: '',
      type: '',
      status: 'ACTIVE',
      plantId: plants.length > 0 ? String(plants[0].id) : '1'
    });
    setError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (machine) => {
    setEditingMachine(machine);
    setFormData({
      name: machine.name,
      type: machine.type,
      status: machine.status,
      plantId: String(machine.plantId || (machine.plant ? machine.plant.id : '1'))
    });
    setError('');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.type.trim() || !formData.plantId) {
      setError('Machine name, type, and plant selection are required.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        name: formData.name,
        type: formData.type,
        status: formData.status,
        plantId: Number(formData.plantId)
      };

      if (editingMachine) {
        await machinesApi.update(editingMachine.id, payload);
      } else {
        await machinesApi.create(payload);
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
    if (!window.confirm(`Delete Machine #${id}? This requires ADMIN privileges.`)) return;
    try {
      await machinesApi.delete(id);
      await fetchData();
    } catch (err) {
      alert(`Deletion failed: ${err.message}`);
    }
  };

  const handleOpenDiagnostics = async (machine) => {
    setSelectedMachine(machine);
    setHealthModalOpen(true);
    setLoadingHealth(true);
    try {
      const [h, a] = await Promise.all([
        machinesApi.getHealth(machine.id),
        machinesApi.getAssessment(machine.id)
      ]);
      setHealthData(h);
      setAssessmentData(a);
    } catch (err) {
      console.error('Health fetch failed:', err);
    } finally {
      setLoadingHealth(false);
    }
  };

  const filteredMachines = machines.filter((m) => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          m.type.toLowerCase().includes(searchTerm.toLowerCase());
    if (statusFilter !== 'ALL') {
      return matchesSearch && (m.status || '').toUpperCase() === statusFilter;
    }
    return matchesSearch;
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Cpu style={{ color: 'var(--neon-purple)' }} />
            Machine Fleet & Edge Assets
          </h1>
          <p className="page-description">
            Industrial machine inventory, operational telemetry status, and AI predictive health diagnostics
          </p>
        </div>
        {hasRole(['ADMIN', 'ENGINEER']) && (
          <button type="button" className="btn btn-primary" onClick={handleOpenCreate}>
            <Plus size={16} />
            Register Machine
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
            placeholder="Search machine by name or model (e.g. CNC Mill, Robotic Welder)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['ALL', 'ACTIVE', 'MAINTENANCE', 'INACTIVE'].map((status) => (
            <button
              key={status}
              type="button"
              className={`btn btn-sm ${statusFilter === status ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setStatusFilter(status)}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Querying Machine Fleet from Machine Service (:8088)..." />
      ) : filteredMachines.length === 0 ? (
        <EmptyState
          icon={Cpu}
          title="No Machines Found"
          description="No industrial equipment matches your filter criteria."
          actionLabel={hasRole(['ADMIN', 'ENGINEER']) ? 'Register First Machine' : undefined}
          onAction={handleOpenCreate}
        />
      ) : (
        <div className="table-wrap">
          <table className="industrial-table">
            <thead>
              <tr>
                <th>Machine ID</th>
                <th>Asset Name</th>
                <th>Equipment Type</th>
                <th>Assigned Facility</th>
                <th>Operating Status</th>
                <th style={{ textAlign: 'right' }}>Diagnostics & Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMachines.map((machine) => {
                const plant = plants.find(p => p.id === machine.plantId) || machine.plant;
                return (
                  <tr key={machine.id}>
                    <td style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: 'var(--neon-purple)' }}>
                      MCH-00{machine.id}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{machine.name}</div>
                    </td>
                    <td>
                      <span style={{ color: 'var(--text-secondary)' }}>{machine.type}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                        <Factory size={13} style={{ color: 'var(--neon-cyan)' }} />
                        <span>{plant ? plant.name : `Plant #${machine.plantId}`}</span>
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={machine.status} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ borderColor: 'rgba(0, 242, 254, 0.3)', color: 'var(--neon-cyan)' }}
                          onClick={() => handleOpenDiagnostics(machine)}
                          title="View Predictive AI Health Diagnostics"
                        >
                          <Sparkles size={14} />
                          <span>AI Health</span>
                        </button>

                        {hasRole(['ADMIN', 'ENGINEER']) && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleOpenEdit(machine)}
                            title="Edit Machine Details"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}

                        {hasRole('ADMIN') && (
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(machine.id)}
                            title="Delete Machine (Admin Only)"
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

      {/* Machine Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingMachine ? `Edit Asset: ${editingMachine.name}` : 'Register New Industrial Machine'}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editingMachine ? 'Update Machine' : 'Create Asset'}
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
            <label className="form-label" htmlFor="machine-name">Machine / Asset Name</label>
            <input
              id="machine-name"
              type="text"
              className="form-input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. CNC Milling Station Alpha"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="machine-type">Equipment Type</label>
            <input
              id="machine-type"
              type="text"
              className="form-input"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              placeholder="e.g. CNC Mill, Robotic Welder, Stamping Press"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="machine-status">Initial Operating Status</label>
            <select
              id="machine-status"
              className="form-select"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="ACTIVE">ACTIVE (Running in Production)</option>
              <option value="MAINTENANCE">MAINTENANCE (Servicing Required)</option>
              <option value="INACTIVE">INACTIVE (Standby)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="machine-plant">Assigned Manufacturing Plant</label>
            <select
              id="machine-plant"
              className="form-select"
              value={formData.plantId}
              onChange={(e) => setFormData({ ...formData, plantId: e.target.value })}
              required
            >
              {plants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.location})
                </option>
              ))}
            </select>
          </div>
        </form>
      </Modal>

      {/* AI Health & Predictive Diagnostics Modal */}
      <Modal
        isOpen={healthModalOpen}
        onClose={() => setHealthModalOpen(false)}
        title={selectedMachine ? `AI Predictive Health: ${selectedMachine.name}` : 'Diagnostics'}
        maxWidth="680px"
        footer={
          <button type="button" className="btn btn-primary" onClick={() => setHealthModalOpen(false)}>
            Close Diagnostics
          </button>
        }
      >
        {loadingHealth ? (
          <LoadingSpinner message="Aggregating predictive models from Maintenance Service (:8085)..." />
        ) : healthData ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Health Score Header Card */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.25rem',
              borderRadius: 'var(--radius-lg)',
              background: healthData.healthState === 'CRITICAL' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.1)',
              border: `1px solid ${healthData.healthState === 'CRITICAL' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700 }}>
                  Assessed Health State
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.2rem' }}>
                  <StatusBadge status={healthData.healthState} />
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  Risk Category: <strong style={{ color: 'var(--text-primary)' }}>{assessmentData?.riskCategory || 'NORMAL'}</strong>
                </div>
              </div>

              <div style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Latest Telemetry</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--neon-cyan)', marginTop: '0.2rem' }}>
                  {new Date(healthData.latestTelemetryTimestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>

            {/* 4 Sensor Telemetry Readouts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
              <div style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                <Thermometer size={18} style={{ color: '#f87171', margin: '0 auto 0.25rem' }} />
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Temperature</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: healthData.temperature > 80 ? '#f87171' : 'var(--text-primary)' }}>
                  {healthData.temperature}°C
                </div>
              </div>

              <div style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                <Activity size={18} style={{ color: '#fbbf24', margin: '0 auto 0.25rem' }} />
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Vibration</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: healthData.vibration > 4 ? '#fbbf24' : 'var(--text-primary)' }}>
                  {healthData.vibration} mm/s
                </div>
              </div>

              <div style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                <Gauge size={18} style={{ color: 'var(--neon-blue)', margin: '0 auto 0.25rem' }} />
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Pressure</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                  {healthData.pressure} PSI
                </div>
              </div>

              <div style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                <Zap size={18} style={{ color: 'var(--neon-cyan)', margin: '0 auto 0.25rem' }} />
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Tachometer</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: 'var(--neon-cyan)' }}>
                  {healthData.rpm} RPM
                </div>
              </div>
            </div>

            {/* AI Predictive Findings & Recommendations */}
            <div style={{
              padding: '1.25rem',
              background: 'rgba(14, 20, 32, 0.9)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--neon-cyan)', fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                <Sparkles size={16} />
                AI Predictive Engine Findings
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                {assessmentData?.explanation || 'All operational harmonics match standard equipment baseline tolerances.'}
              </p>

              {assessmentData?.recommendedAction && (
                <div style={{
                  padding: '0.75rem 1rem',
                  background: 'rgba(0, 242, 254, 0.08)',
                  borderRadius: 'var(--radius-md)',
                  borderLeft: '3px solid var(--neon-cyan)',
                  fontSize: '0.825rem',
                  color: 'var(--text-primary)'
                }}>
                  <strong>Recommended Action:</strong> {assessmentData.recommendedAction}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
