import React, { useState, useEffect } from 'react';
import {
  Wrench,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Cpu,
  Power,
  Calendar,
  User
} from 'lucide-react';
import { maintenanceApi, machinesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const MAINT_TYPES = ['PREVENTIVE', 'CORRECTIVE', 'PREDICTIVE', 'CALIBRATION', 'INSPECTION'];
const MAINT_STATUSES = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

function getTodayDateString() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toDateString(val) {
  if (!val) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(val)) return val.slice(0, 10);
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return getTodayDateString();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function ensureFutureOrPresentDate(dateStr) {
  const today = getTodayDateString();
  const normalized = toDateString(dateStr);
  if (!normalized || normalized < today) return today;
  return normalized;
}

export default function MaintenanceView() {
  const { hasRole, user, assignedPlantId } = useAuth();
  const isAdmin = hasRole('ADMIN') || hasRole('ENGINEER');
  const canDelete = hasRole('ADMIN');
  const isOperator = (user?.role || '').toUpperCase() === 'OPERATOR';

  const [orders, setOrders] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [machineFilter, setMachineFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Create form state
  const [createForm, setCreateForm] = useState({
    machineId: '1',
    type: 'PREVENTIVE',
    description: '',
    scheduledDate: getTodayDateString(),
    completedDate: '',
    status: 'SCHEDULED',
    technician: 'Lead Systems Engineer'
  });

  // Edit form state
  const [editForm, setEditForm] = useState({
    machineId: '1',
    type: 'PREVENTIVE',
    description: '',
    scheduledDate: getTodayDateString(),
    completedDate: '',
    status: 'SCHEDULED',
    technician: ''
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
      const [ordersData, machData] = await Promise.all([
        maintenanceApi.getAll().catch(() => []),
        machinesApi.getAll().catch(() => [])
      ]);
      const orderList = Array.isArray(ordersData) ? ordersData : (ordersData?.content || []);
      const machList = Array.isArray(machData) ? machData : (machData?.content || []);
      setOrders(orderList);
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

  // 1. CREATE WORK ORDER
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast('Permission Denied: Admin or Engineer role required to create work orders', 'error');
      return;
    }
    if (!createForm.description.trim() || createForm.description.trim().length < 5) {
      showToast('Description must be at least 5 characters', 'error');
      return;
    }
    if (!createForm.technician.trim() || createForm.technician.trim().length < 2) {
      showToast('Technician name must be at least 2 characters', 'error');
      return;
    }

    const schedDate = ensureFutureOrPresentDate(createForm.scheduledDate);
    let compDate = createForm.completedDate ? toDateString(createForm.completedDate) : null;
    if (compDate && compDate < schedDate) {
      compDate = schedDate;
    }

    setActionLoading(true);
    try {
      await maintenanceApi.create({
        machineId: Number(createForm.machineId) || 1,
        type: createForm.type,
        description: createForm.description.trim(),
        scheduledDate: schedDate,
        completedDate: compDate,
        status: createForm.status,
        technician: createForm.technician.trim()
      });
      showToast(`Work order (${createForm.type}) scheduled successfully.`);
      setShowCreateModal(false);
      setCreateForm({
        machineId: machines.length > 0 ? String(machines[0].id) : '1',
        type: 'PREVENTIVE',
        description: '',
        scheduledDate: getTodayDateString(),
        completedDate: '',
        status: 'SCHEDULED',
        technician: 'Lead Systems Engineer'
      });
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to create work order', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 2. OPEN EDIT MODAL
  const handleOpenEdit = (order) => {
    setEditingOrder(order);
    setEditForm({
      machineId: String(order.machineId || order.machine?.id || (machines[0]?.id || '1')),
      type: (order.type || 'PREVENTIVE').toUpperCase(),
      description: order.description || order.task || '',
      scheduledDate: ensureFutureOrPresentDate(order.scheduledDate),
      completedDate: order.completedDate ? toDateString(order.completedDate) : '',
      status: (order.status || 'SCHEDULED').toUpperCase(),
      technician: order.technician || order.assignedTo || 'Lead Systems Engineer'
    });
  };

  // 3. UPDATE WORK ORDER
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingOrder) return;
    if (!isAdmin) {
      showToast('Permission Denied: Admin or Engineer role required to edit work orders', 'error');
      return;
    }
    if (!editForm.description.trim() || editForm.description.trim().length < 5) {
      showToast('Description must be at least 5 characters', 'error');
      return;
    }
    if (!editForm.technician.trim() || editForm.technician.trim().length < 2) {
      showToast('Technician name must be at least 2 characters', 'error');
      return;
    }

    const schedDate = ensureFutureOrPresentDate(editForm.scheduledDate);
    let compDate = editForm.completedDate ? toDateString(editForm.completedDate) : null;
    if (compDate && compDate < schedDate) {
      compDate = schedDate;
    }

    const payload = {
      machineId: Number(editForm.machineId) || 1,
      type: editForm.type,
      description: editForm.description.trim(),
      scheduledDate: schedDate,
      completedDate: compDate,
      status: editForm.status,
      technician: editForm.technician.trim()
    };

    setActionLoading(true);
    try {
      setOrders(prev =>
        prev.map(o => (o.id === editingOrder.id ? { ...o, ...payload } : o))
      );

      await maintenanceApi.update(editingOrder.id, payload);
      showToast(`Work order WO-${String(editingOrder.id).padStart(3, '0')} updated successfully.`);
      setEditingOrder(null);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to update work order', 'error');
      fetchData();
    } finally {
      setActionLoading(false);
    }
  };

  // 4. QUICK TOGGLE COMPLETE / REOPEN
  const handleToggleComplete = async (order) => {
    if (!isAdmin) {
      showToast('Permission Denied: Admin or Engineer role required to update work order status', 'error');
      return;
    }
    const isCompleted = (order.status || '').toUpperCase() === 'COMPLETED';
    const nextStatus = isCompleted ? 'IN_PROGRESS' : 'COMPLETED';
    const schedDate = ensureFutureOrPresentDate(order.scheduledDate);
    const today = getTodayDateString();
    const nextCompDate = nextStatus === 'COMPLETED'
      ? (today >= schedDate ? today : schedDate)
      : null;

    const desc = (order.description || order.task || 'Preventive maintenance check').trim();
    const safeDesc = desc.length >= 5 ? desc : `${desc} check`;
    const tech = (order.technician || order.assignedTo || 'Lead Systems Engineer').trim();

    const payload = {
      machineId: Number(order.machineId || order.machine?.id || 1),
      type: (order.type || 'PREVENTIVE').toUpperCase(),
      description: safeDesc,
      scheduledDate: schedDate,
      completedDate: nextCompDate,
      status: nextStatus,
      technician: tech.length >= 2 ? tech : 'Lead Systems Engineer'
    };

    setOrders(prev =>
      prev.map(o => (o.id === order.id ? { ...o, status: nextStatus, completedDate: nextCompDate } : o))
    );

    try {
      await maintenanceApi.update(order.id, payload);
      showToast(`Work order WO-${String(order.id).padStart(3, '0')} marked ${nextStatus}.`);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to update work order status', 'error');
      fetchData();
    }
  };

  // 5. DELETE WORK ORDER
  const handleDelete = async (order) => {
    if (!canDelete) {
      showToast('Permission Denied: Admin role required to delete work orders', 'error');
      return;
    }
    if (!window.confirm(`Are you sure you want to permanently delete work order WO-${String(order.id).padStart(3, '0')}?`)) {
      return;
    }

    try {
      await maintenanceApi.delete(order.id);
      showToast(`Work order WO-${String(order.id).padStart(3, '0')} permanently deleted.`);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to delete work order', 'error');
    }
  };

  const operatorMachineIds = new Set(
    machines.filter(m => Number(m.plantId || m.plant?.id || 1) === Number(assignedPlantId)).map(m => Number(m.id))
  );
  const roleScopedOrders = isOperator
    ? orders.filter(o => operatorMachineIds.has(Number(o.machineId || o.machine?.id)))
    : orders;

  const ordersByMachine = machineFilter === 'ALL'
    ? roleScopedOrders
    : roleScopedOrders.filter(o => Number(o.machineId || o.machine?.id) === Number(machineFilter));

  const scheduledCount = ordersByMachine.filter(o => (o.status || '').toUpperCase() === 'SCHEDULED').length;
  const inProgressCount = ordersByMachine.filter(o => (o.status || '').toUpperCase() === 'IN_PROGRESS').length;
  const completedCount = ordersByMachine.filter(o => (o.status || '').toUpperCase() === 'COMPLETED').length;

  const filteredOrders = ordersByMachine.filter(o => {
    const q = searchTerm.trim().toLowerCase();
    const machId = Number(o.machineId || o.machine?.id || 0);
    const assignedMach = machines.find(m => m.id === machId);
    const matchesSearch = !q ||
      (o.description || o.task || '').toLowerCase().includes(q) ||
      (o.type || '').toLowerCase().includes(q) ||
      (o.technician || o.assignedTo || '').toLowerCase().includes(q) ||
      (o.status || '').toLowerCase().includes(q) ||
      `wo-${String(o.id).padStart(3, '0')}`.includes(q) ||
      String(o.id).includes(q) ||
      (assignedMach?.name || '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'ALL' || (o.status || '').toUpperCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const todayMin = getTodayDateString();

  return (
    <div className="pbi-admin-container">
      {/* Top Banner */}
      <div className="pbi-admin-top-banner">
        <div className="pbi-admin-top-left">
          <div className="pbi-admin-top-icon" style={{ color: '#EC4899', background: 'rgba(236, 72, 153, 0.1)', borderColor: 'rgba(236, 72, 153, 0.3)' }}>
            <Wrench size={24} />
          </div>
          <div>
            <div className="pbi-admin-top-title">Maintenance &amp; Health Diagnostics</div>
          </div>
        </div>

        <button type="button" className="pbi-ribbon-btn" onClick={fetchData}>
          <RefreshCw size={13} className={loading ? 'spin-animation' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Slicers Bar */}
      <div className="pbi-slicers-bar" style={{ marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        {/* Search Box */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1, minWidth: '200px', maxWidth: '280px' }}>
          <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '10px', pointerEvents: 'none' }} />
          <input
            type="text"
            className="pbi-form-input"
            style={{ height: '34px', fontSize: '12px', paddingLeft: '32px', paddingRight: searchTerm ? '30px' : '12px', width: '100%' }}
            placeholder="Search order, asset, or tech..."
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

        {/* Machine Slicer Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="pbi-slicer-label">Machine:</span>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Cpu size={13} color="#EC4899" style={{ position: 'absolute', left: '10px', pointerEvents: 'none' }} />
            <select
              className="pbi-form-input"
              style={{
                height: '34px',
                paddingLeft: '30px',
                paddingRight: '14px',
                fontSize: '11.5px',
                fontWeight: 600,
                color: machineFilter === 'ALL' ? '#CBD5E1' : '#F472B6',
                borderColor: machineFilter === 'ALL' ? 'var(--pbi-border)' : '#EC4899',
                background: machineFilter === 'ALL' ? '#0E1422' : 'rgba(236, 72, 153, 0.12)',
                cursor: 'pointer',
                borderRadius: '20px'
              }}
              value={machineFilter}
              onChange={(e) => setMachineFilter(e.target.value)}
            >
              <option value="ALL">All Machines ({machines.length})</option>
              {machines.map(m => (
                <option key={m.id} value={String(m.id)}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Slicer Chiclets */}
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
              <span className="pbi-slicer-badge">{ordersByMachine.length}</span>
            </button>

            <button
              type="button"
              className={`pbi-slicer-pill ${statusFilter === 'SCHEDULED' ? 'active' : ''}`}
              onClick={() => setStatusFilter('SCHEDULED')}
              style={{
                color: statusFilter === 'SCHEDULED' ? '#38BDF8' : undefined,
                borderColor: statusFilter === 'SCHEDULED' ? '#00BCF2' : undefined,
                boxShadow: statusFilter === 'SCHEDULED' ? '0 0 12px rgba(0, 188, 242, 0.35)' : undefined
              }}
            >
              <span className="pbi-slicer-dot" style={{ background: '#00BCF2', boxShadow: '0 0 6px #00BCF2' }} />
              <span>SCHEDULED</span>
              <span className="pbi-slicer-badge">{scheduledCount}</span>
            </button>

            <button
              type="button"
              className={`pbi-slicer-pill ${statusFilter === 'IN_PROGRESS' ? 'active' : ''}`}
              onClick={() => setStatusFilter('IN_PROGRESS')}
              style={{
                color: statusFilter === 'IN_PROGRESS' ? '#FBBF24' : undefined,
                borderColor: statusFilter === 'IN_PROGRESS' ? '#F59E0B' : undefined,
                boxShadow: statusFilter === 'IN_PROGRESS' ? '0 0 12px rgba(245, 158, 11, 0.35)' : undefined
              }}
            >
              <span className="pbi-slicer-dot" style={{ background: '#F59E0B', boxShadow: '0 0 6px #F59E0B' }} />
              <span>IN PROGRESS</span>
              <span className="pbi-slicer-badge">{inProgressCount}</span>
            </button>

            <button
              type="button"
              className={`pbi-slicer-pill pbi-slicer-pill-online ${statusFilter === 'COMPLETED' ? 'active' : ''}`}
              onClick={() => setStatusFilter('COMPLETED')}
            >
              <span className="pbi-slicer-dot pbi-slicer-dot-online" />
              <span>COMPLETED</span>
              <span className="pbi-slicer-badge">{completedCount}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Matrix Table Card with Single Create Order Button */}
      <div className="pbi-visual-card" style={{ width: '100%', boxSizing: 'border-box' }}>
        <div className="pbi-visual-header">
          <div>
            <div className="pbi-visual-title">Maintenance Work Orders Schedule</div>
          </div>

          {isAdmin && (
            <div className="pbi-visual-actions">
              <button
                type="button"
                className="pbi-btn-action-sm pbi-btn-action-gold"
                onClick={() => {
                  setCreateForm(prev => ({ ...prev, scheduledDate: getTodayDateString() }));
                  setShowCreateModal(true);
                }}
                style={{ height: '30px', padding: '0 14px' }}
              >
                <Plus size={14} />
                <span>Create Order</span>
              </button>
            </div>
          )}
        </div>

        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table className="pbi-matrix-table" style={{ width: '100%', tableLayout: 'auto' }}>
            <thead>
              <tr>
                <th style={{ width: '74px', padding: '10px 8px' }}>Order ID</th>
                <th style={{ width: '165px', padding: '10px 8px' }}>Asset &amp; Type</th>
                <th style={{ padding: '10px 10px' }}>Description &amp; Dispatch</th>
                <th style={{ width: '108px', padding: isAdmin ? '10px 8px' : '10px 14px', textAlign: isAdmin ? 'left' : 'right' }}>Status</th>
                {isAdmin && (
                  <th style={{ width: '202px', textAlign: 'right', padding: '10px 14px', whiteSpace: 'nowrap' }}>Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} style={{ textAlign: 'center', padding: '36px', color: '#94A3B8' }}>
                    No maintenance work orders found matching the selected filters.
                    {(searchTerm || statusFilter !== 'ALL' || machineFilter !== 'ALL') && (
                      <button
                        type="button"
                        className="pbi-ribbon-btn"
                        style={{ marginLeft: '12px', display: 'inline-flex', verticalAlign: 'middle', border: '1px solid var(--pbi-border)' }}
                        onClick={() => { setSearchTerm(''); setStatusFilter('ALL'); setMachineFilter('ALL'); }}
                      >
                        Reset All Filters
                      </button>
                    )}
                  </td>
                </tr>
              )}
              {filteredOrders.map((o) => {
                const statusUpper = (o.status || 'SCHEDULED').toUpperCase();
                const isComplete = statusUpper === 'COMPLETED';
                const isCancelled = statusUpper === 'CANCELLED';
                const statusClass = isComplete
                  ? 'pbi-status-running'
                  : (isCancelled ? 'pbi-status-offline' : (statusUpper === 'IN_PROGRESS' ? 'pbi-status-idle' : 'pbi-status-maintenance'));
                const machId = Number(o.machineId || o.machine?.id || 1);
                const assignedMach = machines.find(m => m.id === machId);
                const maintType = (o.type || 'PREVENTIVE').toUpperCase();
                const typeColor = maintType === 'CORRECTIVE' ? '#EF4444' : (maintType === 'PREDICTIVE' ? '#F59E0B' : '#00BCF2');

                return (
                  <tr key={o.id}>
                    {/* Column 1: Order ID */}
                    <td style={{ padding: '10px 8px', fontFamily: 'var(--pbi-font-mono)', color: '#EC4899', fontWeight: 700, fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                      WO-{String(o.id).padStart(3, '0')}
                    </td>

                    {/* Column 2: Machine Asset & Type */}
                    <td style={{ padding: '10px 8px' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <Cpu size={12} color="#00BCF2" style={{ flexShrink: 0 }} />
                        <span style={{ fontWeight: 700, fontSize: '12.5px', color: '#FFFFFF' }}>
                          {assignedMach ? assignedMach.name : `Machine #${machId}`}
                        </span>
                      </div>
                      <div style={{ marginTop: '3px' }}>
                        <span style={{
                          color: typeColor,
                          background: `${typeColor}15`,
                          border: `1px solid ${typeColor}40`,
                          padding: '1px 6px',
                          borderRadius: '3px',
                          fontFamily: 'var(--pbi-font-mono)',
                          fontSize: '10px',
                          fontWeight: 700
                        }}>
                          {maintType}
                        </span>
                      </div>
                    </td>

                    {/* Column 3: Description + Technician & Scheduled Date */}
                    <td style={{ padding: '10px 10px' }}>
                      <div style={{ color: '#E2E8F0', fontSize: '12.5px', fontWeight: 500, lineHeight: 1.35 }}>
                        {o.description || o.task || 'Preventive lubrication & spindle alignment calibration'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', fontSize: '11px', color: '#94A3B8', flexWrap: 'wrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <User size={11} color="#EC4899" />
                          <span>{o.technician || o.assignedTo || 'Lead Systems Specialist'}</span>
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--pbi-font-mono)', fontSize: '10.5px', color: '#64748B' }}>
                          <Calendar size={11} />
                          <span>{o.scheduledDate ? toDateString(o.scheduledDate) : 'Immediate'}</span>
                        </span>
                      </div>
                    </td>

                    {/* Column 4: Status */}
                    <td style={{ padding: isAdmin ? '10px 8px' : '10px 14px', whiteSpace: 'nowrap', textAlign: isAdmin ? 'left' : 'right' }}>
                      <span className={`pbi-status-pill ${statusClass}`}>
                        <span className="pbi-status-dot" />
                        <span>{statusUpper}</span>
                      </span>
                    </td>

                    {/* Column 5: Actions - Admin/Engineer Only */}
                    {isAdmin && (
                      <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '5px', flexWrap: 'nowrap' }}>
                          {/* Complete / Reopen Toggle */}
                          <button
                            type="button"
                            className={`pbi-btn-action-sm ${isComplete ? 'pbi-btn-toggle-offline' : 'pbi-btn-toggle-online'}`}
                            onClick={() => handleToggleComplete(o)}
                            title={isComplete ? 'Reopen work order to IN_PROGRESS' : 'Mark work order COMPLETED'}
                          >
                            {isComplete ? <Power size={11} /> : <CheckCircle2 size={11} />}
                            <span>{isComplete ? 'Reopen' : 'Done'}</span>
                          </button>

                          {/* Edit Button */}
                          <button
                            type="button"
                            className="pbi-btn-action-sm pbi-btn-action-primary"
                            onClick={() => handleOpenEdit(o)}
                            title="Edit work order details"
                          >
                            <Pencil size={11} />
                            <span>Edit</span>
                          </button>

                          {/* Delete Button */}
                          {canDelete && (
                            <button
                              type="button"
                              className="pbi-btn-action-sm pbi-btn-action-danger"
                              onClick={() => handleDelete(o)}
                              title="Delete work order (Admin authorization required)"
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
      {/* MODAL 1: CREATE WORK ORDER */}
      {/* ============================================================== */}
      {showCreateModal && (
        <div className="pbi-modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="pbi-modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="pbi-modal-header">
              <div className="pbi-modal-title">
                <Wrench size={18} color="#F2C811" />
                <span>Create Maintenance Work Order</span>
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
                    <label className="pbi-form-label">Maintenance Type *</label>
                    <select
                      className="pbi-form-input"
                      value={createForm.type}
                      onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}
                    >
                      {MAINT_TYPES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="pbi-form-label">Work Order Status *</label>
                    <select
                      className="pbi-form-input"
                      value={createForm.status}
                      onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
                    >
                      {MAINT_STATUSES.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="pbi-form-label">Assigned Technician *</label>
                  <input
                    type="text"
                    className="pbi-form-input"
                    placeholder="e.g., Arjun Mehta"
                    value={createForm.technician}
                    onChange={(e) => setCreateForm({ ...createForm, technician: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="pbi-form-label">Scheduled Date *</label>
                    <input
                      type="date"
                      min={todayMin}
                      className="pbi-form-input"
                      value={createForm.scheduledDate}
                      onChange={(e) => setCreateForm({ ...createForm, scheduledDate: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="pbi-form-label">Completed Date (Optional)</label>
                    <input
                      type="date"
                      min={createForm.scheduledDate || todayMin}
                      className="pbi-form-input"
                      value={createForm.completedDate}
                      onChange={(e) => setCreateForm({ ...createForm, completedDate: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="pbi-form-label">Maintenance Description *</label>
                  <textarea
                    className="pbi-form-input"
                    rows={3}
                    style={{ height: 'auto', padding: '10px 12px', resize: 'vertical' }}
                    placeholder="e.g., Preventive spindle bearing lubrication and vibration sensor calibration..."
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
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
                  <span>{actionLoading ? 'Creating...' : 'Create Order'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: EDIT WORK ORDER */}
      {/* ============================================================== */}
      {editingOrder && (
        <div className="pbi-modal-backdrop" onClick={() => setEditingOrder(null)}>
          <div className="pbi-modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="pbi-modal-header">
              <div className="pbi-modal-title">
                <Pencil size={16} color="#00BCF2" />
                <span>Edit Work Order WO-{String(editingOrder.id).padStart(3, '0')}</span>
              </div>
              <button type="button" className="pbi-modal-close" onClick={() => setEditingOrder(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="pbi-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label className="pbi-form-label">Target Machine Asset *</label>
                  <select
                    className="pbi-form-input"
                    value={editForm.machineId}
                    onChange={(e) => setEditForm({ ...editForm, machineId: e.target.value })}
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
                    <label className="pbi-form-label">Maintenance Type *</label>
                    <select
                      className="pbi-form-input"
                      value={editForm.type}
                      onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                    >
                      {!MAINT_TYPES.includes(editForm.type) && (
                        <option value={editForm.type}>{editForm.type}</option>
                      )}
                      {MAINT_TYPES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="pbi-form-label">Work Order Status *</label>
                    <select
                      className="pbi-form-input"
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    >
                      {MAINT_STATUSES.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="pbi-form-label">Assigned Technician *</label>
                  <input
                    type="text"
                    className="pbi-form-input"
                    value={editForm.technician}
                    onChange={(e) => setEditForm({ ...editForm, technician: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="pbi-form-label">Scheduled Date *</label>
                    <input
                      type="date"
                      min={todayMin}
                      className="pbi-form-input"
                      value={editForm.scheduledDate}
                      onChange={(e) => setEditForm({ ...editForm, scheduledDate: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="pbi-form-label">Completed Date (Optional)</label>
                    <input
                      type="date"
                      min={editForm.scheduledDate || todayMin}
                      className="pbi-form-input"
                      value={editForm.completedDate}
                      onChange={(e) => setEditForm({ ...editForm, completedDate: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="pbi-form-label">Maintenance Description *</label>
                  <textarea
                    className="pbi-form-input"
                    rows={3}
                    style={{ height: 'auto', padding: '10px 12px', resize: 'vertical' }}
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="pbi-modal-footer">
                <button type="button" className="pbi-ribbon-btn" onClick={() => setEditingOrder(null)}>
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
