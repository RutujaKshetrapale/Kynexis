import React, { useState, useEffect } from 'react';
import { energyApi, machinesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { 
  Zap, 
  Plus, 
  Cpu, 
  Clock, 
  BatteryCharging, 
  Flame, 
  Edit2, 
  Trash2 
} from 'lucide-react';

export default function EnergyView() {
  const { hasRole } = useAuth();
  const [energyList, setEnergyList] = useState([]);
  const [machines, setMachines] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    machineId: '1',
    energyConsumption: 120.5,
    recordedAt: new Date().toISOString().slice(0, 16)
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      const [eList, machList, summary] = await Promise.all([
        energyApi.getAll(),
        machinesApi.getAll(),
        energyApi.getMetricsSummary()
      ]);
      setEnergyList(Array.isArray(eList) ? eList : []);
      setMachines(machList || []);
      setMetrics(summary);
    } catch (err) {
      console.error('Failed to load energy readings:', err);
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
      energyConsumption: 120.5,
      recordedAt: new Date().toISOString().slice(0, 16)
    });
    setError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      machineId: String(item.machineId),
      energyConsumption: item.energyConsumption,
      recordedAt: item.recordedAt ? item.recordedAt.slice(0, 16) : new Date().toISOString().slice(0, 16)
    });
    setError('');
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Delete Energy Log #${id}? Admin privileges required.`)) return;
    try {
      await energyApi.delete(id);
      await fetchData();
    } catch (err) {
      alert(`Deletion failed: ${err.message}`);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        machineId: Number(formData.machineId),
        energyConsumption: Number(formData.energyConsumption),
        recordedAt: formData.recordedAt ? `${formData.recordedAt}:00` : new Date().toISOString()
      };

      if (editingItem) {
        await energyApi.update(editingItem.id, payload);
      } else {
        await energyApi.create(payload);
      }
      setModalOpen(false);
      await fetchData();
    } catch (err) {
      setError(err.message || 'Operation failed.');
    } finally {
      setSaving(false);
    }
  };

  const totalConsumption = metrics?.totalEnergyConsumption ?? energyList.reduce((acc, e) => acc + (e.energyConsumption || 0), 0);
  const avgLoad = energyList.length > 0 ? (totalConsumption / energyList.length).toFixed(1) : 0;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Zap style={{ color: 'var(--neon-cyan)' }} />
            Factory Power & Energy Consumption (kWh)
          </h1>
          <p className="page-description">
            Sub-meter power monitoring across equipment lines, green sustainability index, and peak load trends
          </p>
        </div>
        {hasRole(['ADMIN', 'ENGINEER']) && (
          <button type="button" className="btn btn-primary" onClick={handleOpenCreate}>
            <Plus size={16} />
            Log Power Measurement
          </button>
        )}
      </div>

      {/* Energy Metrics KPI Grid */}
      <div className="grid-cols-4" style={{ marginBottom: '2rem' }}>
        <div className="kpi-card">
          <div className="kpi-icon-wrap kpi-icon-cyan">
            <Zap size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-title">Total Power Tracked</span>
            <span className="kpi-value">{totalConsumption.toLocaleString()}</span>
            <span className="kpi-sub">Kilowatt-Hours (kWh)</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap kpi-icon-amber">
            <Flame size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-title">Average Machine Load</span>
            <span className="kpi-value">{avgLoad}</span>
            <span className="kpi-sub">kWh per Operating Interval</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap kpi-icon-emerald">
            <Leaf size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-title">ISO 50001 Eco Index</span>
            <span className="kpi-value" style={{ color: 'var(--neon-emerald)' }}>94.8%</span>
            <span className="kpi-sub">Within Target Efficiency Band</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap kpi-icon-purple">
            <BatteryCharging size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-title">Metered Assets</span>
            <span className="kpi-value">{machines.length}</span>
            <span className="kpi-sub">Sub-Metered Feeds</span>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Aggregating power telemetry from Energy Service (:8087)..." />
      ) : energyList.length === 0 ? (
        <EmptyState
          icon={Zap}
          title="No Energy Telemetry Logged"
          description="No power meter intervals currently recorded."
          actionLabel={hasRole(['ADMIN', 'ENGINEER']) ? 'Log First Measurement' : undefined}
          onAction={handleOpenCreate}
        />
      ) : (
        <div className="table-wrap">
          <table className="industrial-table">
            <thead>
              <tr>
                <th>Log ID</th>
                <th>Metered Asset</th>
                <th>Power Consumption</th>
                <th>Measurement Interval</th>
                <th>Efficiency Assessment</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {energyList.map((item) => {
                const machine = machines.find(m => m.id === item.machineId);
                const isHeavyLoad = item.energyConsumption > 140;
                return (
                  <tr key={item.id}>
                    <td style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: 'var(--neon-cyan)' }}>
                      NRG-00{item.id}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                        <Cpu size={14} style={{ color: 'var(--neon-purple)' }} />
                        <span>{machine ? machine.name : `Machine #${item.machineId}`}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, fontSize: '1rem', color: isHeavyLoad ? '#fbbf24' : 'var(--neon-cyan)' }}>
                        {item.energyConsumption} kWh
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}>
                        <Clock size={12} />
                        {new Date(item.recordedAt).toLocaleString()}
                      </div>
                    </td>
                    <td>
                      {isHeavyLoad ? (
                        <span className="badge badge-warning">HEAVY PEAK LOAD</span>
                      ) : (
                        <span className="badge badge-healthy">OPTIMAL CONSUMPTION</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        {hasRole(['ADMIN', 'ENGINEER']) && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleOpenEdit(item)}
                            title="Edit Energy Entry"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                        {hasRole('ADMIN') && (
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(item.id)}
                            title="Delete Energy Entry (Admin Only)"
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

      {/* Energy Log Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? `Edit Energy Entry: NRG-00${editingItem.id}` : 'Log Power Sub-Meter Measurement'}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editingItem ? 'Update Log' : 'Record Power (kWh)'}
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
            <label className="form-label" htmlFor="energy-machine">Metered Equipment</label>
            <select
              id="energy-machine"
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
              <label className="form-label" htmlFor="energy-val">Power Consumption (kWh)</label>
              <input
                id="energy-val"
                type="number"
                step="0.1"
                min="0"
                className="form-input"
                value={formData.energyConsumption}
                onChange={(e) => setFormData({ ...formData, energyConsumption: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="energy-date">Timestamp Interval</label>
              <input
                id="energy-date"
                type="datetime-local"
                className="form-input"
                value={formData.recordedAt}
                onChange={(e) => setFormData({ ...formData, recordedAt: e.target.value })}
                required
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
