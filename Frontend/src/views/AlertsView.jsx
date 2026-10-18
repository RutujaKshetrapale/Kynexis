import React, { useState, useEffect } from 'react';
import { alertsApi, machinesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { 
  AlertTriangle, 
  Plus, 
  CheckCircle, 
  Trash2, 
  Filter, 
  Clock, 
  Cpu 
} from 'lucide-react';

export default function AlertsView() {
  const { hasRole } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [unresolvedOnly, setUnresolvedOnly] = useState(false);

  // Create Alarm Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    machineId: '1',
    type: 'OVERHEATING',
    severity: 'HIGH',
    message: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      const [alertList, machList] = await Promise.all([
        alertsApi.getAll(),
        machinesApi.getAll()
      ]);
      setAlerts(Array.isArray(alertList) ? alertList : []);
      setMachines(machList || []);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleResolve = async (id) => {
    try {
      await alertsApi.resolve(id);
      await fetchData();
    } catch (err) {
      alert(`Failed to resolve alert: ${err.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Delete Alert #${id}? Admin privileges required.`)) return;
    try {
      await alertsApi.delete(id);
      await fetchData();
    } catch (err) {
      alert(`Deletion failed: ${err.message}`);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.message.trim()) {
      setError('Alert description message is required.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await alertsApi.create({
        machineId: Number(formData.machineId),
        type: formData.type,
        severity: formData.severity,
        message: formData.message,
        resolved: false
      });
      setModalOpen(false);
      await fetchData();
    } catch (err) {
      setError(err.message || 'Failed to dispatch alarm.');
    } finally {
      setSaving(false);
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    if (unresolvedOnly && a.resolved) return false;
    if (severityFilter !== 'ALL') {
      return (a.severity || '').toUpperCase() === severityFilter.toUpperCase();
    }
    return true;
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <AlertTriangle style={{ color: 'var(--neon-crimson)' }} />
            Active Industrial Alarms & Event Log
          </h1>
          <p className="page-description">
            Real-time threshold violation incidents, anomaly warnings, and resolution audit log
          </p>
        </div>
        {hasRole(['ADMIN', 'ENGINEER']) && (
          <button 
            type="button" 
            className="btn btn-primary"
            onClick={() => {
              setFormData({ machineId: machines[0]?.id || '1', type: 'OVERHEATING', severity: 'HIGH', message: '' });
              setError('');
              setModalOpen(true);
            }}
          >
            <Plus size={16} />
            Dispatch Alarm Event
          </button>
        )}
      </div>

      {/* Filter and Unresolved Toggle */}
      <div className="filter-bar">
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((s) => (
            <button
              key={s}
              type="button"
              className={`btn btn-sm ${severityFilter === s ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setSeverityFilter(s)}
            >
              {s}
            </button>
          ))}
        </div>

        <button
          type="button"
          className={`btn btn-sm ${unresolvedOnly ? 'btn-danger' : 'btn-ghost'}`}
          onClick={() => setUnresolvedOnly(!unresolvedOnly)}
        >
          <Filter size={14} />
          {unresolvedOnly ? 'Showing Unresolved Only' : 'Show All Events'}
        </button>
      </div>

      {loading ? (
        <LoadingSpinner message="Polling incident queue from Alert Service (:8084)..." />
      ) : filteredAlerts.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="No Incident Events Found"
          description="All telemetry thresholds are currently operating within safe tolerance parameters."
        />
      ) : (
        <div className="table-wrap">
          <table className="industrial-table">
            <thead>
              <tr>
                <th>Alert ID</th>
                <th>Target Asset</th>
                <th>Event Type</th>
                <th>Severity</th>
                <th>Diagnostic Description</th>
                <th>Event Time</th>
                <th>Resolution State</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.map((alert) => {
                const machine = machines.find(m => m.id === alert.machineId);
                return (
                  <tr key={alert.id}>
                    <td style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: 'var(--neon-crimson)' }}>
                      ALT-00{alert.id}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                        <Cpu size={14} style={{ color: 'var(--neon-purple)' }} />
                        <span>{machine ? machine.name : `Machine #${alert.machineId}`}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-idle" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        {alert.type}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={alert.severity} />
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem', maxWidth: 360, color: 'var(--text-primary)' }}>
                        {alert.message}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
                        <Clock size={12} />
                        {new Date(alert.createdAt).toLocaleString()}
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={alert.resolved ? 'RESOLVED' : 'ACTIVE'} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        {!alert.resolved && hasRole(['ADMIN', 'ENGINEER']) && (
                          <button
                            type="button"
                            className="btn btn-success btn-sm"
                            onClick={() => handleResolve(alert.id)}
                            title="Acknowledge and Resolve Alarm"
                          >
                            <CheckCircle size={14} />
                            <span>Resolve</span>
                          </button>
                        )}
                        {hasRole('ADMIN') && (
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(alert.id)}
                            title="Delete Event (Admin Only)"
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

      {/* Manual Alarm Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Dispatch Alarm Event (POST /api/alerts)"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Transmitting...' : 'Dispatch Alarm'}
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
            <label className="form-label" htmlFor="alert-machine">Target Equipment</label>
            <select
              id="alert-machine"
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
              <label className="form-label" htmlFor="alert-type">Fault Type</label>
              <select
                id="alert-type"
                className="form-select"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="OVERHEATING">OVERHEATING</option>
                <option value="VIBRATION_WARNING">VIBRATION WARNING</option>
                <option value="PRESSURE_DROP">PRESSURE DROP</option>
                <option value="BEARING_FAILURE">BEARING FAILURE</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="alert-sev">Severity Level</label>
              <select
                id="alert-sev"
                className="form-select"
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
              >
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="alert-msg">Incident Message / Observation</label>
            <textarea
              id="alert-msg"
              className="form-textarea"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="e.g. Spindle temperature exceeded 85°C safety threshold"
              required
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
