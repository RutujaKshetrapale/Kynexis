import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Filter,
  ShieldAlert,
  BellRing
} from 'lucide-react';
import { alertsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function AlertsView() {
  const { hasRole } = useAuth();
  const canResolve = hasRole('ADMIN') || hasRole('ENGINEER');

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await alertsApi.getAll().catch(() => []);
      setAlerts(Array.isArray(data) ? data : (data?.content || []));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleResolve = async (id) => {
    try {
      await alertsApi.resolve(id);
      fetchData();
    } catch (e) {
      console.error('Failed to resolve alert:', e);
    }
  };

  const unresolved = alerts.filter(a => !a.resolved);
  const critical = alerts.filter(a => (a.severity === 'CRITICAL' || a.severity === 'HIGH') && !a.resolved);

  const filteredAlerts = alerts.filter(a => {
    const matchesSearch = (a.message || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (a.type || a.alertType || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = severityFilter === 'ALL' || a.severity === severityFilter;
    const matchesStatus = statusFilter === 'ALL' ||
                          (statusFilter === 'UNRESOLVED' && !a.resolved) ||
                          (statusFilter === 'RESOLVED' && a.resolved);
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  return (
    <div className="pbi-admin-container">
      {/* Top Banner */}
      <div className="pbi-admin-top-banner">
        <div className="pbi-admin-top-left">
          <div className="pbi-admin-top-icon" style={{ color: '#EF4444', background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <div className="pbi-admin-top-title">System Alerts</div>
            <div className="pbi-admin-top-desc">
              Real-time failure triggers, temperature spikes, vibration breaches &amp; resolution tracking (:8084)
            </div>
          </div>
        </div>

        <button type="button" className="pbi-ribbon-btn" onClick={fetchData}>
          <RefreshCw size={13} className={loading ? 'spin-animation' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Deck */}
      <div className="pbi-kpi-deck" style={{ marginBottom: '20px' }}>
        <div className="pbi-kpi-card" style={{ '--card-accent': '#EF4444' }}>
          <div className="pbi-kpi-header">
            <span className="pbi-kpi-title">Active Unresolved</span>
            <BellRing size={16} color="#EF4444" />
          </div>
          <div className="pbi-kpi-value">{unresolved.length}</div>
          <div className="pbi-kpi-subtext" style={{ color: '#EF4444' }}>
            <span>Requiring Intervention</span>
          </div>
        </div>

        <div className="pbi-kpi-card" style={{ '--card-accent': '#D83B01' }}>
          <div className="pbi-kpi-header">
            <span className="pbi-kpi-title">High / Critical</span>
            <ShieldAlert size={16} color="#D83B01" />
          </div>
          <div className="pbi-kpi-value">{critical.length}</div>
          <div className="pbi-kpi-subtext" style={{ color: '#D83B01' }}>
            <span>High Severity Breaches</span>
          </div>
        </div>

        <div className="pbi-kpi-card" style={{ '--card-accent': '#10B981' }}>
          <div className="pbi-kpi-header">
            <span className="pbi-kpi-title">Resolved Incidents</span>
            <CheckCircle2 size={16} color="#10B981" />
          </div>
          <div className="pbi-kpi-value">{alerts.filter(a => a.resolved).length}</div>
          <div className="pbi-kpi-subtext" style={{ color: '#10B981' }}>
            <span>Audited &amp; Closed</span>
          </div>
        </div>

        <div className="pbi-kpi-card" style={{ '--card-accent': '#00BCF2' }}>
          <div className="pbi-kpi-header">
            <span className="pbi-kpi-title">Lifetime Triggers</span>
            <Clock size={16} color="#00BCF2" />
          </div>
          <div className="pbi-kpi-value">{alerts.length}</div>
          <div className="pbi-kpi-subtext" style={{ color: '#00BCF2' }}>
            <span>Total Incident Log</span>
          </div>
        </div>
      </div>

      {/* Slicers Bar */}
      <div className="pbi-slicers-bar" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, maxWidth: '280px' }}>
          <Search size={15} color="#94A3B8" />
          <input
            type="text"
            className="pbi-form-input"
            style={{ height: '32px', fontSize: '12px' }}
            placeholder="Search incident..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="pbi-slicer-label">Status:</span>
          {['ALL', 'UNRESOLVED', 'RESOLVED'].map((st) => (
            <button
              key={st}
              type="button"
              className={`pbi-slicer-pill ${statusFilter === st ? 'active' : ''}`}
              onClick={() => setStatusFilter(st)}
            >
              {st}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '12px' }}>
          <span className="pbi-slicer-label">Severity:</span>
          {['ALL', 'CRITICAL', 'HIGH', 'WARNING', 'INFO'].map((sev) => (
            <button
              key={sev}
              type="button"
              className={`pbi-slicer-pill ${severityFilter === sev ? 'active' : ''}`}
              onClick={() => setSeverityFilter(sev)}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Matrix Table */}
      <div className="pbi-visual-card">
        <div className="pbi-visual-header">
          <div>
            <div className="pbi-visual-title">Incident Audit &amp; Event Stream</div>
            <div className="pbi-visual-subtitle">High-precision logging of machine threshold breaches with direct operator resolution</div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="pbi-matrix-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Alert ID</th>
                <th>Severity</th>
                <th>Incident Type</th>
                <th>Message Description</th>
                <th>Asset ID</th>
                <th>Triggered Time</th>
                <th>Status &amp; Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.map((a) => {
                const isCrit = a.severity === 'CRITICAL' || a.severity === 'HIGH';
                const sevColor = isCrit ? '#EF4444' : (a.severity === 'WARNING' ? '#F59E0B' : '#00BCF2');

                return (
                  <tr key={a.id}>
                    <td style={{ fontFamily: 'var(--pbi-font-mono)', color: '#EF4444', fontWeight: 700 }}>
                      ALT-{a.id}
                    </td>
                    <td>
                      <span style={{
                        color: sevColor,
                        background: `${sevColor}15`,
                        border: `1px solid ${sevColor}40`,
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '10.5px',
                        fontWeight: 800
                      }}>
                        {a.severity}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--pbi-font-mono)', fontSize: '11px', color: '#FFFFFF' }}>
                      {a.type || a.alertType}
                    </td>
                    <td style={{ color: '#CBD5E1' }}>
                      {a.message}
                    </td>
                    <td style={{ color: '#94A3B8', fontFamily: 'var(--pbi-font-mono)' }}>
                      Machine #{a.machineId || (a.machine && a.machine.id) || '1'}
                    </td>
                    <td style={{ color: '#64748B', fontSize: '11px' }}>
                      {a.createdAt ? new Date(a.createdAt).toLocaleString() : 'Just now'}
                    </td>
                    <td>
                      {a.resolved ? (
                        <span style={{ color: '#10B981', fontSize: '11.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={13} />
                          <span>Resolved</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="pbi-btn-action-sm pbi-btn-action-primary"
                          disabled={!canResolve}
                          onClick={() => handleResolve(a.id)}
                        >
                          Resolve Alert
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

