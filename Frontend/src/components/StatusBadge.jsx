import React from 'react';

export default function StatusBadge({ status }) {
  if (!status) return null;
  const normalized = String(status).toLowerCase().replace(/[\s-]/g, '_');
  
  return (
    <span className={`badge badge-${normalized}`}>
      <span className="badge-dot" />
      {String(status).replace(/_/g, ' ')}
    </span>
  );
}
