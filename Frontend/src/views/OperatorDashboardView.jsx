import React, { useState, useEffect } from 'react';
import {
  HardHat,
  Building2,
  Cpu,
  Layers,
  AlertTriangle,
  Wrench,
  Activity,
  RefreshCw,
  Plus,
  Pencil,
  CheckCircle2,
  XCircle,
  X,
  Download,
  ShieldCheck,
  MapPin,
  Calendar,
  User
} from 'lucide-react';
import {
  plantsApi,
  machinesApi,
  productionApi,
  alertsApi,
  maintenanceApi,
  telemetryApi
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { exportToCsv } from '../utils/exportCsv';

const ALERT_TYPES = [
  'HIGH_TEMPERATURE',
  'EXCESSIVE_VIBRATION',
  'PRESSURE_DROP',
  'RPM_ANOMALY',
  'MACHINE_FAULT',
  'MAINTENANCE_REQUIRED'
];
const SEVERITIES = ['CRITICAL', 'HIGH', 'WARNING', 'INFO'];
const BATCH_STATUSES = ['IN_PROGRESS', 'COMPLETED', 'SCHEDULED'];

function toLocalDateTimeValue(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (Number.isNaN(d.getTime())) return toLocalDateTimeValue(new Date());
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toBackendLocalDateTime(val) {
  if (!val) return null;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(val)) return `${val}:00`;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) return val.slice(0, 19);
  const d = new Date(val);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export default function OperatorDashboardView() {
  const { user, assignedPlantId: ctxAssignedPlantId } = useAuth();

  const [activeTab, setActiveTab] = useState('workstation');
  const [plants, setPlants] = useState([]);
  const [machines, setMachines] = useState([]);
  const [batches, setBatches] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [telemetry, setTelemetry] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Modal: Report Floor Alert
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertForm, setAlertForm] = useState({
    machineId: '1',
    type: 'HIGH_TEMPERATURE',
    severity: 'WARNING',
    message: ''
  });

  // Modal: Submit Production Operational Update (Create or Edit Output)
  const [batchModal, setBatchModal] = useState(null); // { mode: 'create'|'edit', item?: obj }
  const [batchForm, setBatchForm] = useState({
    productName: '',
    machineId: '1',
    quantityProduced: 50,
    quantityRejected: 0,
    status: 'IN_PROGRESS',
    productionStart: toLocalDateTimeValue()
  });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [plantsData, machData, prodData, alertData, maintData, telData] = await Promise.all([
        plantsApi.getAll().catch(() => []),
        machinesApi.getAll().catch(() => []),
        productionApi.getAll().catch(() => []),
        alertsApi.getAll().catch(() => []),
        maintenanceApi.getAll().catch(() => []),
        telemetryApi.getAll().catch(() => [])
      ]);

      setPlants(Array.isArray(plantsData) ? plantsData : (plantsData?.content || []));
      setMachines(Array.isArray(machData) ? machData : (machData?.content || []));
      setBatches(Array.isArray(prodData) ? prodData : (prodData?.content || []));
      setAlerts(Array.isArray(alertData) ? alertData : (alertData?.content || []));
      setOrders(Array.isArray(maintData) ? maintData : (maintData?.content || []));
      setTelemetry(Array.isArray(telData) ? telData : (telData?.content || []));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Operator Assigned Scope: Dynamically matches the Operator's Assigned Plant
  const assignedPlant = plants.find(p => Number(p.id) === Number(ctxAssignedPlantId)) || plants[0] || null;
  const assignedPlantId = assignedPlant?.id ?? ctxAssignedPlantId ?? 1;

  const assignedMachines = machines.filter(
    m => Number(m.plantId || m.plant?.id || 1) === Number(assignedPlantId)
  );
  const assignedMachineIds = new Set(assignedMachines.map(m => Number(m.id)));
  const isAssignedMachine = (item) => {
    const mid = Number(item.machineId || item.machine?.id);
    return assignedMachineIds.has(mid);
  };

  const assignedBatches = batches.filter(isAssignedMachine);
  const assignedAlerts = alerts.filter(isAssignedMachine);
  const assignedOrders = orders.filter(isAssignedMachine);
  const assignedTelemetry = telemetry.filter(isAssignedMachine);

  const getMachineName = (machineId) => {
    const found = machines.find(m => Number(m.id) === Number(machineId));
    return found ? found.name : `Machine #${machineId || 1}`;
  };

  // Export Shift & Machine Report (CSV)
  const handleExportShiftReport = () => {
    const headers = ['Batch ID', 'Machine', 'Product', 'Produced', 'Rejected', 'Status'];
    const rows = assignedBatches.map(b => [
      b.batchCode || `BAT-${String(b.id).padStart(3, '0')}`,
      getMachineName(b.machineId || b.machine?.id),
      b.productName || `Batch #${b.id}`,
      Number(b.quantityProduced ?? b.actualUnits ?? 0),
      Number(b.quantityRejected ?? b.scrapUnits ?? b.defects ?? 0),
      (b.status || 'IN_PROGRESS').toUpperCase()
    ]);
    exportToCsv(`kynexis-shift-report-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    showToast('Shift production report exported to CSV.');
  };

  // 1. REPORT FLOOR ALERT (Operator Authorized: POST /api/alerts)
  const handleOpenReportAlert = () => {
    setAlertForm({
      machineId: String(assignedMachines[0]?.id || '1'),
      type: 'HIGH_TEMPERATURE',
      severity: 'WARNING',
      message: ''
    });
    setShowAlertModal(true);
  };

  const handleReportAlertSubmit = async (e) => {
    e.preventDefault();
    if (!alertForm.message.trim()) {
      showToast('Please enter incident details', 'error');
      return;
    }
    setActionLoading(true);
    try {
      await alertsApi.create({
        machineId: Number(alertForm.machineId) || Number(assignedMachines[0]?.id || 1),
        type: alertForm.type,
        severity: alertForm.severity,
        message: alertForm.message.trim(),
        resolved: false
      });
      showToast('Floor machine alert reported successfully.');
      setShowAlertModal(false);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to report alert', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 2. SUBMIT PRODUCTION OPERATIONAL UPDATE (Create or Update Output)
  const openCreateBatch = () => {
    setBatchForm({
      productName: '',
      machineId: String(assignedMachines[0]?.id || '1'),
      quantityProduced: 50,
      quantityRejected: 0,
      status: 'IN_PROGRESS',
      productionStart: toLocalDateTimeValue()
    });
    setBatchModal({ mode: 'create' });
  };

  const openUpdateBatch = (b) => {
    setBatchForm({
      productName: b.productName || b.partName || '',
      machineId: String(b.machineId || b.machine?.id || assignedMachines[0]?.id || '1'),
      quantityProduced: Number(b.quantityProduced ?? b.actualUnits ?? 0),
      quantityRejected: Number(b.quantityRejected ?? b.scrapUnits ?? b.defects ?? 0),
      status: (b.status || 'IN_PROGRESS').toUpperCase(),
      productionStart: b.productionStart ? toLocalDateTimeValue(b.productionStart) : toLocalDateTimeValue()
    });
    setBatchModal({ mode: 'edit', item: b });
  };

  const handleSaveBatch = async (e) => {
    e.preventDefault();
    if (!batchForm.productName.trim() || batchForm.productName.trim().length < 2) {
      showToast('Product name must be at least 2 characters', 'error');
      return;
    }
    setActionLoading(true);
    try {
      const payload = {
        productName: batchForm.productName.trim(),
        machineId: Number(batchForm.machineId) || Number(assignedMachines[0]?.id || 1),
        quantityProduced: Math.max(0, Number(batchForm.quantityProduced) || 0),
        quantityRejected: Math.max(0, Number(batchForm.quantityRejected) || 0),
        status: batchForm.status,
        productionStart: toBackendLocalDateTime(batchForm.productionStart || new Date()),
        productionEnd: batchForm.status === 'COMPLETED' ? toBackendLocalDateTime(new Date()) : null
      };
      if (batchModal.mode === 'create') {
        await productionApi.create(payload);
        showToast(`Shift batch '${payload.productName}' logged.`);
      } else {
        await productionApi.update(batchModal.item.id, payload);
        showToast(`Shift batch BAT-${String(batchModal.item.id).padStart(3, '0')} output updated.`);
      }
      setBatchModal(null);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to save shift production update', 'error');
    } finally {
      setActionLoading(false);
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

      {/* Top Operator Identity Banner (Emerald Theme) */}
      <div
        className="pbi-admin-top-banner"
        style={{
          borderColor: 'rgba(16, 185, 129, 0.35)',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, #182030 60%)'
        }}
      >
        <div className="pbi-admin-top-left">
          <div
            className="pbi-admin-top-icon"
            style={{
              background: 'rgba(16, 185, 129, 0.14)',
              color: '#34D399',
              borderColor: 'rgba(16, 185, 129, 0.45)',
              boxShadow: '0 0 14px rgba(16, 185, 129, 0.25)'
            }}
          >
            <HardHat size={24} />
          </div>
          <div>
            <div className="pbi-admin-top-title">Floor Operator Workstation</div>
            <div className="pbi-admin-top-desc" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building2 size={12} color="#34D399" />
              <span>
                Assigned Facility: <strong style={{ color: '#FFFFFF' }}>{assignedPlant ? assignedPlant.name : 'Assigned Plant #1'}</strong>
                {assignedPlant?.location ? ` (${assignedPlant.location})` : ''}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div className="pbi-operator-auth-tag">
            <ShieldCheck size={14} />
            <span>Authority: ROLE_{(user?.role || 'OPERATOR').toUpperCase()}</span>
          </div>
          <button
            type="button"
            className="pbi-btn-action-sm pbi-btn-action-gold"
            onClick={handleExportShiftReport}
            style={{ height: '30px', padding: '0 12px' }}
            title="Export Shift & Machine Report (CSV)"
          >
            <Download size={13} />
            <span>Shift Report</span>
          </button>
          <button type="button" className="pbi-ribbon-btn" onClick={fetchData}>
            <RefreshCw size={13} className={loading ? 'spin-animation' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Emerald Navigation Subtabs */}
      <div className="pbi-admin-tabs">
        <button type="button" className={`pbi-admin-tab-btn ${activeTab === 'workstation' ? 'active' : ''}`} onClick={() => setActiveTab('workstation')}>
          <Cpu size={15} />
          <span>Assigned Machines ({assignedMachines.length})</span>
        </button>
        <button type="button" className={`pbi-admin-tab-btn ${activeTab === 'production' ? 'active' : ''}`} onClick={() => setActiveTab('production')}>
          <Layers size={15} />
          <span>Shift Production ({assignedBatches.length})</span>
        </button>
        <button type="button" className={`pbi-admin-tab-btn ${activeTab === 'alerts' ? 'active' : ''}`} onClick={() => setActiveTab('alerts')}>
          <AlertTriangle size={15} />
          <span>Floor Alerts ({assignedAlerts.filter(a => !a.resolved).length})</span>
        </button>
        <button type="button" className={`pbi-admin-tab-btn ${activeTab === 'maintenance' ? 'active' : ''}`} onClick={() => setActiveTab('maintenance')}>
          <Wrench size={15} />
          <span>Maintenance Instructions ({assignedOrders.length})</span>
        </button>
        <button type="button" className={`pbi-admin-tab-btn ${activeTab === 'telemetry' ? 'active' : ''}`} onClick={() => setActiveTab('telemetry')}>
          <Activity size={15} />
          <span>Live Telemetry ({assignedTelemetry.length})</span>
        </button>
      </div>

      {/* TAB 1: ASSIGNED MACHINES (READ-ONLY) */}
      {activeTab === 'workstation' && (
        <div className="pbi-visual-card" style={{ width: '100%', boxSizing: 'border-box' }}>
          <div className="pbi-visual-header">
            <div className="pbi-visual-title">Assigned Floor Machines — {assignedPlant?.name || 'Plant #1'}</div>
            <span style={{ fontSize: '11px', color: '#34D399', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={11} />
              <span>{assignedPlant?.location || 'Floor Zone A'}</span>
            </span>
          </div>
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table className="pbi-matrix-table" style={{ width: '100%', tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th style={{ width: '78px', padding: '10px 8px' }}>Asset ID</th>
                  <th style={{ padding: '10px 10px' }}>Machine Asset &amp; Type</th>
                  <th style={{ width: '110px', padding: '10px 8px' }}>Health</th>
                  <th style={{ width: '120px', padding: '10px 14px', textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {assignedMachines.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: '#94A3B8' }}>
                      No machines assigned to your plant floor.
                    </td>
                  </tr>
                )}
                {assignedMachines.map(m => {
                  const isRunning = m.status === 'RUNNING';
                  const statusClass = isRunning ? 'pbi-status-running' : (m.status === 'IDLE' ? 'pbi-status-idle' : 'pbi-status-maintenance');
                  const healthScore = isRunning ? 94 : (m.status === 'IDLE' ? 82 : 45);
                  return (
                    <tr key={m.id}>
                      <td style={{ padding: '10px 8px', fontFamily: 'var(--pbi-font-mono)', color: '#34D399', fontWeight: 700, fontSize: '11.5px' }}>
                        MCH-{String(m.id).padStart(3, '0')}
                      </td>
                      <td style={{ padding: '10px 10px' }}>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: '#FFFFFF' }}>{m.name}</div>
                        <span style={{ fontFamily: 'var(--pbi-font-mono)', fontSize: '10px', color: '#00BCF2', background: 'rgba(0,188,242,0.12)', padding: '1px 5px', borderRadius: '3px' }}>
                          {m.type || 'CNC'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div className="pbi-cell-bar-track" style={{ width: '50px', height: '5px', background: '#0E1422', borderRadius: '3px' }}>
                            <div className="pbi-cell-bar-fill" style={{ width: `${healthScore}%`, background: healthScore > 80 ? '#10B981' : '#F59E0B', borderRadius: '3px' }} />
                          </div>
                          <span style={{ fontFamily: 'var(--pbi-font-mono)', fontSize: '11px', fontWeight: 700, color: healthScore > 80 ? '#10B981' : '#F59E0B' }}>
                            {healthScore}%
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <span className={`pbi-status-pill ${statusClass}`}>
                          <span className="pbi-status-dot" />
                          <span>{m.status}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: SHIFT PRODUCTION (Submit Operational Updates — NO Delete) */}
      {activeTab === 'production' && (
        <div className="pbi-visual-card" style={{ width: '100%', boxSizing: 'border-box' }}>
          <div className="pbi-visual-header">
            <div className="pbi-visual-title">Assigned Shift Production &amp; Output Updates</div>
            <button type="button" className="pbi-btn-action-sm pbi-btn-action-gold" onClick={openCreateBatch} style={{ height: '28px', padding: '0 12px' }}>
              <Plus size={13} />
              <span>Log Shift Batch</span>
            </button>
          </div>
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table className="pbi-matrix-table" style={{ width: '100%', tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th style={{ width: '78px', padding: '10px 8px' }}>Batch ID</th>
                  <th style={{ padding: '10px 10px' }}>Product &amp; Machine</th>
                  <th style={{ width: '92px', padding: '10px 8px' }}>Produced</th>
                  <th style={{ width: '80px', padding: '10px 8px' }}>Scrap</th>
                  <th style={{ width: '108px', padding: '10px 8px' }}>Status</th>
                  <th style={{ width: '115px', textAlign: 'right', padding: '10px 14px' }}>Update</th>
                </tr>
              </thead>
              <tbody>
                {assignedBatches.map(b => {
                  const produced = Number(b.quantityProduced ?? b.actualUnits ?? 0);
                  const rejected = Number(b.quantityRejected ?? b.scrapUnits ?? b.defects ?? 0);
                  const statusUpper = (b.status || 'IN_PROGRESS').toUpperCase();
                  return (
                    <tr key={b.id}>
                      <td style={{ padding: '10px 8px', fontFamily: 'var(--pbi-font-mono)', color: '#34D399', fontWeight: 700, fontSize: '11.5px' }}>
                        {b.batchCode || `BAT-${String(b.id).padStart(3, '0')}`}
                      </td>
                      <td style={{ padding: '10px 10px' }}>
                        <div style={{ fontWeight: 700, fontSize: '12.5px', color: '#FFFFFF' }}>{b.productName || `Batch #${b.id}`}</div>
                        <div style={{ fontSize: '11px', color: '#94A3B8' }}>{getMachineName(b.machineId || b.machine?.id)}</div>
                      </td>
                      <td style={{ padding: '10px 8px', fontFamily: 'var(--pbi-font-mono)', fontWeight: 700, color: '#FFFFFF' }}>{produced.toLocaleString()} u</td>
                      <td style={{ padding: '10px 8px', fontFamily: 'var(--pbi-font-mono)', fontWeight: 700, color: rejected > 0 ? '#EF4444' : '#10B981' }}>{rejected}</td>
                      <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>
                        <span className={`pbi-status-pill ${statusUpper === 'COMPLETED' ? 'pbi-status-running' : 'pbi-status-idle'}`}>
                          <span className="pbi-status-dot" />
                          <span>{statusUpper}</span>
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button type="button" className="pbi-btn-action-sm pbi-btn-action-primary" onClick={() => openUpdateBatch(b)}>
                          <Pencil size={11} />
                          <span>Update</span>
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

      {/* TAB 3: FLOOR ALERTS (View & Report ONLY — NO Edit/Delete) */}
      {activeTab === 'alerts' && (
        <div className="pbi-visual-card" style={{ width: '100%', boxSizing: 'border-box' }}>
          <div className="pbi-visual-header">
            <div className="pbi-visual-title">Assigned Floor Machine Alerts</div>
            <button type="button" className="pbi-btn-action-sm pbi-btn-action-gold" onClick={handleOpenReportAlert} style={{ height: '28px', padding: '0 12px' }}>
              <Plus size={13} />
              <span>Report Alert</span>
            </button>
          </div>
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table className="pbi-matrix-table" style={{ width: '100%', tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th style={{ width: '74px', padding: '10px 8px' }}>Alert ID</th>
                  <th style={{ width: '90px', padding: '10px 8px' }}>Severity</th>
                  <th style={{ padding: '10px 10px' }}>Incident &amp; Description</th>
                  <th style={{ width: '150px', padding: '10px 8px' }}>Machine</th>
                  <th style={{ width: '105px', textAlign: 'right', padding: '10px 14px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {assignedAlerts.map(a => {
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
                        <span className={`pbi-status-pill ${a.resolved ? 'pbi-status-online' : 'pbi-status-offline'}`}>
                          <span className="pbi-status-dot" />
                          <span>{a.resolved ? 'RESOLVED' : 'OPEN'}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: MAINTENANCE INSTRUCTIONS (READ-ONLY) */}
      {activeTab === 'maintenance' && (
        <div className="pbi-visual-card" style={{ width: '100%', boxSizing: 'border-box' }}>
          <div className="pbi-visual-header">
            <div className="pbi-visual-title">Maintenance Instructions for Assigned Machines</div>
            <span style={{ fontSize: '11px', color: '#94A3B8' }}>Read-Only Floor Instructions</span>
          </div>
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table className="pbi-matrix-table" style={{ width: '100%', tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th style={{ width: '74px', padding: '10px 8px' }}>Order ID</th>
                  <th style={{ width: '160px', padding: '10px 8px' }}>Machine &amp; Type</th>
                  <th style={{ padding: '10px 10px' }}>Instructions &amp; Technician</th>
                  <th style={{ width: '115px', textAlign: 'right', padding: '10px 14px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {assignedOrders.map(o => {
                  const statusUpper = (o.status || 'SCHEDULED').toUpperCase();
                  return (
                    <tr key={o.id}>
                      <td style={{ padding: '10px 8px', fontFamily: 'var(--pbi-font-mono)', color: '#34D399', fontWeight: 700, fontSize: '11.5px' }}>
                        WO-{String(o.id).padStart(3, '0')}
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        <div style={{ fontWeight: 700, fontSize: '12.5px', color: '#FFFFFF' }}>{getMachineName(o.machineId || o.machine?.id)}</div>
                        <span style={{ fontFamily: 'var(--pbi-font-mono)', fontSize: '10px', color: '#34D399', background: 'rgba(16,185,129,0.12)', padding: '1px 5px', borderRadius: '3px' }}>
                          {o.type || 'PREVENTIVE'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 10px' }}>
                        <div style={{ color: '#E2E8F0', fontSize: '12.5px' }}>{o.description || o.task}</div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '3px', fontSize: '11px', color: '#94A3B8' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><User size={11} color="#34D399" />{o.technician || 'Engineer'}</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--pbi-font-mono)' }}><Calendar size={11} />{o.scheduledDate ? String(o.scheduledDate).slice(0, 10) : 'Immediate'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <span className={`pbi-status-pill ${statusUpper === 'COMPLETED' ? 'pbi-status-running' : 'pbi-status-idle'}`}>
                          <span className="pbi-status-dot" />
                          <span>{statusUpper}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: LIVE TELEMETRY (ASSIGNED MACHINES ONLY) */}
      {activeTab === 'telemetry' && (
        <div className="pbi-visual-card" style={{ width: '100%', boxSizing: 'border-box' }}>
          <div className="pbi-visual-header">
            <div className="pbi-visual-title">Assigned Machine Telemetry Feeds</div>
          </div>
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table className="pbi-matrix-table" style={{ width: '100%', tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th style={{ width: '78px', padding: '10px 8px' }}>Stream ID</th>
                  <th style={{ padding: '10px 10px' }}>Machine</th>
                  <th style={{ width: '90px', padding: '10px 8px' }}>Temp</th>
                  <th style={{ width: '96px', padding: '10px 8px' }}>Vibration</th>
                  <th style={{ width: '88px', padding: '10px 8px' }}>Pressure</th>
                  <th style={{ width: '96px', padding: '10px 8px' }}>RPM</th>
                  <th style={{ width: '105px', padding: '10px 14px', textAlign: 'right' }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {assignedTelemetry.slice(0, 20).map(t => {
                  const temp = Number(t.temperature || 65);
                  const vib = Number(t.vibration || 1.2);
                  const pres = Number(t.pressure || 5.5);
                  const rpm = Number(t.rpm || 2400);
                  return (
                    <tr key={t.id}>
                      <td style={{ padding: '10px 8px', fontFamily: 'var(--pbi-font-mono)', color: '#34D399', fontWeight: 700, fontSize: '11.5px' }}>TLM-{t.id}</td>
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

      {/* MODAL: REPORT FLOOR ALERT */}
      {showAlertModal && (
        <div className="pbi-modal-backdrop" onClick={() => setShowAlertModal(false)}>
          <div className="pbi-modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="pbi-modal-header">
              <div className="pbi-modal-title">
                <AlertTriangle size={16} color="#10B981" />
                <span>Report Floor Machine Alert</span>
              </div>
              <button type="button" className="pbi-modal-close" onClick={() => setShowAlertModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleReportAlertSubmit}>
              <div className="pbi-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label className="pbi-form-label">Assigned Machine *</label>
                  <select className="pbi-form-input" value={alertForm.machineId} onChange={(e) => setAlertForm({ ...alertForm, machineId: e.target.value })}>
                    {assignedMachines.map(m => <option key={m.id} value={String(m.id)}>{m.name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="pbi-form-label">Incident Type</label>
                    <select className="pbi-form-input" value={alertForm.type} onChange={(e) => setAlertForm({ ...alertForm, type: e.target.value })}>
                      {ALERT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="pbi-form-label">Severity</label>
                    <select className="pbi-form-input" value={alertForm.severity} onChange={(e) => setAlertForm({ ...alertForm, severity: e.target.value })}>
                      {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="pbi-form-label">Floor Observation / Description *</label>
                  <textarea rows={3} className="pbi-form-input" style={{ height: 'auto', padding: '10px 12px' }} placeholder="Describe the machine anomaly observed on the floor..." value={alertForm.message} onChange={(e) => setAlertForm({ ...alertForm, message: e.target.value })} required />
                </div>
              </div>
              <div className="pbi-modal-footer">
                <button type="button" className="pbi-ribbon-btn" onClick={() => setShowAlertModal(false)}>Cancel</button>
                <button type="submit" className="pbi-btn-action-sm pbi-btn-action-gold" disabled={actionLoading} style={{ height: '32px', padding: '0 16px' }}>
                  {actionLoading ? 'Reporting...' : 'Submit Alert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SUBMIT SHIFT PRODUCTION UPDATE */}
      {batchModal && (
        <div className="pbi-modal-backdrop" onClick={() => setBatchModal(null)}>
          <div className="pbi-modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="pbi-modal-header">
              <div className="pbi-modal-title">
                <Layers size={16} color="#10B981" />
                <span>{batchModal.mode === 'create' ? 'Log Shift Production Batch' : `Update Batch BAT-${String(batchModal.item.id).padStart(3, '0')}`}</span>
              </div>
              <button type="button" className="pbi-modal-close" onClick={() => setBatchModal(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveBatch}>
              <div className="pbi-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label className="pbi-form-label">Product / Part Name *</label>
                  <input type="text" className="pbi-form-input" value={batchForm.productName} onChange={(e) => setBatchForm({ ...batchForm, productName: e.target.value })} required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="pbi-form-label">Assigned Machine</label>
                    <select className="pbi-form-input" value={batchForm.machineId} onChange={(e) => setBatchForm({ ...batchForm, machineId: e.target.value })}>
                      {assignedMachines.map(m => <option key={m.id} value={String(m.id)}>{m.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="pbi-form-label">Shift Status</label>
                    <select className="pbi-form-input" value={batchForm.status} onChange={(e) => setBatchForm({ ...batchForm, status: e.target.value })}>
                      {BATCH_STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="pbi-form-label">Units Produced *</label>
                    <input type="number" min="0" className="pbi-form-input" value={batchForm.quantityProduced} onChange={(e) => setBatchForm({ ...batchForm, quantityProduced: e.target.value })} required />
                  </div>
                  <div>
                    <label className="pbi-form-label">Units Rejected (Scrap) *</label>
                    <input type="number" min="0" className="pbi-form-input" value={batchForm.quantityRejected} onChange={(e) => setBatchForm({ ...batchForm, quantityRejected: e.target.value })} required />
                  </div>
                </div>
              </div>
              <div className="pbi-modal-footer">
                <button type="button" className="pbi-ribbon-btn" onClick={() => setBatchModal(null)}>Cancel</button>
                <button type="submit" className="pbi-btn-action-sm pbi-btn-action-gold" disabled={actionLoading} style={{ height: '32px', padding: '0 16px' }}>
                  {actionLoading ? 'Submitting...' : 'Save Output'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

