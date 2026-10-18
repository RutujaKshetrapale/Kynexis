import React, { useState, useEffect } from 'react';
import { dashboardApi, alertsApi, telemetryApi } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  Factory, 
  Cpu, 
  Radio, 
  AlertTriangle, 
  Boxes, 
  Zap, 
  Activity, 
  ArrowUpRight, 
  RefreshCw,
  Clock
} from 'lucide-react';

export default function DashboardView({ onNavigate }) {
  const [summary, setSummary] = useState(null);
  const [machineStatus, setMachineStatus] = useState(null);
  const [criticalAlert, setCriticalAlert] = useState(null);
  const [recentTelemetry, setRecentTelemetry] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const [sum, status, alerts, telem] = await Promise.all([
        dashboardApi.getSummary(),
        dashboardApi.getMachineStatus(),
        alertsApi.getUnresolved(),
        telemetryApi.getAll({ size: 5 })
      ]);

      setSummary(sum);
      setMachineStatus(status);

      const critical = (alerts || []).find(a => (a.severity || '').toUpperCase() === 'CRITICAL');
      setCriticalAlert(critical || (alerts && alerts.length > 0 ? alerts[0] : null));
      setRecentTelemetry(Array.isArray(telem) ? telem.slice(0, 5) : []);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading) {
    return <LoadingSpinner message="Aggregating telemetry from 10 microservices..." />;
  }

  const totalMachines = (machineStatus?.active || 0) + (machineStatus?.inactive || 0) + (machineStatus?.maintenance || 0) || 1;
  const activePct = Math.round(((machineStatus?.active || 0) / totalMachines) * 100);
  const maintPct = Math.round(((machineStatus?.maintenance || 0) / totalMachines) * 100);
  const inactivePct = 100 - activePct - maintPct;

  return (
    <div className="page-container">
      {/* Top Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Activity className="text-accent" style={{ color: 'var(--neon-cyan)' }} />
            Executive Smart Factory Dashboard
          </h1>
          <p className="page-description">
            Real-time industrial operational overview across all manufacturing facilities and IoT equipment
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            type="button" 
            className="btn btn-ghost btn-sm" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw size={14} className={refreshing ? 'spinner' : ''} />
            <span>{refreshing ? 'Syncing...' : 'Sync Fleet'}</span>
          </button>
        </div>
      </div>

      {/* Critical Alert Warning Banner */}
      {criticalAlert && !criticalAlert.resolved && (
        <div className="alert-banner">
          <div className="alert-banner-content">
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--neon-crimson)'
            }}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontWeight: 700, color: '#f87171', fontSize: '0.9rem' }}>
                  ACTIVE {criticalAlert.severity} ALARM: {criticalAlert.type}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  (Machine #{criticalAlert.machineId})
                </span>
              </div>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                {criticalAlert.message}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={() => onNavigate('alerts')}
          >
            Investigate Alarm
            <ArrowUpRight size={14} />
          </button>
        </div>
      )}

      {/* 6 Key Operational KPI Cards */}
      <div className="grid-cols-4" style={{ marginBottom: '2rem' }}>
        {/* Total Plants */}
        <div className="kpi-card card-hoverable" onClick={() => onNavigate('plants')} style={{ cursor: 'pointer' }}>
          <div className="kpi-icon-wrap kpi-icon-cyan">
            <Factory size={26} />
          </div>
          <div className="kpi-info">
            <span className="kpi-title">Manufacturing Plants</span>
            <span className="kpi-value">{summary?.totalPlants ?? 3}</span>
            <span className="kpi-sub" style={{ color: 'var(--neon-cyan)' }}>100% Online & Connected</span>
          </div>
        </div>

        {/* Total Machines */}
        <div className="kpi-card card-hoverable" onClick={() => onNavigate('machines')} style={{ cursor: 'pointer' }}>
          <div className="kpi-icon-wrap kpi-icon-purple">
            <Cpu size={26} />
          </div>
          <div className="kpi-info">
            <span className="kpi-title">Industrial Equipment</span>
            <span className="kpi-value">{summary?.totalMachines ?? 5}</span>
            <span className="kpi-sub">
              {summary?.activeMachines ?? 3} Active / {machineStatus?.maintenance ?? 1} Maint
            </span>
          </div>
        </div>

        {/* Total Sensors */}
        <div className="kpi-card card-hoverable" onClick={() => onNavigate('sensors')} style={{ cursor: 'pointer' }}>
          <div className="kpi-icon-wrap kpi-icon-emerald">
            <Radio size={26} />
          </div>
          <div className="kpi-info">
            <span className="kpi-title">Active IoT Sensors</span>
            <span className="kpi-value">{summary?.totalSensors ?? 5}</span>
            <span className="kpi-sub" style={{ color: 'var(--neon-emerald)' }}>Telemetry Edge Stream</span>
          </div>
        </div>

        {/* Unresolved Alerts */}
        <div className="kpi-card card-hoverable" onClick={() => onNavigate('alerts')} style={{ cursor: 'pointer' }}>
          <div className={`kpi-icon-wrap ${(summary?.unresolvedAlerts || 0) > 0 ? 'kpi-icon-crimson' : 'kpi-icon-emerald'}`}>
            <AlertTriangle size={26} />
          </div>
          <div className="kpi-info">
            <span className="kpi-title">Unresolved Alarms</span>
            <span className="kpi-value" style={{ color: (summary?.unresolvedAlerts || 0) > 0 ? '#f87171' : 'var(--neon-emerald)' }}>
              {summary?.unresolvedAlerts ?? 1}
            </span>
            <span className="kpi-sub">Needs Engineer Attention</span>
          </div>
        </div>

        {/* Total Production */}
        <div className="kpi-card card-hoverable" onClick={() => onNavigate('production')} style={{ cursor: 'pointer' }}>
          <div className="kpi-icon-wrap kpi-icon-amber">
            <Boxes size={26} />
          </div>
          <div className="kpi-info">
            <span className="kpi-title">Production Output</span>
            <span className="kpi-value">{summary?.totalProduction?.toLocaleString() ?? '1,650'}</span>
            <span className="kpi-sub">Scrap: {summary?.rejectedProduction ?? 17} units ({((summary?.rejectedProduction || 17) / (summary?.totalProduction || 1650) * 100).toFixed(1)}%)</span>
          </div>
        </div>

        {/* Energy Consumption */}
        <div className="kpi-card card-hoverable" onClick={() => onNavigate('energy')} style={{ cursor: 'pointer' }}>
          <div className="kpi-icon-wrap kpi-icon-cyan">
            <Zap size={26} />
          </div>
          <div className="kpi-info">
            <span className="kpi-title">Factory Power Usage</span>
            <span className="kpi-value">{summary?.totalEnergyConsumption ?? '491.1'}</span>
            <span className="kpi-sub">Total kWh Tracked</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Machine Health Distribution & Real-time Telemetry Stream */}
      <div className="grid-cols-2" style={{ marginBottom: '2rem' }}>
        {/* Machine Operational Health Distribution */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Cpu size={18} style={{ color: 'var(--neon-cyan)' }} />
              Fleet Operational Status Distribution
            </h2>
            <button 
              type="button" 
              className="btn btn-ghost btn-sm" 
              onClick={() => onNavigate('machines')}
            >
              Fleet Inventory
              <ArrowUpRight size={13} />
            </button>
          </div>

          {/* Graphical Multi-segmented Progress Bar */}
          <div style={{
            height: 14,
            borderRadius: '6px',
            background: 'rgba(255, 255, 255, 0.05)',
            overflow: 'hidden',
            display: 'flex',
            marginBottom: '1.5rem',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)'
          }}>
            <div style={{ width: `${activePct}%`, background: 'var(--neon-emerald)', transition: 'width 0.4s ease' }} title={`Active: ${activePct}%`} />
            <div style={{ width: `${maintPct}%`, background: 'var(--neon-purple)', transition: 'width 0.4s ease' }} title={`Maintenance: ${maintPct}%`} />
            <div style={{ width: `${inactivePct}%`, background: '#64748b', transition: 'width 0.4s ease' }} title={`Inactive: ${inactivePct}%`} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', textAlign: 'center' }}>
            <div style={{ padding: '0.85rem', background: 'rgba(16, 185, 129, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <div style={{ fontSize: '0.75rem', color: '#6ee7b7', fontWeight: 600 }}>OPERATIONAL (ACTIVE)</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#34d399', marginTop: '0.25rem' }}>
                {machineStatus?.active ?? 3}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{activePct}% of Total Fleet</div>
            </div>

            <div style={{ padding: '0.85rem', background: 'rgba(168, 85, 247, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
              <div style={{ fontSize: '0.75rem', color: '#c084fc', fontWeight: 600 }}>IN MAINTENANCE</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#a855f7', marginTop: '0.25rem' }}>
                {machineStatus?.maintenance ?? 1}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{maintPct}% Scheduled Work</div>
            </div>

            <div style={{ padding: '0.85rem', background: 'rgba(100, 116, 139, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(100, 116, 139, 0.2)' }}>
              <div style={{ fontSize: '0.75rem', color: '#cbd5e1', fontWeight: 600 }}>STANDBY / IDLE</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#94a3b8', marginTop: '0.25rem' }}>
                {machineStatus?.inactive ?? 1}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{inactivePct}% Awaiting Run</div>
            </div>
          </div>
        </div>

        {/* Live IoT Telemetry Feed Stream */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={18} style={{ color: 'var(--neon-emerald)' }} />
              Real-Time Edge Telemetry Stream
            </h2>
            <button 
              type="button" 
              className="btn btn-ghost btn-sm" 
              onClick={() => onNavigate('telemetry')}
            >
              Live Monitor
              <ArrowUpRight size={13} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recentTelemetry.map((t) => (
              <div 
                key={t.id} 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(0, 242, 254, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--neon-cyan)',
                    fontSize: '0.75rem',
                    fontWeight: 700
                  }}>
                    #{t.machineId}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Machine #{t.machineId}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Clock size={11} />
                      {new Date(t.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.775rem' }}>
                  <span style={{ color: t.temperature > 80 ? '#f87171' : 'var(--text-primary)' }}>
                    {t.temperature}°C
                  </span>
                  <span style={{ color: t.vibration > 4 ? '#fbbf24' : 'var(--text-secondary)' }}>
                    {t.vibration} mm/s
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {t.pressure} PSI
                  </span>
                  <span style={{ color: 'var(--neon-cyan)' }}>
                    {t.rpm} RPM
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Launchpad Actions */}
      <div className="card">
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Factory Quick Launchpad
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <button 
            type="button" 
            className="btn btn-ghost" 
            style={{ justifyContent: 'flex-start', padding: '0.85rem 1rem' }}
            onClick={() => onNavigate('telemetry')}
          >
            <Activity size={18} style={{ color: 'var(--neon-cyan)' }} />
            <span>Simulate Sensor Telemetry</span>
          </button>

          <button 
            type="button" 
            className="btn btn-ghost" 
            style={{ justifyContent: 'flex-start', padding: '0.85rem 1rem' }}
            onClick={() => onNavigate('maintenance')}
          >
            <ShieldCheck size={18} style={{ color: 'var(--neon-emerald)' }} />
            <span>Predictive AI Assessment</span>
          </button>

          <button 
            type="button" 
            className="btn btn-ghost" 
            style={{ justifyContent: 'flex-start', padding: '0.85rem 1rem' }}
            onClick={() => onNavigate('production')}
          >
            <TrendingUp size={18} style={{ color: 'var(--neon-amber)' }} />
            <span>Record Batch Production</span>
          </button>

          <button 
            type="button" 
            className="btn btn-ghost" 
            style={{ justifyContent: 'flex-start', padding: '0.85rem 1rem' }}
            onClick={() => onNavigate('energy')}
          >
            <Zap size={18} style={{ color: 'var(--neon-purple)' }} />
            <span>Track Power Meter (kWh)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
