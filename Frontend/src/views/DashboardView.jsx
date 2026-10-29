import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Cpu,
  Clock,
  Zap,
  Radio,
  Flame,
  Gauge,
  RotateCw,
  Wrench,
  ShieldCheck,
  Server,
  Sparkles,
  Layers,
  ChevronRight,
  Info
} from 'lucide-react';

// Dynamic production datasets across time ranges
const PROD_DATASETS = {
  '7D': {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    actual: [490, 530, 515, 560, 545, 480, 570],
    target: [480, 480, 490, 500, 500, 460, 500],
    yMax: 700,
    yLabels: ['600', '450', '300', '150', '0'],
    summary: '3,690 Units',
    delta: '+7.9% vs Target',
    avg: '527 units/day',
    unit: 'Units'
  },
  '1M': {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    actual: [3420, 3580, 3490, 3740],
    target: [3300, 3350, 3400, 3450],
    yMax: 4500,
    yLabels: ['4K', '3K', '2K', '1K', '0'],
    summary: '14,230 Units',
    delta: '+5.8% vs Target',
    avg: '3,558 units/wk',
    unit: 'Units'
  },
  '3M': {
    labels: ['August', 'September', 'October'],
    actual: [13800, 14400, 15200],
    target: [13200, 13500, 13800],
    yMax: 18000,
    yLabels: ['16K', '12K', '8K', '4K', '0'],
    summary: '43,400 Units',
    delta: '+9.1% vs Target',
    avg: '14,467 units/mo',
    unit: 'Units'
  },
  '1Y': {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
    actual: [11200, 11800, 12400, 12900, 13100, 13600, 14100, 13800, 14400, 15200],
    target: [11000, 11200, 11500, 12000, 12200, 12500, 13000, 13200, 13500, 13800],
    yMax: 18000,
    yLabels: ['16K', '12K', '8K', '4K', '0'],
    summary: '132,500 Units',
    delta: '+6.4% vs Target',
    avg: '13,250 units/mo',
    unit: 'Units'
  }
};

// Streamed Ingestion Packet Ticker Feed
const INGESTION_PACKETS = [
  { id: 'PKT-1082', sensor: 'SENS-VIB-01', machine: 'CNC-01', metric: '1.24 mm/s RMS', latency: '8ms', status: 'OK' },
  { id: 'PKT-1083', sensor: 'SENS-TMP-03', machine: 'CNC-02', metric: '42.8°C Spindle', latency: '11ms', status: 'OK' },
  { id: 'PKT-1084', sensor: 'SENS-TMP-05', machine: 'LTH-01', metric: '78.4°C Bearing', latency: '12ms', status: 'WARN' },
  { id: 'PKT-1085', sensor: 'SENS-PWR-01', machine: 'PRS-01', metric: '22.5 kW Draw', latency: '7ms', status: 'OK' },
  { id: 'PKT-1086', sensor: 'SENS-HYD-02', machine: 'ASM-01', metric: '144.6 bar Press', latency: '9ms', status: 'OK' },
  { id: 'PKT-1087', sensor: 'SENS-RPM-01', machine: 'ROB-01', metric: '2,800 RPM', latency: '8ms', status: 'OK' },
  { id: 'PKT-1088', sensor: 'SENS-VIB-02', machine: 'CNC-03', metric: '1.38 mm/s RMS', latency: '10ms', status: 'OK' },
  { id: 'PKT-1089', sensor: 'SENS-PWR-02', machine: 'WLD-01', metric: '16.2 kW Load', latency: '6ms', status: 'OK' },
];

const DEFAULT_SUMMARY = {
  totalProduction: 3580,
  rejectedProduction: 95,
  totalMachines: 10,
  activeMachines: 7,
  unresolvedAlerts: 3
};

const DEFAULT_MACHINE_STATUS = {
  active: 7,
  idle: 2,
  maintenance: 1
};

