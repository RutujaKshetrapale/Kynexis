import React, { useState, useEffect } from 'react';
import { maintenanceApi, machinesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { 
  Wrench, 
  Plus, 
  Calendar, 
  UserCheck, 
  CheckCircle, 
  Sparkles, 
  Cpu, 
  Edit2, 
  Trash2 
} from 'lucide-react';

export default function MaintenanceView() {
  const { hasRole } = useAuth();
  const [maintenance, setMaintenance] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Create / Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    machineId: '1',
    type: 'PREVENTIVE',
    description: '',
    scheduledDate: new Date().toISOString().slice(0, 10),
    status: 'SCHEDULED',
    technician: 'Robert Vance'
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      const [maintList, machList] = await Promise.all([
        maintenanceApi.getAll(),
        machinesApi.getAll()
      ]);
      setMaintenance(Array.isArray(maintList) ? maintList : []);
      setMachines(machList || []);
    } catch (err) {
      console.error('Failed to load maintenance records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      machineId: machines[0]?.id ? String(machines[0].id) : '1',
      type: 'PREVENTIVE',
      description: '',
      scheduledDate: new Date().toISOString().slice(0, 10),
      status: 'SCHEDULED',
      technician: 'Sarah Jenkins'
    });
    setError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      machineId: String(item.machineId),
      type: item.type,
      description: item.description,
      scheduledDate: item.scheduledDate || new Date().toISOString().slice(0, 10),
      status: item.status,
      technician: item.technician
    });
    setError('');
    setModalOpen(true);
  };

  const handleMarkComplete = async (item) => {
    try {
      await maintenanceApi.update(item.id, {
        ...item,
        status: 'COMPLETED',
        completedDate: new Date().toISOString().slice(0, 10)
      });
      await fetchData();
    } catch (err) {
      alert(`Update failed: ${err.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Delete Work Order #${id}? Admin privileges required.`)) return;
    try {
      await maintenanceApi.delete(id);
      await fetchData();
    } catch (err) {
      alert(`Deletion failed: ${err.message}`);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.description.trim() || !formData.technician.trim()) {
      setError('Description and technician name are required.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        machineId: Number(formData.machineId),
        type: formData.type,
        description: formData.description,
        scheduledDate: formData.scheduledDate,
        status: formData.status,
        technician: formData.technician,
        completedDate: formData.status === 'COMPLETED' ? new Date().toISOString().slice(0, 10) : null
      };

      if (editingItem) {
        await maintenanceApi.update(editingItem.id, payload);
      } else {
        await maintenanceApi.create(payload);
      }
      setModalOpen(false);
      await fetchData();
    } catch (err) {
      setError(err.message || 'Operation failed.');
    } finally {
      setSaving(false);
    }
  };

  const filteredMaintenance = maintenance.filter((m) => {
    if (statusFilter !== 'ALL') {
      return (m.status || '').toUpperCase() === statusFilter.toUpperCase();
    }
    return true;
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Wrench style={{ color: 'var(--neon-purple)' }} />
            Preventive Maintenance & Work Orders
          </h1>
          <p className="page-description">
            Predictive servicing schedules, AI-driven wear assessments, and technician work logs
          </p>
        </div>
        {hasRole(['ADMIN', 'ENGINEER']) && (
          <button type="button" className="btn btn-primary" onClick={handleOpenCreate}>
            <Plus size={16} />
            Schedule Work Order
          </button>
        )}
      </div>

      {/* AI Predictive Insight Banner */}
      <div style={{
        padding: '1.25rem 1.5rem',
        borderRadius: 'var(--radius-lg)',
        background: 'linear-gradient(90deg, rgba(168, 85, 247, 0.15) 0%, rgba(0, 242, 254, 0.08) 100%)',
        border: '1px solid rgba(168, 85, 247, 0.3)',
        marginBottom: '1.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 'var(--radius-md)',
            background: 'rgba(168, 85, 247, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--neon-purple)'
          }}>
            <Sparkles size={22} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#e9d5ff' }}>
              Predictive AI Insight: CNC Milling Station Alpha (MCH-001)
            </div>
            <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Model detected 24% elevated bearing friction following thermal spike. Replacement recommended within 12 operating hours.
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="badge badge-high_risk">AI RISK: HIGH</span>
        </div>
      </div>

      {/* Status Filter Bar */}
      <div className="filter-bar">
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['ALL', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED'].map((s) => (
            <button
              key={s}
              type="button"
              className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setStatusFilter(s)}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Retrieving work orders from Maintenance Service (:8085)..." />
      ) : filteredMaintenance.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="No Work Orders Found"
          description="No maintenance records match your active filter."
          actionLabel={hasRole(['ADMIN', 'ENGINEER']) ? 'Schedule First Order' : undefined}
          onAction={handleOpenCreate}
        />
      ) : (
        <div className="table-wrap">
          <table className="industrial-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Target Asset</th>
                <th>Maintenance Type</th>
                <th>Task Description</th>
                <th>Scheduled Date</th>
                <th>Assigned Field Tech</th>
                <th>Work Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMaintenance.map((item) => {
                const machine = machines.find(m => m.id === item.machineId);
                return (
                  <tr key={item.id}>
                    <td style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: 'var(--neon-purple)' }}>
                      MNT-00{item.id}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                        <Cpu size={14} style={{ color: 'var(--neon-cyan)' }} />
                        <span>{machine ? machine.name : `Machine #${item.machineId}`}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-idle" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        {item.type}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem', maxWidth: 320, color: 'var(--text-primary)' }}>
                        {item.description}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}>
                        <Calendar size={13} style={{ color: 'var(--neon-blue)' }} />
                        {item.scheduledDate}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
                        <UserCheck size={14} style={{ color: 'var(--neon-emerald)' }} />
                        <span>{item.technician}</span>
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        {item.status !== 'COMPLETED' && hasRole(['ADMIN', 'ENGINEER']) && (
                          <button
                            type="button"
                            className="btn btn-success btn-sm"
                            onClick={() => handleMarkComplete(item)}
                            title="Mark Work Order Completed"
                          >
                            <CheckCircle size={14} />
                            <span>Complete</span>
                          </button>
                        )}
                        {hasRole(['ADMIN', 'ENGINEER']) && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleOpenEdit(item)}
                            title="Edit Work Order"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                        {hasRole('ADMIN') && (
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(item.id)}
                            title="Delete Order (Admin Only)"
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

      {/* Work Order Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? `Edit Work Order: MNT-00${editingItem.id}` : 'Schedule New Maintenance Order'}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editingItem ? 'Update Order' : 'Schedule Order'}
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
            <label className="form-label" htmlFor="maint-machine">Target Equipment</label>
            <select
              id="maint-machine"
              className="form-select"
              value={formData.machineId}
              onChange={(e) => setFormData({ ...formData, machineId: e.target.value })}
            >
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} (#{m.id})
                </option>
              ))}
            </select>
          </div>

          <div className="grid-cols-2" style={{ gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="maint-type">Maintenance Protocol</label>
              <select
                id="maint-type"
                className="form-select"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="PREVENTIVE">PREVENTIVE (Routine Service)</option>
                <option value="CORRECTIVE">CORRECTIVE (Incident Repair)</option>
                <option value="PREDICTIVE">PREDICTIVE (AI Flagged)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="maint-status">Order Status</label>
              <select
                id="maint-status"
                className="form-select"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="SCHEDULED">SCHEDULED</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="COMPLETED">COMPLETED</option>
              </select>
            </div>
          </div>

          <div className="grid-cols-2" style={{ gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="maint-date">Scheduled Service Date</label>
              <input
                id="maint-date"
                type="date"
                className="form-input"
                value={formData.scheduledDate}
                onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="maint-tech">Assigned Certified Technician</label>
              <input
                id="maint-tech"
                type="text"
                className="form-input"
                value={formData.technician}
                onChange={(e) => setFormData({ ...formData, technician: e.target.value })}
                placeholder="e.g. Sarah Jenkins"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="maint-desc">Service Instructions & Work Scope</label>
            <textarea
              id="maint-desc"
              className="form-textarea"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g. Quarterly hydraulic fluid change and valve seal check..."
              required
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
