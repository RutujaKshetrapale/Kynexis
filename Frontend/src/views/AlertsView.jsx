import React, { useState, useEffect } from 'react';
import { alertsApi, machinesApi } from '../services/api';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { 
  Search, 
  ChevronDown, 
  Plus,
  CheckCircle2,
  AlertTriangle,
  Check
} from 'lucide-react';

export default function AlertsView() {
  const [alerts, setAlerts] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showSeverityMenu, setShowSeverityMenu] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    machineId: 1, 
    type: 'HIGH_TEMPERATURE', 
    alertType: 'HIGH_TEMPERATURE', 
    severity: 'WARNING', 
    message: '' 
  });
  const [saving, setSaving] = useState(false);

  const fetchAlerts = async () => {
    setLoading(true);
    setError('');
    try {
      const [alertData, machData] = await Promise.all([
        alertsApi.getAll(),
        machinesApi.getAll()
      ]);
      setAlerts(Array.isArray(alertData) ? alertData : []);
      setMachines(Array.isArray(machData) ? machData : []);
    } catch (err) {
      console.warn('Alert fetch error:', err);
      setError(err.message || 'Failed to load alerts from database');
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const selectedType = formData.type || formData.alertType || 'HIGH_TEMPERATURE';
      const machId = Number(formData.machineId || machines[0]?.id || 1);
      const msg = formData.message?.trim() || `${selectedType} anomaly observed on ${getMachineName(machId)}`;

      await alertsApi.create({
        machineId: machId,
        type: selectedType,
        alertType: selectedType,
        severity: formData.severity || 'WARNING',
        message: msg,
        resolved: false
      });
      setModalOpen(false);
      await fetchAlerts();
    } catch (err) {
      console.error('Trigger alert error:', err);
      setError(err.message || 'Failed to trigger alert');
    } finally {
      setSaving(false);
    }
  };

  const handleResolve = async (id) => {
    try {
      await alertsApi.resolve(id, 'Resolved by floor operator via control console');
      await fetchAlerts();
    } catch (err) {
      setError(err.message || 'Failed to resolve alert');
    }
  };

  const handleAcknowledge = async (id) => {
    try {
      await alertsApi.acknowledge(id);
      await fetchAlerts();
    } catch (err) {
      setError(err.message || 'Failed to acknowledge alert');
    }
  };

  const getMachineName = (id) => {
    const found = machines.find(m => Number(m.id) === Number(id));
    return found ? found.name : `Machine #${id}`;
  };

  const filtered = alerts.filter(a => {
    const eventType = a.type || a.alertType || 'UNKNOWN_ALERT';
    const msg = (a.message || `${eventType} on Machine #${a.machineId}`).toLowerCase();
    const machName = getMachineName(a.machineId).toLowerCase();
    const matchSearch = msg.includes(searchTerm.toLowerCase()) || 
                        machName.includes(searchTerm.toLowerCase()) || 
                        `#ALT-${a.id}`.includes(searchTerm) ||
                        eventType.toLowerCase().includes(searchTerm.toLowerCase());

    let matchStatus = true;
    if (statusFilter === 'OPEN') matchStatus = !a.resolved;
    else if (statusFilter === 'RESOLVED') matchStatus = !!a.resolved;

    let matchSeverity = true;
    if (severityFilter !== 'ALL') {
      matchSeverity = (a.severity || '').toUpperCase() === severityFilter.toUpperCase();
    }

    return matchSearch && matchStatus && matchSeverity;
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
            onClick={fetchAlerts}
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

      {/* Top Filter Bar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {/* Severity Filter */}
        <div style={{ position: 'relative' }}>
          <button 
            type="button" 
            className="filter-dropdown-btn"
            onClick={() => { setShowSeverityMenu(!showSeverityMenu); setShowStatusMenu(false); }}
          >
            <span>Severity: {severityFilter}</span>
            <ChevronDown size={12} style={{ color: 'var(--text-muted)' }} />
          </button>

          {showSeverityMenu && (
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
              {['ALL', 'CRITICAL', 'WARNING', 'INFO'].map(sev => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => { setSeverityFilter(sev); setShowSeverityMenu(false); }}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    background: severityFilter === sev ? 'var(--surface-elevated)' : 'transparent',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '11.5px',
                    color: severityFilter === sev ? '#FFFFFF' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  {sev}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Status Filter */}
        <div style={{ position: 'relative' }}>
          <button 
            type="button" 
            className="filter-dropdown-btn"
            onClick={() => { setShowStatusMenu(!showStatusMenu); setShowSeverityMenu(false); }}
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
              {['ALL', 'OPEN', 'RESOLVED'].map(st => (
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
            placeholder="Search alerts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            const defaultMachId = machines[0]?.id || 1;
            setFormData({ 
              machineId: defaultMachId, 
              type: 'HIGH_TEMPERATURE',
              alertType: 'HIGH_TEMPERATURE', 
              severity: 'WARNING', 
              message: `Abnormal thermal reading observed on ${getMachineName(defaultMachId)}` 
            });
            setModalOpen(true);
          }}
        >
          <Plus size={14} />
          <span>Trigger Alert</span>
        </button>
      </div>

      {/* Alerts Table */}
      {loading ? (
        <div style={{ minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LoadingSpinner message="Querying Factory Alerts from Database..." />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No Alerts Found"
          description={searchTerm ? `No alerts match "${searchTerm}"` : "All factory machines operating nominal. Zero alerts logged."}
          actionLabel="Simulate Alert"
          onAction={() => setModalOpen(true)}
        />
      ) : (
        <div className="table-container">
          <table className="kyn-table">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Alert ID</th>
                <th>Machine</th>
                <th>Alert Event</th>
                <th>Triggered At</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const isCritical = item.severity === 'CRITICAL';
                const isWarning = item.severity === 'WARNING';
                const sevColor = isCritical ? '#EF4444' : (isWarning ? '#F59E0B' : '#0066FF');

                return (
                  <tr key={item.id}>
                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: `${sevColor}15`,
                        color: sevColor,
                        border: `1px solid ${sevColor}35`
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: sevColor }} />
                        <span>{item.severity || 'WARNING'}</span>
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent)' }}>
                      {`#ALT-${String(item.id).padStart(3, '0')}`}
                    </td>
                    <td style={{ color: '#FFFFFF', fontWeight: 500 }}>
                      {getMachineName(item.machineId)}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {item.message || item.type || item.alertType}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                      {item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Recent'}
                    </td>
                    <td>
                      <span className={`badge ${item.resolved ? 'badge-online' : 'badge-maintenance'}`}>
                        <span className="badge-dot" />
                        <span>{item.resolved ? 'Resolved' : (item.acknowledged ? 'Acknowledged' : 'Open')}</span>
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {!item.resolved ? (
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          {!item.acknowledged && (
                            <button
                              type="button"
                              onClick={() => handleAcknowledge(item.id)}
                              className="btn btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '10.5px' }}
                              title="Acknowledge Alert"
                            >
                              Ack
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleResolve(item.id)}
                            className="btn btn-primary"
                            style={{ padding: '4px 10px', fontSize: '10.5px' }}
                            title="Resolve Alert"
                          >
                            Resolve
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Completed
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Trigger Alert Modal */}
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Trigger Industrial Equipment Alert"
        >
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label className="form-label">Affected Machine</label>
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
              <label className="form-label">Alert Severity</label>
              <select
                className="form-input"
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
              >
                <option value="CRITICAL">CRITICAL (Immediate Attention)</option>
                <option value="WARNING">WARNING (Threshold Exceeded)</option>
                <option value="INFO">INFO (Operational Notice)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Alert Type</label>
              <select
                className="form-input"
                value={formData.type || formData.alertType}
                onChange={(e) => setFormData({ ...formData, type: e.target.value, alertType: e.target.value })}
              >
                <option value="HIGH_TEMPERATURE">HIGH_TEMPERATURE</option>
                <option value="HIGH_VIBRATION">HIGH_VIBRATION</option>
                <option value="LOW_PRESSURE">LOW_PRESSURE</option>
                <option value="MOTOR_STALL">MOTOR_STALL</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Detailed Message</label>
              <input
                type="text"
                className="form-input"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="e.g. Temperature reached 89.4°C on CNC Spindle"
                required
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Triggering...' : 'Dispatch Alert'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