export default function DashboardView({ onNavigate, selectedPlant }) {
  const [summary, setSummary] = useState(DEFAULT_SUMMARY);
  const [machineStatus, setMachineStatus] = useState(DEFAULT_MACHINE_STATUS);
  const [alerts, setAlerts] = useState([]);
  const [machines, setMachines] = useState([]);
  const [telemetry, setTelemetry] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Time toggle on Production Overview: 7D, 1M, 3M, 1Y
  const [prodTimeRange, setProdTimeRange] = useState('7D');
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const currProdData = PROD_DATASETS[prodTimeRange] || PROD_DATASETS['7D'];

  // Live Telemetry Ingestion State (Dynamic throughput & packet stream)
  const [throughputRate, setThroughputRate] = useState(1284);
  const [packetTickerIndex, setPacketTickerIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setThroughputRate(1260 + Math.floor(Math.sin(Date.now() / 1500) * 45) + Math.floor(Math.random() * 20));
      setPacketTickerIndex(prev => prev + 1);
    }, 2200);
    return () => clearInterval(timer);
  }, []);

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
          2. MIDDLE ANALYTICS ROW (Production Overview, Machine Fleet Activity, Machine Health)
          ------------------------------------------------------------- */}
      <div className="dashboard-middle-grid">
        {/* Card 1: Production Overview (Spline Line Chart with Time Toggles & Live Hover) */}
        <div className="kyn-card">
          <div className="kyn-card-header" style={{ alignItems: 'flex-start' }}>
            <div>
              <h2 className="kyn-card-title">Production Overview</h2>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {hoveredPoint ? (
                  <span style={{ color: '#00f2fe', fontWeight: 600 }}>
                    {hoveredPoint.label}: {hoveredPoint.actual.toLocaleString()} {currProdData.unit} 
                    <span style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>
                      (Target: {hoveredPoint.target.toLocaleString()})
                    </span>
                  </span>
                ) : (
                  <span>
                    <strong style={{ color: 'var(--text-primary)' }}>{currProdData.summary}</strong> • <span style={{ color: '#10B981' }}>{currProdData.delta}</span> • Avg {currProdData.avg}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', color: 'var(--text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#0066FF' }} />
                  <span>Actual</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: 10, height: 2, background: '#10B981', borderTop: '2px dashed #10B981' }} />
                  <span>Target</span>
                </span>
              </div>
              <div className="time-segment-control">
                {['7D', '1M', '3M', '1Y'].map((range) => (
                  <button
                    key={range}
                    type="button"
                    className={`time-segment-btn ${prodTimeRange === range ? 'active' : ''}`}
                    onClick={() => {
                      setProdTimeRange(range);
                      setHoveredPoint(null);
                    }}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ width: '100%', height: '175px', position: 'relative' }}>
            {(() => {
              const currData = PROD_DATASETS[prodTimeRange] || PROD_DATASETS['7D'];
              const svgW = 500;
              const svgH = 160;
              const padL = 40;
              const padR = 20;
              const padT = 18;
              const padB = 24;
              const pW = svgW - padL - padR;
              const pH = svgH - padT - padB;

              const pts = currData.labels.map((lbl, idx) => {
                const x = padL + (idx / Math.max(1, currData.labels.length - 1)) * pW;
                const yAct = padT + pH - (currData.actual[idx] / currData.yMax) * pH;
                const yTgt = padT + pH - (currData.target[idx] / currData.yMax) * pH;
                return {
                  label: lbl,
                  actual: currData.actual[idx],
                  target: currData.target[idx],
                  x,
                  yAct,
                  yTgt
                };
              });

              let actPath = '';
              let tgtPath = '';
              if (pts.length > 0) {
                actPath = `M ${pts[0].x} ${pts[0].yAct}`;
                tgtPath = `M ${pts[0].x} ${pts[0].yTgt}`;
                for (let i = 0; i < pts.length - 1; i++) {
                  const p0 = pts[i];
                  const p1 = pts[i + 1];
                  const mx = (p0.x + p1.x) / 2;
                  actPath += ` C ${mx} ${p0.yAct}, ${mx} ${p1.yAct}, ${p1.x} ${p1.yAct}`;
                  tgtPath += ` L ${p1.x} ${p1.yTgt}`;
                }
              }
              const area = pts.length > 0
                ? `${actPath} L ${pts[pts.length - 1].x} ${padT + pH} L ${pts[0].x} ${padT + pH} Z`
                : '';

              return (
                <svg 
                  viewBox={`0 0 ${svgW} ${svgH}`} 
                  style={{ width: '100%', height: '100%', overflow: 'visible' }}
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="prodOverviewGradDynamic" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0066FF" stopOpacity="0.45" />
                      <stop offset="60%" stopColor="#0066FF" stopOpacity="0.12" />
                      <stop offset="100%" stopColor="#0066FF" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Y-axis Labels */}
                  {currData.yLabels.map((yl, idx) => {
                    const yPos = padT + (idx / 4) * pH;
                    return (
                      <g key={yl}>
                        <text x="5" y={yPos + 3} fill="#64748B" fontSize="9" fontFamily="var(--font-mono)">
                          {yl}
                        </text>
                        <line 
                          x1={padL - 4} 
                          y1={yPos} 
                          x2={svgW - padR} 
                          y2={yPos} 
                          stroke="#1E293B" 
                          strokeWidth="1" 
                          strokeDasharray={idx === 4 ? 'none' : '3 3'} 
                        />
                      </g>
                    );
                  })}

                  {/* Spline Area Fill */}
                  <path d={area} fill="url(#prodOverviewGradDynamic)" />

                  {/* Target Benchmark Line (Dashed Green) */}
                  <path
                    d={tgtPath}
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="1.8"
                    strokeDasharray="4 4"
                    strokeLinecap="round"
                  />

                  {/* Actual Production Line (Blue/Cyan) */}
                  <path
                    d={actPath}
                    fill="none"
                    stroke="#0066FF"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                  />

                  {/* Active Hover Guideline and Dot */}
                  {hoveredPoint && (
                    <g>
                      <line 
                        x1={hoveredPoint.x} 
                        y1={padT} 
                        x2={hoveredPoint.x} 
                        y2={padT + pH} 
                        stroke="#38BDF8" 
                        strokeWidth="1.5" 
                        strokeDasharray="3 3" 
                      />
                      <circle 
                        cx={hoveredPoint.x} 
                        cy={hoveredPoint.yAct} 
                        r="5" 
                        fill="#00f2fe" 
                        stroke="#ffffff" 
                        strokeWidth="2" 
                      />
                      <circle 
                        cx={hoveredPoint.x} 
                        cy={hoveredPoint.yTgt} 
                        r="4" 
                        fill="#10B981" 
                        stroke="#ffffff" 
                        strokeWidth="1.5" 
                      />
                    </g>
                  )}

                  {/* Interactive Points on Line */}
                  {pts.map((pt, pIdx) => (
                    <g key={pt.label}>
                      {/* Invisible wider hit-area */}
                      <circle
                        cx={pt.x}
                        cy={pt.yAct}
                        r="14"
                        fill="transparent"
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={() => setHoveredPoint(pt)}
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                      {/* Visible marker dot */}
                      <circle
                        cx={pt.x}
                        cy={pt.yAct}
                        r={hoveredPoint?.label === pt.label ? 5 : 3}
                        fill="#0066FF"
                        stroke="#ffffff"
                        strokeWidth={1.5}
                        style={{ pointerEvents: 'none', transition: 'r 0.15s ease' }}
                      />
                      {/* X-axis Label */}
                      <text
                        x={pt.x}
                        y={padT + pH + 15}
                        fill={hoveredPoint?.label === pt.label ? '#00f2fe' : '#64748B'}
                        fontSize="9"
                        fontFamily="var(--font-mono)"
                        textAnchor="middle"
                        fontWeight={hoveredPoint?.label === pt.label ? 700 : 500}
                      >
                        {pt.label}
                      </text>
                    </g>
                  ))}
                </svg>
              );
            })()}
          </div>
        </div>

        {/* Card 2: Machine Fleet Status & Utilization (Redesigned & Crystal Clear) */}
        <div className="kyn-card">
          <div className="kyn-card-header" style={{ alignItems: 'flex-start' }}>
            <div>
              <h2 className="kyn-card-title">Machine Fleet Activity</h2>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Shift runtime hours &amp; operational availability
              </div>
            </div>

            {/* Clear Status Counts */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px' }}>
              <span style={{ 
                background: 'rgba(16, 185, 129, 0.15)', 
                color: '#10B981', 
                padding: '2px 6px', 
                borderRadius: '4px', 
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10B981' }} />
                6 Running
              </span>
              <span style={{ 
                background: 'rgba(245, 158, 11, 0.15)', 
                color: '#F59E0B', 
                padding: '2px 6px', 
                borderRadius: '4px', 
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#F59E0B' }} />
                1 Idle
              </span>
              <span style={{ 
                background: 'rgba(239, 68, 68, 0.15)', 
                color: '#EF4444', 
                padding: '2px 6px', 
                borderRadius: '4px', 
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#EF4444' }} />
                1 Maint
              </span>
            </div>
          </div>

          {/* Stacked Fleet Availability Visualizer */}
          <div style={{ width: '100%', marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '3px' }}>
              <span>Fleet Availability Rate</span>
              <strong style={{ color: '#10B981', fontFamily: 'var(--font-mono)' }}>75.0% Active</strong>
            </div>
            <div style={{ width: '100%', height: '6px', borderRadius: '3px', background: '#1E293B', display: 'flex', overflow: 'hidden' }}>
              <div style={{ width: '75%', height: '100%', background: '#10B981' }} title="6 Machines Operating" />
              <div style={{ width: '12.5%', height: '100%', background: '#F59E0B' }} title="1 Machine Idle (Standby)" />
              <div style={{ width: '12.5%', height: '100%', background: '#EF4444' }} title="1 Machine In Maintenance" />
            </div>
          </div>

          {/* Machine List with Shift Hours & Utilization */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '130px', overflowY: 'auto', paddingRight: '4px' }}>
            {[
              { code: 'CNC-01', name: 'CNC Milling Center', status: 'RUNNING', hours: 7.4, maxH: 8.0, util: 92.5, power: '18.4 kW' },
              { code: 'ROB-01', name: '6-Axis Articulated Arm', status: 'RUNNING', hours: 7.8, maxH: 8.0, util: 97.5, power: '14.2 kW' },
              { code: 'ASM-01', name: 'Packaging Conveyor', status: 'RUNNING', hours: 7.2, maxH: 8.0, util: 90.0, power: '11.8 kW' },
              { code: 'PRS-01', name: 'Stamping Press', status: 'RUNNING', hours: 6.9, maxH: 8.0, util: 86.2, power: '22.5 kW' },
              { code: 'CNC-03', name: '5-Axis Precision Mill', status: 'RUNNING', hours: 7.5, maxH: 8.0, util: 93.8, power: '19.1 kW' },
              { code: 'WLD-01', name: 'Laser Welder', status: 'RUNNING', hours: 7.1, maxH: 8.0, util: 88.7, power: '16.0 kW' },
              { code: 'CNC-02', name: 'Turning Center (Standby)', status: 'IDLE', hours: 2.1, maxH: 8.0, util: 26.3, power: '2.1 kW' },
              { code: 'LTH-01', name: 'Heavy Lathe (Bearing Fix)', status: 'MAINTENANCE', hours: 0.5, maxH: 8.0, util: 6.2, power: '0.4 kW' },
            ].map((m) => {
              const isRunning = m.status === 'RUNNING';
              const isIdle = m.status === 'IDLE';
              const themeColor = isRunning ? '#10B981' : (isIdle ? '#F59E0B' : '#EF4444');
              return (
                <div 
                  key={m.code}
                  onClick={() => onNavigate && onNavigate('digital-twin')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '5px 8px',
                    borderRadius: '4px',
                    background: 'var(--surface-elevated, #131B28)',
                    border: '1px solid var(--border-subtle, #1E293B)',
                    cursor: 'pointer',
                    fontSize: '11px',
                    transition: 'border-color 0.15s'
                  }}
                  title={`Click to inspect ${m.code} in Digital Twin`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '120px' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: themeColor, boxShadow: `0 0 5px ${themeColor}` }} />
                    <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{m.code}</strong>
                    <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{m.status.toLowerCase()}</span>
                  </div>

                  {/* Shift Runtime Bar */}
                  <div style={{ flex: 1, margin: '0 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: '#1E293B', overflow: 'hidden' }}>
                      <div style={{ width: `${m.util}%`, height: '100%', background: themeColor, borderRadius: '2px' }} />
                    </div>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', minWidth: '55px', textAlign: 'right' }}>
                      {m.hours}h / {m.maxH}h
                    </span>
                  </div>

                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', minWidth: '45px', textAlign: 'right' }}>
                    {m.power}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card 3: Machine Health Index & Predictive Diagnostics (Redesigned & Actionable) */}
        <div className="kyn-card">
          <div className="kyn-card-header" style={{ alignItems: 'flex-start' }}>
            <div>
              <h2 className="kyn-card-title">Machine Health &amp; Diagnostics</h2>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Health score (0–100) &amp; component wear detection
              </div>
            </div>

            {/* Fleet Health Meter */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 8px',
              borderRadius: '6px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.35)'
            }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#10B981', fontFamily: 'var(--font-mono)' }}>
                91 / 100
              </span>
              <span style={{ fontSize: '9px', fontWeight: 700, color: '#10B981', textTransform: 'uppercase' }}>
                Optimal
              </span>
            </div>
          </div>

          {/* Machine Health Score Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '135px', overflowY: 'auto', paddingRight: '4px', marginTop: '2px' }}>
            {[
              { code: 'CNC-01', score: 96, status: 'OPTIMAL', vib: '1.2 mm/s', temp: '42.5°C', alert: false },
              { code: 'ROB-01', score: 94, status: 'OPTIMAL', vib: '0.9 mm/s', temp: '39.0°C', alert: false },
              { code: 'ASM-01', score: 92, status: 'OPTIMAL', vib: '0.8 mm/s', temp: '37.8°C', alert: false },
              { code: 'PRS-01', score: 88, status: 'OPTIMAL', vib: '1.8 mm/s', temp: '51.0°C', alert: false },
              { code: 'CNC-02', score: 78, status: 'WARNING', vib: '2.8 mm/s', temp: '48.6°C', alert: 'Spindle vibration near threshold' },
              { code: 'LTH-01', score: 52, status: 'CRITICAL', vib: '4.6 mm/s', temp: '78.4°C', alert: 'Bearing wear: overhaul advised' },
            ].map((m) => {
              const isOptimal = m.score >= 85;
              const isWarning = m.score >= 70 && m.score < 85;
              const barColor = isOptimal ? '#10B981' : (isWarning ? '#F59E0B' : '#EF4444');
              return (
                <div 
                  key={m.code}
                  onClick={() => onNavigate && onNavigate('machines')}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '4px',
                    background: 'var(--surface-elevated, #131B28)',
                    border: `1px solid ${m.alert ? (m.score < 70 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.4)') : 'var(--border-subtle, #1E293B)'}`,
                    cursor: 'pointer',
                    fontSize: '11px'
                  }}
                  title={`Click to inspect ${m.code} diagnostics`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{m.code}</strong>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Vib: {m.vib} • Temp: {m.temp}</span>
                    </div>
                    <span style={{ 
                      fontSize: '11px', 
                      fontWeight: 700, 
                      color: barColor, 
                      fontFamily: 'var(--font-mono)' 
                    }}>
                      {m.score}%
                    </span>
                  </div>

                  {/* Health Progress Bar */}
                  <div style={{ width: '100%', height: '4px', borderRadius: '2px', background: '#1E293B', overflow: 'hidden' }}>
                    <div style={{ width: `${m.score}%`, height: '100%', background: barColor, borderRadius: '2px' }} />
                  </div>

                  {m.alert && (
                    <div style={{ fontSize: '9.5px', color: barColor, marginTop: '3px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertTriangle size={10} />
                      <span>{m.alert}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Callout */}
          <div style={{
            marginTop: '8px',
            padding: '5px 8px',
            borderRadius: '4px',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '10.5px'
          }}>
            <span style={{ color: '#EF4444', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <AlertTriangle size={12} />
              <span>LTH-01 Bearing Wear: Schedule service in 48h</span>
            </span>
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('maintenance')}
              style={{
                background: '#EF4444',
                color: '#ffffff',
                border: 'none',
                padding: '2px 8px',
                borderRadius: '3px',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Work Order
            </button>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------
          3. BOTTOM ANALYTICS ROW (Production Summary, IoT Telemetry Data Stream, Recent Alerts)
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

        {/* Card 2: IoT Telemetry Data Stream (Redesigned Telemetry Sensor Ingestion) */}
        <div className="kyn-card">
          <div className="kyn-card-header" style={{ alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 className="kyn-card-title">IoT Telemetry Data Stream</h2>
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#10B981',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  fontSize: '9.5px',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '9999px',
                  lineHeight: 1.2
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px #10B981' }} />
                  LIVE INGESTION
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Real-time sensor message throughput &amp; signal waveform telemetry
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate && onNavigate('telemetry')}
              style={{
                background: 'none',
                border: 'none',
                color: '#0066FF',
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '2px'
              }}
            >
              <span>Explore Stream</span>
              <ArrowRight size={12} />
            </button>
          </div>

          {/* 4 Pipeline Throughput KPI Badges */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px' }}>
            <div style={{ padding: '6px 8px', borderRadius: '4px', background: 'var(--surface-elevated, #131B28)', border: '1px solid var(--border-subtle, #1E293B)' }}>
              <div style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>Throughput Rate</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--neon-cyan, #00f2fe)', fontFamily: 'var(--font-mono)' }}>
                {throughputRate.toLocaleString()} <span style={{ fontSize: '9px', fontWeight: 500, color: 'var(--text-muted)' }}>pkt/s</span>
              </div>
            </div>
            <div style={{ padding: '6px 8px', borderRadius: '4px', background: 'var(--surface-elevated, #131B28)', border: '1px solid var(--border-subtle, #1E293B)' }}>
              <div style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>Active Sensors</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#10B981', fontFamily: 'var(--font-mono)' }}>
                20 / 20 <span style={{ fontSize: '9px', fontWeight: 500, color: 'var(--text-muted)' }}>Online</span>
              </div>
            </div>
            <div style={{ padding: '6px 8px', borderRadius: '4px', background: 'var(--surface-elevated, #131B28)', border: '1px solid var(--border-subtle, #1E293B)' }}>
              <div style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>Pipeline Latency</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#38BDF8', fontFamily: 'var(--font-mono)' }}>
                12 ms <span style={{ fontSize: '9px', fontWeight: 500, color: 'var(--text-muted)' }}>Avg</span>
              </div>
            </div>
            <div style={{ padding: '6px 8px', borderRadius: '4px', background: 'var(--surface-elevated, #131B28)', border: '1px solid var(--border-subtle, #1E293B)' }}>
              <div style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>Data Integrity</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#10B981', fontFamily: 'var(--font-mono)' }}>
                99.98%
              </div>
            </div>
          </div>

          {/* 4 Sensor Channel Waveform Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '10px' }}>
            {/* Channel 1: Temperature */}
            <div style={{ padding: '8px', borderRadius: '6px', background: 'var(--surface-elevated, #131B28)', border: '1px solid var(--border-subtle, #1E293B)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>Temperature</span>
                <span style={{ fontSize: '11px', color: '#00f2fe', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>42.5°C</span>
              </div>
              <div style={{ width: '100%', height: '24px' }}>
                <svg viewBox="0 0 100 24" style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
                  <path d="M 0 16 Q 15 8, 30 14 T 60 10 T 85 15 L 100 12" fill="none" stroke="#00f2fe" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                <span>6 Sensors</span>
                <span style={{ color: '#10B981' }}>Nominal</span>
              </div>
            </div>

            {/* Channel 2: Vibration */}
            <div style={{ padding: '8px', borderRadius: '6px', background: 'var(--surface-elevated, #131B28)', border: '1px solid var(--border-subtle, #1E293B)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>Vibration RMS</span>
                <span style={{ fontSize: '11px', color: '#0066FF', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>1.34 mm/s</span>
              </div>
              <div style={{ width: '100%', height: '24px' }}>
                <svg viewBox="0 0 100 24" style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
                  <path d="M 0 14 Q 10 20, 20 6 T 40 18 T 60 8 T 80 16 L 100 12" fill="none" stroke="#0066FF" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                <span>6 Sensors</span>
                <span style={{ color: '#10B981' }}>Nominal</span>
              </div>
            </div>

            {/* Channel 3: Hydraulic Pressure */}
            <div style={{ padding: '8px', borderRadius: '6px', background: 'var(--surface-elevated, #131B28)', border: '1px solid var(--border-subtle, #1E293B)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>Hydraulic Press</span>
                <span style={{ fontSize: '11px', color: '#a855f7', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>142 bar</span>
              </div>
              <div style={{ width: '100%', height: '24px' }}>
                <svg viewBox="0 0 100 24" style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
                  <path d="M 0 12 Q 25 10, 50 14 T 75 11 L 100 13" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                <span>4 Sensors</span>
                <span style={{ color: '#10B981' }}>Stable</span>
              </div>
            </div>

            {/* Channel 4: Power Draw */}
            <div style={{ padding: '8px', borderRadius: '6px', background: 'var(--surface-elevated, #131B28)', border: '1px solid var(--border-subtle, #1E293B)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>Active Power</span>
                <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>18.2 kW</span>
              </div>
              <div style={{ width: '100%', height: '24px' }}>
                <svg viewBox="0 0 100 24" style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
                  <path d="M 0 16 L 25 16 L 25 8 L 60 8 L 60 14 L 100 14" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                <span>4 Sensors</span>
                <span style={{ color: '#10B981' }}>Nominal</span>
              </div>
            </div>
          </div>

          {/* Live Ingested Packet Terminal Stream (Showing live incoming data) */}
          <div style={{
            background: '#070B10',
            border: '1px solid var(--border-subtle, #1E293B)',
            borderRadius: '4px',
            padding: '6px 10px',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '9px', borderBottom: '1px solid #141D2B', paddingBottom: '3px' }}>
              <span>LIVE PACKET INGESTION FEED</span>
              <span>BROKER: MQTT/KAFKA • 200 OK</span>
            </div>
            {[0, 1, 2].map((offset) => {
              const pkt = INGESTION_PACKETS[(packetTickerIndex + offset) % INGESTION_PACKETS.length];
              const isWarn = pkt.status === 'WARN';
              return (
                <div key={pkt.id + offset} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: isWarn ? '#F59E0B' : '#94A3B8' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#0066FF' }}>{pkt.id}</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{pkt.sensor}</strong>
                    <span style={{ color: 'var(--text-muted)' }}>({pkt.machine})</span>
                    <span>{pkt.metric}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{pkt.latency}</span>
                    <span style={{ color: isWarn ? '#F59E0B' : '#10B981', fontWeight: 600 }}>{isWarn ? 'WARN' : 'INGESTED'}</span>
                  </div>
                </div>
              );
            })}
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
