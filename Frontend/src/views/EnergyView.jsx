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
  Trash2,
  BarChart3
} from 'lucide-react';

export default function EnergyView() {
  const { hasRole } = useAuth();
  const [energyList, setEnergyList] = useState([]);
  const [machines, setMachines] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('ALL');
  const [selectedMachineFilter, setSelectedMachineFilter] = useState('ALL');

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
  const avgLoad = energyList.length > 0 ? (totalConsumption / energyList.length).toFixed(1) : '0.0';
  
  // Find highest peak reading
  const peakItem = energyList.length > 0 
    ? [...energyList].sort((a, b) => (b.energyConsumption || 0) - (a.energyConsumption || 0))[0] 
    : null;
  const peakMachine = peakItem ? machines.find(m => m.id === peakItem.machineId) : null;

  // Filtered readings
  const filteredEnergy = energyList.filter(item => {
    if (selectedMachineFilter !== 'ALL' && item.machineId !== Number(selectedMachineFilter)) {
      return false;
    }
    return true;
  });

  // Calculate machine energy breakdown for visual chart
  const machineBreakdowns = machines.map(m => {
    const logs = energyList.filter(e => e.machineId === m.id);
    const sum = logs.reduce((acc, l) => acc + (l.energyConsumption || 0), 0);
    const avg = logs.length > 0 ? (sum / logs.length).toFixed(1) : 0;
    return { id: m.id, name: m.name, sum: Math.round(sum * 10) / 10, avg, count: logs.length };
  }).filter(m => m.sum > 0);

  const maxMachineLoad = Math.max(1, ...machineBreakdowns.map(m => m.sum));

  return (
    <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
            Energy Analytics
          </h1>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0' }}>
            Sub-meter power telemetry across assets, peak load trends, and energy consumption logs
          </p>
        </div>

        {hasRole(['ADMIN', 'ENGINEER']) && (
          <button 
            type="button" 
            className="kyn-btn-primary" 
            onClick={handleOpenCreate}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}
          >
            <Plus size={14} />
            Log Power Measurement
          </button>
        )}
      </div>

      {/* Energy Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total Power Tracked</span>
            <Zap size={16} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff', margin: '0.35rem 0' }}>
            {totalConsumption.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Kilowatt-Hours (kWh)</span>
        </div>

        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Average Machine Load</span>
            <Flame size={16} style={{ color: 'var(--warning)' }} />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff', margin: '0.35rem 0' }}>
            {avgLoad}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>kWh per logged interval</span>
        </div>

        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Peak Demand Peak</span>
            <BatteryCharging size={16} style={{ color: 'var(--danger)' }} />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--danger)', margin: '0.35rem 0' }}>
            {peakItem ? `${peakItem.energyConsumption} kWh` : '0 kWh'}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{peakMachine ? peakMachine.name : 'Nominal load'}</span>
        </div>

        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Sub-Metered Assets</span>
            <Cpu size={16} style={{ color: 'var(--accent-cyan)' }} />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff', margin: '0.35rem 0' }}>
            {machineBreakdowns.length}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Connected telemetry feeds</span>
        </div>
      </div>

      {/* Machine Energy Consumption Breakdown Chart */}
      {machineBreakdowns.length > 0 && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BarChart3 size={15} style={{ color: 'var(--accent-primary)' }} />
                Sub-Metered Load Distribution by Equipment
              </h2>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Cumulative energy consumption in kilowatt-hours (kWh)
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Total: <strong style={{ color: '#fff' }}>{totalConsumption.toLocaleString()} kWh</strong>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {machineBreakdowns.map(mb => {
              const pct = (mb.sum / maxMachineLoad) * 100;
              const shareOfTotal = totalConsumption > 0 ? ((mb.sum / totalConsumption) * 100).toFixed(1) : 0;
              const isHigh = mb.avg > 140;

              return (
                <div key={mb.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 600, color: '#fff' }}>{mb.name}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({mb.count} readings)</span>
                      {isHigh && (
                        <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: 4, background: 'rgba(245, 158, 11, 0.15)', color: 'var(--warning)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                          Peak Load
                        </span>
                      )}
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', color: '#fff', fontWeight: 600 }}>
                      {mb.sum.toLocaleString()} kWh <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({shareOfTotal}%)</span>
                    </span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: '#131B28', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${pct}%`, 
                      height: '100%', 
                      background: isHigh ? 'var(--warning)' : 'var(--accent-primary)',
                      borderRadius: 4,
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Asset:</span>
          <select
            className="filter-dropdown-btn"
            style={{ width: 'auto', minWidth: 200, padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
            value={selectedMachineFilter}
            onChange={(e) => setSelectedMachineFilter(e.target.value)}
          >
            <option value="ALL">All Metered Equipment</option>
            {machines.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {['ALL', '24H', '7D', '30D'].map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeFilter(tf)}
              style={{
                fontSize: '0.72rem',
                padding: '0.3rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid',
                borderColor: timeFilter === tf ? 'var(--accent-primary)' : 'var(--border)',
                background: timeFilter === tf ? 'var(--accent-primary)' : 'var(--surface)',
                color: timeFilter === tf ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: 500,
                transition: 'all 0.15s ease'
              }}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Aggregating power telemetry from Energy Service..." />
      ) : filteredEnergy.length === 0 ? (
        <EmptyState
          icon={Zap}
          title="No Energy Telemetry Logged"
          description="No power meter readings match your current filter."
          actionLabel={hasRole(['ADMIN', 'ENGINEER']) ? 'Log First Measurement' : undefined}
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
                <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>LOG ID</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>METERED ASSET</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>ENERGY CONSUMPTION</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>DEMAND CLASSIFICATION</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>TIMESTAMP</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right', fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredEnergy.map((item) => {
                const machine = machines.find(m => m.id === item.machineId);
                const isHeavyLoad = item.energyConsumption > 140;
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-primary)', fontSize: '0.75rem' }}>
                      NRG-00{item.id}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 600, color: '#fff', fontSize: '0.8rem' }}>
                        <Cpu size={13} style={{ color: 'var(--text-muted)' }} />
                        <span>{machine ? machine.name : `Machine #${item.machineId}`}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        color: isHeavyLoad ? 'var(--warning)' : '#fff'
                      }}>
                        {item.energyConsumption} kWh
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{
                        fontSize: '0.7rem',
                        padding: '0.2rem 0.5rem',
                        borderRadius: 4,
                        fontWeight: 600,
                        background: isHeavyLoad ? 'rgba(245, 158, 11, 0.12)' : 'rgba(0, 210, 106, 0.12)',
                        color: isHeavyLoad ? 'var(--warning)' : 'var(--success)',
                        border: isHeavyLoad ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid rgba(0, 210, 106, 0.25)'
                      }}>
                        {isHeavyLoad ? 'PEAK DEMAND SPIKE' : 'NOMINAL BASELOAD'}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        <Clock size={12} />
                        {new Date(item.recordedAt).toLocaleString()}
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        {hasRole(['ADMIN', 'ENGINEER']) && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--text-secondary)', padding: '0.3rem' }}
                            onClick={() => handleOpenEdit(item)}
                            title="Edit Reading"
                          >
                            <Edit2 size={13} />
                          </button>
                        )}
                        {hasRole('ADMIN') && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--text-muted)', padding: '0.3rem' }}
                            onClick={() => handleDelete(item.id)}
                            title="Delete Reading (Admin Only)"
                          >
                            <Trash2 size={13} />
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

      {/* Log Power Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? `Edit Power Reading: NRG-00${editingItem.id}` : 'Log Energy Consumption'}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="kyn-btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editingItem ? 'Update Measurement' : 'Record Meter Reading'}
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
            <label className="form-label" htmlFor="nrg-machine" style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Metered Equipment Asset</label>
            <select
              id="nrg-machine"
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

          <div className="form-group">
            <label className="form-label" htmlFor="nrg-kwh" style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Power Consumption (kWh)</label>
            <input
              id="nrg-kwh"
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
            <label className="form-label" htmlFor="nrg-time" style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Meter Ingestion Timestamp</label>
            <input
              id="nrg-time"
              type="datetime-local"
              className="form-input"
              value={formData.recordedAt}
              onChange={(e) => setFormData({ ...formData, recordedAt: e.target.value })}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
