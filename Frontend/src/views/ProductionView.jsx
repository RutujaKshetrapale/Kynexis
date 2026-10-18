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
  TrendingUp, 
  CheckCircle, 
  AlertOctagon, 
  Clock, 
  Edit2, 
  Trash2 
} from 'lucide-react';

export default function ProductionView() {
  const { hasRole } = useAuth();
  const [production, setProduction] = useState([]);
  const [machines, setMachines] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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
  const yieldRate = totalProduced > 0 ? (((totalProduced - totalRejected) / totalProduced) * 100).toFixed(1) : 100;
  const scrapRate = totalProduced > 0 ? ((totalRejected / totalProduced) * 100).toFixed(2) : 0;

  const filteredProduction = production.filter((p) =>
    p.productName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Boxes style={{ color: 'var(--neon-amber)' }} />
            Factory Production Yield & Batch Quality
          </h1>
          <p className="page-description">
            Overall Equipment Effectiveness (OEE), batch production volume, and scrap defect tracking
          </p>
        </div>
        {hasRole(['ADMIN', 'ENGINEER']) && (
          <button type="button" className="btn btn-primary" onClick={handleOpenCreate}>
            <Plus size={16} />
            Record Production Batch
          </button>
        )}
      </div>

      {/* Production Metrics Overview */}
      <div className="grid-cols-4" style={{ marginBottom: '2rem' }}>
        <div className="kpi-card">
          <div className="kpi-icon-wrap kpi-icon-amber">
            <Boxes size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-title">Gross Output</span>
            <span className="kpi-value">{totalProduced.toLocaleString()}</span>
            <span className="kpi-sub">Total Units Manufactured</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap kpi-icon-emerald">
            <CheckCircle size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-title">Passed Quality</span>
            <span className="kpi-value">{(totalProduced - totalRejected).toLocaleString()}</span>
            <span className="kpi-sub" style={{ color: 'var(--neon-emerald)' }}>{yieldRate}% Yield Rate</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap kpi-icon-crimson">
            <AlertOctagon size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-title">Defect Scrap</span>
            <span className="kpi-value" style={{ color: '#f87171' }}>{totalRejected}</span>
            <span className="kpi-sub">{scrapRate}% Defect Tolerance</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap kpi-icon-cyan">
            <TrendingUp size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-title">Active Batches</span>
            <span className="kpi-value">
              {production.filter(p => p.status === 'IN_PROGRESS').length}
            </span>
            <span className="kpi-sub">On Active Production Lines</span>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="form-input"
            placeholder="Search batches by component name (e.g. Engine Block, Chassis Bracket)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Calculating batch telemetry from Production Service (:8086)..." />
      ) : filteredProduction.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No Production Batches Found"
          description="No manufactured batches match your filter."
          actionLabel={hasRole(['ADMIN', 'ENGINEER']) ? 'Record First Batch' : undefined}
          onAction={handleOpenCreate}
        />
      ) : (
        <div className="table-wrap">
          <table className="industrial-table">
            <thead>
              <tr>
                <th>Batch ID</th>
                <th>Manufactured Component</th>
                <th>Production Equipment</th>
                <th>Units Produced</th>
                <th>Units Rejected</th>
                <th>Batch Scrap %</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProduction.map((batch) => {
                const machine = machines.find(m => m.id === batch.machineId);
                const batchScrap = batch.quantityProduced > 0 
                  ? ((batch.quantityRejected / batch.quantityProduced) * 100).toFixed(1) 
                  : '0.0';
                return (
                  <tr key={batch.id}>
                    <td style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: 'var(--neon-amber)' }}>
                      PRD-00{batch.id}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{batch.productName}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        <Clock size={11} />
                        Started: {new Date(batch.productionStart).toLocaleDateString()}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                        <Cpu size={14} style={{ color: 'var(--neon-purple)' }} />
                        <span>{machine ? machine.name : `Machine #${batch.machineId}`}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: '0.95rem' }}>
                        {batch.quantityProduced.toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: batch.quantityRejected > 0 ? '#f87171' : 'var(--text-secondary)' }}>
                        {batch.quantityRejected}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        color: Number(batchScrap) > 2 ? '#f87171' : 'var(--neon-emerald)',
                        fontWeight: 600
                      }}>
                        {batchScrap}%
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={batch.status} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        {hasRole(['ADMIN', 'ENGINEER']) && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleOpenEdit(batch)}
                            title="Edit Batch Record"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                        {hasRole('ADMIN') && (
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(batch.id)}
                            title="Delete Batch Record (Admin Only)"
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

      {/* Production Batch Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? `Edit Batch: PRD-00${editingItem.id}` : 'Record New Production Run'}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editingItem ? 'Update Batch' : 'Log Production'}
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
            <label className="form-label" htmlFor="prod-name">Product / Component Name</label>
            <input
              id="prod-name"
              type="text"
              className="form-input"
              value={formData.productName}
              onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
              placeholder="e.g. Engine Block Castings #A4"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="prod-machine">Production Machine Line</label>
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

          <div className="grid-cols-2" style={{ gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="prod-qty">Gross Units Produced</label>
              <input
                id="prod-qty"
                type="number"
                min="0"
                className="form-input"
                value={formData.quantityProduced}
                onChange={(e) => setFormData({ ...formData, quantityProduced: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="prod-rej">Defective Scrap Units</label>
              <input
                id="prod-rej"
                type="number"
                min="0"
                className="form-input"
                value={formData.quantityRejected}
                onChange={(e) => setFormData({ ...formData, quantityRejected: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid-cols-2" style={{ gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="prod-status">Batch Status</label>
              <select
                id="prod-status"
                className="form-select"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="COMPLETED">COMPLETED</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="prod-start">Shift Start Date & Time</label>
              <input
                id="prod-start"
                type="datetime-local"
                className="form-input"
                value={formData.productionStart}
                onChange={(e) => setFormData({ ...formData, productionStart: e.target.value })}
                required
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
