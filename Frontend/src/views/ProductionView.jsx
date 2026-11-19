import React, { useState, useEffect } from 'react';
import {
  Layers,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Cpu,
  Power
} from 'lucide-react';
import { productionApi, machinesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const BATCH_STATUSES = ['IN_PROGRESS', 'COMPLETED', 'SCHEDULED'];

function toLocalDateTimeValue(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (Number.isNaN(d.getTime())) return toLocalDateTimeValue(new Date());
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toBackendLocalDateTime(val) {
  if (!val) return null;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(val)) {
    return `${val}:00`;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
    return val.slice(0, 19);
  }
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return `${toLocalDateTimeValue(new Date())}:00`;
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export default function ProductionView() {
  const { hasRole, user, assignedPlantId } = useAuth();
  const canMutate = hasRole('ADMIN') || hasRole('OPERATOR');
  const canDelete = hasRole('ADMIN');
  const isOperator = (user?.role || '').toUpperCase() === 'OPERATOR';

  const [batches, setBatches] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [machineFilter, setMachineFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Create form state
  const [createForm, setCreateForm] = useState({
    productName: '',
    machineId: '1',
    quantityProduced: 100,
    quantityRejected: 0,
    status: 'IN_PROGRESS',
    productionStart: toLocalDateTimeValue(),
    productionEnd: ''
  });

  // Edit form state
  const [editForm, setEditForm] = useState({
    productName: '',
    machineId: '1',
    quantityProduced: 0,
    quantityRejected: 0,
    status: 'IN_PROGRESS',
    productionStart: toLocalDateTimeValue(),
    productionEnd: ''
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
      const [batchData, machData] = await Promise.all([
        productionApi.getAll().catch(() => []),
        machinesApi.getAll().catch(() => [])
      ]);
      const batchList = Array.isArray(batchData) ? batchData : (batchData?.content || []);
      const machList = Array.isArray(machData) ? machData : (machData?.content || []);
      setBatches(batchList);
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

  // 1. CREATE BATCH
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!canMutate) {
      showToast('Permission Denied: Operator, Engineer, or Admin role required', 'error');
      return;
    }
    if (!createForm.productName.trim() || createForm.productName.trim().length < 2) {
      showToast('Product name must be at least 2 characters', 'error');
      return;
    }

    setActionLoading(true);
    try {
      await productionApi.create({
        productName: createForm.productName.trim(),
        machineId: Number(createForm.machineId) || 1,
        quantityProduced: Math.max(0, Number(createForm.quantityProduced) || 0),
        quantityRejected: Math.max(0, Number(createForm.quantityRejected) || 0),
        status: createForm.status,
        productionStart: toBackendLocalDateTime(createForm.productionStart || new Date()),
        productionEnd: createForm.productionEnd ? toBackendLocalDateTime(createForm.productionEnd) : null
      });
      showToast(`Batch '${createForm.productName.trim()}' created successfully.`);
      setShowCreateModal(false);
      setCreateForm({
        productName: '',
        machineId: machines.length > 0 ? String(machines[0].id) : '1',
        quantityProduced: 100,
        quantityRejected: 0,
        status: 'IN_PROGRESS',
        productionStart: toLocalDateTimeValue(),
        productionEnd: ''
      });
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to create production batch', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 2. OPEN EDIT MODAL
  const handleOpenEdit = (batch) => {
    setEditingBatch(batch);
    setEditForm({
      productName: batch.productName || batch.partName || '',
      machineId: String(batch.machineId || batch.machine?.id || (machines[0]?.id || '1')),
      quantityProduced: Number(batch.quantityProduced ?? batch.actualUnits ?? 0),
      quantityRejected: Number(batch.quantityRejected ?? batch.scrapUnits ?? batch.defects ?? 0),
      status: (batch.status || 'IN_PROGRESS').toUpperCase(),
      productionStart: batch.productionStart ? toLocalDateTimeValue(batch.productionStart) : toLocalDateTimeValue(),
      productionEnd: batch.productionEnd ? toLocalDateTimeValue(batch.productionEnd) : ''
    });
  };

  // 3. UPDATE BATCH
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingBatch) return;
    if (!canMutate) {
      showToast('Permission Denied: Operator, Engineer, or Admin role required', 'error');
      return;
    }
    if (!editForm.productName.trim() || editForm.productName.trim().length < 2) {
      showToast('Product name must be at least 2 characters', 'error');
      return;
    }

    setActionLoading(true);
    const payload = {
      productName: editForm.productName.trim(),
      machineId: Number(editForm.machineId) || 1,
      quantityProduced: Math.max(0, Number(editForm.quantityProduced) || 0),
      quantityRejected: Math.max(0, Number(editForm.quantityRejected) || 0),
      status: editForm.status,
      productionStart: toBackendLocalDateTime(editForm.productionStart || new Date()),
      productionEnd: editForm.productionEnd ? toBackendLocalDateTime(editForm.productionEnd) : null
    };

    try {
      setBatches(prev =>
        prev.map(b => (b.id === editingBatch.id ? { ...b, ...payload } : b))
      );

      await productionApi.update(editingBatch.id, payload);
      showToast(`Batch BAT-${String(editingBatch.id).padStart(3, '0')} updated successfully.`);
      setEditingBatch(null);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to update production batch', 'error');
      fetchData();
    } finally {
      setActionLoading(false);
    }
  };

  // 4. QUICK TOGGLE STATUS (IN_PROGRESS / SCHEDULED <-> COMPLETED)
  const handleToggleComplete = async (batch) => {
    if (!canMutate) {
      showToast('Permission Denied: Authorization required to update batch status', 'error');
      return;
    }
    const isCompleted = (batch.status || '').toUpperCase() === 'COMPLETED';
    const nextStatus = isCompleted ? 'IN_PROGRESS' : 'COMPLETED';
    const nextEnd = nextStatus === 'COMPLETED'
      ? (batch.productionEnd ? toBackendLocalDateTime(batch.productionEnd) : toBackendLocalDateTime(new Date()))
      : null;

    const payload = {
      productName: batch.productName || batch.partName || `Batch #${batch.id}`,
      machineId: Number(batch.machineId || batch.machine?.id || 1),
      quantityProduced: Math.max(0, Number(batch.quantityProduced ?? batch.actualUnits ?? 0)),
      quantityRejected: Math.max(0, Number(batch.quantityRejected ?? batch.scrapUnits ?? batch.defects ?? 0)),
      status: nextStatus,
      productionStart: toBackendLocalDateTime(batch.productionStart || new Date()),
      productionEnd: nextEnd
    };

    // Optimistic update
    setBatches(prev =>
      prev.map(b => (b.id === batch.id ? { ...b, status: nextStatus, productionEnd: nextEnd } : b))
    );

    try {
      await productionApi.update(batch.id, payload);
      showToast(`Batch BAT-${String(batch.id).padStart(3, '0')} marked ${nextStatus}.`);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to update batch status', 'error');
      fetchData();
    }
  };

  // 5. DELETE BATCH
  const handleDelete = async (batch) => {
    if (!canDelete) {
      showToast('Permission Denied: Admin role required to delete production batches', 'error');
      return;
    }
    if (!window.confirm(`Are you sure you want to permanently delete batch BAT-${String(batch.id).padStart(3, '0')} (${batch.productName || 'Production Batch'})?`)) {
      return;
    }

    try {
      await productionApi.delete(batch.id);
      showToast(`Batch BAT-${String(batch.id).padStart(3, '0')} permanently deleted.`);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to delete production batch', 'error');
    }
  };

  const operatorMachineIds = new Set(
    machines.filter(m => Number(m.plantId || m.plant?.id || 1) === Number(assignedPlantId)).map(m => Number(m.id))
  );
  const roleScopedBatches = isOperator
    ? batches.filter(b => operatorMachineIds.has(Number(b.machineId || b.machine?.id)))
    : batches;

  const batchesByMachine = machineFilter === 'ALL'
    ? roleScopedBatches
    : roleScopedBatches.filter(b => Number(b.machineId || b.machine?.id) === Number(machineFilter));

  const completedCount = batchesByMachine.filter(b => (b.status || '').toUpperCase() === 'COMPLETED').length;
  const inProgressCount = batchesByMachine.filter(b => (b.status || '').toUpperCase() === 'IN_PROGRESS').length;
  const scheduledCount = batchesByMachine.filter(b => (b.status || '').toUpperCase() === 'SCHEDULED').length;

  const filteredBatches = batchesByMachine.filter(b => {
    const q = searchTerm.trim().toLowerCase();
    const machId = Number(b.machineId || b.machine?.id || 0);
    const assignedMach = machines.find(m => m.id === machId);
    const matchesSearch = !q ||
      (b.productName || b.partName || '').toLowerCase().includes(q) ||
      (b.batchCode || b.batchNumber || `bat-${String(b.id).padStart(3, '0')}`).toLowerCase().includes(q) ||
      String(b.id).includes(q) ||
      (b.status || '').toLowerCase().includes(q) ||
      (assignedMach?.name || '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'ALL' || (b.status || '').toUpperCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="pbi-admin-container">
      {/* Top Banner */}
      <div className="pbi-admin-top-banner">
        <div className="pbi-admin-top-left">
          <div className="pbi-admin-top-icon" style={{ color: '#A855F7', background: 'rgba(168, 85, 247, 0.1)', borderColor: 'rgba(168, 85, 247, 0.3)' }}>
            <Layers size={24} />
          </div>
          <div>
            <div className="pbi-admin-top-title">Production Batches &amp; Yield Analytics</div>
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
            placeholder="Search batch, product, or asset..."
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
            <Cpu size={13} color="#A855F7" style={{ position: 'absolute', left: '10px', pointerEvents: 'none' }} />
            <select
              className="pbi-form-input"
              style={{
                height: '34px',
                paddingLeft: '30px',
                paddingRight: '14px',
                fontSize: '11.5px',
                fontWeight: 600,
                color: machineFilter === 'ALL' ? '#CBD5E1' : '#D8B4FE',
                borderColor: machineFilter === 'ALL' ? 'var(--pbi-border)' : '#A855F7',
                background: machineFilter === 'ALL' ? '#0E1422' : 'rgba(168, 85, 247, 0.12)',
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

        {/* Batch Status Slicer Chiclets */}
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
              <span className="pbi-slicer-badge">{batchesByMachine.length}</span>
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
          </div>
        </div>
      </div>

      {/* Matrix Table Card with Single Create Batch Button */}
      <div className="pbi-visual-card" style={{ width: '100%', boxSizing: 'border-box' }}>
        <div className="pbi-visual-header">
          <div>
            <div className="pbi-visual-title">Production Batches Execution Matrix</div>
          </div>

          {canMutate && (
            <div className="pbi-visual-actions">
              <button
                type="button"
                className="pbi-btn-action-sm pbi-btn-action-gold"
                onClick={() => {
                  setCreateForm(prev => ({ ...prev, productionStart: toLocalDateTimeValue() }));
                  setShowCreateModal(true);
                }}
                style={{ height: '30px', padding: '0 14px' }}
              >
                <Plus size={14} />
                <span>Create Batch</span>
              </button>
            </div>
          )}
        </div>

        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table className="pbi-matrix-table" style={{ width: '100%', tableLayout: 'auto' }}>
            <thead>
              <tr>
                <th style={{ width: '78px', padding: '10px 8px' }}>Batch ID</th>
                <th style={{ padding: '10px 10px' }}>Product &amp; Machine</th>
                <th style={{ width: '92px', padding: '10px 8px' }}>Produced</th>
                <th style={{ width: '125px', padding: '10px 8px' }}>Yield / Scrap</th>
                <th style={{ width: '108px', padding: canMutate ? '10px 8px' : '10px 14px', textAlign: canMutate ? 'left' : 'right' }}>Status</th>
                {canMutate && (
                  <th style={{ width: '202px', textAlign: 'right', padding: '10px 14px', whiteSpace: 'nowrap' }}>Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredBatches.length === 0 && (
                <tr>
                  <td colSpan={canMutate ? 6 : 5} style={{ textAlign: 'center', padding: '36px', color: '#94A3B8' }}>
                    No production batches found matching the selected filters.
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
              {filteredBatches.map((b) => {
                const produced = Number(b.quantityProduced ?? b.actualUnits ?? 0);
                const rejected = Number(b.quantityRejected ?? b.scrapUnits ?? b.defects ?? 0);
                const totalAttempted = produced + rejected;
                const yieldPct = totalAttempted > 0 ? Math.round((produced / totalAttempted) * 100) : 100;
                const statusUpper = (b.status || 'IN_PROGRESS').toUpperCase();
                const isCompleted = statusUpper === 'COMPLETED';
                const machId = Number(b.machineId || b.machine?.id || 1);
                const assignedMach = machines.find(m => m.id === machId);

                return (
                  <tr key={b.id}>
                    {/* Column 1: Batch Code */}
                    <td style={{ padding: '10px 8px', fontFamily: 'var(--pbi-font-mono)', color: '#A855F7', fontWeight: 700, fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                      {b.batchCode || b.batchNumber || `BAT-${String(b.id).padStart(3, '0')}`}
                    </td>

                    {/* Column 2: Product & Machine */}
                    <td style={{ padding: '10px 10px' }}>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: '#FFFFFF', letterSpacing: '-0.01em' }}>
                        {b.productName || b.partName || `Precision Alloy Component #${b.id}`}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', fontSize: '11px', color: '#94A3B8' }}>
                        <Cpu size={11} color="#00BCF2" />
                        <span>{assignedMach ? assignedMach.name : `Machine #${machId}`}</span>
                      </div>
                    </td>

                    {/* Column 3: Produced Units */}
                    <td style={{ padding: '10px 8px', fontFamily: 'var(--pbi-font-mono)', fontWeight: 700, color: '#FFFFFF', fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {produced.toLocaleString()} <span style={{ color: '#64748B', fontWeight: 500, fontSize: '10.5px' }}>u</span>
                    </td>

                    {/* Column 4: Yield & Scrap (Compact Inline) */}
                    <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div className="pbi-cell-bar-track" style={{ width: '44px', height: '5px', background: '#0E1422', borderRadius: '3px', flexShrink: 0 }}>
                          <div
                            className="pbi-cell-bar-fill"
                            style={{
                              width: `${yieldPct}%`,
                              background: yieldPct >= 95 ? '#10B981' : (yieldPct >= 85 ? '#F59E0B' : '#EF4444'),
                              borderRadius: '3px'
                            }}
                          />
                        </div>
                        <span style={{ fontWeight: 700, fontSize: '11px', fontFamily: 'var(--pbi-font-mono)', color: yieldPct >= 95 ? '#10B981' : '#F59E0B' }}>
                          {yieldPct}%
                        </span>
                        <span style={{ fontSize: '10.5px', fontFamily: 'var(--pbi-font-mono)', color: rejected > 0 ? '#EF4444' : '#64748B' }}>
                          ({rejected} rej)
                        </span>
                      </div>
                    </td>

                    {/* Column 5: Status */}
                    <td style={{ padding: canMutate ? '10px 8px' : '10px 14px', whiteSpace: 'nowrap', textAlign: canMutate ? 'left' : 'right' }}>
                      <span className={`pbi-status-pill ${isCompleted ? 'pbi-status-running' : 'pbi-status-idle'}`}>
                        <span className="pbi-status-dot" />
                        <span>{statusUpper}</span>
                      </span>
                    </td>

                    {/* Column 6: Actions - Authorized Roles Only */}
                    {canMutate && (
                      <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '5px', flexWrap: 'nowrap' }}>
                          {/* Complete / Reopen Toggle */}
                          <button
                            type="button"
                            className={`pbi-btn-action-sm ${isCompleted ? 'pbi-btn-toggle-offline' : 'pbi-btn-toggle-online'}`}
                            onClick={() => handleToggleComplete(b)}
                            title={isCompleted ? 'Reopen batch to IN_PROGRESS' : 'Mark batch as COMPLETED'}
                          >
                            {isCompleted ? <Power size={11} /> : <CheckCircle2 size={11} />}
                            <span>{isCompleted ? 'Reopen' : 'Done'}</span>
                          </button>

                          {/* Edit Button */}
                          <button
                            type="button"
                            className="pbi-btn-action-sm pbi-btn-action-primary"
                            onClick={() => handleOpenEdit(b)}
                            title="Edit production batch"
                          >
                            <Pencil size={11} />
                            <span>Edit</span>
                          </button>

                          {/* Delete Button */}
                          {canDelete && (
                            <button
                              type="button"
                              className="pbi-btn-action-sm pbi-btn-action-danger"
                              onClick={() => handleDelete(b)}
                              title="Delete production batch (Admin authorization required)"
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
      {/* MODAL 1: CREATE PRODUCTION BATCH */}
      {/* ============================================================== */}
      {showCreateModal && (
        <div className="pbi-modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="pbi-modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="pbi-modal-header">
              <div className="pbi-modal-title">
                <Layers size={18} color="#F2C811" />
                <span>Create Production Batch</span>
              </div>
              <button type="button" className="pbi-modal-close" onClick={() => setShowCreateModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="pbi-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label className="pbi-form-label">Product / Part Name *</label>
                  <input
                    type="text"
                    className="pbi-form-input"
                    placeholder="e.g., Titanium Aerospace Rotor Shaft"
                    value={createForm.productName}
                    onChange={(e) => setCreateForm({ ...createForm, productName: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="pbi-form-label">Assigned Machine *</label>
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

                  <div>
                    <label className="pbi-form-label">Batch Status *</label>
                    <select
                      className="pbi-form-input"
                      value={createForm.status}
                      onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
                    >
                      {BATCH_STATUSES.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="pbi-form-label">Quantity Produced *</label>
                    <input
                      type="number"
                      min="0"
                      className="pbi-form-input"
                      value={createForm.quantityProduced}
                      onChange={(e) => setCreateForm({ ...createForm, quantityProduced: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="pbi-form-label">Quantity Rejected (Scrap) *</label>
                    <input
                      type="number"
                      min="0"
                      className="pbi-form-input"
                      value={createForm.quantityRejected}
                      onChange={(e) => setCreateForm({ ...createForm, quantityRejected: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="pbi-form-label">Production Start *</label>
                    <input
                      type="datetime-local"
                      className="pbi-form-input"
                      value={createForm.productionStart}
                      onChange={(e) => setCreateForm({ ...createForm, productionStart: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="pbi-form-label">Production End (Optional)</label>
                    <input
                      type="datetime-local"
                      className="pbi-form-input"
                      value={createForm.productionEnd}
                      onChange={(e) => setCreateForm({ ...createForm, productionEnd: e.target.value })}
                    />
                  </div>
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
                  <span>{actionLoading ? 'Creating...' : 'Create Batch'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: EDIT PRODUCTION BATCH */}
      {/* ============================================================== */}
      {editingBatch && (
        <div className="pbi-modal-backdrop" onClick={() => setEditingBatch(null)}>
          <div className="pbi-modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="pbi-modal-header">
              <div className="pbi-modal-title">
                <Pencil size={16} color="#00BCF2" />
                <span>Edit Batch BAT-{String(editingBatch.id).padStart(3, '0')}</span>
              </div>
              <button type="button" className="pbi-modal-close" onClick={() => setEditingBatch(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="pbi-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label className="pbi-form-label">Product / Part Name *</label>
                  <input
                    type="text"
                    className="pbi-form-input"
                    value={editForm.productName}
                    onChange={(e) => setEditForm({ ...editForm, productName: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="pbi-form-label">Assigned Machine *</label>
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

                  <div>
                    <label className="pbi-form-label">Batch Status *</label>
                    <select
                      className="pbi-form-input"
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    >
                      {!BATCH_STATUSES.includes(editForm.status) && (
                        <option value={editForm.status}>{editForm.status}</option>
                      )}
                      {BATCH_STATUSES.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="pbi-form-label">Quantity Produced *</label>
                    <input
                      type="number"
                      min="0"
                      className="pbi-form-input"
                      value={editForm.quantityProduced}
                      onChange={(e) => setEditForm({ ...editForm, quantityProduced: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="pbi-form-label">Quantity Rejected (Scrap) *</label>
                    <input
                      type="number"
                      min="0"
                      className="pbi-form-input"
                      value={editForm.quantityRejected}
                      onChange={(e) => setEditForm({ ...editForm, quantityRejected: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="pbi-form-label">Production Start *</label>
                    <input
                      type="datetime-local"
                      className="pbi-form-input"
                      value={editForm.productionStart}
                      onChange={(e) => setEditForm({ ...editForm, productionStart: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="pbi-form-label">Production End (Optional)</label>
                    <input
                      type="datetime-local"
                      className="pbi-form-input"
                      value={editForm.productionEnd}
                      onChange={(e) => setEditForm({ ...editForm, productionEnd: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="pbi-modal-footer">
                <button type="button" className="pbi-ribbon-btn" onClick={() => setEditingBatch(null)}>
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
