import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Settings, 
  Wrench, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Activity, 
  Zap, 
  Cpu, 
  Maximize2, 
  Radio, 
  Play, 
  TrendingUp,
  Layers,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { normalizeStatus } from './MachineStatusIndicator';

// Base pin positions and metadata matching the user's reference factory floor
const DEFAULT_FACTORY_PINS = [
  {
    id: 1,
    name: 'CNC-01',
    code: 'CNC-01',
    type: 'CNC Milling Center',
    status: 'RUNNING',
    statusText: 'Running',
    oee: '92%',
    x: 21.5,
    y: 24.5,
    icon: 'gear',
    badgeTheme: 'green',
    baseRpm: 14200,
    baseTemp: 42.5,
    baseVib: 1.4,
    power: '18.4 kW',
    desc: '5-Axis Precision Vertical Machining Center'
  },
  {
    id: 2,
    name: 'CNC-02',
    code: 'CNC-02',
    type: 'CNC Lathe & Turning',
    status: 'IDLE',
    statusText: 'Idle',
    oee: '64%',
    x: 31.0,
    y: 21.0,
    icon: 'tool',
    badgeTheme: 'yellow',
    baseRpm: 0,
    baseTemp: 28.2,
    baseVib: 0.1,
    power: '2.1 kW',
    desc: 'Twin-Spindle Heavy Duty Turning Center (Standby)'
  },
  {
    id: 3,
    name: 'Press-01',
    code: 'Press-01',
    type: 'Hydraulic Stamping Press',
    status: 'ALERT',
    statusText: 'Fault',
    oee: '-',
    x: 43.0,
    y: 17.5,
    icon: 'alert',
    badgeTheme: 'red',
    baseRpm: 0,
    baseTemp: 68.4,
    baseVib: 4.8,
    pressure: '14.2 bar (Low)',
    power: '5.2 kW',
    desc: '200-Ton Hydraulic Progressive Die Press (Hydraulic Drop)'
  },
  {
    id: 4,
    name: 'Assembly-01',
    code: 'Assembly-01',
    type: 'Robotic Assembly Cell',
    status: 'RUNNING',
    statusText: 'Running',
    oee: '88%',
    x: 50.0,
    y: 27.0,
    icon: 'circle',
    badgeTheme: 'green',
    baseRpm: 3200,
    baseTemp: 37.1,
    baseVib: 0.8,
    power: '12.8 kW',
    desc: 'Dual 6-Axis Robotic Arm Assembly Workstation'
  },
  {
    id: 5,
    name: 'Packaging-01',
    code: 'Packaging-01',
    type: 'High-Speed Case Packer',
    status: 'RUNNING',
    statusText: 'Running',
    oee: '90%',
    x: 58.0,
    y: 33.0,
    icon: 'circle',
    badgeTheme: 'green',
    baseRpm: 1800,
    baseTemp: 34.2,
    baseVib: 0.6,
    power: '9.6 kW',
    desc: 'Automated High-Speed Case Packaging System'
  },
  {
    id: 6,
    name: 'Packaging-01', // secondary packaging conveyor cell as shown in screenshot
    code: 'Packaging-01',
    type: 'Palletizing & Sorting',
    status: 'RUNNING',
    statusText: 'Running',
    oee: '89%',
    x: 46.5,
    y: 51.5,
    icon: 'circle',
    badgeTheme: 'green',
    baseRpm: 1820,
    baseTemp: 35.0,
    baseVib: 0.7,
    power: '10.2 kW',
    desc: 'End-of-Line Robotic Palletizer & Conveyor Sorter'
  }
];

