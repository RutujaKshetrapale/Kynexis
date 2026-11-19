import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Cpu,
  Power,
  ShieldAlert
} from 'lucide-react';
import { alertsApi, machinesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const ALERT_TYPES = [
  'HIGH_TEMPERATURE',
  'EXCESSIVE_VIBRATION',
  'PRESSURE_DROP',
  'PRESSURE_SPIKE',
  'RPM_ANOMALY',
  'MACHINE_FAULT',
  'POWER_SURGE',
  'MAINTENANCE_REQUIRED'
];

const SEVERITIES = ['CRITICAL', 'HIGH', 'WARNING', 'INFO'];

export default function AlertsView() {
  const { hasRole, user, assignedPlantId } = useAuth();
  const isAdmin = hasRole('ADMIN') || hasRole('ENGINEER');
  const canCreate = hasRole('ADMIN') || hasRole('OPERATOR');
  const canDelete = hasRole('ADMIN');
  const canResolve = hasRole('ADMIN') || hasRole('ENGINEER');
  const isOperator = (user?.role || '').toUpperCase() === 'OPERATOR';
  const showActionsCol = isAdmin;

  const [alerts, setAlerts] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAlert, setEditingAlert] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Create form state
  const [createForm, setCreateForm] = useState({
    machineId: '1',
    type: 'HIGH_TEMPERATURE',
    severity: 'HIGH',
    message: ''
  });

  // Edit form state
  const [editForm, setEditForm] = useState({
    machineId: '1',
    type: 'HIGH_TEMPERATURE',
    severity: 'HIGH',
    message: '',
    resolved: false
  });

  // Toast notification state
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [alertData, machData] = await Promise.all([
        alertsApi.getAll().catch(() => []),
        machinesApi.getAll().catch(() => [])
      ]);
      const alertList = Array.isArray(alertData) ? alertData : (alertData?.content || []);
      const machList = Array.isArray(machData) ? machData : (machData?.content || []);
      setAlerts(alertList);
      setMachines(machList);
      if (machList.length > 0 && createForm.machineId === '1') {
        setCreateForm(prev => ({ ...prev, machineId: String(machList[0].id) }));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 1. CREATE ALERT
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!canCreate) {
      showToast('Permission Denied: Admin or Operator role required to report alerts', 'error');
      return;
    }
    if (!createForm.message.trim()) {
      showToast('Incident description message is required', 'error');
      return;
    }

    setActionLoading(true);
    try {
      await alertsApi.create({
        machineId: Number(createForm.machineId) || 1,
        type: createForm.type,
        severity: createForm.severity,
        message: createForm.message.trim(),
        resolved: false
      });
      showToast(`Alert '${createForm.type}' logged successfully.`);
      setShowCreateModal(false);
      setCreateForm({
        machineId: machines.length > 0 ? String(machines[0].id) : '1',
        type: 'HIGH_TEMPERATURE',
        severity: 'HIGH',
        message: ''
      });
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to create alert', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 2. OPEN EDIT MODAL
  const handleOpenEdit = (alert) => {
    setEditingAlert(alert);
    setEditForm({
      machineId: String(alert.machineId || alert.machine?.id || '1'),
      type: alert.type || alert.alertType || 'HIGH_TEMPERATURE',
      severity: alert.severity || 'WARNING',
      message: alert.message || '',
      resolved: Boolean(alert.resolved)
    });
  };

  // 3. UPDATE ALERT
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingAlert) return;
    if (!isAdmin) {
      showToast('Permission Denied: Admin or Engineer role required to edit alerts', 'error');
      return;
    }
    if (!editForm.message.trim()) {
      showToast('Incident description message is required', 'error');
      return;
    }

    setActionLoading(true);
    try {
      // Optimistic update
      setAlerts(prev =>
        prev.map(a =>
          a.id === editingAlert.id
            ? {
              ...a,
              machineId: Number(editForm.machineId) || a.machineId,
              type: editForm.type,
              alertType: editForm.type,
              severity: editForm.severity,
              message: editForm.message.trim(),
              resolved: Boolean(editForm.resolved)
            }
            : a
        )
      );

      await alertsApi.update(editingAlert.id, {
        machineId: Number(editForm.machineId) || Number(editingAlert.machineId) || 1,
        type: editForm.type,
        severity: editForm.severity,
        message: editForm.message.trim(),
        resolved: Boolean(editForm.resolved)
      });

      showToast(`Alert ALT-${String(editingAlert.id).padStart(3, '0')} updated successfully.`);
      setEditingAlert(null);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to update alert', 'error');
      fetchData();
    } finally {
      setActionLoading(false);
    }
  };

  // 4. QUICK TOGGLE RESOLVE / REOPEN
  const handleToggleResolve = async (alert) => {
    if (!canResolve) {
      showToast('Permission Denied: Authorization required to update alert status', 'error');
      return;
    }
    const nextResolved = !alert.resolved;

    // Optimistic instant update
    setAlerts(prev =>
      prev.map(a => (a.id === alert.id ? { ...a, resolved: nextResolved } : a))
    );

    try {
      if (nextResolved) {
        await alertsApi.resolve(alert.id);
        showToast(`Alert ALT-${String(alert.id).padStart(3, '0')} marked RESOLVED.`);
      } else {
        await alertsApi.update(alert.id, {
          machineId: Number(alert.machineId || alert.machine?.id || 1),
          type: alert.type || alert.alertType || 'HIGH_TEMPERATURE',
          severity: alert.severity || 'WARNING',
          message: alert.message || 'Reopened incident',
          resolved: false
        });
        showToast(`Alert ALT-${String(alert.id).padStart(3, '0')} reopened.`);
      }
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to update alert status', 'error');
      fetchData();
    }
  };

  // 5. DELETE ALERT
  const handleDelete = async (alert) => {
    if (!canDelete) {
      showToast('Permission Denied: Admin role required to delete alerts', 'error');
      return;
    }
    if (!window.confirm(`Are you sure you want to permanently delete alert ALT-${String(alert.id).padStart(3, '0')} (${alert.type || alert.alertType})?`)) {
      return;
    }

    try {
      await alertsApi.delete(alert.id);
      showToast(`Alert ALT-${String(alert.id).padStart(3, '0')} permanently deleted.`);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to delete alert', 'error');
    }
  };

  const operatorMachineIds = new Set(
    machines.filter(m => Number(m.plantId || m.plant?.id || 1) === Number(assignedPlantId)).map(m => Number(m.id))
  );
  const roleScopedAlerts = isOperator
    ? alerts.filter(a => operatorMachineIds.has(Number(a.machineId || a.machine?.id)))
    : alerts;

  const openCount = roleScopedAlerts.filter(a => !a.resolved).length;
  const resolvedCount = roleScopedAlerts.filter(a => a.resolved).length;

  const filteredAlerts = roleScopedAlerts.filter(a => {
    const q = searchTerm.trim().toLowerCase();
    const machId = Number(a.machineId || a.machine?.id || 0);
    const assignedMach = machines.find(m => m.id === machId);
    const matchesSearch = !q ||
      (a.message || '').toLowerCase().includes(q) ||
      (a.type || a.alertType || '').toLowerCase().includes(q) ||
      (a.severity || '').toLowerCase().includes(q) ||
      `alt-${String(a.id).padStart(3, '0')}`.includes(q) ||
      String(a.id).includes(q) ||
      (assignedMach?.name || '').toLowerCase().includes(q);
    const matchesSeverity = severityFilter === 'ALL' || a.severity === severityFilter;
    const matchesStatus = statusFilter === 'ALL' ||
      (statusFilter === 'UNRESOLVED' && !a.resolved) ||
      (statusFilter === 'RESOLVED' && a.resolved);
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  return (
    <div className="pbi-admin-container">
      {/* Top Banner */}
      <div className="pbi-admin-top-banner">
        <div className="pbi-admin-top-left">
          <div className="pbi-admin-top-icon" style={{ color: '#EF4444', background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <div className="pbi-admin-top-title">System Alerts</div>
          </div>
        </div>

        <button type="button" className="pbi-ribbon-btn" onClick={fetchData}>
          <RefreshCw size={13} className={loading ? 'spin-animation' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Slicers Bar */}
      <div className="pbi-slicers-bar" style={{ marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        {/* Search Input with Clear Button */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1, minWidth: '210px', maxWidth: '300px' }}>
          <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '10px', pointerEvents: 'none' }} />
          <input
            type="text"
            className="pbi-form-input"
            style={{ height: '34px', fontSize: '12px', paddingLeft: '32px', paddingRight: searchTerm ? '30px' : '12px', width: '100%' }}
            placeholder="Search alert, type, or asset..."
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

        {/* Status Slicer Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="pbi-slicer-label">Status:</span>
          <div className="pbi-slicer-pill-container">
            <button
              type="button"
              className={`pbi-slicer-pill pbi-slicer-pill-all ${statusFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setStatusFilter('ALL')}
            >
              <span className="pbi-slicer-dot pbi-slicer-dot-all" />
              <span>ALL</span>
              <span className="pbi-slicer-badge">{alerts.length}</span>
            </button>

            <button
              type="button"
              className={`pbi-slicer-pill pbi-slicer-pill-offline ${statusFilter === 'UNRESOLVED' ? 'active' : ''}`}
              onClick={() => setStatusFilter('UNRESOLVED')}
            >
              <span className="pbi-slicer-dot pbi-slicer-dot-offline" />
              <span>OPEN</span>
              <span className="pbi-slicer-badge">{openCount}</span>
            </button>

            <button
              type="button"
              className={`pbi-slicer-pill pbi-slicer-pill-online ${statusFilter === 'RESOLVED' ? 'active' : ''}`}
              onClick={() => setStatusFilter('RESOLVED')}
            >
              <span className="pbi-slicer-dot pbi-slicer-dot-online" />
              <span>RESOLVED</span>
              <span className="pbi-slicer-badge">{resolvedCount}</span>
            </button>
          </div>
        </div>

        {/* Severity Slicer Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="pbi-slicer-label">Severity:</span>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <ShieldAlert size={13} color="#EF4444" style={{ position: 'absolute', left: '10px', pointerEvents: 'none' }} />
            <select
              className="pbi-form-input"
              style={{
                height: '34px',
                paddingLeft: '30px',
                paddingRight: '14px',
                fontSize: '11.5px',
                fontWeight: 600,
                color: severityFilter === 'ALL' ? '#CBD5E1' : '#FCA5A5',
                borderColor: severityFilter === 'ALL' ? 'var(--pbi-border)' : '#EF4444',
                background: severityFilter === 'ALL' ? '#0E1422' : 'rgba(239, 68, 68, 0.12)',
                cursor: 'pointer',
                borderRadius: '20px'
              }}
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
            >
              <option value="ALL">All Severities</option>
              {SEVERITIES.map(sev => (
                <option key={sev} value={sev}>{sev}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Matrix Table Card with Single Create Alert Button */}
      <div className="pbi-visual-card" style={{ width: '100%', boxSizing: 'border-box' }}>
        <div className="pbi-visual-header">
          <div>
            <div className="pbi-visual-title">Incident Audit &amp; Event Stream</div>
          </div>

          {/* SINGLE CREATE ALERT BUTTON */}
          {canCreate && (
            <div className="pbi-visual-actions">
              <button
                type="button"
                className="pbi-btn-action-sm pbi-btn-action-gold"
                onClick={() => setShowCreateModal(true)}
                style={{ height: '30px', padding: '0 14px' }}
              >
                <Plus size={14} />
                <span>Log Alert</span>
              </button>
            </div>
          )}
        </div>

        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table className="pbi-matrix-table" style={{ width: '100%', tableLayout: 'auto' }}>
            <thead>
              <tr>
                <th style={{ width: '74px', padding: '10px 8px' }}>Alert ID</th>
                <th style={{ width: '92px', padding: '10px 8px' }}>Severity</th>
                <th style={{ padding: '10px 10px' }}>Incident &amp; Description</th>
                <th style={{ width: '150px', padding: '10px 8px' }}>Machine Asset</th>
                <th style={{ width: '96px', padding: showActionsCol ? '10px 8px' : '10px 14px', textAlign: showActionsCol ? 'left' : 'right' }}>Status</th>
                {showActionsCol && (
                  <th style={{ width: '195px', textAlign: 'right', padding: '10px 14px', whiteSpace: 'nowrap' }}>Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.length === 0 && (
                <tr>
                  <td colSpan={showActionsCol ? 6 : 5} style={{ textAlign: 'center', padding: '36px', color: '#94A3B8' }}>
                    No alerts found matching the selected filters.
                    {(searchTerm || statusFilter !== 'ALL' || severityFilter !== 'ALL') && (
                      <button
                        type="button"
                        className="pbi-ribbon-btn"
                        style={{ marginLeft: '12px', display: 'inline-flex', verticalAlign: 'middle', border: '1px solid var(--pbi-border)' }}
                        onClick={() => { setSearchTerm(''); setStatusFilter('ALL'); setSeverityFilter('ALL'); }}
                      >
                        Reset All Filters
                      </button>
                    )}
                  </td>
                </tr>
              )}
              {filteredAlerts.map((a) => {
                const isCrit = a.severity === 'CRITICAL' || a.severity === 'HIGH';
                const sevColor = isCrit ? '#EF4444' : (a.severity === 'WARNING' ? '#F59E0B' : '#00BCF2');
                const machId = Number(a.machineId || a.machine?.id || 1);
                const assignedMach = machines.find(m => m.id === machId);

                return (
                  <tr key={a.id}>
                    {/* Column 1: Alert ID */}
                    <td style={{ padding: '10px 8px', fontFamily: 'var(--pbi-font-mono)', color: '#EF4444', fontWeight: 700, fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                      ALT-{String(a.id).padStart(3, '0')}
                    </td>

                    {/* Column 2: Severity */}
                    <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        color: sevColor,
                        background: `${sevColor}15`,
                        border: `1px solid ${sevColor}40`,
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '10px',
                        fontWeight: 800,
                        letterSpacing: '0.02em'
                      }}>
                        {a.severity}
                      </span>
                    </td>

                    {/* Column 3: Incident Type + Message + Timestamp */}
                    <td style={{ padding: '10px 10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                          fontFamily: 'var(--pbi-font-mono)',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          color: '#F8FAFC',
                          background: 'rgba(148, 163, 184, 0.14)',
                          border: '1px solid rgba(148, 163, 184, 0.25)',
                          padding: '1px 6px',
                          borderRadius: '3px'
                        }}>
                          {a.type || a.alertType}
                        </span>
                        <span style={{ color: '#64748B', fontSize: '10.5px' }}>
                          {a.createdAt ? new Date(a.createdAt).toLocaleString() : 'Just now'}
                        </span>
                      </div>
                      <div style={{ color: '#CBD5E1', fontSize: '12.5px', marginTop: '3px', lineHeight: 1.35 }}>
                        {a.message}
                      </div>
                    </td>

                    {/* Column 4: Bound Machine Asset */}
                    <td style={{ padding: '10px 8px', color: '#CBD5E1' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <Cpu size={12} color="#00BCF2" style={{ flexShrink: 0 }} />
                        <span style={{ fontWeight: 600, fontSize: '12px', color: '#FFFFFF' }}>
                          {assignedMach ? assignedMach.name : `Machine #${machId}`}
                        </span>
                      </div>
                    </td>

                    {/* Column 5: Status */}
                    <td style={{ padding: showActionsCol ? '10px 8px' : '10px 14px', whiteSpace: 'nowrap', textAlign: showActionsCol ? 'left' : 'right' }}>
                      <span className={`pbi-status-pill ${a.resolved ? 'pbi-status-online' : 'pbi-status-offline'}`}>
                        <span className="pbi-status-dot" />
                        <span>{a.resolved ? 'RESOLVED' : 'OPEN'}</span>
                      </span>
                    </td>

                    {/* Column 6: Actions - Admin / Engineer Only */}
                    {showActionsCol && (
                      <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '5px', flexWrap: 'nowrap' }}>
                          {/* Resolve / Reopen Toggle */}
                          <button
                            type="button"
                            className={`pbi-btn-action-sm ${a.resolved ? 'pbi-btn-toggle-offline' : 'pbi-btn-toggle-online'}`}
                            disabled={!canResolve}
                            onClick={() => handleToggleResolve(a)}
                            title={a.resolved ? 'Reopen alert incident' : 'Mark alert as resolved'}
                          >
                            {a.resolved ? <Power size={11} /> : <CheckCircle2 size={11} />}
                            <span>{a.resolved ? 'Reopen' : 'Resolve'}</span>
                          </button>

                          {/* Edit Button (Admin / Engineer only) */}
                          <button
                            type="button"
                            className="pbi-btn-action-sm pbi-btn-action-primary"
                            onClick={() => handleOpenEdit(a)}
                            title="Edit alert details"
                          >
                            <Pencil size={11} />
                            <span>Edit</span>
                          </button>

                          {/* Delete Button (Admin only) */}
                          {canDelete && (
                            <button
                              type="button"
                              className="pbi-btn-action-sm pbi-btn-action-danger"
                              onClick={() => handleDelete(a)}
                              title="Delete alert (Admin authorization required)"
                            >
                              <Trash2 size={11} />
                              <span>Delete</span>
                            </button>
                          )}
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
      {/* MODAL 1: CREATE ALERT */}
      {/* ============================================================== */}
      {showCreateModal && (
        <div className="pbi-modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="pbi-modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="pbi-modal-header">
              <div className="pbi-modal-title">
                <AlertTriangle size={18} color="#F2C811" />
                <span>Log New System Alert</span>
              </div>
              <button type="button" className="pbi-modal-close" onClick={() => setShowCreateModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="pbi-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label className="pbi-form-label">Target Machine Asset *</label>
                  <select
                    className="pbi-form-input"
                    value={createForm.machineId}
                    onChange={(e) => setCreateForm({ ...createForm, machineId: e.target.value })}
                  >
                    {machines.length === 0 && <option value="1">Machine #1</option>}
                    {machines.map(m => (
                      <option key={m.id} value={String(m.id)}>
                        MCH-{String(m.id).padStart(3, '0')} — {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="pbi-form-label">Incident Type *</label>
                    <select
                      className="pbi-form-input"
                      value={createForm.type}
                      onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}
                    >
                      {ALERT_TYPES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="pbi-form-label">Severity Level *</label>
                    <select
                      className="pbi-form-input"
                      value={createForm.severity}
                      onChange={(e) => setCreateForm({ ...createForm, severity: e.target.value })}
                    >
                      {SEVERITIES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="pbi-form-label">Incident Description *</label>
                  <textarea
                    className="pbi-form-input"
                    rows={3}
                    style={{ height: 'auto', padding: '10px 12px', resize: 'vertical' }}
                    placeholder="e.g., Spindle bearing temperature exceeded 82°C safety threshold..."
                    value={createForm.message}
                    onChange={(e) => setCreateForm({ ...createForm, message: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="pbi-modal-footer">
                <button type="button" className="pbi-ribbon-btn" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="pbi-btn-action-sm pbi-btn-action-gold"
                  disabled={actionLoading}
                  style={{ height: '32px', padding: '0 16px' }}
                >
                  <Plus size={14} />
                  <span>{actionLoading ? 'Logging...' : 'Log Alert'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: EDIT ALERT */}
      {/* ============================================================== */}
      {editingAlert && (
        <div className="pbi-modal-backdrop" onClick={() => setEditingAlert(null)}>
          <div className="pbi-modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="pbi-modal-header">
              <div className="pbi-modal-title">
                <Pencil size={16} color="#00BCF2" />
                <span>Edit Alert ALT-{String(editingAlert.id).padStart(3, '0')}</span>
              </div>
              <button type="button" className="pbi-modal-close" onClick={() => setEditingAlert(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="pbi-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="pbi-form-label">Incident Type *</label>
                    <select
                      className="pbi-form-input"
                      value={editForm.type}
                      onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                    >
                      {!ALERT_TYPES.includes(editForm.type) && (
                        <option value={editForm.type}>{editForm.type}</option>
                      )}
                      {ALERT_TYPES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="pbi-form-label">Severity Level *</label>
                    <select
                      className="pbi-form-input"
                      value={editForm.severity}
                      onChange={(e) => setEditForm({ ...editForm, severity: e.target.value })}
                    >
                      {SEVERITIES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="pbi-form-label">Resolution State</label>
                  <select
                    className="pbi-form-input"
                    value={editForm.resolved ? 'RESOLVED' : 'OPEN'}
                    onChange={(e) => setEditForm({ ...editForm, resolved: e.target.value === 'RESOLVED' })}
                  >
                    <option value="OPEN">OPEN (Unresolved)</option>
                    <option value="RESOLVED">RESOLVED (Closed)</option>
                  </select>
                </div>

                <div>
                  <label className="pbi-form-label">Incident Description *</label>
                  <textarea
                    className="pbi-form-input"
                    rows={3}
                    style={{ height: 'auto', padding: '10px 12px', resize: 'vertical' }}
                    value={editForm.message}
                    onChange={(e) => setEditForm({ ...editForm, message: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="pbi-modal-footer">
                <button type="button" className="pbi-ribbon-btn" onClick={() => setEditingAlert(null)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="pbi-btn-action-sm pbi-btn-action-primary"
                  disabled={actionLoading}
                  style={{ height: '32px', padding: '0 16px' }}
                >
                  <span>{actionLoading ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`pbi-toast-notification ${toast.type === 'error' ? 'pbi-toast-error' : 'pbi-toast-success'}`}>
          {toast.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
