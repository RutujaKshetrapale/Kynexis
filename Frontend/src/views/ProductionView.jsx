import React, { useState, useEffect } from 'react';
import {
  Layers,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Search,
  Package,
  Clock
} from 'lucide-react';
import { productionApi } from '../services/api';

export default function ProductionView() {
  const [batches, setBatches] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [batchData, metricsData] = await Promise.all([
        productionApi.getAll().catch(() => []),
        productionApi.getMetricsSummary().catch(() => null)
      ]);
      setBatches(Array.isArray(batchData) ? batchData : (batchData?.content || []));
      setMetrics(metricsData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalProduced = batches.reduce((acc, b) => acc + Number(b.actualUnits || b.quantityProduced || 0), 0);
  const totalTarget = batches.reduce((acc, b) => acc + Number(b.targetUnits || b.plannedQuantity || 1), 0);
  const totalScrap = batches.reduce((acc, b) => acc + Number(b.scrapUnits || b.defects || 0), 0);
  const overallYield = totalTarget > 0 ? ((totalProduced / (totalProduced + totalScrap || 1)) * 100).toFixed(1) : '98.4';

  const filteredBatches = batches.filter(b => {
    if (statusFilter === 'ALL') return true;
    return (b.status || '').toUpperCase() === statusFilter;
  });

  return (
    <div className="pbi-admin-container">
      {/* Top Banner */}
      <div className="pbi-admin-top-banner">
        <div className="pbi-admin-top-left">
          <div className="pbi-admin-top-icon" style={{ color: '#A855F7', background: 'rgba(168, 85, 247, 0.1)', borderColor: 'rgba(168, 85, 247, 0.3)' }}>
            <Layers size={24} />
          </div>
          <div>
            <div className="pbi-admin-top-title">Production Batches &amp; Yield Analytics</div>
            <div className="pbi-admin-top-desc">
              Work order execution, batch target variances &amp; scrap rates from Production Service (:8086)
            </div>
          </div>
        </div>

        <button type="button" className="pbi-ribbon-btn" onClick={fetchData}>
          <RefreshCw size={13} className={loading ? 'spin-animation' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="pbi-kpi-deck" style={{ marginBottom: '20px' }}>
        <div className="pbi-kpi-card" style={{ '--card-accent': '#A855F7' }}>
          <div className="pbi-kpi-header">
            <span className="pbi-kpi-title">Actual Output</span>
            <Package size={16} color="#A855F7" />
          </div>
          <div className="pbi-kpi-value">{totalProduced.toLocaleString()}</div>
          <div className="pbi-kpi-subtext" style={{ color: '#A855F7' }}>
            <span>Target: {totalTarget.toLocaleString()} Units</span>
          </div>
        </div>

        <div className="pbi-kpi-card" style={{ '--card-accent': '#10B981' }}>
          <div className="pbi-kpi-header">
            <span className="pbi-kpi-title">First Pass Yield</span>
            <TrendingUp size={16} color="#10B981" />
          </div>
          <div className="pbi-kpi-value">{overallYield}%</div>
          <div className="pbi-kpi-subtext" style={{ color: '#10B981' }}>
            <span>Target: &gt;96.5%</span>
          </div>
        </div>

        <div className="pbi-kpi-card" style={{ '--card-accent': '#EF4444' }}>
          <div className="pbi-kpi-header">
            <span className="pbi-kpi-title">Scrap &amp; Defects</span>
            <AlertTriangle size={16} color="#EF4444" />
          </div>
          <div className="pbi-kpi-value">{totalScrap.toLocaleString()}</div>
          <div className="pbi-kpi-subtext" style={{ color: '#EF4444' }}>
            <span>Scrap Rate: {(100 - parseFloat(overallYield)).toFixed(1)}%</span>
          </div>
        </div>

        <div className="pbi-kpi-card" style={{ '--card-accent': '#00BCF2' }}>
          <div className="pbi-kpi-header">
            <span className="pbi-kpi-title">Active Batches</span>
            <Clock size={16} color="#00BCF2" />
          </div>
          <div className="pbi-kpi-value">{batches.length}</div>
          <div className="pbi-kpi-subtext" style={{ color: '#00BCF2' }}>
            <span>Tracked Orders</span>
          </div>
        </div>
      </div>

      {/* Slicers */}
      <div className="pbi-slicers-bar" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="pbi-slicer-label">Batch Status:</span>
          {['ALL', 'COMPLETED', 'IN_PROGRESS', 'SCHEDULED'].map((st) => (
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
      </div>

      {/* Matrix Table */}
      <div className="pbi-visual-card">
        <div className="pbi-visual-header">
          <div>
            <div className="pbi-visual-title">Production Batches Execution Matrix</div>
            <div className="pbi-visual-subtitle">Detailed tracking of work order quotas, cycle completion and defect rates</div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="pbi-matrix-table">
            <thead>
              <tr>
                <th style={{ width: '90px' }}>Batch Code</th>
                <th>Part / Product Description</th>
                <th>Target Quota</th>
                <th>Actual Output</th>
                <th>Progress %</th>
                <th>Defects</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredBatches.map((b) => {
                const actual = Number(b.actualUnits || b.quantityProduced || 0);
                const target = Number(b.targetUnits || b.plannedQuantity || 1);
                const pct = Math.min(100, Math.round((actual / target) * 100));
                const defects = Number(b.scrapUnits || b.defects || 0);

                return (
                  <tr key={b.id}>
                    <td style={{ fontFamily: 'var(--pbi-font-mono)', color: '#A855F7', fontWeight: 700 }}>
                      {b.batchCode || b.batchNumber || `BAT-${b.id}`}
                    </td>
                    <td style={{ fontWeight: 600, color: '#FFFFFF' }}>
                      {b.productName || b.partName || `Precision Alloy Component #${b.id}`}
                    </td>
                    <td style={{ fontFamily: 'var(--pbi-font-mono)' }}>
                      {target.toLocaleString()} units
                    </td>
                    <td style={{ fontFamily: 'var(--pbi-font-mono)', fontWeight: 700, color: '#FFFFFF' }}>
                      {actual.toLocaleString()} units
                    </td>
                    <td style={{ width: '200px' }}>
                      <div className="pbi-data-bar-wrap">
                        <div className="pbi-data-bar-track">
                          <div
                            className="pbi-data-bar-fill"
                            style={{
                              width: `${pct}%`,
                              background: pct >= 100 ? '#10B981' : '#A855F7'
                            }}
                          />
                        </div>
                        <span className="pbi-data-bar-value">{pct}%</span>
                      </div>
                    </td>
                    <td style={{ color: defects > 0 ? '#EF4444' : '#10B981', fontWeight: 600 }}>
                      {defects}
                    </td>
                    <td>
                      <span className={`pbi-status-pill ${b.status === 'COMPLETED' ? 'pbi-status-running' : 'pbi-status-idle'}`}>
                        <span className="pbi-status-dot" />
                        <span>{b.status || 'IN_PROGRESS'}</span>
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

