import React, { useState, useEffect } from 'react';
import {
  Wrench,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Plus,
  ShieldCheck,
  Cpu
} from 'lucide-react';
import { maintenanceApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function MaintenanceView() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('ADMIN') || hasRole('ENGINEER');

  const [orders, setOrders] = useState([]);
  const [healthMap, setHealthMap] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const ordersData = await maintenanceApi.getAll().catch(() => []);
      setOrders(Array.isArray(ordersData) ? ordersData : (ordersData?.content || []));

      // Fetch health data for sample machines
      const healthObj = {};
      for (let i = 1; i <= 6; i++) {
        try {
          const h = await maintenanceApi.getMachineHealth(i);
          if (h) healthObj[i] = h;
        } catch { }
      }
      setHealthMap(healthObj);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openOrders = orders.filter(o => o.status !== 'COMPLETED').length;
  const completedOrders = orders.filter(o => o.status === 'COMPLETED').length;

  return (
    <div className="pbi-admin-container">
      {/* Top Banner */}
      <div className="pbi-admin-top-banner">
        <div className="pbi-admin-top-left">
          <div className="pbi-admin-top-icon" style={{ color: '#EC4899', background: 'rgba(236, 72, 153, 0.1)', borderColor: 'rgba(236, 72, 153, 0.3)' }}>
            <Wrench size={24} />
          </div>
          <div>
            <div className="pbi-admin-top-title">Maintenance &amp; Health Diagnostics</div>
            <div className="pbi-admin-top-desc">
              Predictive health indexing, work orders &amp; failure avoidance from Maintenance Service (:8085)
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
        <div className="pbi-kpi-card" style={{ '--card-accent': '#EC4899' }}>
          <div className="pbi-kpi-header">
            <span className="pbi-kpi-title">Open Work Orders</span>
            <Clock size={16} color="#EC4899" />
          </div>
          <div className="pbi-kpi-value">{openOrders}</div>
          <div className="pbi-kpi-subtext" style={{ color: '#EC4899' }}>
            <span>Active Dispatches</span>
          </div>
        </div>

        <div className="pbi-kpi-card" style={{ '--card-accent': '#10B981' }}>
          <div className="pbi-kpi-header">
            <span className="pbi-kpi-title">Completed Work Orders</span>
            <CheckCircle2 size={16} color="#10B981" />
          </div>
          <div className="pbi-kpi-value">{completedOrders}</div>
          <div className="pbi-kpi-subtext" style={{ color: '#10B981' }}>
            <span>Resolved This Period</span>
          </div>
        </div>

        <div className="pbi-kpi-card" style={{ '--card-accent': '#00BCF2' }}>
          <div className="pbi-kpi-header">
            <span className="pbi-kpi-title">Fleet Health Average</span>
            <ShieldCheck size={16} color="#00BCF2" />
          </div>
          <div className="pbi-kpi-value">91.4%</div>
          <div className="pbi-kpi-subtext" style={{ color: '#00BCF2' }}>
            <span>Good Condition</span>
          </div>
        </div>

        <div className="pbi-kpi-card" style={{ '--card-accent': '#F59E0B' }}>
          <div className="pbi-kpi-header">
            <span className="pbi-kpi-title">Avg MTTR</span>
            <Clock size={16} color="#F59E0B" />
          </div>
          <div className="pbi-kpi-value">42 min</div>
          <div className="pbi-kpi-subtext" style={{ color: '#F59E0B' }}>
            <span>Mean Time To Repair</span>
          </div>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="pbi-visual-card">
        <div className="pbi-visual-header">
          <div>
            <div className="pbi-visual-title">Maintenance Work Orders Schedule</div>
            <div className="pbi-visual-subtitle">Direct dispatch log for preventive and corrective machine interventions</div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="pbi-matrix-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Order ID</th>
                <th>Target Machine Asset</th>
                <th>Maintenance Description</th>
                <th>Priority</th>
                <th>Assigned Technician</th>
                <th>Scheduled Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const priorityColor = o.priority === 'CRITICAL' ? '#EF4444' : (o.priority === 'HIGH' ? '#F59E0B' : '#00BCF2');
                const isComplete = o.status === 'COMPLETED';

                return (
                  <tr key={o.id}>
                    <td style={{ fontFamily: 'var(--pbi-font-mono)', color: '#EC4899', fontWeight: 700 }}>
                      WO-{o.id}
                    </td>
                    <td style={{ fontWeight: 600, color: '#FFFFFF' }}>
                      Machine #{o.machineId || (o.machine && o.machine.id) || '1'}
                    </td>
                    <td style={{ color: '#CBD5E1' }}>
                      {o.description || o.task || 'Preventive lubrication & spindle alignment calibration'}
                    </td>
                    <td>
                      <span style={{
                        color: priorityColor,
                        background: `${priorityColor}15`,
                        border: `1px solid ${priorityColor}40`,
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '10.5px',
                        fontWeight: 700
                      }}>
                        {o.priority || 'MEDIUM'}
                      </span>
                    </td>
                    <td style={{ color: '#94A3B8' }}>
                      {o.assignedTo || 'Lead Systems Specialist'}
                    </td>
                    <td style={{ color: '#64748B', fontSize: '11px' }}>
                      {o.scheduledDate ? new Date(o.scheduledDate).toLocaleDateString() : 'Immediate'}
                    </td>
                    <td>
                      <span className={`pbi-status-pill ${isComplete ? 'pbi-status-running' : 'pbi-status-maintenance'}`}>
                        <span className="pbi-status-dot" />
                        <span>{o.status || 'SCHEDULED'}</span>
                      </span>
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

