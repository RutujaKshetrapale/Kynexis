import React from 'react';

export default function LoadingSpinner({ message = 'Synchronizing IoT Telemetry...' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', gap: '1rem' }}>
      <div className="spinner" />
      <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
        {message}
      </span>
    </div>
  );
}
