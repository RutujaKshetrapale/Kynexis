import React from 'react';
import { PackageOpen } from 'lucide-react';

export default function EmptyState({ 
  icon: Icon = PackageOpen, 
  title = 'No Records Found', 
  description = 'No entities currently match the query filters.', 
  actionLabel, 
  onAction 
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '3.5rem 1.5rem',
      textAlign: 'center',
      background: 'rgba(255, 255, 255, 0.01)',
      border: '1px dashed var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      margin: '1rem 0'
    }}>
      <div style={{
        width: 56,
        height: 56,
        borderRadius: '50%',
        background: 'rgba(255, 255, 255, 0.04)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '1rem',
        color: 'var(--text-muted)'
      }}>
        <Icon size={28} />
      </div>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
        {title}
      </h3>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: 400, marginBottom: actionLabel ? '1.25rem' : 0 }}>
        {description}
      </p>
      {actionLabel && onAction && (
        <button type="button" className="btn btn-primary btn-sm" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
