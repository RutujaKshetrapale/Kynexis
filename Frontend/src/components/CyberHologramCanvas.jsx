import React, { useRef, useEffect, useState } from 'react';
import { soundEffects } from '../utils/audioEngine';

export default function CyberHologramCanvas({ machineName = 'CNC Spindle Assembly v4' }) {
  const canvasRef = useRef(null);
  const [modelType, setModelType] = useState('turbine'); // 'turbine' | 'arm' | 'core'
  const rotationSpeed = 0.015;
  const [wireframeColor, setWireframeColor] = useState('#00f2fe');
  const [isHovered, setIsHovered] = useState(false);
  const angleRef = useRef({ x: 0.3, y: 0.5 });
  const mouseRef = useRef({ isDown: false, lastX: 0, lastY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let time = 0;

    const render = () => {
      time += 0.02;
      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Auto rotation
      if (!mouseRef.current.isDown) {
        angleRef.current.y += rotationSpeed;
      }

      const rx = angleRef.current.x;
      const ry = angleRef.current.y;

      // Project 3D point to 2D
      const project = (x, y, z) => {
        // Rotate around Y
        const cosY = Math.cos(ry);
        const sinY = Math.sin(ry);
        const x1 = x * cosY - z * sinY;
        const z1 = x * sinY + z * cosY;

        // Rotate around X
        const cosX = Math.cos(rx);
        const sinX = Math.sin(rx);
        const y2 = y * cosX - z1 * sinX;
        const z2 = y * sinX + z1 * cosX;

        const distance = 400;
        const scale = distance / (distance + z2);
        return {
          x: cx + x1 * scale,
          y: cy + y2 * scale,
          z: z2,
          scale
        };
      };

      // Draw Hologram Base Grid
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 242, 254, 0.15)';
      ctx.lineWidth = 1;
      const gridSize = 160;
      const gridSteps = 8;
      const step = gridSize / gridSteps;
      for (let i = -gridSize; i <= gridSize; i += step) {
        const p1 = project(i, 80, -gridSize);
        const p2 = project(i, 80, gridSize);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        const p3 = project(-gridSize, 80, i);
        const p4 = project(gridSize, 80, i);
        ctx.beginPath();
        ctx.moveTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.stroke();
      }
      ctx.restore();

      // Draw Orbiting Scan Ring
      ctx.save();
      const ringY = Math.sin(time * 2) * 60;
      ctx.strokeStyle = 'rgba(0, 242, 254, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      const ringRadius = 90;
      const segments = 32;
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const px = Math.cos(theta) * ringRadius;
        const pz = Math.sin(theta) * ringRadius;
        const proj = project(px, ringY, pz);
        if (i === 0) ctx.moveTo(proj.x, proj.y);
        else ctx.lineTo(proj.x, proj.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Generate 3D wireframe geometry based on modelType
      const lines = [];

      if (modelType === 'turbine') {
        // Multi-stage cylindrical turbine rotor
        const stages = [-60, -30, 0, 30, 60];
        const radii = [40, 65, 75, 60, 35];

        stages.forEach((y, sIdx) => {
          const r = radii[sIdx];
          const segs = 16;
          for (let i = 0; i < segs; i++) {
            const a1 = (i / segs) * Math.PI * 2;
            const a2 = ((i + 1) / segs) * Math.PI * 2;
            lines.push([
              [Math.cos(a1) * r, y, Math.sin(a1) * r],
              [Math.cos(a2) * r, y, Math.sin(a2) * r]
            ]);
            // Connect to previous stage
            if (sIdx > 0) {
              const prevY = stages[sIdx - 1];
              const prevR = radii[sIdx - 1];
              lines.push([
                [Math.cos(a1) * r, y, Math.sin(a1) * r],
                [Math.cos(a1) * prevR, prevY, Math.sin(a1) * prevR]
              ]);
            }
          }
        });
        // Center shaft
        lines.push([[0, -80, 0], [0, 80, 0]]);
      } else if (modelType === 'arm') {
        // Robotic arm kinematics joints
        const joints = [
          [0, 70, 0],
          [0, 20, 0],
          [40, -30, 20],
          [20, -70, 50],
          [-10, -85, 60]
        ];
        // Draw linkages
        for (let i = 0; i < joints.length - 1; i++) {
          lines.push([joints[i], joints[i + 1]]);
          // Add joint cage rings
          const j = joints[i];
          const segs = 8;
          for (let k = 0; k < segs; k++) {
            const a1 = (k / segs) * Math.PI * 2;
            const a2 = ((k + 1) / segs) * Math.PI * 2;
            lines.push([
              [j[0] + Math.cos(a1) * 15, j[1], j[2] + Math.sin(a1) * 15],
              [j[0] + Math.cos(a2) * 15, j[1], j[2] + Math.sin(a2) * 15]
            ]);
          }
        }
      } else {
        // Cybernetic reactor core (nested platonic polyhedra)
        const size = 50;
        const verts = [
          [-size, -size, -size], [size, -size, -size], [size, size, -size], [-size, size, -size],
          [-size, -size, size], [size, -size, size], [size, size, size], [-size, size, size]
        ];
        const cubeEdges = [
          [0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],
          [0,4],[1,5],[2,6],[3,7]
        ];
        cubeEdges.forEach(([a, b]) => {
          lines.push([verts[a], verts[b]]);
        });
        // Inner spinning octahedron
        const s2 = 35;
        const octVerts = [
          [0, -s2 * 1.3, 0], [0, s2 * 1.3, 0],
          [-s2, 0, 0], [s2, 0, 0], [0, 0, -s2], [0, 0, s2]
        ];
        const octEdges = [
          [0,2],[0,3],[0,4],[0,5],
          [1,2],[1,3],[1,4],[1,5],
          [2,4],[4,3],[3,5],[5,2]
        ];
        octEdges.forEach(([a, b]) => {
          lines.push([octVerts[a], octVerts[b]]);
        });
      }

      // Draw Wireframe Lines with depth and neon glow
      lines.forEach(([pA, pB]) => {
        const p1 = project(pA[0], pA[1], pA[2]);
        const p2 = project(pB[0], pB[1], pB[2]);
        const avgZ = (p1.z + p2.z) / 2;
        const alpha = Math.max(0.15, Math.min(0.9, (avgZ + 150) / 300));

        ctx.save();
        ctx.strokeStyle = wireframeColor;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        // Node points on joints
        if (Math.random() > 0.98) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(p1.x, p1.y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // Target Crosshairs in Center
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 242, 254, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 15, cy);
      ctx.lineTo(cx + 15, cy);
      ctx.moveTo(cx, cy - 15);
      ctx.lineTo(cx, cy + 15);
      ctx.stroke();
      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [modelType, rotationSpeed, wireframeColor]);

  // Mouse interaction for rotation
  const handleMouseDown = (e) => {
    mouseRef.current.isDown = true;
    mouseRef.current.lastX = e.clientX;
    mouseRef.current.lastY = e.clientY;
  };

  const handleMouseMove = (e) => {
    if (!mouseRef.current.isDown) return;
    const dx = e.clientX - mouseRef.current.lastX;
    const dy = e.clientY - mouseRef.current.lastY;
    angleRef.current.y += dx * 0.01;
    angleRef.current.x += dy * 0.01;
    mouseRef.current.lastX = e.clientX;
    mouseRef.current.lastY = e.clientY;
  };

  const handleMouseUp = () => {
    mouseRef.current.isDown = false;
  };

  const selectModel = (type) => {
    soundEffects.select();
    setModelType(type);
  };

  return (
    <div 
      className="card cyber-hologram-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        handleMouseUp();
      }}
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'radial-gradient(circle at 50% 50%, rgba(0, 242, 254, 0.07) 0%, rgba(10, 14, 23, 0.95) 75%)',
        border: '1px solid rgba(0, 242, 254, 0.25)',
        boxShadow: '0 0 30px rgba(0, 242, 254, 0.1)',
        padding: '1.25rem'
      }}
    >
      {/* Corner HUD Brackets */}
      <div className="hud-bracket hud-bracket-tl" />
      <div className="hud-bracket hud-bracket-tr" />
      <div className="hud-bracket hud-bracket-bl" />
      <div className="hud-bracket hud-bracket-br" />

      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span className="live-radar-dot" style={{ background: wireframeColor, boxShadow: `0 0 8px ${wireframeColor}` }} />
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Interactive Digital Twin Wireframe
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              {machineName}
            </h3>
          </div>
        </div>

        {/* Model Switcher Tabs */}
        <div style={{ display: 'flex', gap: '0.4rem', background: 'rgba(0,0,0,0.4)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
          {[
            { id: 'turbine', label: 'Turbine Rotor' },
            { id: 'arm', label: 'Robotic Arm' },
            { id: 'core', label: 'Reactor Core' }
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => selectModel(m.id)}
              className={`btn btn-sm ${modelType === m.id ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '0.25rem 0.65rem', fontSize: '0.72rem' }}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Canvas Viewport */}
      <div 
        style={{
          position: 'relative',
          width: '100%',
          height: '240px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          cursor: isHovered ? 'grab' : 'default'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <canvas
          ref={canvasRef}
          width={520}
          height={240}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />

        {/* Tactical HUD overlays */}
        <div style={{
          position: 'absolute',
          top: 10,
          left: 12,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.68rem',
          color: 'rgba(0, 242, 254, 0.75)',
          lineHeight: '1.4'
        }}>
          <div>FOV: 65° // PERSPECTIVE</div>
          <div>ROT_SPEED: {(rotationSpeed * 100).toFixed(1)} rad/s</div>
          <div>TELEMETRY: SYNCHRONIZED</div>
        </div>

        <div style={{
          position: 'absolute',
          bottom: 10,
          right: 12,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.68rem',
          color: 'var(--neon-emerald)',
          textAlign: 'right'
        }}>
          <div>ISO-10816 CLASS 1</div>
          <div style={{ color: 'var(--neon-cyan)' }}>DRAG TO ROTATE 3D</div>
        </div>
      </div>

      {/* Bottom Telemetry Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '0.75rem',
        paddingTop: '0.75rem',
        borderTop: '1px solid var(--border-subtle)',
        fontSize: '0.75rem',
        position: 'relative',
        zIndex: 2
      }}>
        <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-secondary)' }}>
          <span>Mesh: <strong style={{ color: 'var(--text-primary)' }}>1,420 Vertices</strong></span>
          <span>Sample Rate: <strong style={{ color: 'var(--neon-cyan)' }}>60 FPS Realtime</strong></span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['#00f2fe', '#a855f7', '#00ff87'].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                soundEffects.click();
                setWireframeColor(c);
              }}
              style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: c,
                border: wireframeColor === c ? '2px solid #ffffff' : 'none',
                cursor: 'pointer',
                boxShadow: `0 0 8px ${c}`
              }}
              title={`Switch neon laser color to ${c}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
