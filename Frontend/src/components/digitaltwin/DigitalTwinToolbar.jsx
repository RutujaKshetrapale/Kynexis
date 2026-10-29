import React from 'react';
import { 
  Search, 
  RotateCcw, 
  Play, 
  Pause, 
  RefreshCw, 
  Box, 
  ListFilter, 
  Factory,
  Radio
} from 'lucide-react';

export default function DigitalTwinToolbar({
  plants = [],
  selectedPlant = 'ALL',
  onSelectPlant,
  searchTerm = '',
  onSearchChange,
  statusFilter = 'ALL',
  onStatusFilterChange,
  viewMode = '3d', // '3d' | 'schematic'
  onViewModeChange,
  autoRotate = false,
  onToggleAutoRotate,
  onResetCamera,
  onManualRefresh,
  refreshing = false,
  lastUpdated = null,
  transportMode = 'POLLING', // 'WEBSOCKET' | 'POLLING' | 'STALE'
  counts = { total: 0, running: 0, idle: 0, maintenance: 0, alert: 0 }
}) {
  return (
    <div className="digital-twin-toolbar card" style={{ padding: '0.85rem 1.15rem', marginBottom: '1.25rem' }}>
      {/* Top Row: Filters, Controls & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        
        {/* Left Side: Plant Selector & Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          
          {/* Facility Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--surface-elevated)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <Factory size={14} style={{ color: 'var(--accent, #0066FF)' }} />
            <select
              value={selectedPlant}
              onChange={(e) => onSelectPlant(e.target.value)}
              className="digital-twin-select"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.775rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
              aria-label="Filter by Plant Facility"
            >
              <option value="ALL">All Facilities ({plants.length})</option>
              {plants.map(p => (
                <option key={p.id} value={String(p.id)}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: '200px' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search equipment or type..."
              style={{
                width: '100%',
                padding: '0.35rem 0.65rem 0.35rem 2rem',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontSize: '0.775rem',
                outline: 'none'
              }}
              aria-label="Search machines"
            />
          </div>

          {/* Status Filter Tabs */}
          <div style={{ display: 'flex', gap: '0.25rem', background: 'rgba(0,0,0,0.35)', padding: '0.2rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            {[
              { id: 'ALL', label: 'All', count: counts.total },
              { id: 'RUNNING', label: 'Running', count: counts.running, color: 'var(--success)' },
              { id: 'IDLE', label: 'Idle', count: counts.idle, color: '#94A3B8' },
              { id: 'MAINTENANCE', label: 'Maint', count: counts.maintenance, color: 'var(--warning)' },
              { id: 'ALERT', label: 'Alert', count: counts.alert, color: 'var(--danger)' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onStatusFilterChange(tab.id)}
                className={`btn btn-sm ${statusFilter === tab.id ? 'btn-primary' : 'btn-ghost'}`}
                style={{
                  fontSize: '0.7rem',
                  padding: '0.2rem 0.55rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <span>{tab.label}</span>
                <span style={{ 
                  fontSize: '0.65rem', 
                  opacity: 0.85, 
                  background: statusFilter === tab.id ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)',
                  padding: '0.05rem 0.3rem',
                  borderRadius: '3px'
                }}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: 3D Scene Controls & Refresh Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          
          {/* View Mode Switcher */}
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.35)', padding: '0.2rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <button
              type="button"
              className={`btn btn-sm ${viewMode === '3d' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => onViewModeChange('3d')}
              style={{ fontSize: '0.725rem', padding: '0.25rem 0.55rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              title="Interactive 3D Factory Floor View"
            >
              <Box size={13} />
              <span>3D View</span>
            </button>
            <button
              type="button"
              className={`btn btn-sm ${viewMode === 'schematic' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => onViewModeChange('schematic')}
              style={{ fontSize: '0.725rem', padding: '0.25rem 0.55rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              title="Accessible 2D Schematic / List View"
            >
              <ListFilter size={13} />
              <span>Schematic List</span>
            </button>
          </div>

          {/* 3D Camera Controls (Only in 3D mode) */}
          {viewMode === '3d' && (
            <>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={onToggleAutoRotate}
                style={{ fontSize: '0.725rem', padding: '0.3rem 0.55rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                title={autoRotate ? 'Pause 3D auto-turntable' : 'Enable 3D auto-turntable'}
              >
                {autoRotate ? <Pause size={12} /> : <Play size={12} />}
                <span>{autoRotate ? 'Orbit On' : 'Orbit Off'}</span>
              </button>

              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={onResetCamera}
                style={{ fontSize: '0.725rem', padding: '0.3rem 0.55rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                title="Reset 3D camera to default isometric overview"
              >
                <RotateCcw size={12} />
                <span>Reset View</span>
              </button>
            </>
          )}

          {/* Refresh Action & Transport Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onManualRefresh}
              disabled={refreshing}
              style={{ fontSize: '0.725rem', padding: '0.3rem 0.55rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              title="Refresh telemetry & equipment states now"
            >
              <RefreshCw size={12} className={refreshing ? 'spin-animation' : ''} />
              <span>{refreshing ? 'Syncing...' : 'Sync'}</span>
            </button>

            {/* Transport status indicator */}
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.35rem', 
                fontSize: '0.675rem', 
                color: transportMode === 'WEBSOCKET' ? 'var(--neon-emerald, #10B981)' : transportMode === 'STALE' ? 'var(--warning)' : 'var(--neon-cyan, #00f2fe)',
                background: 'rgba(255,255,255,0.03)',
                padding: '0.25rem 0.45rem',
                borderRadius: '4px',
                border: '1px solid var(--border-subtle)'
              }}
              title={lastUpdated ? `Last updated: ${new Date(lastUpdated).toLocaleTimeString()}` : 'Connecting...'}
            >
              <Radio size={11} className={transportMode === 'WEBSOCKET' ? 'pulse-radar' : ''} />
              <span>{transportMode === 'WEBSOCKET' ? 'STOMP /ws' : transportMode === 'STALE' ? 'Stale' : 'Polling'}</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
