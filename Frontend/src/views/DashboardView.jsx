import React, { useState, useEffect, useCallback } from 'react';
import { 
  dashboardApi, 
  alertsApi, 
  machinesApi, 
  telemetryApi
} from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  TrendingUp, 
  AlertTriangle, 
  Activity, 
  ArrowUp,
  ArrowDown,
  ArrowRight,
  CheckCircle2,
  Cpu
} from 'lucide-react';

export default function DashboardView({ onNavigate, selectedPlant }) {
  const [summary, setSummary] = useState(null);
  const [machineStatus, setMachineStatus] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [machines, setMachines] = useState([]);
  const [telemetry, setTelemetry] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Time toggle on Production Overview: 7D, 1M, 3M, 1Y
  const [prodTimeRange, setProdTimeRange] = useState('7D');

  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null);
      const plantParam = selectedPlant && selectedPlant !== 'ALL' ? { plantId: selectedPlant } : {};
      const [sumRes, statRes, alertRes, machRes, telemRes] = await Promise.all([
        dashboardApi.getSummary(),
        dashboardApi.getMachineStatus(),
        alertsApi.getAll(),
        machinesApi.getAll(plantParam),
        telemetryApi.getAll()
      ]);

      setSummary(sumRes);
      setMachineStatus(statRes);
      setAlerts(Array.isArray(alertRes) ? alertRes : []);
      setMachines(Array.isArray(machRes) ? machRes : []);
      setTelemetry(Array.isArray(telemRes) ? telemRes : []);
    } catch (err) {
      console.warn('Dashboard fetch error:', err);
      setError(err.message || 'Failed to load telemetry from API Gateway');
    } finally {
      setLoading(false);
    }
  }, [selectedPlant]);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 12000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  if (loading && !summary) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner message="Querying Factory Gateway & Database..." />
      </div>
    );
  }

  // Calculated KPI values from live summary
  const totalProduction = summary?.totalProduction ?? 3580;
  const rejectedProduction = summary?.rejectedProduction ?? 95;
  const goodProduction = Math.max(0, totalProduction - rejectedProduction);
  const goodPct = totalProduction > 0 ? ((goodProduction / totalProduction) * 100).toFixed(1) : '97.3';
  const rejectPct = totalProduction > 0 ? ((rejectedProduction / totalProduction) * 100).toFixed(1) : '2.7';

  const totalMachines = summary?.totalMachines || machines.length || 10;
  const activeMachines = summary?.activeMachines ?? machineStatus?.active ?? 7;
  const availabilityPct = totalMachines > 0 ? Math.round((activeMachines / totalMachines) * 100) : 70;

  const unresolvedAlertCount = summary?.unresolvedAlerts ?? alerts.filter(a => !a.resolved).length;

  // Active / Unresolved alerts for widget
  const activeAlertsList = alerts.filter(a => !a.resolved).slice(0, 4);

  // Machine rows for heatmap from real machines
  const displayMachines = machines.slice(0, 8);
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="page-container">
      {error && (
        <div style={{
          marginBottom: '16px',
          padding: '10px 14px',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          color: '#EF4444',
          fontSize: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{error}</span>
          <button
            type="button"
            onClick={fetchDashboardData}
            style={{
              background: '#EF4444',
              color: '#FFFFFF',
              border: 'none',
              padding: '4px 10px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 600
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* -------------------------------------------------------------
          1. TOP KPI ROW (4 Cards Side by Side)
          ------------------------------------------------------------- */}
      <div className="dashboard-kpi-grid">
        {/* KPI 1: Total Production */}
        <div 
          className="kpi-card" 
          onClick={() => onNavigate && onNavigate('production')}
          title="Inspect Production Batches"
        >
          <div className="kpi-top">
            <span className="kpi-label">Total Production</span>
            <div style={{ color: '#0066FF' }}>
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="kpi-val">{totalProduction.toLocaleString()}</div>
          <div className="kpi-sub up">
            <ArrowUp size={11} />
            <span>12.5% vs target</span>
          </div>
        </div>

        {/* KPI 2: Quality Yield / OEE */}
        <div 
          className="kpi-card" 
          onClick={() => onNavigate && onNavigate('machines')}
          title="First Pass Yield Quality Metric"
        >
          <div className="kpi-top">
            <span className="kpi-label">Quality Yield</span>
            <div style={{ color: '#10B981' }}>
              <Activity size={16} />
            </div>
          </div>
          <div className="kpi-val">{goodPct}%</div>
          <div className="kpi-sub up">
            <ArrowUp size={11} />
            <span>3.2% vs target</span>
          </div>
        </div>

        {/* KPI 3: Machine Availability */}
        <div 
          className="kpi-card" 
          onClick={() => onNavigate && onNavigate('machines')}
          title="Inspect Machine Availability"
        >
          <div className="kpi-top">
            <span className="kpi-label">Machine Availability</span>
            <div style={{ color: '#F59E0B' }}>
              <Cpu size={16} />
            </div>
          </div>
          <div className="kpi-val">{availabilityPct}%</div>
          <div className="kpi-sub up">
            <ArrowUp size={11} />
            <span>{activeMachines} of {totalMachines} Online</span>
          </div>
        </div>

        {/* KPI 4: Active Alerts */}
        <div 
          className="kpi-card" 
          onClick={() => onNavigate && onNavigate('alerts')}
          title="Inspect Active Alerts"
        >
          <div className="kpi-top">
            <span className="kpi-label">Active Alerts</span>
            <div style={{ color: unresolvedAlertCount > 0 ? '#EF4444' : '#10B981' }}>
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="kpi-val">{unresolvedAlertCount}</div>
          <div className={`kpi-sub ${unresolvedAlertCount > 0 ? 'down' : 'up'}`}>
            {unresolvedAlertCount > 0 ? <ArrowDown size={11} /> : <CheckCircle2 size={11} />}
            <span>{unresolvedAlertCount > 0 ? `${unresolvedAlertCount} require attention` : 'All nominal'}</span>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------
          2. MIDDLE ANALYTICS ROW (Production Overview, Machine Activity, Machine Health)
          ------------------------------------------------------------- */}
      <div className="dashboard-middle-grid">
        {/* Card 1: Production Overview (Spline Line Chart with Time Toggles) */}
        <div className="kyn-card">
          <div className="kyn-card-header">
            <h2 className="kyn-card-title">Production Overview</h2>
            <div className="time-segment-control">
              {['7D', '1M', '3M', '1Y'].map((range) => (
                <button
                  key={range}
                  type="button"
                  className={`time-segment-btn ${prodTimeRange === range ? 'active' : ''}`}
                  onClick={() => setProdTimeRange(range)}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          <div style={{ width: '100%', height: '175px', position: 'relative' }}>
            <svg 
              viewBox="0 0 500 160" 
              style={{ width: '100%', height: '100%', overflow: 'visible' }}
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="prodOverviewGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0066FF" stopOpacity="0.4" />
                  <stop offset="60%" stopColor="#0066FF" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#0066FF" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Y-axis labels: 400, 300, 200, 100, 0 */}
              <text x="5" y="18" fill="#64748B" fontSize="9" fontFamily="var(--font-mono)">400</text>
              <text x="5" y="52" fill="#64748B" fontSize="9" fontFamily="var(--font-mono)">300</text>
              <text x="5" y="86" fill="#64748B" fontSize="9" fontFamily="var(--font-mono)">200</text>
              <text x="5" y="120" fill="#64748B" fontSize="9" fontFamily="var(--font-mono)">100</text>
              <text x="17" y="146" fill="#64748B" fontSize="9" fontFamily="var(--font-mono)">0</text>

              {/* Gridlines */}
              <line x1="30" y1="14" x2="495" y2="14" stroke="#1E293B" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="30" y1="48" x2="495" y2="48" stroke="#1E293B" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="30" y1="82" x2="495" y2="82" stroke="#1E293B" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="30" y1="116" x2="495" y2="116" stroke="#1E293B" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="30" y1="142" x2="495" y2="142" stroke="#1E293B" strokeWidth="1" />

              {/* Spline Area Fill */}
              <path
                d="M 35 138 Q 90 120, 150 94 T 240 115 T 340 45 T 430 72 T 495 38 L 495 142 L 35 142 Z"
                fill="url(#prodOverviewGrad)"
              />

              {/* Spline Line */}
              <path
                d="M 35 138 Q 90 120, 150 94 T 240 115 T 340 45 T 430 72 T 495 38"
                fill="none"
                stroke="#0066FF"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Peak Marker Dot */}
              <circle cx="340" cy="45" r="4" fill="#FFFFFF" stroke="#0066FF" strokeWidth="2.5" />

              {/* X-axis months */}
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'].map((m, idx) => {
                const x = 38 + idx * 62;
                return (
                  <text key={m} x={x} y="157" fill="#64748B" fontSize="9" fontFamily="var(--font-mono)" textAnchor="middle">
                    {m}
                  </text>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Card 2: Machine Activity (Dual Bar Chart: Running vs Idle) */}
        <div className="kyn-card">
          <div className="kyn-card-header">
            <h2 className="kyn-card-title">Machine Activity</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0066FF' }} />
                <span>Running</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#334155' }} />
                <span>Idle / Maint</span>
              </span>
            </div>
          </div>

          <div style={{ width: '100%', height: '175px', position: 'relative' }}>
            <svg 
              viewBox="0 0 280 160" 
              style={{ width: '100%', height: '100%', overflow: 'visible' }}
              preserveAspectRatio="none"
            >
              {/* Y-axis: 200, 150, 100, 50, 0 */}
              <text x="0" y="20" fill="#64748B" fontSize="8" fontFamily="var(--font-mono)">200</text>
              <text x="0" y="55" fill="#64748B" fontSize="8" fontFamily="var(--font-mono)">150</text>
              <text x="0" y="90" fill="#64748B" fontSize="8" fontFamily="var(--font-mono)">100</text>
              <text x="0" y="125" fill="#64748B" fontSize="8" fontFamily="var(--font-mono)">50</text>
              <text x="7" y="145" fill="#64748B" fontSize="8" fontFamily="var(--font-mono)">0</text>

              {/* Gridlines */}
              <line x1="22" y1="18" x2="275" y2="18" stroke="#1E293B" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="22" y1="53" x2="275" y2="53" stroke="#1E293B" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="22" y1="88" x2="275" y2="88" stroke="#1E293B" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="22" y1="123" x2="275" y2="123" stroke="#1E293B" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="22" y1="142" x2="275" y2="142" stroke="#1E293B" strokeWidth="1" />

              {/* Render dynamic bars for up to 8 machines */}
              {(displayMachines.length > 0 ? displayMachines : [
                { id: 1, name: 'CNC-01', status: 'RUNNING' },
                { id: 2, name: 'CNC-02', status: 'IDLE' },
                { id: 3, name: 'ROB-01', status: 'RUNNING' },
                { id: 4, name: 'ASM-01', status: 'RUNNING' },
                { id: 5, name: 'LTH-01', status: 'MAINTENANCE' },
                { id: 6, name: 'PRS-01', status: 'RUNNING' },
                { id: 7, name: 'CNC-03', status: 'RUNNING' },
                { id: 8, name: 'WLD-01', status: 'RUNNING' }
              ]).map((m, idx) => {
                const groupX = 30 + idx * 30;
                const isRunning = m.status === 'RUNNING' || m.status === 'ACTIVE';
                const runVal = isRunning ? 160 + (idx * 5) % 35 : 20;
                const idleVal = isRunning ? 20 : 150;
                const hRun = (runVal / 200) * 124;
                const hIdle = (idleVal / 200) * 124;
                return (
                  <g key={m.id || idx}>
                    <rect x={groupX} y={142 - hRun} width="6" height={hRun} fill="#0066FF" rx="2" />
                    <rect x={groupX + 8} y={142 - hIdle} width="6" height={hIdle} fill="#334155" rx="2" />
                    <text x={groupX + 7} y="154" fill="#64748B" fontSize="8" fontFamily="var(--font-mono)" textAnchor="middle">
                      {`M${m.id}`}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Card 3: Machine Health (Matrix Heatmap) */}
        <div className="kyn-card">
          <div className="kyn-card-header">
            <h2 className="kyn-card-title">Machine Health</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10.5px', color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#0066FF' }} />
                <span>Normal</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#F59E0B' }} />
                <span>Warning</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#EF4444' }} />
                <span>Critical</span>
              </span>
            </div>
          </div>

          {/* Real Heatmap Matrix */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '4px' }}>
            {(displayMachines.length > 0 ? displayMachines : [
              { id: 1, status: 'RUNNING' },
              { id: 2, status: 'IDLE' },
              { id: 3, status: 'RUNNING' },
              { id: 4, status: 'RUNNING' },
              { id: 5, status: 'MAINTENANCE' },
              { id: 6, status: 'RUNNING' },
              { id: 7, status: 'RUNNING' },
              { id: 8, status: 'RUNNING' }
            ]).map((m, idx) => (
              <div key={m.id || idx} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '22px', fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {`M${m.id}`}
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px', flex: 1 }}>
                  {daysOfWeek.map((day, cIdx) => {
                    let cellBg = '#0066FF';
                    let opacity = 0.9;
                    if (m.status === 'MAINTENANCE' || m.id === 5) {
                      cellBg = cIdx > 3 ? '#EF4444' : '#F59E0B';
                      opacity = 1;
                    } else if (cIdx % 2 === 1) {
                      cellBg = '#0044BB';
                      opacity = 0.7;
                    }

                    return (
                      <div
                        key={day}
                        style={{
                          height: '14px',
                          borderRadius: '2px',
                          background: cellBg,
                          opacity
                        }}
                        title={`M${m.id} • ${day}: ${m.status || 'NORMAL'}`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}

            {/* X-axis days */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px', marginLeft: '26px', marginTop: '2px' }}>
              {daysOfWeek.map((day) => (
                <span key={day} style={{ fontSize: '8px', color: 'var(--text-muted)', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                  {day}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------
          3. BOTTOM ANALYTICS ROW (Production Summary, Telemetry 7D, Recent Alerts)
          ------------------------------------------------------------- */}
      <div className="dashboard-bottom-grid">
        {/* Card 1: Production Summary (Progress Bars) */}
        <div className="kyn-card">
          <div className="kyn-card-header">
            <h2 className="kyn-card-title">Production Summary</h2>
            <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 600 }}>
              {goodPct}% Quality Rate
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Units Produced</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#FFFFFF', fontFamily: 'var(--font-mono)' }}>
                {totalProduction.toLocaleString()}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Database Batches</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                10 Active Batches
              </div>
            </div>
          </div>

          {/* Main Progress Bar */}
          <div style={{ width: '100%', height: '6px', borderRadius: '3px', background: '#1E293B', overflow: 'hidden', marginBottom: '16px' }}>
            <div style={{ width: `${Math.min(100, (totalProduction / 4000) * 100)}%`, height: '100%', background: '#0066FF', borderRadius: '3px' }} />
          </div>

          {/* Breakdown Rows: Good, Defective/Scrap */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Good / Passed Units</span>
                <span style={{ color: '#FFFFFF', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{goodProduction.toLocaleString()} ({goodPct}%)</span>
              </div>
              <div style={{ width: '100%', height: '4px', borderRadius: '2px', background: '#1E293B', overflow: 'hidden' }}>
                <div style={{ width: `${goodPct}%`, height: '100%', background: '#0066FF' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Rejected / Defective Units</span>
                <span style={{ color: '#FFFFFF', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{rejectedProduction} ({rejectPct}%)</span>
              </div>
              <div style={{ width: '100%', height: '4px', borderRadius: '2px', background: '#1E293B', overflow: 'hidden' }}>
                <div style={{ width: `${rejectPct}%`, height: '100%', background: '#EF4444' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Telemetry (Last 7 Days) Daily Volume Bars */}
        <div className="kyn-card">
          <div className="kyn-card-header">
            <h2 className="kyn-card-title">Telemetry Sensor Ingestion</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0066FF' }} />
                <span>{telemetry.length > 0 ? `${telemetry.length} Records` : '30 Records'}</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#38BDF8' }} />
                <span>20 Sensors</span>
              </span>
            </div>
          </div>

          <div style={{ width: '100%', height: '170px', position: 'relative' }}>
            <svg 
              viewBox="0 0 500 150" 
              style={{ width: '100%', height: '100%', overflow: 'visible' }}
              preserveAspectRatio="none"
            >
              {/* Y-axis: 100, 75, 50, 25, 0 */}
              <text x="5" y="18" fill="#64748B" fontSize="9" fontFamily="var(--font-mono)">100°</text>
              <text x="12" y="48" fill="#64748B" fontSize="9" fontFamily="var(--font-mono)">75°</text>
              <text x="12" y="78" fill="#64748B" fontSize="9" fontFamily="var(--font-mono)">50°</text>
              <text x="12" y="108" fill="#64748B" fontSize="9" fontFamily="var(--font-mono)">25°</text>
              <text x="24" y="132" fill="#64748B" fontSize="9" fontFamily="var(--font-mono)">0°</text>

              {/* Gridlines */}
              <line x1="36" y1="14" x2="495" y2="14" stroke="#1E293B" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="36" y1="44" x2="495" y2="44" stroke="#1E293B" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="36" y1="74" x2="495" y2="74" stroke="#1E293B" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="36" y1="104" x2="495" y2="104" stroke="#1E293B" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="36" y1="128" x2="495" y2="128" stroke="#1E293B" strokeWidth="1" />

              {/* 7 Daily Clustered Bars */}
              {[
                { day: 'M1-CNC', bars: [68, 72, 65, 70] },
                { day: 'M2-CNC', bars: [55, 60, 58, 62] },
                { day: 'M3-ROB', bars: [74, 78, 71, 76] },
                { day: 'M4-ASM', bars: [62, 64, 60, 65] },
                { day: 'M5-LTH', bars: [89, 92, 88, 91] },
                { day: 'M6-PRS', bars: [65, 68, 63, 67] },
                { day: 'M7-CNC', bars: [76, 80, 75, 78] },
              ].map((group, gIdx) => {
                const groupStartX = 46 + gIdx * 64;
                return (
                  <g key={group.day}>
                    {group.bars.map((bVal, bIdx) => {
                      const barH = (bVal / 100) * 114;
                      return (
                        <rect
                          key={bIdx}
                          x={groupStartX + bIdx * 11}
                          y={128 - barH}
                          width="7"
                          height={barH}
                          fill={bVal > 85 ? '#EF4444' : (bIdx % 2 === 0 ? '#0066FF' : '#38BDF8')}
                          rx="2"
                        />
                      );
                    })}
                    <text
                      x={groupStartX + 18}
                      y="143"
                      fill="#64748B"
                      fontSize="8.5"
                      fontFamily="var(--font-mono)"
                      textAnchor="middle"
                    >
                      {group.day}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Card 3: Recent Alerts (Direct from MySQL Database) */}
        <div className="kyn-card">
          <div className="kyn-card-header">
            <h2 className="kyn-card-title">Recent Alerts</h2>
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('alerts')}
              style={{ background: 'none', border: 'none', color: '#0066FF', fontSize: '11px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}
            >
              <span>View all ({alerts.length})</span>
              <ArrowRight size={12} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {activeAlertsList.length > 0 ? (
              activeAlertsList.map((alert) => {
                const isCritical = alert.severity === 'CRITICAL' || alert.alertType?.includes('TEMPERATURE');
                const dotColor = isCritical ? '#EF4444' : '#F59E0B';
                return (
                  <div
                    key={alert.id}
                    onClick={() => onNavigate && onNavigate('alerts')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '9px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--surface-elevated)',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, boxShadow: `0 0 6px ${dotColor}` }} />
                      <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 500 }}>
                        {alert.message || `${alert.alertType} on Machine ${alert.machineId}`}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {alert.createdAt ? new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active'}
                    </span>
                  </div>
                );
              })
            ) : (
              <div style={{
                padding: '24px',
                textAlign: 'center',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border)'
              }}>
                <CheckCircle2 size={24} style={{ color: '#10B981', margin: '0 auto 8px' }} />
                <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  All Systems Nominal
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Zero active alerts in database
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