export default function FactoryScene({
  machines = [],
  selectedMachineId = null,
  onSelectMachine,
  alertsMap = {},
  liveMetrics = {}
}) {
  const containerRef = useRef(null);

  // View Mode: 'HYBRID' (Default: Real on Left, Digital Twin on Right) | 'REAL' | 'DIGITAL_TWIN'
  const [viewMode, setViewMode] = useState('HYBRID');

  // Interactive Split Slider Position (percentage from 0 to 100, default 50%)
  const [splitPos, setSplitPos] = useState(50);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);

  // Hovered Machine Tooltip State
  const [hoveredMachine, setHoveredMachine] = useState(null);

  // 3D Parallax Tilt on Mouse Move
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  // Real-Time Telemetry Ticker (updates values dynamically every 1.5s)
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTick(prev => prev + 1);
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  // Compute live fluctuating telemetry values
  const liveTelemetry = useMemo(() => {
    const noise = (seed) => Math.sin(tick * 0.8 + seed) * 0.5;
    const rpmNoise = (seed) => Math.round(Math.sin(tick * 1.2 + seed) * 45);

    return {
      1: {
        rpm: 14200 + rpmNoise(1),
        temp: +(42.5 + noise(1) * 0.6).toFixed(1),
        vib: +(1.4 + noise(2) * 0.08).toFixed(2),
        load: Math.min(96, Math.max(75, 84 + Math.round(noise(3) * 6)))
      },
      2: {
        rpm: 0,
        temp: +(28.2 + noise(4) * 0.2).toFixed(1),
        vib: 0.1,
        load: 12
      },
      3: {
        rpm: 0,
        temp: +(68.4 + noise(5) * 1.2).toFixed(1),
        vib: +(4.8 + noise(6) * 0.3).toFixed(2),
        pressure: +(14.2 + noise(7) * 0.4).toFixed(1)
      },
      4: {
        rpm: 3200 + rpmNoise(8),
        temp: +(37.1 + noise(8) * 0.5).toFixed(1),
        vib: +(0.8 + noise(9) * 0.05).toFixed(2),
        cycle: '4.2s'
      },
      5: {
        rpm: 1800 + rpmNoise(10),
        temp: +(34.2 + noise(10) * 0.4).toFixed(1),
        vib: +(0.6 + noise(11) * 0.04).toFixed(2),
        throughput: '120 ppm'
      },
      6: {
        rpm: 1820 + rpmNoise(12),
        temp: +(35.0 + noise(12) * 0.4).toFixed(1),
        vib: +(0.7 + noise(13) * 0.05).toFixed(2),
        pallets: '390 units'
      }
    };
  }, [tick]);

  // Merge database machines with default pins
  const activePins = useMemo(() => {
    return DEFAULT_FACTORY_PINS.map(pin => {
      // Find matching machine in database if available
      const dbMachine = machines.find(m => m.id === pin.id || m.name === pin.name);
      const hasAlert = (alertsMap[pin.id] || []).some(a => !a.resolved);
      
      let status = pin.status;
      let statusText = pin.statusText;
      let badgeTheme = pin.badgeTheme;

      if (dbMachine) {
        const norm = normalizeStatus(dbMachine.status, hasAlert);
        if (norm === 'ALERT') {
          status = 'ALERT';
          statusText = 'Fault';
          badgeTheme = 'red';
        } else if (norm === 'IDLE') {
          status = 'IDLE';
          statusText = 'Idle';
          badgeTheme = 'yellow';
        } else {
          status = 'RUNNING';
          statusText = 'Running';
          badgeTheme = 'green';
        }
      }

      return {
        ...pin,
        status,
        statusText,
        badgeTheme,
        currentTelemetry: liveTelemetry[pin.id] || {}
      };
    });
  }, [machines, alertsMap, liveTelemetry]);

  // Subtle Mouse Parallax Tilt
  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: x * 6, y: -y * 6 });

    // If dragging split slider
    if (isDraggingSlider) {
      const pct = Math.max(10, Math.min(90, ((e.clientX - rect.left) / rect.width) * 100));
      setSplitPos(pct);
    }
  };

  const handleMouseUp = () => {
    if (isDraggingSlider) setIsDraggingSlider(false);
  };

  // Determine active view mode image source
  const getActiveBackground = () => {
    if (viewMode === 'REAL') return '/images/digital_twin_real_view.jpg';
    if (viewMode === 'DIGITAL_TWIN') return '/images/digital_twin_full_hologram.jpg';
    return '/images/digital_twin_factory_floor.jpg';
  };

  return (
    <div
      ref={containerRef}
      className="factory-scene-viewport"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '460px',
        maxHeight: '520px',
        overflow: 'hidden',
        borderRadius: 'var(--radius-xl, 16px)',
        border: '1px solid var(--border-strong, #1E293B)',
        background: '#06090e',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.75)',
        userSelect: 'none',
        perspective: '1000px'
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        setTilt({ x: 0, y: 0 });
        setIsDraggingSlider(false);
      }}
    >
      {/* ========================================================
          1. BACKGROUND FACTORY FLOOR VISUALIZATION
          ======================================================== */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        transform: `rotateX(${tilt.y}deg) rotateY(${tilt.x}deg) scale(1.02)`,
        transition: isDraggingSlider ? 'none' : 'transform 0.15s ease-out',
        transformStyle: 'preserve-3d'
      }}>
        {/* Layer 1: Base Factory Image */}
        <img
          src={getActiveBackground()}
          alt="KYNEXIS Digital Twin Factory Floor"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center center',
            display: 'block',
            filter: 'brightness(1.02) contrast(1.06)'
          }}
          loading="eager"
        />

        {/* Layer 2: Subtle Ambient Vignette & Industrial Lighting Glow */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'radial-gradient(ellipse at 50% 40%, rgba(0, 242, 254, 0.05) 0%, rgba(6, 9, 14, 0.45) 85%, rgba(6, 9, 14, 0.85) 100%)',
          pointerEvents: 'none'
        }} />

        {/* Layer 3: Laser Divider Beam (In HYBRID mode, exactly matching screenshot) */}
        {viewMode === 'HYBRID' && (
          <div style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${splitPos}%`,
            width: '2px',
            background: 'linear-gradient(to bottom, rgba(0, 242, 254, 0.1), #00f2fe 30%, #00f2fe 70%, rgba(0, 242, 254, 0.1))',
            boxShadow: '0 0 16px #00f2fe, 0 0 32px rgba(0, 242, 254, 0.6)',
            zIndex: 10,
            cursor: 'ew-resize',
            pointerEvents: 'auto'
          }}
          onMouseDown={() => setIsDraggingSlider(true)}
          title="Drag to adjust Real View vs Digital Twin split"
          >
            {/* Pulsing Vertical Scanner Node */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: 'rgba(0, 242, 254, 0.25)',
              border: '1.5px solid #00f2fe',
              boxShadow: '0 0 12px #00f2fe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ffffff' }} />
            </div>
          </div>
        )}

        {/* Layer 4: Animated Floor Ground Ripple / Hazard Waves */}
        {activePins.map(pin => {
          const isFault = pin.status === 'ALERT';
          const isSelected = Number(pin.id) === Number(selectedMachineId);

          return (
            <div
              key={`floor-glow-${pin.id}`}
              style={{
                position: 'absolute',
                left: `${pin.x}%`,
                top: `${pin.y + 11}%`,
                transform: 'translate(-50%, -50%) rotateX(65deg)',
                pointerEvents: 'none',
                zIndex: 4
              }}
            >
              {/* Fault Radar Pulse Ring */}
              {isFault && (
                <div style={{
                  width: '70px',
                  height: '70px',
                  borderRadius: '50%',
                  border: '2px solid rgba(239, 68, 68, 0.85)',
                  boxShadow: '0 0 20px rgba(239, 68, 68, 0.6), inset 0 0 12px rgba(239, 68, 68, 0.4)',
                  animation: 'pulseRing 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite'
                }} />
              )}

              {/* Selection Halo */}
              {isSelected && (
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  border: '2px solid #00f2fe',
                  boxShadow: '0 0 24px rgba(0, 242, 254, 0.8), inset 0 0 16px rgba(0, 242, 254, 0.35)',
                  animation: 'pulseRing 2.4s ease-out infinite'
                }} />
              )}
            </div>
          );
        })}

        {/* ========================================================
            2. INTERACTIVE 3D MACHINE PINS PINNED OVER MACHINES
            (Matching Screenshot Badges Exactly)
            ======================================================== */}
        {activePins.map((pin) => {
          const isSelected = Number(pin.id) === Number(selectedMachineId);
          const isFault = pin.badgeTheme === 'red';
          const isIdle = pin.badgeTheme === 'yellow';
          const isRunning = pin.badgeTheme === 'green';

          return (
            <div
              key={`machine-badge-${pin.id}`}
              style={{
                position: 'absolute',
                left: `${pin.x}%`,
                top: `${pin.y}%`,
                transform: 'translate(-50%, -100%)',
                zIndex: isSelected ? 35 : 20,
                cursor: 'pointer',
                transition: 'transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)'
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectMachine(pin.id);
              }}
              onMouseEnter={() => setHoveredMachine(pin)}
              onMouseLeave={() => setHoveredMachine(null)}
              title={`Click to inspect ${pin.name} telemetry & digital twin`}
            >
              {/* Badge Container */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.3rem 0.65rem 0.3rem 0.4rem',
                borderRadius: '8px',
                background: isSelected 
                  ? 'rgba(6, 12, 22, 0.96)' 
                  : isFault 
                    ? 'rgba(35, 10, 14, 0.94)' 
                    : isIdle 
                      ? 'rgba(35, 26, 8, 0.94)' 
                      : 'rgba(8, 28, 22, 0.94)',
                backdropFilter: 'blur(12px)',
                border: isSelected 
                  ? '1.5px solid #00f2fe' 
                  : isFault 
                    ? '1.2px solid rgba(239, 68, 68, 0.7)' 
                    : isIdle 
                      ? '1.2px solid rgba(245, 158, 11, 0.7)' 
                      : '1.2px solid rgba(16, 185, 129, 0.7)',
                boxShadow: isSelected 
                  ? '0 0 20px rgba(0, 242, 254, 0.7), 0 8px 24px rgba(0, 0, 0, 0.7)' 
                  : isFault 
                    ? '0 0 16px rgba(239, 68, 68, 0.5), 0 6px 18px rgba(0, 0, 0, 0.6)' 
                    : isIdle 
                      ? '0 0 14px rgba(245, 158, 11, 0.4), 0 6px 18px rgba(0, 0, 0, 0.6)' 
                      : '0 0 14px rgba(16, 185, 129, 0.4), 0 6px 18px rgba(0, 0, 0, 0.6)',
                color: '#ffffff',
                fontSize: '0.75rem',
                fontWeight: 800,
                whiteSpace: 'nowrap',
                transform: isSelected ? 'scale(1.06)' : 'scale(1)',
                transition: 'all 0.18s ease'
              }}>
                {/* Icon Container */}
                <div style={{
                  width: 22,
                  height: 22,
                  borderRadius: '5px',
                  background: isFault 
                    ? '#EF4444' 
                    : isIdle 
                      ? '#F59E0B' 
                      : isRunning 
                        ? '#10B981' 
                        : '#0066FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: isFault ? '0 0 8px #EF4444' : 'none'
                }}>
                  {pin.icon === 'gear' && <Settings size={13} />}
                  {pin.icon === 'tool' && <Wrench size={12} />}
                  {pin.icon === 'alert' && <AlertTriangle size={13} />}
                  {pin.icon === 'circle' && <CheckCircle2 size={13} />}
                </div>

                {/* Machine Name */}
                <span style={{
                  letterSpacing: '0.02em',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.775rem'
                }}>
                  {pin.name}
                </span>

                {/* Status Indicator Dot & Text */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  paddingLeft: '0.35rem',
                  borderLeft: '1px solid rgba(255, 255, 255, 0.2)'
                }}>
                  <span style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: isFault ? '#EF4444' : isIdle ? '#F59E0B' : '#10B981',
                    boxShadow: isFault 
                      ? '0 0 8px #EF4444' 
                      : isIdle 
                        ? '0 0 6px #F59E0B' 
                        : '0 0 6px #10B981'
                  }} />
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: isFault ? '#EF4444' : isIdle ? '#F59E0B' : '#10B981'
                  }}>
                    {pin.statusText}
                  </span>
                </div>
              </div>

              {/* Pin Arrow Pointer */}
              <div style={{
                width: 0,
                height: 0,
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderTop: `7px solid ${isSelected ? '#00f2fe' : isFault ? '#EF4444' : isIdle ? '#F59E0B' : '#10B981'}`,
                margin: '0 auto',
                filter: isSelected ? 'drop-shadow(0 0 6px #00f2fe)' : 'none'
              }} />
            </div>
          );
        })}
      </div>

      {/* ========================================================
          3. REAL-TIME TELEMETRY HOVER HUD TOOLTIP
          ======================================================== */}
      {hoveredMachine && (
        <div style={{
          position: 'absolute',
          top: 16,
          right: 16,
          width: '280px',
          background: 'rgba(10, 15, 24, 0.94)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(0, 242, 254, 0.4)',
          borderRadius: 'var(--radius-lg, 12px)',
          padding: '1rem',
          boxShadow: '0 16px 36px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 242, 254, 0.2)',
          zIndex: 40,
          pointerEvents: 'none',
          animation: 'fadeIn 0.2s ease'
        }}>
          {/* Machine Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.65rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                  {hoveredMachine.name}
                </span>
                <span style={{
                  fontSize: '0.625rem',
                  fontWeight: 800,
                  padding: '0.15rem 0.4rem',
                  borderRadius: '4px',
                  background: hoveredMachine.badgeTheme === 'red' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                  color: hoveredMachine.badgeTheme === 'red' ? '#EF4444' : '#10B981'
                }}>
                  {hoveredMachine.statusText}
                </span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                {hoveredMachine.type}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>OEE</div>
              <div style={{ fontSize: '1rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: hoveredMachine.oee === '-' ? 'var(--text-muted)' : '#00f2fe' }}>
                {hoveredMachine.oee}
              </div>
            </div>
          </div>

          {/* Real-time Metrics Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '0.5rem',
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '0.65rem',
            borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            <div>
              <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>Spindle / Speed</div>
              <div style={{ fontSize: '0.825rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                {hoveredMachine.currentTelemetry.rpm ? `${hoveredMachine.currentTelemetry.rpm.toLocaleString()} RPM` : '0 RPM'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>Core Temp</div>
              <div style={{ fontSize: '0.825rem', fontWeight: 800, color: hoveredMachine.currentTelemetry.temp > 60 ? '#EF4444' : '#ffffff', fontFamily: 'var(--font-mono)' }}>
                {hoveredMachine.currentTelemetry.temp || hoveredMachine.baseTemp} °C
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>Vibration</div>
              <div style={{ fontSize: '0.825rem', fontWeight: 800, color: hoveredMachine.currentTelemetry.vib > 3 ? '#EF4444' : '#ffffff', fontFamily: 'var(--font-mono)' }}>
                {hoveredMachine.currentTelemetry.vib || hoveredMachine.baseVib} mm/s
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>Power Load</div>
              <div style={{ fontSize: '0.825rem', fontWeight: 800, color: '#38BDF8', fontFamily: 'var(--font-mono)' }}>
                {hoveredMachine.power}
              </div>
            </div>
          </div>

          {/* Click Tip */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.65rem',
            color: 'var(--neon-cyan, #00f2fe)',
            marginTop: '0.65rem',
            paddingTop: '0.45rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <span>Click to inspect 3D Twin & controls</span>
            <ChevronRight size={12} />
          </div>
        </div>
      )}

      {/* ========================================================
          4. BOTTOM-LEFT VIEW MODE TOGGLE PILL
          (Matching Screenshot: [Real View] [● Digital Twin])
          ======================================================== */}
      <div style={{
        position: 'absolute',
        bottom: 16,
        left: 18,
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(8, 12, 20, 0.90)',
        backdropFilter: 'blur(12px)',
        padding: '0.25rem',
        borderRadius: '9999px',
        border: '1px solid rgba(255, 255, 255, 0.16)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.65), 0 0 16px rgba(0, 102, 255, 0.2)',
        zIndex: 25
      }}>
        {/* Button 1: Real View */}
        <button
          type="button"
          onClick={() => setViewMode(viewMode === 'REAL' ? 'HYBRID' : 'REAL')}
          style={{
            padding: '0.4rem 0.95rem',
            borderRadius: '9999px',
            background: viewMode === 'REAL' ? '#0066FF' : 'transparent',
            color: viewMode === 'REAL' ? '#ffffff' : 'var(--text-secondary, #94A3B8)',
            border: 'none',
            fontSize: '0.775rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: viewMode === 'REAL' ? '0 0 14px rgba(0, 102, 255, 0.6)' : 'none'
          }}
          title="Toggle Full Real View"
        >
          Real View
        </button>

        {/* Button 2: Digital Twin (Active / Hybrid / Full) */}
        <button
          type="button"
          onClick={() => setViewMode(viewMode === 'DIGITAL_TWIN' ? 'HYBRID' : 'DIGITAL_TWIN')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.4rem 0.95rem',
            borderRadius: '9999px',
            background: (viewMode === 'DIGITAL_TWIN' || viewMode === 'HYBRID') ? '#0066FF' : 'transparent',
            color: (viewMode === 'DIGITAL_TWIN' || viewMode === 'HYBRID') ? '#ffffff' : 'var(--text-secondary, #94A3B8)',
            border: 'none',
            fontSize: '0.775rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: (viewMode === 'DIGITAL_TWIN' || viewMode === 'HYBRID') ? '0 0 14px rgba(0, 102, 255, 0.6)' : 'none',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          title="Toggle Digital Twin Mode (Click again to switch Full Hologram / Split)"
        >
          <span style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: '#00f2fe',
            boxShadow: '0 0 8px #00f2fe'
          }} />
          <span>Digital Twin</span>
        </button>
      </div>

      {/* View Mode Indicator Badge (Top-Left) */}
      <div style={{
        position: 'absolute',
        top: 14,
        left: 16,
        display: 'flex',
        alignItems: 'center',
        gap: '0.45rem',
        padding: '0.28rem 0.65rem',
        borderRadius: '6px',
        background: 'rgba(6, 10, 18, 0.8)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        fontSize: '0.7rem',
        color: 'var(--text-secondary)',
        fontWeight: 600,
        zIndex: 20
      }}>
        <Layers size={13} style={{ color: '#00f2fe' }} />
        <span>
          {viewMode === 'HYBRID' ? 'Split Dual View (Real + Digital Twin)' : viewMode === 'REAL' ? 'Full Photorealistic View' : 'Full Holographic Digital Twin'}
        </span>
      </div>

    </div>
  );
}
