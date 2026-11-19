import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Gauge,
  Wrench,
  AlertTriangle,
  Activity,
  Building2,
  RefreshCw,
  Plus,
  Pencil,
  Power,
  CheckCircle2,
  XCircle,
  X,
  Calendar,
  User,
  Download,
  ShieldCheck
} from 'lucide-react';
import {
  plantsApi,
  machinesApi,
  sensorsApi,
  maintenanceApi,
  alertsApi,
  telemetryApi
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { exportToCsv } from '../utils/exportCsv';

const MACHINE_TYPES = ['CNC', 'ROBOTIC_ARM', 'HYDRAULIC_PRESS', 'LATHE', 'CONVEYOR', 'INJECTION_MOLDER'];
const MACHINE_STATUSES = ['RUNNING', 'IDLE', 'MAINTENANCE'];
const SENSOR_TYPES = [
  { type: 'TEMPERATURE', unit: '°C' },
  { type: 'VIBRATION', unit: 'mm/s' },
  { type: 'PRESSURE', unit: 'bar' },
  { type: 'RPM', unit: 'RPM' },
  { type: 'POWER', unit: 'kW' }
];
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

export default function EngineerDashboardView() {
  const { user, hasRole } = useAuth();
  const canManageTech = hasRole('ENGINEER') || hasRole('ADMIN');

  const [activeTab, setActiveTab] = useState('machines');
  const [selectedPlantId, setSelectedPlantId] = useState('ALL');

  const [plants, setPlants] = useState([]);
  const [machines, setMachines] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [orders, setOrders] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [telemetry, setTelemetry] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Modals (Create & Edit ONLY — No Delete for Engineer)
  const [machineModal, setMachineModal] = useState(null); // { mode: 'create'|'edit', item?: obj }
  const [machineForm, setMachineForm] = useState({ name: '', type: 'CNC', status: 'RUNNING', plantId: '1' });

  const [sensorModal, setSensorModal] = useState(null);
  const [sensorForm, setSensorForm] = useState({ name: '', type: 'TEMPERATURE', unit: '°C', machineId: '1', active: true });

  const [orderModal, setOrderModal] = useState(null);
  const [orderForm, setOrderForm] = useState({
    machineId: '1',
    type: 'PREVENTIVE',
    status: 'SCHEDULED',
    technician: 'Lead Systems Engineer',
    scheduledDate: getTodayDateString(),
    description: ''
  });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [plantsData, machData, sensData, maintData, alertData, telData] = await Promise.all([
        plantsApi.getAll().catch(() => []),
        machinesApi.getAll().catch(() => []),
        sensorsApi.getAll().catch(() => []),
        maintenanceApi.getAll().catch(() => []),
        alertsApi.getAll().catch(() => []),
        telemetryApi.getAll().catch(() => [])
      ]);

      setPlants(Array.isArray(plantsData) ? plantsData : (plantsData?.content || []));
      setMachines(Array.isArray(machData) ? machData : (machData?.content || []));
      setSensors(Array.isArray(sensData) ? sensData : (sensData?.content || []));
      setOrders(Array.isArray(maintData) ? maintData : (maintData?.content || []));
      setAlerts(Array.isArray(alertData) ? alertData : (alertData?.content || []));
      setTelemetry(Array.isArray(telData) ? telData : (telData?.content || []));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Scoped datasets by Facility dropdown
  const scopedMachines = selectedPlantId === 'ALL'
    ? machines
    : machines.filter(m => Number(m.plantId || m.plant?.id) === Number(selectedPlantId));
  const scopedMachineIds = new Set(scopedMachines.map(m => Number(m.id)));
  const byMachineScope = (item) => selectedPlantId === 'ALL' || scopedMachineIds.has(Number(item.machineId || item.machine?.id));

  const scopedSensors = sensors.filter(byMachineScope);
  const scopedOrders = orders.filter(byMachineScope);
  const scopedAlerts = alerts.filter(byMachineScope);
  const scopedTelemetry = telemetry.filter(byMachineScope);
  const openAlerts = scopedAlerts.filter(a => !a.resolved);

  const getPlantName = (plantId) => {
    const found = plants.find(p => Number(p.id) === Number(plantId));
    return found ? found.name : `Plant #${plantId || 1}`;
  };

  const getMachineName = (machineId) => {
    const found = machines.find(m => Number(m.id) === Number(machineId));
    return found ? found.name : `Machine #${machineId || 1}`;
  };

  // Export Technical & Maintenance Report (CSV)
  const handleExportTechnicalReport = () => {
    const headers = ['Order ID', 'Machine', 'Maintenance Type', 'Technician', 'Scheduled Date', 'Status', 'Description'];
    const rows = scopedOrders.map(o => [
      `WO-${String(o.id).padStart(3, '0')}`,
      getMachineName(o.machineId || o.machine?.id),
      o.type || 'PREVENTIVE',
      o.technician || o.assignedTo || 'Engineer',
      o.scheduledDate ? toDateString(o.scheduledDate) : '',
      o.status || 'SCHEDULED',
      o.description || ''
    ]);
    exportToCsv(`kynexis-technical-maintenance-report-${getTodayDateString()}.csv`, headers, rows);
    showToast('Technical & maintenance report exported to CSV.');
  };

  // --- MACHINE HANDLERS (Create & Update ONLY) ---
  const openCreateMachine = () => {
    setMachineForm({ name: '', type: 'CNC', status: 'RUNNING', plantId: String(plants[0]?.id || '1') });
    setMachineModal({ mode: 'create' });
  };

  const openEditMachine = (m) => {
    setMachineForm({
      name: m.name || '',
      type: m.type || 'CNC',
      status: m.status || 'RUNNING',
      plantId: String(m.plantId || m.plant?.id || plants[0]?.id || '1')
    });
    setMachineModal({ mode: 'edit', item: m });
  };

  const handleSaveMachine = async (e) => {
    e.preventDefault();
    if (!canManageTech || !machineForm.name.trim()) return;
    setActionLoading(true);
    try {
      const payload = {
        name: machineForm.name.trim(),
        type: machineForm.type,
        status: machineForm.status,
        plantId: Number(machineForm.plantId) || 1
      };
      if (machineModal.mode === 'create') {
        await machinesApi.create(payload);
        showToast(`Machine '${payload.name}' created.`);
      } else {
        await machinesApi.update(machineModal.item.id, payload);
        showToast(`Machine '${payload.name}' updated.`);
      }
      setMachineModal(null);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Machine operation failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleMachine = async (m) => {
    if (!canManageTech) return;
    const nextStatus = m.status === 'RUNNING' ? 'IDLE' : 'RUNNING';
    setMachines(prev => prev.map(x => (x.id === m.id ? { ...x, status: nextStatus } : x)));
    try {
      await machinesApi.update(m.id, {
        name: m.name,
        type: m.type || 'CNC',
        status: nextStatus,
        plantId: Number(m.plantId || m.plant?.id || 1)
      });
      showToast(`Machine '${m.name}' set to ${nextStatus}.`);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to update machine', 'error');
      fetchData();
    }
  };

  // --- SENSOR HANDLERS (Create & Update ONLY) ---
  const openCreateSensor = () => {
    setSensorForm({ name: '', type: 'TEMPERATURE', unit: '°C', machineId: String(machines[0]?.id || '1'), active: true });
    setSensorModal({ mode: 'create' });
  };

  const openEditSensor = (s) => {
    setSensorForm({
      name: s.name || '',
      type: s.type || 'TEMPERATURE',
      unit: s.unit || '°C',
      machineId: String(s.machineId || s.machine?.id || machines[0]?.id || '1'),
      active: s.active !== false
    });
    setSensorModal({ mode: 'edit', item: s });
  };

  const handleSaveSensor = async (e) => {
    e.preventDefault();
    if (!canManageTech || !sensorForm.name.trim()) return;
    setActionLoading(true);
    try {
      const payload = {
        name: sensorForm.name.trim(),
        type: sensorForm.type,
        unit: sensorForm.unit || '°C',
        machineId: Number(sensorForm.machineId) || 1,
        active: Boolean(sensorForm.active)
      };
      if (sensorModal.mode === 'create') {
        await sensorsApi.create(payload);
        showToast(`Sensor '${payload.name}' calibrated & provisioned.`);
      } else {
        await sensorsApi.update(sensorModal.item.id, payload);
        showToast(`Sensor '${payload.name}' updated.`);
      }
      setSensorModal(null);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Sensor operation failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleSensor = async (s) => {
    if (!canManageTech) return;
    const nextActive = !(s.active !== false);
    setSensors(prev => prev.map(x => (x.id === s.id ? { ...x, active: nextActive } : x)));
    try {
      await sensorsApi.update(s.id, {
        name: s.name || `${s.type} Sensor #${s.id}`,
        type: s.type || 'TEMPERATURE',
        unit: s.unit || '°C',
        machineId: Number(s.machineId || s.machine?.id || 1),
        active: nextActive
      });
      showToast(`Sensor '${s.name || s.id}' set to ${nextActive ? 'CALIBRATED' : 'STANDBY'}.`);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to update sensor', 'error');
      fetchData();
    }
  };

  // --- MAINTENANCE HANDLERS (Create & Update ONLY) ---
  const openCreateOrder = () => {
    setOrderForm({
      machineId: String(machines[0]?.id || '1'),
      type: 'PREVENTIVE',
      status: 'SCHEDULED',
      technician: user?.username || 'Lead Systems Engineer',
      scheduledDate: getTodayDateString(),
      description: ''
    });
    setOrderModal({ mode: 'create' });
  };

  const openEditOrder = (o) => {
    setOrderForm({
      machineId: String(o.machineId || o.machine?.id || machines[0]?.id || '1'),
      type: (o.type || 'PREVENTIVE').toUpperCase(),
      status: (o.status || 'SCHEDULED').toUpperCase(),
      technician: o.technician || o.assignedTo || 'Lead Systems Engineer',
      scheduledDate: ensureFutureOrPresentDate(o.scheduledDate),
      description: o.description || o.task || ''
    });
    setOrderModal({ mode: 'edit', item: o });
  };

  const handleSaveOrder = async (e) => {
    e.preventDefault();
    if (!canManageTech || orderForm.description.trim().length < 5) {
      showToast('Description must be at least 5 characters', 'error');
      return;
    }
    setActionLoading(true);
    try {
      const schedDate = ensureFutureOrPresentDate(orderForm.scheduledDate);
      const payload = {
        machineId: Number(orderForm.machineId) || 1,
        type: orderForm.type,
        status: orderForm.status,
        technician: orderForm.technician.trim() || 'Lead Systems Engineer',
        scheduledDate: schedDate,
        completedDate: orderForm.status === 'COMPLETED' ? schedDate : null,
        description: orderForm.description.trim()
      };
      if (orderModal.mode === 'create') {
        await maintenanceApi.create(payload);
        showToast('Maintenance work order dispatched.');
      } else {
        await maintenanceApi.update(orderModal.item.id, payload);
        showToast(`Work order WO-${String(orderModal.item.id).padStart(3, '0')} updated.`);
      }
      setOrderModal(null);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Maintenance operation failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleOrder = async (o) => {
    if (!canManageTech) return;
    const isComplete = (o.status || '').toUpperCase() === 'COMPLETED';
    const nextStatus = isComplete ? 'IN_PROGRESS' : 'COMPLETED';
    const schedDate = ensureFutureOrPresentDate(o.scheduledDate);
    const today = getTodayDateString();
    const nextCompDate = nextStatus === 'COMPLETED' ? (today >= schedDate ? today : schedDate) : null;
    const desc = (o.description || o.task || 'Preventive maintenance check').trim();

    setOrders(prev => prev.map(x => (x.id === o.id ? { ...x, status: nextStatus } : x)));
    try {
      await maintenanceApi.update(o.id, {
        machineId: Number(o.machineId || o.machine?.id || 1),
        type: (o.type || 'PREVENTIVE').toUpperCase(),
        status: nextStatus,
        technician: (o.technician || o.assignedTo || 'Lead Systems Engineer').trim(),
        scheduledDate: schedDate,
        completedDate: nextCompDate,
        description: desc.length >= 5 ? desc : `${desc} check`
      });
      showToast(`Work order WO-${String(o.id).padStart(3, '0')} marked ${nextStatus}.`);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to update work order', 'error');
      fetchData();
    }
  };

  // --- ALERT RESOLUTION (Investigate & Resolve — NO Delete) ---
  const handleResolveAlert = async (alert) => {
    if (!canManageTech) return;
    const nextResolved = !alert.resolved;
    setAlerts(prev => prev.map(a => (a.id === alert.id ? { ...a, resolved: nextResolved } : a)));
    try {
      if (nextResolved) {
        await alertsApi.resolve(alert.id, `Resolved by Engineer (${user?.username || 'engineer'})`);
        showToast(`Alert ALT-${String(alert.id).padStart(3, '0')} resolved.`);
      } else {
        await alertsApi.update(alert.id, {
          machineId: Number(alert.machineId || alert.machine?.id || 1),
          type: alert.type || alert.alertType || 'HIGH_TEMPERATURE',
          severity: alert.severity || 'WARNING',
          message: alert.message || 'Reopened for investigation',
          resolved: false
        });
        showToast(`Alert ALT-${String(alert.id).padStart(3, '0')} reopened.`);
      }
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to update alert', 'error');
      fetchData();
    }
  };

  return (
    <div className="pbi-admin-container">
      {toast && (
        <div className={`pbi-toast-notification ${toast.type === 'error' ? 'pbi-toast-error' : 'pbi-toast-success'}`}>
          {toast.type === 'error' ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Engineering Identity Banner (Cyan Theme) */}
      <div
        className="pbi-admin-top-banner"
        style={{
          borderColor: 'rgba(0, 188, 242, 0.35)',
          background: 'linear-gradient(135deg, rgba(0, 188, 242, 0.08) 0%, #182030 60%)'
        }}
      >
        <div className="pbi-admin-top-left">
          <div
            className="pbi-admin-top-icon"
            style={{
              background: 'rgba(0, 188, 242, 0.14)',
              color: '#38BDF8',
              borderColor: 'rgba(0, 188, 242, 0.45)',
              boxShadow: '0 0 14px rgba(0, 188, 242, 0.25)'
            }}
          >
            <Cpu size={24} />
          </div>
          <div>
            <div className="pbi-admin-top-title">Engineering Operations Dashboard</div>
            <div className="pbi-admin-top-desc">
              Machine configuration, sensor calibration, predictive maintenance &amp; technical alert resolution
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div className="pbi-engineer-auth-tag">
            <ShieldCheck size={14} />
            <span>Authority: ROLE_{(user?.role || 'ENGINEER').toUpperCase()}</span>
          </div>
          <button
            type="button"
            className="pbi-btn-action-sm pbi-btn-action-gold"
            onClick={handleExportTechnicalReport}
            style={{ height: '30px', padding: '0 12px' }}
            title="Export Technical & Maintenance Report (CSV)"
          >
            <Download size={13} />
            <span>Technical Report</span>
          </button>
          <button type="button" className="pbi-ribbon-btn" onClick={fetchData}>
            <RefreshCw size={13} className={loading ? 'spin-animation' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Subtabs + Facility Scope Filter */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div className="pbi-admin-tabs" style={{ marginBottom: 0 }}>
          <button type="button" className={`pbi-admin-tab-btn ${activeTab === 'machines' ? 'active' : ''}`} onClick={() => setActiveTab('machines')}>
            <Cpu size={15} />
            <span>Machines ({scopedMachines.length})</span>
          </button>
          <button type="button" className={`pbi-admin-tab-btn ${activeTab === 'sensors' ? 'active' : ''}`} onClick={() => setActiveTab('sensors')}>
            <Gauge size={15} />
            <span>Sensors ({scopedSensors.length})</span>
          </button>
          <button type="button" className={`pbi-admin-tab-btn ${activeTab === 'maintenance' ? 'active' : ''}`} onClick={() => setActiveTab('maintenance')}>
            <Wrench size={15} />
            <span>Maintenance ({scopedOrders.length})</span>
          </button>
          <button type="button" className={`pbi-admin-tab-btn ${activeTab === 'alerts' ? 'active' : ''}`} onClick={() => setActiveTab('alerts')}>
            <AlertTriangle size={15} />
            <span>Technical Alerts ({openAlerts.length})</span>
          </button>
          <button type="button" className={`pbi-admin-tab-btn ${activeTab === 'telemetry' ? 'active' : ''}`} onClick={() => setActiveTab('telemetry')}>
            <Activity size={15} />
            <span>Live Telemetry ({scopedTelemetry.length})</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="pbi-slicer-label">Facility:</span>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Building2 size={13} color="#38BDF8" style={{ position: 'absolute', left: '10px', pointerEvents: 'none' }} />
            <select
              className="pbi-form-input"
              style={{
                height: '32px',
                paddingLeft: '30px',
                paddingRight: '14px',
                fontSize: '11.5px',
                fontWeight: 600,
                color: selectedPlantId === 'ALL' ? '#E2E8F0' : '#7DD3FC',
                borderColor: selectedPlantId === 'ALL' ? 'rgba(0, 188, 242, 0.35)' : '#00BCF2',
                background: selectedPlantId === 'ALL' ? '#0E1422' : 'rgba(0, 188, 242, 0.14)',
                cursor: 'pointer',
                borderRadius: '20px'
              }}
              value={selectedPlantId}
              onChange={(e) => setSelectedPlantId(e.target.value)}
            >
              <option value="ALL">All Facilities ({plants.length})</option>
              {plants.map(p => (
                <option key={p.id} value={String(p.id)}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* TAB 1: MACHINES (Create & Edit, NO Delete) */}
      {activeTab === 'machines' && (
        <div className="pbi-visual-card" style={{ width: '100%', boxSizing: 'border-box' }}>
          <div className="pbi-visual-header">
            <div className="pbi-visual-title">Machine Fleet Technical Configuration</div>
            {canManageTech && (
              <button type="button" className="pbi-btn-action-sm pbi-btn-action-gold" onClick={openCreateMachine} style={{ height: '28px', padding: '0 12px' }}>
                <Plus size={13} />
                <span>Add Machine</span>
              </button>
            )}
          </div>
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table className="pbi-matrix-table" style={{ width: '100%', tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th style={{ width: '76px', padding: '10px 8px' }}>Asset ID</th>
                  <th style={{ padding: '10px 10px' }}>Machine &amp; Type</th>
                  <th style={{ padding: '10px 10px' }}>Facility</th>
                  <th style={{ width: '108px', padding: '10px 8px' }}>Status</th>
                  <th style={{ width: '150px', textAlign: 'right', padding: '10px 14px', whiteSpace: 'nowrap' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {scopedMachines.map(m => {
                  const isRunning = m.status === 'RUNNING';
                  const statusClass = isRunning ? 'pbi-status-running' : (m.status === 'IDLE' ? 'pbi-status-idle' : 'pbi-status-maintenance');
                  return (
                    <tr key={m.id}>
                      <td style={{ padding: '10px 8px', fontFamily: 'var(--pbi-font-mono)', color: '#38BDF8', fontWeight: 700, fontSize: '11.5px' }}>
                        MCH-{String(m.id).padStart(3, '0')}
                      </td>
                      <td style={{ padding: '10px 10px' }}>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: '#FFFFFF' }}>{m.name}</div>
                        <span style={{ fontFamily: 'var(--pbi-font-mono)', fontSize: '10px', color: '#00BCF2', background: 'rgba(0,188,242,0.12)', padding: '1px 5px', borderRadius: '3px' }}>
                          {m.type || 'CNC'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 10px', color: '#CBD5E1', fontSize: '12.5px' }}>{getPlantName(m.plantId || m.plant?.id)}</td>
                      <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>
                        <span className={`pbi-status-pill ${statusClass}`}>
                          <span className="pbi-status-dot" />
                          <span>{m.status}</span>
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: '5px' }}>
                          <button type="button" className={`pbi-btn-action-sm ${isRunning ? 'pbi-btn-toggle-offline' : 'pbi-btn-toggle-online'}`} onClick={() => handleToggleMachine(m)}>
                            <Power size={11} />
                            <span>{isRunning ? 'Idle' : 'Start'}</span>
                          </button>
                          <button type="button" className="pbi-btn-action-sm pbi-btn-action-primary" onClick={() => openEditMachine(m)}>
                            <Pencil size={11} />
                            <span>Edit</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: SENSORS (Create & Edit, NO Delete) */}
      {activeTab === 'sensors' && (
        <div className="pbi-visual-card" style={{ width: '100%', boxSizing: 'border-box' }}>
          <div className="pbi-visual-header">
            <div className="pbi-visual-title">IoT Transducer Calibration Matrix</div>
            {canManageTech && (
              <button type="button" className="pbi-btn-action-sm pbi-btn-action-gold" onClick={openCreateSensor} style={{ height: '28px', padding: '0 12px' }}>
                <Plus size={13} />
                <span>Add Sensor</span>
              </button>
            )}
          </div>
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table className="pbi-matrix-table" style={{ width: '100%', tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th style={{ width: '76px', padding: '10px 8px' }}>Sensor ID</th>
                  <th style={{ padding: '10px 10px' }}>Sensor &amp; Modality</th>
                  <th style={{ padding: '10px 10px' }}>Bound Machine</th>
                  <th style={{ width: '68px', padding: '10px 8px', textAlign: 'center' }}>Unit</th>
                  <th style={{ width: '108px', padding: '10px 8px' }}>Status</th>
                  <th style={{ width: '165px', textAlign: 'right', padding: '10px 14px', whiteSpace: 'nowrap' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {scopedSensors.map(s => {
                  const isActive = s.active !== false;
                  return (
                    <tr key={s.id}>
                      <td style={{ padding: '10px 8px', fontFamily: 'var(--pbi-font-mono)', color: '#F59E0B', fontWeight: 700, fontSize: '11.5px' }}>
                        SEN-{String(s.id).padStart(3, '0')}
                      </td>
                      <td style={{ padding: '10px 10px' }}>
                        <div style={{ fontWeight: 700, fontSize: '12.5px', color: '#FFFFFF' }}>{s.name || `${s.type} Sensor #${s.id}`}</div>
                        <span style={{ fontFamily: 'var(--pbi-font-mono)', fontSize: '10px', color: '#F59E0B', background: 'rgba(245,158,11,0.12)', padding: '1px 5px', borderRadius: '3px' }}>
                          {s.type}
                        </span>
                      </td>
                      <td style={{ padding: '10px 10px', color: '#CBD5E1', fontSize: '12.5px' }}>{getMachineName(s.machineId || s.machine?.id)}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'center', fontFamily: 'var(--pbi-font-mono)', color: '#38BDF8', fontWeight: 700 }}>{s.unit || '°C'}</td>
                      <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>
                        <span className={`pbi-status-pill ${isActive ? 'pbi-status-online' : 'pbi-status-offline'}`}>
                          <span className="pbi-status-dot" />
                          <span>{isActive ? 'CALIBRATED' : 'STANDBY'}</span>
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: '5px' }}>
                          <button type="button" className={`pbi-btn-action-sm ${isActive ? 'pbi-btn-toggle-offline' : 'pbi-btn-toggle-online'}`} onClick={() => handleToggleSensor(s)}>
                            <Power size={11} />
                            <span>{isActive ? 'Standby' : 'Calibrate'}</span>
                          </button>
                          <button type="button" className="pbi-btn-action-sm pbi-btn-action-primary" onClick={() => openEditSensor(s)}>
                            <Pencil size={11} />
                            <span>Edit</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: MAINTENANCE (Create & Edit, NO Delete) */}
      {activeTab === 'maintenance' && (
        <div className="pbi-visual-card" style={{ width: '100%', boxSizing: 'border-box' }}>
          <div className="pbi-visual-header">
            <div className="pbi-visual-title">Predictive &amp; Corrective Maintenance Management</div>
            {canManageTech && (
              <button type="button" className="pbi-btn-action-sm pbi-btn-action-gold" onClick={openCreateOrder} style={{ height: '28px', padding: '0 12px' }}>
                <Plus size={13} />
                <span>Create Order</span>
              </button>
            )}
          </div>
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table className="pbi-matrix-table" style={{ width: '100%', tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th style={{ width: '74px', padding: '10px 8px' }}>Order ID</th>
                  <th style={{ width: '165px', padding: '10px 8px' }}>Asset &amp; Type</th>
                  <th style={{ padding: '10px 10px' }}>Description &amp; Dispatch</th>
                  <th style={{ width: '108px', padding: '10px 8px' }}>Status</th>
                  <th style={{ width: '155px', textAlign: 'right', padding: '10px 14px', whiteSpace: 'nowrap' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {scopedOrders.map(o => {
                  const statusUpper = (o.status || 'SCHEDULED').toUpperCase();
                  const isComplete = statusUpper === 'COMPLETED';
                  return (
                    <tr key={o.id}>
                      <td style={{ padding: '10px 8px', fontFamily: 'var(--pbi-font-mono)', color: '#EC4899', fontWeight: 700, fontSize: '11.5px' }}>
                        WO-{String(o.id).padStart(3, '0')}
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        <div style={{ fontWeight: 700, fontSize: '12.5px', color: '#FFFFFF' }}>{getMachineName(o.machineId || o.machine?.id)}</div>
                        <span style={{ fontFamily: 'var(--pbi-font-mono)', fontSize: '10px', color: '#38BDF8', background: 'rgba(56,189,248,0.12)', padding: '1px 5px', borderRadius: '3px' }}>
                          {o.type || 'PREVENTIVE'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 10px' }}>
                        <div style={{ color: '#E2E8F0', fontSize: '12.5px' }}>{o.description || o.task}</div>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '3px', fontSize: '11px', color: '#94A3B8' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><User size={11} color="#38BDF8" />{o.technician || 'Engineer'}</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--pbi-font-mono)' }}><Calendar size={11} />{o.scheduledDate ? toDateString(o.scheduledDate) : 'Immediate'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>
                        <span className={`pbi-status-pill ${isComplete ? 'pbi-status-running' : 'pbi-status-idle'}`}>
                          <span className="pbi-status-dot" />
                          <span>{statusUpper}</span>
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: '5px' }}>
                          <button type="button" className={`pbi-btn-action-sm ${isComplete ? 'pbi-btn-toggle-offline' : 'pbi-btn-toggle-online'}`} onClick={() => handleToggleOrder(o)}>
                            {isComplete ? <Power size={11} /> : <CheckCircle2 size={11} />}
                            <span>{isComplete ? 'Reopen' : 'Done'}</span>
                          </button>
                          <button type="button" className="pbi-btn-action-sm pbi-btn-action-primary" onClick={() => openEditOrder(o)}>
                            <Pencil size={11} />
                            <span>Edit</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: TECHNICAL ALERTS (Investigate & Resolve, NO Delete) */}
      {activeTab === 'alerts' && (
        <div className="pbi-visual-card" style={{ width: '100%', boxSizing: 'border-box' }}>
          <div className="pbi-visual-header">
            <div className="pbi-visual-title">Technical Alert Investigation &amp; Resolution</div>
          </div>
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table className="pbi-matrix-table" style={{ width: '100%', tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th style={{ width: '74px', padding: '10px 8px' }}>Alert ID</th>
                  <th style={{ width: '90px', padding: '10px 8px' }}>Severity</th>
                  <th style={{ padding: '10px 10px' }}>Incident &amp; Description</th>
                  <th style={{ width: '150px', padding: '10px 8px' }}>Machine Asset</th>
                  <th style={{ width: '115px', textAlign: 'right', padding: '10px 14px', whiteSpace: 'nowrap' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {scopedAlerts.map(a => {
                  const isCrit = a.severity === 'CRITICAL' || a.severity === 'HIGH';
                  const sevColor = isCrit ? '#EF4444' : (a.severity === 'WARNING' ? '#F59E0B' : '#00BCF2');
                  return (
                    <tr key={a.id}>
                      <td style={{ padding: '10px 8px', fontFamily: 'var(--pbi-font-mono)', color: '#EF4444', fontWeight: 700, fontSize: '11.5px' }}>
                        ALT-{String(a.id).padStart(3, '0')}
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        <span style={{ color: sevColor, background: `${sevColor}15`, border: `1px solid ${sevColor}40`, padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 800 }}>
                          {a.severity}
                        </span>
                      </td>
                      <td style={{ padding: '10px 10px' }}>
                        <div style={{ fontFamily: 'var(--pbi-font-mono)', fontSize: '10.5px', fontWeight: 700, color: '#F8FAFC' }}>{a.type || a.alertType}</div>
                        <div style={{ color: '#CBD5E1', fontSize: '12.5px', marginTop: '2px' }}>{a.message}</div>
                      </td>
                      <td style={{ padding: '10px 8px', fontSize: '12px', fontWeight: 600, color: '#FFFFFF' }}>{getMachineName(a.machineId || a.machine?.id)}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          className={`pbi-btn-action-sm ${a.resolved ? 'pbi-btn-toggle-offline' : 'pbi-btn-toggle-online'}`}
                          onClick={() => handleResolveAlert(a)}
                        >
                          {a.resolved ? <Power size={11} /> : <CheckCircle2 size={11} />}
                          <span>{a.resolved ? 'Reopen' : 'Resolve'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: LIVE TELEMETRY DIAGNOSTICS */}
      {activeTab === 'telemetry' && (
        <div className="pbi-visual-card" style={{ width: '100%', boxSizing: 'border-box' }}>
          <div className="pbi-visual-header">
            <div className="pbi-visual-title">High-Frequency Telemetry Diagnostics</div>
          </div>
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table className="pbi-matrix-table" style={{ width: '100%', tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th style={{ width: '78px', padding: '10px 8px' }}>Stream ID</th>
                  <th style={{ padding: '10px 10px' }}>Machine Asset</th>
                  <th style={{ width: '92px', padding: '10px 8px' }}>Temp</th>
                  <th style={{ width: '96px', padding: '10px 8px' }}>Vibration</th>
                  <th style={{ width: '88px', padding: '10px 8px' }}>Pressure</th>
                  <th style={{ width: '96px', padding: '10px 8px' }}>RPM</th>
                  <th style={{ width: '105px', padding: '10px 14px', textAlign: 'right' }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {scopedTelemetry.slice(0, 25).map(t => {
                  const temp = Number(t.temperature || 65);
                  const vib = Number(t.vibration || 1.2);
                  const pres = Number(t.pressure || 5.5);
                  const rpm = Number(t.rpm || 2400);
                  return (
                    <tr key={t.id}>
                      <td style={{ padding: '10px 8px', fontFamily: 'var(--pbi-font-mono)', color: '#38BDF8', fontWeight: 700, fontSize: '11.5px' }}>TLM-{t.id}</td>
                      <td style={{ padding: '10px 10px', fontWeight: 600, color: '#FFFFFF' }}>{getMachineName(t.machineId)}</td>
                      <td style={{ padding: '10px 8px', fontFamily: 'var(--pbi-font-mono)', fontWeight: 700, color: temp > 75 ? '#EF4444' : '#10B981' }}>{temp.toFixed(1)} °C</td>
                      <td style={{ padding: '10px 8px', fontFamily: 'var(--pbi-font-mono)', color: vib > 2.5 ? '#F59E0B' : '#CBD5E1' }}>{vib.toFixed(2)} mm/s</td>
                      <td style={{ padding: '10px 8px', fontFamily: 'var(--pbi-font-mono)', color: (pres < 4 || pres > 8) ? '#EF4444' : '#CBD5E1' }}>{pres.toFixed(1)} bar</td>
                      <td style={{ padding: '10px 8px', fontFamily: 'var(--pbi-font-mono)', color: '#FFFFFF' }}>{rpm.toLocaleString()} RPM</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: '#94A3B8', fontSize: '11px', fontFamily: 'var(--pbi-font-mono)' }}>
                        {t.timestamp ? new Date(t.timestamp).toLocaleTimeString() : 'Live'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: CREATE / EDIT MACHINE */}
      {machineModal && (
        <div className="pbi-modal-backdrop" onClick={() => setMachineModal(null)}>
          <div className="pbi-modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="pbi-modal-header">
              <div className="pbi-modal-title">
                <Cpu size={16} color="#00BCF2" />
                <span>{machineModal.mode === 'create' ? 'Add Machine Asset' : `Edit ${machineModal.item.name}`}</span>
              </div>
              <button type="button" className="pbi-modal-close" onClick={() => setMachineModal(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveMachine}>
              <div className="pbi-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label className="pbi-form-label">Machine Name *</label>
                  <input type="text" className="pbi-form-input" value={machineForm.name} onChange={(e) => setMachineForm({ ...machineForm, name: e.target.value })} required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="pbi-form-label">Type</label>
                    <select className="pbi-form-input" value={machineForm.type} onChange={(e) => setMachineForm({ ...machineForm, type: e.target.value })}>
                      {MACHINE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="pbi-form-label">Status</label>
                    <select className="pbi-form-input" value={machineForm.status} onChange={(e) => setMachineForm({ ...machineForm, status: e.target.value })}>
                      {MACHINE_STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="pbi-form-label">Allocated Facility</label>
                  <select className="pbi-form-input" value={machineForm.plantId} onChange={(e) => setMachineForm({ ...machineForm, plantId: e.target.value })}>
                    {plants.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="pbi-modal-footer">
                <button type="button" className="pbi-ribbon-btn" onClick={() => setMachineModal(null)}>Cancel</button>
                <button type="submit" className="pbi-btn-action-sm pbi-btn-action-gold" disabled={actionLoading} style={{ height: '32px', padding: '0 16px' }}>
                  {actionLoading ? 'Saving...' : 'Save Machine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE / EDIT SENSOR */}
      {sensorModal && (
        <div className="pbi-modal-backdrop" onClick={() => setSensorModal(null)}>
          <div className="pbi-modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="pbi-modal-header">
              <div className="pbi-modal-title">
                <Gauge size={16} color="#00BCF2" />
                <span>{sensorModal.mode === 'create' ? 'Provision IoT Sensor' : 'Edit Sensor Calibration'}</span>
              </div>
              <button type="button" className="pbi-modal-close" onClick={() => setSensorModal(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveSensor}>
              <div className="pbi-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label className="pbi-form-label">Sensor Label *</label>
                  <input type="text" className="pbi-form-input" value={sensorForm.name} onChange={(e) => setSensorForm({ ...sensorForm, name: e.target.value })} required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="pbi-form-label">Modality</label>
                    <select
                      className="pbi-form-input"
                      value={sensorForm.type}
                      onChange={(e) => {
                        const found = SENSOR_TYPES.find(t => t.type === e.target.value);
                        setSensorForm({ ...sensorForm, type: e.target.value, unit: found ? found.unit : sensorForm.unit });
                      }}
                    >
                      {SENSOR_TYPES.map(t => <option key={t.type} value={t.type}>{t.type}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="pbi-form-label">Unit</label>
                    <input type="text" className="pbi-form-input" value={sensorForm.unit} onChange={(e) => setSensorForm({ ...sensorForm, unit: e.target.value })} required />
                  </div>
                </div>
                <div>
                  <label className="pbi-form-label">Bound Machine</label>
                  <select className="pbi-form-input" value={sensorForm.machineId} onChange={(e) => setSensorForm({ ...sensorForm, machineId: e.target.value })}>
                    {machines.map(m => <option key={m.id} value={String(m.id)}>{m.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="pbi-modal-footer">
                <button type="button" className="pbi-ribbon-btn" onClick={() => setSensorModal(null)}>Cancel</button>
                <button type="submit" className="pbi-btn-action-sm pbi-btn-action-gold" disabled={actionLoading} style={{ height: '32px', padding: '0 16px' }}>
                  {actionLoading ? 'Saving...' : 'Save Sensor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE / EDIT MAINTENANCE ORDER */}
      {orderModal && (
        <div className="pbi-modal-backdrop" onClick={() => setOrderModal(null)}>
          <div className="pbi-modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="pbi-modal-header">
              <div className="pbi-modal-title">
                <Wrench size={16} color="#00BCF2" />
                <span>{orderModal.mode === 'create' ? 'Create Maintenance Work Order' : `Edit Work Order WO-${String(orderModal.item.id).padStart(3, '0')}`}</span>
              </div>
              <button type="button" className="pbi-modal-close" onClick={() => setOrderModal(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveOrder}>
              <div className="pbi-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label className="pbi-form-label">Target Machine *</label>
                  <select className="pbi-form-input" value={orderForm.machineId} onChange={(e) => setOrderForm({ ...orderForm, machineId: e.target.value })}>
                    {machines.map(m => <option key={m.id} value={String(m.id)}>{m.name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="pbi-form-label">Type</label>
                    <select className="pbi-form-input" value={orderForm.type} onChange={(e) => setOrderForm({ ...orderForm, type: e.target.value })}>
                      {MAINT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="pbi-form-label">Status</label>
                    <select className="pbi-form-input" value={orderForm.status} onChange={(e) => setOrderForm({ ...orderForm, status: e.target.value })}>
                      {MAINT_STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="pbi-form-label">Technician *</label>
                    <input type="text" className="pbi-form-input" value={orderForm.technician} onChange={(e) => setOrderForm({ ...orderForm, technician: e.target.value })} required />
                  </div>
                  <div>
                    <label className="pbi-form-label">Scheduled Date *</label>
                    <input type="date" min={getTodayDateString()} className="pbi-form-input" value={orderForm.scheduledDate} onChange={(e) => setOrderForm({ ...orderForm, scheduledDate: e.target.value })} required />
                  </div>
                </div>
                <div>
                  <label className="pbi-form-label">Description *</label>
                  <textarea rows={3} className="pbi-form-input" style={{ height: 'auto', padding: '10px 12px' }} value={orderForm.description} onChange={(e) => setOrderForm({ ...orderForm, description: e.target.value })} required />
                </div>
              </div>
              <div className="pbi-modal-footer">
                <button type="button" className="pbi-ribbon-btn" onClick={() => setOrderModal(null)}>Cancel</button>
                <button type="submit" className="pbi-btn-action-sm pbi-btn-action-gold" disabled={actionLoading} style={{ height: '32px', padding: '0 16px' }}>
                  {actionLoading ? 'Saving...' : 'Save Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

