import React from 'react';
import { CheckCircle2, Clock, Wrench, AlertTriangle, HelpCircle } from 'lucide-react';

export const STATUS_CONFIG = {
  RUNNING: {
    label: 'Running',
    color: 'var(--success, #10B981)',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.35)',
    icon: CheckCircle2,
    badgeClass: 'badge-online'
  },
  ACTIVE: {
    label: 'Active',
    color: 'var(--success, #10B981)',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.35)',
    icon: CheckCircle2,
    badgeClass: 'badge-online'
  },
  IDLE: {
    label: 'Idle',
    color: '#94A3B8',
    bg: 'rgba(100, 116, 139, 0.12)',
    border: 'rgba(100, 116, 139, 0.3)',
    icon: Clock,
    badgeClass: 'badge-inactive'
  },
  STOPPED: {
    label: 'Stopped',
    color: '#94A3B8',
    bg: 'rgba(100, 116, 139, 0.12)',
    border: 'rgba(100, 116, 139, 0.3)',
    icon: Clock,
    badgeClass: 'badge-inactive'
  },
  MAINTENANCE: {
    label: 'Maintenance',
    color: 'var(--warning, #F59E0B)',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.35)',
    icon: Wrench,
    badgeClass: 'badge-maintenance'
  },
  ALERT: {
    label: 'Fault / Alert',
    color: 'var(--danger, #EF4444)',
    bg: 'rgba(239, 68, 68, 0.15)',
    border: 'rgba(239, 68, 68, 0.4)',
    icon: AlertTriangle,
    badgeClass: 'badge-critical'
  },
  UNKNOWN: {
    label: 'Unknown',
    color: '#64748B',
    bg: 'rgba(71, 85, 105, 0.12)',
    border: 'rgba(71, 85, 105, 0.3)',
    icon: HelpCircle,
    badgeClass: 'badge-unknown'
  }
};

export function normalizeStatus(rawStatus, hasAlert = false) {
  if (hasAlert) return 'ALERT';
  if (!rawStatus) return 'UNKNOWN';
  const s = String(rawStatus).toUpperCase().trim();
  if (s === 'RUNNING' || s === 'ACTIVE') return 'RUNNING';
  if (s === 'IDLE' || s === 'STOPPED' || s === 'INACTIVE') return 'IDLE';
  if (s === 'MAINTENANCE') return 'MAINTENANCE';
  if (s === 'ALERT' || s === 'CRITICAL' || s === 'FAULT' || s === 'ERROR') return 'ALERT';
  return 'UNKNOWN';
}

export default function MachineStatusIndicator({ status, hasAlert = false, size = 'md', showIcon = true }) {
  const normKey = normalizeStatus(status, hasAlert);
  const cfg = STATUS_CONFIG[normKey] || STATUS_CONFIG.UNKNOWN;
  const Icon = cfg.icon;

  const fontSizes = {
    sm: '0.675rem',
    md: '0.75rem',
    lg: '0.85rem'
  };

  const iconSizes = {
    sm: 11,
    md: 13,
    lg: 15
  };

  return (
    <span 
      className={`status-badge-indicator ${cfg.badgeClass}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: size === 'sm' ? '0.15rem 0.45rem' : '0.25rem 0.65rem',
        borderRadius: 'var(--radius-sm, 6px)',
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        color: cfg.color,
        fontSize: fontSizes[size] || fontSizes.md,
        fontWeight: 700,
        letterSpacing: '0.02em',
        textTransform: 'uppercase'
      }}
      role="status"
      aria-label={`Machine status: ${cfg.label}`}
    >
      <span 
        style={{
          width: size === 'sm' ? 6 : 8,
          height: size === 'sm' ? 6 : 8,
          borderRadius: '50%',
          backgroundColor: cfg.color,
          boxShadow: normKey === 'RUNNING' || normKey === 'ALERT' ? `0 0 8px ${cfg.color}` : 'none',
          display: 'inline-block',
          flexShrink: 0
        }}
      />
      {showIcon && <Icon size={iconSizes[size] || 13} style={{ flexShrink: 0 }} aria-hidden="true" />}
      <span>{cfg.label}</span>
    </span>
  );
}
