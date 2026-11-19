import React, { useState, useEffect } from 'react';
import {
  Zap,
  RefreshCw
} from 'lucide-react';
import { energyApi, machinesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function EnergyView() {
  const { user, assignedPlantId } = useAuth();
  const isOperator = (user?.role || '').toUpperCase() === 'OPERATOR';

  const [readings, setReadings] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [energyData, machData] = await Promise.all([
        energyApi.getAll().catch(() => []),
        machinesApi.getAll().catch(() => [])
      ]);
      setReadings(Array.isArray(energyData) ? energyData : (energyData?.content || []));
      setMachines(Array.isArray(machData) ? machData : (machData?.content || []));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const operatorMachineIds = new Set(
    machines.filter(m => Number(m.plantId || m.plant?.id || 1) === Number(assignedPlantId)).map(m => Number(m.id))
  );
  const visibleReadings = isOperator
    ? readings.filter(r => operatorMachineIds.has(Number(r.machineId || r.machine?.id)))
    : readings;

  return (
    <div className="pbi-admin-container">
      {/* Top Banner */}
      <div className="pbi-admin-top-banner">
        <div className="pbi-admin-top-left">
          <div className="pbi-admin-top-icon" style={{ color: '#EAB308', background: 'rgba(234, 179, 8, 0.1)', borderColor: 'rgba(234, 179, 8, 0.3)' }}>
            <Zap size={24} />
          </div>
          <div>
            <div className="pbi-admin-top-title">Energy &amp; Electrical Demand Analytics</div>
          </div>
        </div>

        <button type="button" className="pbi-ribbon-btn" onClick={fetchData}>
          <RefreshCw size={13} className={loading ? 'spin-animation' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Matrix Table */}
      <div className="pbi-visual-card" style={{ width: '100%', boxSizing: 'border-box' }}>
        <div className="pbi-visual-header">
          <div>
            <div className="pbi-visual-title">Continuous Power Consumption Matrix</div>
          </div>
        </div>

        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table className="pbi-matrix-table" style={{ width: '100%', tableLayout: 'auto' }}>
            <thead>
              <tr>
                <th style={{ width: '76px', padding: '10px 8px' }}>Meter ID</th>
                <th style={{ padding: '10px 10px' }}>Machine Asset</th>
                <th style={{ width: '86px', padding: '10px 8px' }}>Power</th>
                <th style={{ width: '110px', padding: '10px 8px' }}>Load</th>
                <th style={{ width: '62px', padding: '10px 8px' }}>PF</th>
                <th style={{ width: '80px', padding: '10px 8px' }}>Voltage</th>
                <th style={{ width: '76px', padding: '10px 8px' }}>Current</th>
                <th style={{ width: '105px', padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {visibleReadings.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: '#94A3B8' }}>
                    No energy meter readings available.
                  </td>
                </tr>
              )}
              {visibleReadings.map((r) => {
                const kw = Number(r.activePower || r.powerConsumption || 24.5);
                const pf = Number(r.powerFactor || 0.95);
                const barWidth = Math.min(100, Math.round((kw / 50) * 100));

                return (
                  <tr key={r.id}>
                    <td style={{ padding: '10px 8px', fontFamily: 'var(--pbi-font-mono)', color: '#EAB308', fontWeight: 700, fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                      MTR-{String(r.id).padStart(3, '0')}
                    </td>
                    <td style={{ padding: '10px 10px', fontWeight: 600, color: '#FFFFFF', fontSize: '12.5px' }}>
                      Machine #{r.machineId || (r.machine && r.machine.id) || '1'}
                    </td>
                    <td style={{ padding: '10px 8px', fontFamily: 'var(--pbi-font-mono)', fontWeight: 700, color: '#FFFFFF', fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {kw.toFixed(1)} kW
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <div className="pbi-cell-bar-track" style={{ width: '86px', height: '6px', background: '#0E1422', borderRadius: '3px' }}>
                        <div
                          className="pbi-cell-bar-fill"
                          style={{
                            width: `${barWidth}%`,
                            background: kw > 35 ? '#EF4444' : (kw > 20 ? '#EAB308' : '#10B981'),
                            borderRadius: '3px'
                          }}
                        />
                      </div>
                    </td>
                    <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        color: pf >= 0.95 ? '#10B981' : '#F59E0B',
                        fontFamily: 'var(--pbi-font-mono)',
                        fontWeight: 700,
                        fontSize: '12px'
                      }}>
                        {pf.toFixed(2)}
                      </span>
                    </td>
                    <td style={{ padding: '10px 8px', fontFamily: 'var(--pbi-font-mono)', color: '#CBD5E1', fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {r.voltage || '415.0'} V
                    </td>
                    <td style={{ padding: '10px 8px', fontFamily: 'var(--pbi-font-mono)', color: '#CBD5E1', fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {r.current || '34.2'} A
                    </td>
                    <td style={{ padding: '10px 14px', color: '#94A3B8', fontSize: '11px', fontFamily: 'var(--pbi-font-mono)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {r.timestamp ? new Date(r.timestamp).toLocaleTimeString() : 'Live'}
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
