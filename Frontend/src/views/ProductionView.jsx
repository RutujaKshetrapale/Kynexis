import React, { useState, useEffect } from 'react';
import { productionApi, machinesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { 
  Boxes, 
  Plus, 
  Search, 
  Cpu, 
  AlertOctagon, 
  Edit2, 
  Trash2,
  TrendingUp,
  CheckCircle2,
  BarChart3
} from 'lucide-react';

export default function ProductionView() {
  const { hasRole } = useAuth();
  const [production, setProduction] = useState([]);
  const [machines, setMachines] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    machineId: '1',
    productName: '',
    quantityProduced: 500,
    quantityRejected: 8,
    status: 'IN_PROGRESS',
    productionStart: new Date().toISOString().slice(0, 16)
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      const [prodList, machList, metrics] = await Promise.all([
        productionApi.getAll(),
        machinesApi.getAll(),
        productionApi.getMetricsSummary()
      ]);
      setProduction(Array.isArray(prodList) ? prodList : []);
      setMachines(machList || []);
      setSummary(metrics);
    } catch (err) {
      console.error('Failed to load production data:', err);
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
      productName: '',
      quantityProduced: 500,
      quantityRejected: 8,
      status: 'IN_PROGRESS',
      productionStart: new Date().toISOString().slice(0, 16)
    });
    setError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      machineId: String(item.machineId),
      productName: item.productName,
      quantityProduced: item.quantityProduced,
      quantityRejected: item.quantityRejected,
      status: item.status,
      productionStart: item.productionStart ? item.productionStart.slice(0, 16) : new Date().toISOString().slice(0, 16)
    });
    setError('');
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Delete Batch #${id}? Admin privileges required.`)) return;
    try {
      await productionApi.delete(id);
      await fetchData();
    } catch (err) {
      alert(`Deletion failed: ${err.message}`);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.productName.trim()) {
      setError('Product batch name is required.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        machineId: Number(formData.machineId),
        productName: formData.productName,
        quantityProduced: Number(formData.quantityProduced),
        quantityRejected: Number(formData.quantityRejected),
        productionStart: formData.productionStart ? `${formData.productionStart}:00` : new Date().toISOString(),
        productionEnd: formData.status === 'COMPLETED' ? new Date().toISOString() : null,
        status: formData.status
      };

      if (editingItem) {
        await productionApi.update(editingItem.id, payload);
      } else {
        await productionApi.create(payload);
      }
      setModalOpen(false);
      await fetchData();
    } catch (err) {
      setError(err.message || 'Operation failed.');
    } finally {
      setSaving(false);
    }
  };

  const totalProduced = summary?.totalProduction ?? production.reduce((acc, p) => acc + (p.quantityProduced || 0), 0);
  const totalRejected = summary?.rejectedProduction ?? production.reduce((acc, p) => acc + (p.quantityRejected || 0), 0);
  const goodUnits = Math.max(0, totalProduced - totalRejected);
  const yieldRate = totalProduced > 0 ? ((goodUnits / totalProduced) * 100).toFixed(1) : '100.0';
  const scrapRate = totalProduced > 0 ? ((totalRejected / totalProduced) * 100).toFixed(2) : '0.00';
  const activeBatches = production.filter(p => p.status === 'IN_PROGRESS').length;

  const filteredProduction = production.filter((p) => {
    const matchesSearch = (p.productName || '').toLowerCase().includes(searchTerm.toLowerCase());
    if (statusFilter !== 'ALL') return matchesSearch && p.status === statusFilter;
    return matchesSearch;
  });

  // Calculate machine volume breakdown for actual chart & asset cards
  const sortedMachineVolumes = [...machines].map(m => {
    const machineBatches = production.filter(p => Number(p.machineId) === Number(m.id));
    const volume = machineBatches.reduce((sum, b) => sum + (b.quantityProduced || 0), 0);
    const scrap = machineBatches.reduce((sum, b) => sum + (b.quantityRejected || 0), 0);
    const goodUnits = Math.max(0, volume - scrap);
    const yieldRate = volume > 0 ? ((goodUnits / volume) * 100).toFixed(1) : '100.0';
    return {
      id: m.id,
      name: m.name,
      type: m.type || 'Industrial Asset',
      status: m.status || 'ACTIVE',
      volume,
      scrap,
      goodUnits,
      yieldRate,
      batchCount: machineBatches.length
    };
  }).sort((a, b) => b.volume - a.volume);

  const totalFleetVolume = sortedMachineVolumes.reduce((acc, m) => acc + m.volume, 0);
  const totalFleetScrap = sortedMachineVolumes.reduce((acc, m) => acc + m.scrap, 0);
  const fleetYield = totalFleetVolume > 0 
    ? (((totalFleetVolume - totalFleetScrap) / totalFleetVolume) * 100).toFixed(1) 
    : '100.0';
  const maxMachineVolume = Math.max(1, ...sortedMachineVolumes.map(m => m.volume));

  return (
    <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Header & Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
            Production
          </h1>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0' }}>
            Batch execution, output volume and first-pass yield tracking
          </p>
        </div>

        {hasRole(['ADMIN', 'ENGINEER']) && (
          <button 
            type="button" 
            className="btn-record-batch" 
            onClick={handleOpenCreate}
            title="Schedule and record a new production batch"
          >
            <span className="btn-record-batch-icon">
              <Plus size={14} />
            </span>
            <span>Record Batch</span>
          </button>
        )}
      </div>

      {/* Production KPIs Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Gross Output</span>
            <Boxes size={16} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff', margin: '0.35rem 0' }}>
            {totalProduced.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Total manufactured units</span>
        </div>

        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Passed Quality</span>
            <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--success)', margin: '0.35rem 0' }}>
            {goodUnits.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--success)', fontWeight: 600 }}>
            {yieldRate}% First-Pass Yield
          </span>
        </div>

        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Scrap Defects</span>
            <AlertOctagon size={16} style={{ color: totalRejected > 0 ? 'var(--danger)' : 'var(--text-muted)' }} />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: totalRejected > 0 ? 'var(--danger)' : '#fff', margin: '0.35rem 0' }}>
            {totalRejected.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{scrapRate}% Defect rate</span>
        </div>

        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Active Batches</span>
            <TrendingUp size={16} style={{ color: 'var(--accent-cyan)' }} />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff', margin: '0.35rem 0' }}>
            {activeBatches}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Lines in continuous run</span>
        </div>
      </div>

      {/* Redesigned Manufactured Volume by Asset Section */}
      <div className="asset-volume-container">
        <div className="asset-volume-header">
          <div className="asset-volume-title-group">
            <div className="asset-volume-icon-badge">
              <BarChart3 size={18} />
            </div>
            <div>
              <h2 className="asset-volume-title">Manufactured Volume by Asset</h2>
              <div className="asset-volume-subtitle">
                Live output metrics, first-pass yield and defect distribution across production cells
              </div>
            </div>
          </div>

          <div className="asset-volume-summary-pills">
            <div className="asset-summary-pill">
              <span>Fleet Output:</span>
              <strong>{totalFleetVolume.toLocaleString()} units</strong>
            </div>
            <div className="asset-summary-pill">
              <span>Fleet Yield:</span>
              <strong style={{ color: '#10B981' }}>{fleetYield}%</strong>
            </div>
            <div className="asset-summary-pill">
              <span>Producing Assets:</span>
              <strong>{sortedMachineVolumes.filter(m => m.volume > 0).length} / {machines.length}</strong>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginLeft: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: 'linear-gradient(90deg, #0066FF, #00D2FF)' }} />
                <span>Passed</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: '#EF4444' }} />
                <span>Scrap</span>
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Asset Volume Grid */}
        <div className="asset-volume-grid">
          {sortedMachineVolumes.map((mv) => {
            const goodPct = (mv.goodUnits / maxMachineVolume) * 100;
            const scrapPct = (mv.scrap / maxMachineVolume) * 100;
            const isHighYield = Number(mv.yieldRate) >= 95;
            const hasBatches = mv.volume > 0;

            return (
              <div key={mv.id} className="asset-volume-card">
                <div className="asset-card-top">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="asset-tag">#00{mv.id}</span>
                      <span className="asset-name">{mv.name}</span>
                    </div>
                    <div className="asset-type-badge">{mv.type}</div>
                  </div>

                  <div>
                    <div className="asset-volume-value">
                      {mv.volume.toLocaleString()} <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)' }}>units</span>
                    </div>
                    <div style={{ textAlign: 'right', marginTop: '2px' }}>
                      <span 
                        className={`badge ${isHighYield ? 'badge-online' : 'badge-warning'}`}
                        style={{ fontSize: '10px', padding: '1px 6px' }}
                      >
                        <span className="badge-dot" />
                        <span>{hasBatches ? `${mv.yieldRate}% Yield` : 'Standby'}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress bar track */}
                <div className="asset-volume-track">
                  {hasBatches ? (
                    <>
                      <div 
                        className="asset-bar-good" 
                        style={{ width: `${goodPct}%` }} 
                        title={`Passed: ${mv.goodUnits.toLocaleString()} units`}
                      />
                      <div 
                        className="asset-bar-scrap" 
                        style={{ width: `${scrapPct}%` }} 
                        title={`Scrap: ${mv.scrap} units`}
                      />
                    </>
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: 'rgba(255, 255, 255, 0.03)' }} />
                  )}
                </div>

                {/* Metrics breakdown footer */}
                <div className="asset-card-footer">
                  <div className="asset-metric-chip">
                    <span className="dot" style={{ background: '#38BDF8' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>Passed:</span>
                    <strong style={{ color: '#FFFFFF', fontFamily: 'var(--font-mono)' }}>{mv.goodUnits.toLocaleString()}</strong>
                  </div>

                  <div className="asset-metric-chip">
                    <span className="dot" style={{ background: mv.scrap > 0 ? '#EF4444' : 'var(--text-muted)' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>Scrap:</span>
                    <strong style={{ color: mv.scrap > 0 ? '#EF4444' : 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {mv.scrap}
                    </strong>
                  </div>

                  <div className="asset-metric-chip">
                    <span style={{ color: 'var(--text-muted)' }}>Share:</span>
                    <strong style={{ color: '#38BDF8', fontFamily: 'var(--font-mono)' }}>
                      {totalFleetVolume > 0 ? ((mv.volume / totalFleetVolume) * 100).toFixed(0) : 0}%
                    </strong>
                  </div>

                  <div className="asset-metric-chip">
                    <span style={{ color: 'var(--text-muted)' }}>Batches:</span>
                    <strong style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{mv.batchCount}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '0.35rem 0.75rem',
          width: 320,
          maxWidth: '100%'
        }}>
          <Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#fff',
              fontSize: '0.75rem',
              width: '100%'
            }}
            placeholder="Search batches by product name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {['ALL', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              style={{
                fontSize: '0.72rem',
                padding: '0.3rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid',
                borderColor: statusFilter === st ? 'var(--accent-primary)' : 'var(--border)',
                background: statusFilter === st ? 'var(--accent-primary)' : 'var(--surface)',
                color: statusFilter === st ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: 500,
                transition: 'all 0.15s ease'
              }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Querying batch run data from Production Service..." />
      ) : filteredProduction.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No Production Batches Found"
          description={searchTerm ? "No manufacturing runs match your search query." : "No production batches currently recorded."}
          actionLabel={hasRole(['ADMIN', 'ENGINEER']) ? 'Record First Batch' : undefined}
          onAction={handleOpenCreate}
        />
      ) : (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden'
        }}>
          <table className="kyn-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>BATCH ID</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>PRODUCT ITEM</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>EQUIPMENT LINE</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>OUTPUT UNITS</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>SCRAP / DEFECTS</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>YIELD RATE</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>STATUS</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right', fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredProduction.map((item) => {
                const machine = machines.find(m => m.id === item.machineId);
                const batchYield = item.quantityProduced > 0 
                  ? (((item.quantityProduced - item.quantityRejected) / item.quantityProduced) * 100).toFixed(1)
                  : '100.0';
                const isHighYield = Number(batchYield) >= 95;

                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-primary)', fontSize: '0.75rem' }}>
                      BAT-00{item.id}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#fff' }}>{item.productName}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        Started: {new Date(item.productionStart).toLocaleString()}
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                        <Cpu size={13} style={{ color: 'var(--accent-primary)' }} />
                        <span>{machine ? machine.name : `Machine #${item.machineId}`}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#fff', fontSize: '0.8rem' }}>
                        {item.quantityProduced.toLocaleString()}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: item.quantityRejected > 0 ? 'var(--danger)' : 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {item.quantityRejected}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: isHighYield ? 'var(--success)' : 'var(--warning)', fontSize: '0.78rem' }}>
                          {batchYield}%
                        </span>
                        <div style={{ width: 44, height: 4, background: '#131B28', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ width: `${batchYield}%`, height: '100%', background: isHighYield ? 'var(--success)' : 'var(--warning)' }} />
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <StatusBadge status={item.status} />
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <div className="action-btn-group">
                        {hasRole(['ADMIN', 'ENGINEER']) && (
                          <button
                            type="button"
                            className="action-btn action-btn-edit"
                            onClick={() => handleOpenEdit(item)}
                            title="Edit Batch Record"
                          >
                            <Edit2 size={12} />
                            <span>Edit</span>
                          </button>
                        )}
                        {hasRole('ADMIN') && (
                          <button
                            type="button"
                            className="action-btn action-btn-delete"
                            onClick={() => handleDelete(item.id)}
                            title="Delete Record (Admin Only)"
                          >
                            <Trash2 size={12} />
                            <span>Delete</span>
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

      {/* Record / Edit Batch Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? `Edit Batch: ${editingItem.productName}` : 'Schedule Production Batch'}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn-record-batch" onClick={handleSave} disabled={saving}>
              <span className="btn-record-batch-icon">
                {editingItem ? <Edit2 size={13} /> : <Plus size={13} />}
              </span>
              <span>{saving ? 'Saving...' : editingItem ? 'Update Batch' : 'Dispatch Batch'}</span>
            </button>
          </>
        }
      >
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && (
            <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--danger)', fontSize: '0.8rem' }}>
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="prod-name" style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Product / Component Name</label>
            <input
              id="prod-name"
              type="text"
              className="form-input"
              value={formData.productName}
              onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
              placeholder="e.g. Engine Block Casting v2"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="prod-machine" style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Target Machinery Line</label>
            <select
              id="prod-machine"
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="prod-qty" style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Total Units Produced</label>
              <input
                id="prod-qty"
                type="number"
                min="1"
                className="form-input"
                value={formData.quantityProduced}
                onChange={(e) => setFormData({ ...formData, quantityProduced: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="prod-scrap" style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Defective / Scrap Units</label>
              <input
                id="prod-scrap"
                type="number"
                min="0"
                className="form-input"
                value={formData.quantityRejected}
                onChange={(e) => setFormData({ ...formData, quantityRejected: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="prod-status" style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Batch Execution Status</label>
            <select
              id="prod-status"
              className="form-select"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="IN_PROGRESS">IN_PROGRESS (Currently Running)</option>
              <option value="COMPLETED">COMPLETED (Run Finished)</option>
              <option value="CANCELLED">CANCELLED (Aborted)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="prod-start" style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Shift Start Date & Time</label>
            <input
              id="prod-start"
              type="datetime-local"
              className="form-input"
              value={formData.productionStart}
              onChange={(e) => setFormData({ ...formData, productionStart: e.target.value })}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
