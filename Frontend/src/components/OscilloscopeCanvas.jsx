import React, { useRef, useEffect, useState } from 'react';
import { soundEffects } from '../utils/audioEngine';
import { Activity, Play, Pause, Zap } from 'lucide-react';

export default function OscilloscopeCanvas({ activeMachine = 'MCH-001 CNC Spindle' }) {
  const canvasRef = useRef(null);
  const [isRunning, setIsRunning] = useState(true);
  const timebase = 1; // 1X div
  const [channels, setChannels] = useState({
    ch1: { label: 'CH1: Spindle Vib (mm/s)', color: '#00f2fe', enabled: true, freq: 2.4, amp: 22, offset: 50 },
    ch2: { label: 'CH2: Thermal Flux (°C)', color: '#ff0055', enabled: true, freq: 0.8, amp: 16, offset: 90 },
    ch3: { label: 'CH3: Hydraulic PSI', color: '#00ff87', enabled: true, freq: 1.2, amp: 14, offset: 130 },
    ch4: { label: 'CH4: Spindle RPM Phase', color: '#a855f7', enabled: false, freq: 4.8, amp: 20, offset: 170 }
  });
  const [hasSpike, setHasSpike] = useState(false);

  const toggleChannel = (key) => {
    soundEffects.select();
    setChannels(prev => ({
      ...prev,
      [key]: { ...prev[key], enabled: !prev[key].enabled }
    }));
  };

  const triggerSpike = () => {
    soundEffects.alert();
    setHasSpike(true);
    setTimeout(() => setHasSpike(false), 2400);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let phase = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Dark phosphor CRT background
      ctx.fillStyle = 'rgba(4, 7, 14, 0.45)';
      ctx.fillRect(0, 0, width, height);

      // Draw Oscilloscope Reticle Grid
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 242, 254, 0.12)';
      ctx.lineWidth = 1;
      const stepX = width / 12;
      const stepY = height / 8;

      for (let x = 0; x <= width; x += stepX) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += stepY) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Center crosshair with micro ticks
      ctx.strokeStyle = 'rgba(0, 242, 254, 0.28)';
      ctx.beginPath();
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      ctx.restore();

      if (isRunning) {
        phase += 0.05 * timebase;
      }

      // Render each active channel waveform
      Object.keys(channels).forEach((key) => {
        const ch = channels[key];
        if (!ch.enabled) return;

        ctx.save();
        ctx.strokeStyle = ch.color;
        ctx.lineWidth = 2;
        ctx.shadowColor = ch.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();

        const spikeMult = hasSpike ? 2.8 : 1.0;

        for (let x = 0; x < width; x += 3) {
          const t = (x / width) * Math.PI * 4 * ch.freq + phase;
          // Harmonics
          let wave = Math.sin(t) * ch.amp * spikeMult;
          wave += Math.sin(t * 2.3 + phase) * (ch.amp * 0.25);
          // Jitter/noise
          wave += (Math.random() - 0.5) * 3;

          const y = ch.offset + wave;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
      });

      // Scanline sweep bar
      const sweepX = (phase * 150) % width;
      ctx.save();
      const grad = ctx.createLinearGradient(sweepX - 25, 0, sweepX, 0);
      grad.addColorStop(0, 'rgba(0, 242, 254, 0)');
      grad.addColorStop(1, 'rgba(0, 242, 254, 0.35)');
      ctx.fillStyle = grad;
      ctx.fillRect(sweepX - 25, 0, 25, height);

      ctx.strokeStyle = '#00f2fe';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sweepX, 0);
      ctx.lineTo(sweepX, height);
      ctx.stroke();
      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isRunning, timebase, channels, hasSpike]);

  return (
    <div className="card" style={{
      background: 'radial-gradient(ellipse at 50% 50%, rgba(0, 242, 254, 0.04) 0%, rgba(5, 8, 15, 0.98) 85%)',
      border: '1px solid rgba(0, 242, 254, 0.25)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div className="hud-bracket hud-bracket-tl" />
      <div className="hud-bracket hud-bracket-tr" />
      <div className="hud-bracket hud-bracket-bl" />
      <div className="hud-bracket hud-bracket-br" />

      {/* Header controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <Activity size={18} style={{ color: 'var(--neon-cyan)' }} />
          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Real-Time Oscilloscope / FFT Spectrum
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>
              {activeMachine}
            </h3>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => {
              soundEffects.click();
              setIsRunning(!isRunning);
            }}
            style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
          >
            {isRunning ? <Pause size={13} style={{ color: 'var(--neon-amber)' }} /> : <Play size={13} style={{ color: 'var(--neon-emerald)' }} />}
            <span>{isRunning ? 'Pause Sweep' : 'Run Sweep'}</span>
          </button>

          <button
            type="button"
            className="btn btn-sm"
            onClick={triggerSpike}
            style={{
              fontSize: '0.75rem',
              padding: '0.3rem 0.75rem',
              background: 'rgba(255, 0, 85, 0.15)',
              border: '1px solid rgba(255, 0, 85, 0.4)',
              color: '#ff4d79'
            }}
          >
            <Zap size={13} />
            <span>Harmonic Spike</span>
          </button>
        </div>
      </div>

      {/* Canvas Viewport */}
      <div style={{ position: 'relative', width: '100%', height: '220px', borderRadius: '8px', overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          width={700}
          height={220}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />

        {/* Readout Overlay */}
        <div style={{
          position: 'absolute',
          top: 10,
          left: 12,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.68rem',
          color: 'rgba(0, 242, 254, 0.85)',
          background: 'rgba(0, 0, 0, 0.65)',
          padding: '0.3rem 0.5rem',
          borderRadius: '4px',
          border: '1px solid rgba(0, 242, 254, 0.2)'
        }}>
          <div>TRIG: AUTO // 500mV</div>
          <div>TIMEBASE: {timebase}X DIV</div>
          {hasSpike && <div style={{ color: '#ff0055', fontWeight: 800 }}>⚠️ ANOMALY DETECTED</div>}
        </div>
      </div>

      {/* Channel Selector Ribbon */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }}>
        {Object.keys(channels).map((key) => {
          const ch = channels[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleChannel(key)}
              style={{
                flex: '1 1 auto',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 600,
                background: ch.enabled ? `${ch.color}15` : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${ch.enabled ? ch.color : 'var(--border-subtle)'}`,
                color: ch.enabled ? ch.color : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: ch.enabled ? ch.color : 'transparent',
                border: `1px solid ${ch.color}`,
                boxShadow: ch.enabled ? `0 0 8px ${ch.color}` : 'none'
              }} />
              <span>{ch.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
