import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Building2,
  Layers,
  Zap,
  Wrench,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  MapPin,
  Calendar,
  User,
  ShieldCheck,
  Download
} from 'lucide-react';
import { exportToCsv } from '../utils/exportCsv';
import {
  plantsApi,
  machinesApi,
  productionApi,
  energyApi,
  maintenanceApi,
  alertsApi
} from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ManagerDashboardView() {
  const { user, hasRole } = useAuth();
  const canResolveAlerts = hasRole('MANAGER') || hasRole('ADMIN') || hasRole('ENGINEER') || hasRole('OPERATOR');

  const [activeTab, setActiveTab] = useState('facilities');
  const [selectedPlantId, setSelectedPlantId] = useState('ALL');
  const [alertStatusFilter, setAlertStatusFilter] = useState('OPEN');

  const [plants, setPlants] = useState([]);
  const [machines, setMachines] = useState([]);
  const [batches, setBatches] = useState([]);
  const [energyReadings, setEnergyReadings] = useState([]);
  const [maintenanceOrders, setMaintenanceOrders] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        plantsData,
        machinesData,
        productionData,
        energyData,
        maintData,
        alertsData
      ] = await Promise.all([
        plantsApi.getAll().catch(() => []),
        machinesApi.getAll().catch(() => []),
        productionApi.getAll().catch(() => []),
        energyApi.getAll().catch(() => []),
        maintenanceApi.getAll().catch(() => []),
        alertsApi.getAll().catch(() => [])
      ]);

      setPlants(Array.isArray(plantsData) ? plantsData : (plantsData?.content || []));
      setMachines(Array.isArray(machinesData) ? machinesData : (machinesData?.content || []));
      setBatches(Array.isArray(productionData) ? productionData : (productionData?.content || []));
      setEnergyReadings(Array.isArray(energyData) ? energyData : (energyData?.content || []));
      setMaintenanceOrders(Array.isArray(maintData) ? maintData : (maintData?.content || []));
      setAlerts(Array.isArray(alertsData) ? alertsData : (alertsData?.content || []));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Export Management Report CSV (Authorized for ROLE_MANAGER)
  const handleExportReport = () => {
    const headers = ['Facility ID', 'Facility Name', 'Location', 'Status', 'Total Machines', 'Running Machines', 'Utilization %', 'Open Alerts'];
    const rows = plants.map(plant => {
      const pMachines = machines.filter(m => Number(m.plantId || m.plant?.id) === plant.id);
      const pIds = new Set(pMachines.map(m => Number(m.id)));
      const pRunning = pMachines.filter(m => m.status === 'RUNNING').length;
      const utilPct = pMachines.length > 0 ? Math.round((pRunning / pMachines.length) * 100) : 0;
      const pOpenAlerts = alerts.filter(a => !a.resolved && pIds.has(Number(a.machineId || a.machine?.id))).length;
      return [
        `FAC-${String(plant.id).padStart(3, '0')}`,
        plant.name,
        plant.location,
        plant.active !== false ? 'ONLINE' : 'OFFLINE',
        pMachines.length,
        pRunning,
        `${utilPct}%`,
        pOpenAlerts
      ];
    });
    exportToCsv(`kynexis-management-report-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    showToast('Management report exported to CSV.');
  };

  // Cross-facility filtering
  const scopedMachines = selectedPlantId === 'ALL'
    ? machines
    : machines.filter(m => Number(m.plantId || m.plant?.id) === Number(selectedPlantId));

  const scopedMachineIds = new Set(scopedMachines.map(m => Number(m.id)));

  const filterByScopedMachine = (item) => {
    if (selectedPlantId === 'ALL') return true;
    const mid = Number(item.machineId || item.machine?.id);
    return scopedMachineIds.has(mid);
  };

  const scopedBatches = batches.filter(filterByScopedMachine);
  const scopedEnergy = energyReadings.filter(filterByScopedMachine);
  const scopedOrders = maintenanceOrders.filter(filterByScopedMachine);
  const scopedAlerts = alerts.filter(filterByScopedMachine);

  const totalKw = scopedEnergy.reduce((acc, r) => acc + Number(r.activePower || r.powerConsumption || 0), 0);
  const openAlerts = scopedAlerts.filter(a => !a.resolved);

  const visibleAlerts = scopedAlerts.filter(a => {
    if (alertStatusFilter === 'OPEN') return !a.resolved;
    if (alertStatusFilter === 'RESOLVED') return Boolean(a.resolved);
    return true;
  });

  const getMachineName = (machineId) => {
    const found = machines.find(m => Number(m.id) === Number(machineId));
    return found ? found.name : `Machine #${machineId || 1}`;
  };

  return (
    <div className="pbi-admin-container">
      {/* Toast Notification */}
      {toast && (
        <div className={`pbi-toast-notification ${toast.type === 'error' ? 'pbi-toast-error' : 'pbi-toast-success'}`}>
          {toast.type === 'error' ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Executive Identity Banner (Purple Theme) */}
      <div
        className="pbi-admin-top-banner"
        style={{
          borderColor: 'rgba(168, 85, 247, 0.35)',
          background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08) 0%, #182030 60%)'
        }}
      >
        <div className="pbi-admin-top-left">
          <div
            className="pbi-admin-top-icon"
            style={{
              background: 'rgba(168, 85, 247, 0.16)',
              color: '#C084FC',
              borderColor: 'rgba(168, 85, 247, 0.45)',
              boxShadow: '0 0 14px rgba(168, 85, 247, 0.25)'
            }}
          >
            <BarChart3 size={24} />
          </div>
          <div>
            <div className="pbi-admin-top-title">Plant Manager Executive Hub</div>
            <div className="pbi-admin-top-desc">
              Cross-facility OEE audits, fleet capacity, production yield, energy demand &amp; SLA alert escalation
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div className="pbi-manager-auth-tag">
            <ShieldCheck size={14} />
            <span>Authority: ROLE_{(user?.role || 'MANAGER').toUpperCase()}</span>
          </div>
          <button
            type="button"
            className="pbi-btn-action-sm pbi-btn-action-gold"
            onClick={handleExportReport}
            style={{ height: '30px', padding: '0 12px' }}
            title="Export Management Report (CSV)"
          >
            <Download size={13} />
            <span>Export Report</span>
          </button>
          <button type="button" className="pbi-ribbon-btn" onClick={fetchData}>
            <RefreshCw size={13} className={loading ? 'spin-animation' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Global Facility Scope Slicer + Purple Navigation Subtabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div className="pbi-admin-tabs" style={{ marginBottom: 0 }}>
          <button
            type="button"
            className={`pbi-admin-tab-btn ${activeTab === 'facilities' ? 'active' : ''}`}
            onClick={() => setActiveTab('facilities')}
          >
            <Building2 size={15} />
            <span>Facility Audits ({plants.length})</span>
          </button>

          <button
            type="button"
            className={`pbi-admin-tab-btn ${activeTab === 'production' ? 'active' : ''}`}
            onClick={() => setActiveTab('production')}
          >
            <Layers size={15} />
            <span>Production Yield ({scopedBatches.length})</span>
          </button>

          <button
            type="button"
            className={`pbi-admin-tab-btn ${activeTab === 'energy' ? 'active' : ''}`}
            onClick={() => setActiveTab('energy')}
          >
            <Zap size={15} />
            <span>Energy Demand ({scopedEnergy.length})</span>
          </button>

          <button
            type="button"
            className={`pbi-admin-tab-btn ${activeTab === 'maintenance' ? 'active' : ''}`}
            onClick={() => setActiveTab('maintenance')}
          >
            <Wrench size={15} />
            <span>Maintenance ({scopedOrders.length})</span>
          </button>

          <button
            type="button"
            className={`pbi-admin-tab-btn ${activeTab === 'alerts' ? 'active' : ''}`}
            onClick={() => setActiveTab('alerts')}
          >
            <AlertTriangle size={15} />
            <span>SLA Alerts ({openAlerts.length})</span>
          </button>
        </div>

        {/* Plant Cross-Filter Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="pbi-slicer-label">Facility Scope:</span>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Building2 size={13} color="#C084FC" style={{ position: 'absolute', left: '10px', pointerEvents: 'none' }} />
            <select
              className="pbi-form-input"
              style={{
                height: '32px',
                paddingLeft: '30px',
                paddingRight: '14px',
                fontSize: '11.5px',
                fontWeight: 600,
                color: selectedPlantId === 'ALL' ? '#E2E8F0' : '#D8B4FE',
                borderColor: selectedPlantId === 'ALL' ? 'rgba(168, 85, 247, 0.35)' : '#A855F7',
                background: selectedPlantId === 'ALL' ? '#0E1422' : 'rgba(168, 85, 247, 0.14)',
                cursor: 'pointer',
                borderRadius: '20px'
              }}
              value={selectedPlantId}
              onChange={(e) => setSelectedPlantId(e.target.value)}
            >
              <option value="ALL">All Facilities ({plants.length})</option>
              {plants.map(p => (
                <option key={p.id} value={String(p.id)}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: FACILITY AUDITS & CAPACITY PLANNING (READ-ONLY) */}
      {/* ============================================================== */}
      {activeTab === 'facilities' && (
        <div className="pbi-visual-card" style={{ width: '100%', boxSizing: 'border-box' }}>
          <div className="pbi-visual-header">
            <div className="pbi-visual-title">Cross-Facility Performance &amp; Capacity Audit</div>
            <span style={{ fontSize: '11px', color: '#C084FC', fontWeight: 600 }}>
              Click any facility to scope all tabs
            </span>
          </div>

          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table className="pbi-matrix-table" style={{ width: '100%', tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th style={{ width: '76px', padding: '10px 8px' }}>ID</th>
                  <th style={{ padding: '10px 10px' }}>Facility &amp; Location</th>
                  <th style={{ width: '150px', padding: '10px 8px' }}>Fleet Breakdown</th>
                  <th style={{ width: '140px', padding: '10px 8px' }}>OEE Utilization</th>
                  <th style={{ width: '90px', padding: '10px 8px', textAlign: 'center' }}>Open Alerts</th>
                  <th style={{ width: '100px', padding: '10px 14px', textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {plants.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#94A3B8' }}>
                      No manufacturing facilities available.
                    </td>
                  </tr>
                )}
                {plants.map((plant) => {
                  const pMachines = machines.filter(m => Number(m.plantId || m.plant?.id) === plant.id);
                  const pMachineIds = new Set(pMachines.map(m => Number(m.id)));
                  const pRunning = pMachines.filter(m => m.status === 'RUNNING').length;
                  const pIdle = pMachines.filter(m => m.status === 'IDLE').length;
                  const pMaint = pMachines.filter(m => m.status === 'MAINTENANCE').length;
                  const utilPct = pMachines.length > 0 ? Math.round((pRunning / pMachines.length) * 100) : 0;
                  const pOpenAlerts = alerts.filter(a => !a.resolved && pMachineIds.has(Number(a.machineId || a.machine?.id))).length;
                  const isOnline = plant.active !== false;
                  const isSelected = selectedPlantId === String(plant.id);

                  return (
                    <tr
                      key={plant.id}
                      onClick={() => setSelectedPlantId(isSelected ? 'ALL' : String(plant.id))}
                      style={{
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(168, 85, 247, 0.12)' : undefined
                      }}
                    >
                      <td style={{ padding: '10px 8px', fontFamily: 'var(--pbi-font-mono)', color: '#C084FC', fontWeight: 700, fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                        FAC-{String(plant.id).padStart(3, '0')}
                      </td>
                      <td style={{ padding: '10px 10px' }}>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: '#FFFFFF' }}>{plant.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                          <MapPin size={10} color="#C084FC" />
                          <span>{plant.location}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 8px', fontSize: '11.5px', fontFamily: 'var(--pbi-font-mono)', whiteSpace: 'nowrap' }}>
                        <span style={{ color: '#10B981', fontWeight: 700 }}>{pRunning}R</span>
                        <span style={{ color: '#475569', margin: '0 4px' }}>/</span>
                        <span style={{ color: '#F59E0B', fontWeight: 700 }}>{pIdle}I</span>
                        <span style={{ color: '#475569', margin: '0 4px' }}>/</span>
                        <span style={{ color: '#EF4444', fontWeight: 700 }}>{pMaint}M</span>
                        <span style={{ color: '#64748B', marginLeft: '6px' }}>({pMachines.length})</span>
                      </td>
                      <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div className="pbi-cell-bar-track" style={{ width: '70px', height: '6px', background: '#0E1422', borderRadius: '3px', flexShrink: 0 }}>
                            <div
                              className="pbi-cell-bar-fill"
                              style={{
                                width: `${utilPct}%`,
                                background: isOnline ? 'linear-gradient(90deg, #A855F7, #00BCF2)' : '#64748B',
                                borderRadius: '3px'
                              }}
                            />
                          </div>
                          <span style={{ fontWeight: 700, fontSize: '11.5px', fontFamily: 'var(--pbi-font-mono)', color: isOnline ? '#D8B4FE' : '#64748B' }}>
                            {utilPct}%
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                        <span style={{
                          fontFamily: 'var(--pbi-font-mono)',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '10px',
                          color: pOpenAlerts > 0 ? '#FCA5A5' : '#34D399',
                          background: pOpenAlerts > 0 ? 'rgba(239, 68, 68, 0.14)' : 'rgba(16, 185, 129, 0.12)',
                          border: `1px solid ${pOpenAlerts > 0 ? 'rgba(239, 68, 68, 0.35)' : 'rgba(16, 185, 129, 0.3)'}`
                        }}>
                          {pOpenAlerts}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <span className={`pbi-status-pill ${isOnline ? 'pbi-status-online' : 'pbi-status-offline'}`}>
                          <span className="pbi-status-dot" />
                          <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
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

      {/* ============================================================== */}
      {/* TAB 2: PRODUCTION & YIELD AUDIT */}
      {/* ============================================================== */}
      {activeTab === 'production' && (
        <div className="pbi-visual-card" style={{ width: '100%', boxSizing: 'border-box' }}>
          <div className="pbi-visual-header">
            <div className="pbi-visual-title">Production Output &amp; First-Pass Yield Audit</div>
            <span style={{ fontSize: '11px', color: '#94A3B8' }}>Read-Only Executive Review</span>
          </div>

          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table className="pbi-matrix-table" style={{ width: '100%', tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th style={{ width: '80px', padding: '10px 8px' }}>Batch ID</th>
                  <th style={{ padding: '10px 10px' }}>Product &amp; Machine</th>
                  <th style={{ width: '96px', padding: '10px 8px' }}>Produced</th>
                  <th style={{ width: '80px', padding: '10px 8px' }}>Scrap</th>
                  <th style={{ width: '125px', padding: '10px 8px' }}>Yield</th>
                  <th style={{ width: '115px', padding: '10px 14px', textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {scopedBatches.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#94A3B8' }}>
                      No production batches found for this facility scope.
                    </td>
                  </tr>
                )}
                {scopedBatches.map((b) => {
                  const produced = Number(b.quantityProduced ?? b.actualUnits ?? 0);
                  const rejected = Number(b.quantityRejected ?? b.scrapUnits ?? b.defects ?? 0);
                  const total = produced + rejected;
                  const yieldPct = total > 0 ? Math.round((produced / total) * 100) : 100;
                  const statusUpper = (b.status || 'IN_PROGRESS').toUpperCase();

                  return (
                    <tr key={b.id}>
                      <td style={{ padding: '10px 8px', fontFamily: 'var(--pbi-font-mono)', color: '#C084FC', fontWeight: 700, fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                        {b.batchCode || `BAT-${String(b.id).padStart(3, '0')}`}
                      </td>
                      <td style={{ padding: '10px 10px' }}>
                        <div style={{ fontWeight: 700, fontSize: '12.5px', color: '#FFFFFF' }}>{b.productName || `Batch #${b.id}`}</div>
                        <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                          {getMachineName(b.machineId || b.machine?.id)}
                        </div>
                      </td>
                      <td style={{ padding: '10px 8px', fontFamily: 'var(--pbi-font-mono)', fontWeight: 700, color: '#FFFFFF', fontSize: '12px' }}>
                        {produced.toLocaleString()} u
                      </td>
                      <td style={{ padding: '10px 8px', fontFamily: 'var(--pbi-font-mono)', fontWeight: 700, color: rejected > 0 ? '#EF4444' : '#10B981', fontSize: '12px' }}>
                        {rejected}
                      </td>
                      <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div className="pbi-cell-bar-track" style={{ width: '54px', height: '5px', background: '#0E1422', borderRadius: '3px' }}>
                            <div
                              className="pbi-cell-bar-fill"
                              style={{
                                width: `${yieldPct}%`,
                                background: yieldPct >= 95 ? '#10B981' : '#A855F7',
                                borderRadius: '3px'
                              }}
                            />
                          </div>
                          <span style={{ fontWeight: 700, fontSize: '11px', fontFamily: 'var(--pbi-font-mono)', color: yieldPct >= 95 ? '#10B981' : '#D8B4FE' }}>
                            {yieldPct}%
                          </span>
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

      {/* ============================================================== */}
      {/* TAB 3: ENERGY & TARIFF DEMAND AUDITS */}
      {/* ============================================================== */}
      {activeTab === 'energy' && (
        <div className="pbi-visual-card" style={{ width: '100%', boxSizing: 'border-box' }}>
          <div className="pbi-visual-header">
            <div className="pbi-visual-title">Electrical Demand &amp; Power Factor Audit</div>
            <span style={{ fontSize: '11px', color: '#EAB308', fontFamily: 'var(--pbi-font-mono)' }}>
              Total Load: {totalKw.toFixed(1)} kW
            </span>
          </div>

          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table className="pbi-matrix-table" style={{ width: '100%', tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th style={{ width: '76px', padding: '10px 8px' }}>Meter ID</th>
                  <th style={{ padding: '10px 10px' }}>Machine Asset</th>
                  <th style={{ width: '86px', padding: '10px 8px' }}>Power</th>
                  <th style={{ width: '110px', padding: '10px 8px' }}>Load</th>
                  <th style={{ width: '62px', padding: '10px 8px' }}>PF</th>
                  <th style={{ width: '80px', padding: '10px 8px' }}>Voltage</th>
                  <th style={{ width: '105px', padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {scopedEnergy.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#94A3B8' }}>
                      No energy meter readings available for this scope.
                    </td>
                  </tr>
                )}
                {scopedEnergy.map((r) => {
                  const kw = Number(r.activePower || r.powerConsumption || 24.5);
                  const pf = Number(r.powerFactor || 0.95);
                  const barWidth = Math.min(100, Math.round((kw / 50) * 100));

                  return (
                    <tr key={r.id}>
                      <td style={{ padding: '10px 8px', fontFamily: 'var(--pbi-font-mono)', color: '#EAB308', fontWeight: 700, fontSize: '11.5px' }}>
                        MTR-{String(r.id).padStart(3, '0')}
                      </td>
                      <td style={{ padding: '10px 10px', fontWeight: 600, color: '#FFFFFF', fontSize: '12.5px' }}>
                        {getMachineName(r.machineId || r.machine?.id)}
                      </td>
                      <td style={{ padding: '10px 8px', fontFamily: 'var(--pbi-font-mono)', fontWeight: 700, color: '#FFFFFF', fontSize: '12px' }}>
                        {kw.toFixed(1)} kW
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        <div className="pbi-cell-bar-track" style={{ width: '86px', height: '6px', background: '#0E1422', borderRadius: '3px' }}>
                          <div
                            className="pbi-cell-bar-fill"
                            style={{
                              width: `${barWidth}%`,
                              background: kw > 35 ? '#EF4444' : (kw > 20 ? '#A855F7' : '#10B981'),
                              borderRadius: '3px'
                            }}
                          />
                        </div>
                      </td>
                      <td style={{ padding: '10px 8px', fontFamily: 'var(--pbi-font-mono)', fontWeight: 700, fontSize: '12px', color: pf >= 0.95 ? '#10B981' : '#F59E0B' }}>
                        {pf.toFixed(2)}
                      </td>
                      <td style={{ padding: '10px 8px', fontFamily: 'var(--pbi-font-mono)', color: '#CBD5E1', fontSize: '12px' }}>
                        {r.voltage || '415.0'} V
                      </td>
                      <td style={{ padding: '10px 14px', color: '#94A3B8', fontSize: '11px', fontFamily: 'var(--pbi-font-mono)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {r.timestamp ? new Date(r.timestamp).toLocaleTimeString() : 'Live'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: MAINTENANCE SCHEDULE OVERVIEW */}
      {/* ============================================================== */}
      {activeTab === 'maintenance' && (
        <div className="pbi-visual-card" style={{ width: '100%', boxSizing: 'border-box' }}>
          <div className="pbi-visual-header">
            <div className="pbi-visual-title">Maintenance Dispatch &amp; Downtime Audit</div>
            <span style={{ fontSize: '11px', color: '#94A3B8' }}>Read-Only Schedule Overview</span>
          </div>

          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table className="pbi-matrix-table" style={{ width: '100%', tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th style={{ width: '74px', padding: '10px 8px' }}>Order ID</th>
                  <th style={{ width: '165px', padding: '10px 8px' }}>Asset &amp; Type</th>
                  <th style={{ padding: '10px 10px' }}>Description &amp; Technician</th>
                  <th style={{ width: '115px', padding: '10px 14px', textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {scopedOrders.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: '#94A3B8' }}>
                      No maintenance work orders found for this scope.
                    </td>
                  </tr>
                )}
                {scopedOrders.map((o) => {
                  const statusUpper = (o.status || 'SCHEDULED').toUpperCase();
                  const isComplete = statusUpper === 'COMPLETED';
                  const maintType = (o.type || 'PREVENTIVE').toUpperCase();
                  const typeColor = maintType === 'CORRECTIVE' ? '#EF4444' : (maintType === 'PREDICTIVE' ? '#F59E0B' : '#C084FC');

                  return (
                    <tr key={o.id}>
                      <td style={{ padding: '10px 8px', fontFamily: 'var(--pbi-font-mono)', color: '#C084FC', fontWeight: 700, fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                        WO-{String(o.id).padStart(3, '0')}
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        <div style={{ fontWeight: 700, fontSize: '12.5px', color: '#FFFFFF' }}>
                          {getMachineName(o.machineId || o.machine?.id)}
                        </div>
                        <span style={{
                          color: typeColor,
                          background: `${typeColor}15`,
                          border: `1px solid ${typeColor}40`,
                          padding: '1px 5px',
                          borderRadius: '3px',
                          fontFamily: 'var(--pbi-font-mono)',
                          fontSize: '10px',
                          fontWeight: 700,
                          display: 'inline-block',
                          marginTop: '2px'
                        }}>
                          {maintType}
                        </span>
                      </td>
                      <td style={{ padding: '10px 10px' }}>
                        <div style={{ color: '#E2E8F0', fontSize: '12.5px', lineHeight: 1.35 }}>
                          {o.description || o.task || 'Preventive maintenance check'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '3px', fontSize: '11px', color: '#94A3B8' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <User size={11} color="#C084FC" />
                            <span>{o.technician || o.assignedTo || 'Lead Systems Engineer'}</span>
                          </span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--pbi-font-mono)', fontSize: '10.5px', color: '#64748B' }}>
                            <Calendar size={11} />
                            <span>{o.scheduledDate ? String(o.scheduledDate).slice(0, 10) : 'Immediate'}</span>
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <span className={`pbi-status-pill ${isComplete ? 'pbi-status-running' : 'pbi-status-idle'}`}>
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

      {/* ============================================================== */}
      {/* TAB 5: SLA ALERT ESCALATION & RESOLUTION (MANAGER AUTHORIZED) */}
      {/* ============================================================== */}
      {activeTab === 'alerts' && (
        <div className="pbi-visual-card" style={{ width: '100%', boxSizing: 'border-box' }}>
          <div className="pbi-visual-header">
            <div className="pbi-visual-title">SLA Alert Escalation &amp; Operator Resolution</div>

            <div className="pbi-slicer-pill-container" style={{ transform: 'scale(0.92)', transformOrigin: 'right center' }}>
              <button
                type="button"
                className={`pbi-slicer-pill pbi-slicer-pill-offline ${alertStatusFilter === 'OPEN' ? 'active' : ''}`}
                onClick={() => setAlertStatusFilter('OPEN')}
              >
                <span className="pbi-slicer-dot pbi-slicer-dot-offline" />
                <span>OPEN</span>
                <span className="pbi-slicer-badge">{openAlerts.length}</span>
              </button>
              <button
                type="button"
                className={`pbi-slicer-pill pbi-slicer-pill-online ${alertStatusFilter === 'RESOLVED' ? 'active' : ''}`}
                onClick={() => setAlertStatusFilter('RESOLVED')}
              >
                <span className="pbi-slicer-dot pbi-slicer-dot-online" />
                <span>RESOLVED</span>
                <span className="pbi-slicer-badge">{scopedAlerts.length - openAlerts.length}</span>
              </button>
              <button
                type="button"
                className={`pbi-slicer-pill pbi-slicer-pill-all ${alertStatusFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => setAlertStatusFilter('ALL')}
              >
                <span>ALL</span>
                <span className="pbi-slicer-badge">{scopedAlerts.length}</span>
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table className="pbi-matrix-table" style={{ width: '100%', tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th style={{ width: '74px', padding: '10px 8px' }}>Alert ID</th>
                  <th style={{ width: '90px', padding: '10px 8px' }}>Severity</th>
                  <th style={{ padding: '10px 10px' }}>Incident &amp; Message</th>
                  <th style={{ width: '150px', padding: '10px 8px' }}>Machine Asset</th>
                  <th style={{ width: '115px', padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {visibleAlerts.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: '#94A3B8' }}>
                      {alertStatusFilter === 'OPEN'
                        ? 'Zero open operational alerts.'
                        : 'No alerts found matching this filter.'}
                    </td>
                  </tr>
                )}
                {visibleAlerts.map((a) => {
                  const isCrit = a.severity === 'CRITICAL' || a.severity === 'HIGH';
                  const sevColor = isCrit ? '#EF4444' : (a.severity === 'WARNING' ? '#F59E0B' : '#00BCF2');

                  return (
                    <tr key={a.id}>
                      <td style={{ padding: '10px 8px', fontFamily: 'var(--pbi-font-mono)', color: '#EF4444', fontWeight: 700, fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                        ALT-{String(a.id).padStart(3, '0')}
                      </td>
                      <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          color: sevColor,
                          background: `${sevColor}15`,
                          border: `1px solid ${sevColor}40`,
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '10px',
                          fontWeight: 800
                        }}>
                          {a.severity}
                        </span>
                      </td>
                      <td style={{ padding: '10px 10px' }}>
                        <div style={{ fontFamily: 'var(--pbi-font-mono)', fontSize: '10.5px', fontWeight: 700, color: '#F8FAFC' }}>
                          {a.type || a.alertType}
                          <span style={{ color: '#64748B', fontWeight: 400, marginLeft: '8px' }}>
                            {a.createdAt ? new Date(a.createdAt).toLocaleString() : 'Just now'}
                          </span>
                        </div>
                        <div style={{ color: '#CBD5E1', fontSize: '12.5px', marginTop: '2px' }}>
                          {a.message}
                        </div>
                      </td>
                      <td style={{ padding: '10px 8px', fontSize: '12px', fontWeight: 600, color: '#FFFFFF' }}>
                        {getMachineName(a.machineId || a.machine?.id)}
                      </td>
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
    </div>
  );
}

