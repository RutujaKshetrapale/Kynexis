import React, { useState, useEffect } from 'react';
import { maintenanceApi, machinesApi } from '../services/api';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { 
  Plus
} from 'lucide-react';

export default function MaintenanceView() {
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED'
  const [maintenanceList, setMaintenanceList] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    machineId: 1, 
    type: 'PREVENTIVE', 
    description: '', 
    scheduledDate: new Date().toISOString().slice(0, 10), 
    cost: 150.0 
  });
  const [saving, setSaving] = useState(false);

  const fetchMaintenance = async () => {
    setLoading(true);
    setError('');
    try {
      const [maintData, machData] = await Promise.all([
        maintenanceApi.getAll(),
        machinesApi.getAll()
      ]);
      setMaintenanceList(Array.isArray(maintData) ? maintData : []);
      setMachines(Array.isArray(machData) ? machData : []);
    } catch (err) {
      console.warn('Maintenance fetch error:', err);
      setError(err.message || 'Failed to query maintenance records from database');
      setMaintenanceList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaintenance();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await maintenanceApi.create(formData);
      setModalOpen(false);
      await fetchMaintenance();
    } catch (err) {
      setError(err.message || 'Failed to create maintenance work order');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (order, nextStatus) => {
    try {
      await maintenanceApi.update(order.id, {
        ...order,
        status: nextStatus
      });
      await fetchMaintenance();
    } catch (err) {
      setError(err.message || 'Failed to update work order status');
    }
  };

  const getMachineName = (id) => {
    const found = machines.find(m => Number(m.id) === Number(id));
    return found ? found.name : `Machine #${id}`;
  };

  const scheduledCount = maintenanceList.filter(m => (m.status || '').toUpperCase() === 'SCHEDULED' || (m.status || '').toUpperCase() === 'OPEN').length;
  const inProgressCount = maintenanceList.filter(m => (m.status || '').toUpperCase() === 'IN_PROGRESS').length;
  const completedCount = maintenanceList.filter(m => (m.status || '').toUpperCase() === 'COMPLETED').length;

  const filtered = maintenanceList.filter(m => {
    const s = (m.status || '').toUpperCase();
    if (activeTab === 'SCHEDULED') return s === 'SCHEDULED' || s === 'OPEN';
    if (activeTab === 'IN_PROGRESS') return s === 'IN_PROGRESS';
    if (activeTab === 'COMPLETED') return s === 'COMPLETED';
    return true;
  });

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
            onClick={fetchMaintenance}
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

      {/* Top Filter & Tab Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        {/* Status Tabs */}
        <div style={{ display: 'inline-flex', background: 'var(--surface)', padding: '3px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', gap: '4px' }}>
          {[
            { id: 'ALL', label: `All Orders (${maintenanceList.length})` },
            { id: 'SCHEDULED', label: `Scheduled (${scheduledCount})` },
            { id: 'IN_PROGRESS', label: `In Progress (${inProgressCount})` },
            { id: 'COMPLETED', label: `Completed (${completedCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '4px',
                border: 'none',
                background: activeTab === tab.id ? '#0066FF' : 'transparent',
                color: activeTab === tab.id ? '#FFFFFF' : 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setFormData({ machineId: machines[0]?.id || 1, type: 'PREVENTIVE', description: '', scheduledDate: new Date().toISOString().slice(0, 10), cost: 200.0 });
            setModalOpen(true);
          }}
        >
          <Plus size={14} />
          <span>New Work Order</span>
        </button>
      </div>

      {/* Maintenance Orders Table */}
      {loading ? (
        <div style={{ minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LoadingSpinner message="Querying Work Orders from Database..." />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No Maintenance Orders"
          description="No work orders match the selected criteria."
          actionLabel="Create Work Order"
          onAction={() => setModalOpen(true)}
        />
      ) : (
        <div className="table-container">
          <table className="kyn-table">
            <thead>
              <tr>
                <th>Work Order ID</th>
                <th>Target Machine</th>
                <th>Type</th>
                <th>Description</th>
                <th>Scheduled Date</th>
                <th>Cost</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const s = (item.status || '').toUpperCase();
                const isCompleted = s === 'COMPLETED';
                const isInProgress = s === 'IN_PROGRESS';

                return (
                  <tr key={item.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent)' }}>
                      {`#WO-${String(item.id).padStart(3, '0')}`}
                    </td>
                    <td style={{ color: '#FFFFFF', fontWeight: 500 }}>
                      {getMachineName(item.machineId)}
                    </td>
                    <td>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontFamily: 'var(--font-mono)',
                        background: 'rgba(0, 102, 255, 0.1)',
                        color: 'var(--accent)',
                        border: '1px solid rgba(0, 102, 255, 0.25)'
                      }}>
                        {item.type || 'PREVENTIVE'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.description || 'Standard inspection & calibration'}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                      {item.scheduledDate ? new Date(item.scheduledDate).toLocaleDateString() : 'Scheduled'}
                    </td>
                    <td style={{ color: '#10B981', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      ${Number(item.cost || 0).toFixed(2)}
                    </td>
                    <td>
                      <span className={`badge ${isCompleted ? 'badge-online' : (isInProgress ? 'badge-maintenance' : '')}`} style={!isCompleted && !isInProgress ? { background: 'rgba(100, 116, 139, 0.12)', color: '#94A3B8', border: '1px solid rgba(100, 116, 139, 0.3)' } : {}}>
                        <span className="badge-dot" style={!isCompleted && !isInProgress ? { background: '#94A3B8' } : {}} />
                        <span>{isCompleted ? 'Completed' : (isInProgress ? 'In Progress' : 'Scheduled')}</span>
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        {!isCompleted && !isInProgress && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(item, 'IN_PROGRESS')}
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '10.5px' }}
                            title="Start Work Order"
                          >
                            Start
                          </button>
                        )}
                        {isInProgress && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(item, 'COMPLETED')}
                            className="btn btn-primary"
                            style={{ padding: '4px 10px', fontSize: '10.5px' }}
                            title="Complete Work Order"
                          >
                            Complete
                          </button>
                        )}
                        {isCompleted && (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Archived
                          </span>
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

      {/* Create Work Order Modal */}
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Create Maintenance Work Order"
        >
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label className="form-label">Target Equipment</label>
              <select
                className="form-input"
                value={formData.machineId}
                onChange={(e) => setFormData({ ...formData, machineId: Number(e.target.value) })}
              >
                {machines.map(m => (
                  <option key={m.id} value={m.id}>{m.name} (#{m.id})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Maintenance Type</label>
              <select
                className="form-input"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="PREVENTIVE">PREVENTIVE (Routine Maintenance)</option>
                <option value="CORRECTIVE">CORRECTIVE (Repair & Fix)</option>
                <option value="PREDICTIVE">PREDICTIVE (Condition-based)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Scheduled Execution Date</label>
              <input
                type="date"
                className="form-input"
                value={formData.scheduledDate}
                onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Estimated Cost ($ USD)</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Scope Description</label>
              <input
                type="text"
                className="form-input"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g. Spindle bearing lubrication and thermal calibration"
                required
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Creating...' : 'Issue Work Order'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
