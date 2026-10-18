// KYNEXIS Industrial Mock Data Repository
// Mirrors Database/mysql/seed_data.sql for offline demonstration & verification

export const INITIAL_DATA = {
  users: [
    { id: 1, username: 'admin', email: 'admin@kynexis.industrial.com', role: 'ADMIN', active: true },
    { id: 2, username: 'engineer_sarah', email: 'sarah.engineer@kynexis.industrial.com', role: 'ENGINEER', active: true },
    { id: 3, username: 'operator_john', email: 'john.operator@kynexis.industrial.com', role: 'OPERATOR', active: true },
    { id: 4, username: 'manager_alex', email: 'alex.manager@kynexis.industrial.com', role: 'MANAGER', active: true }
  ],
  plants: [
    { id: 1, name: 'Pune Automotive Hub', location: 'Pune, Maharashtra, India', active: true },
    { id: 2, name: 'Munich Smart Factory', location: 'Munich, Bavaria, Germany', active: true },
    { id: 3, name: 'Detroit Assembly Plant', location: 'Detroit, Michigan, USA', active: true }
  ],
  machines: [
    { id: 1, name: 'CNC Milling Station Alpha', type: 'CNC Mill', status: 'ACTIVE', plantId: 1, plant: { id: 1, name: 'Pune Automotive Hub', location: 'Pune, Maharashtra, India' } },
    { id: 2, name: 'Robotic Welding Arm W-100', type: 'Robotic Welder', status: 'ACTIVE', plantId: 1, plant: { id: 1, name: 'Pune Automotive Hub', location: 'Pune, Maharashtra, India' } },
    { id: 3, name: 'Hydraulic Stamping Press P-500', type: 'Stamping Press', status: 'MAINTENANCE', plantId: 1, plant: { id: 1, name: 'Pune Automotive Hub', location: 'Pune, Maharashtra, India' } },
    { id: 4, name: 'Automated Injection Molder M-40', type: 'Injection Molder', status: 'INACTIVE', plantId: 2, plant: { id: 2, name: 'Munich Smart Factory', location: 'Munich, Bavaria, Germany' } },
    { id: 5, name: 'Laser Cutter Station LC-9', type: 'Laser Cutter', status: 'ACTIVE', plantId: 3, plant: { id: 3, name: 'Detroit Assembly Plant', location: 'Detroit, Michigan, USA' } }
  ],
  sensors: [
    { id: 1, name: 'Spindle Thermal Sensor', type: 'Temperature', unit: '°C', active: true, machineId: 1 },
    { id: 2, name: 'Vibration Monitor Axis-Z', type: 'Vibration', unit: 'mm/s', active: true, machineId: 1 },
    { id: 3, name: 'Hydraulic Pressure Gauge', type: 'Pressure', unit: 'PSI', active: true, machineId: 3 },
    { id: 4, name: 'Tachometer Motor RPM', type: 'RPM', unit: 'RPM', active: true, machineId: 1 },
    { id: 5, name: 'Welding Tip Thermal Sensor', type: 'Temperature', unit: '°C', active: true, machineId: 2 }
  ],
  telemetry: [
    { id: 1, machineId: 1, temperature: 68.5, vibration: 1.2, pressure: 45.0, rpm: 3200.0, timestamp: '2026-10-18T10:00:00' },
    { id: 2, machineId: 1, temperature: 72.1, vibration: 2.8, pressure: 46.2, rpm: 3250.0, timestamp: '2026-10-18T10:15:00' },
    { id: 3, machineId: 1, temperature: 89.4, vibration: 6.5, pressure: 48.0, rpm: 3400.0, timestamp: '2026-10-18T10:30:00' },
    { id: 4, machineId: 2, temperature: 55.0, vibration: 0.8, pressure: 120.0, rpm: 0.0, timestamp: '2026-10-18T10:00:00' },
    { id: 5, machineId: 2, temperature: 56.2, vibration: 0.9, pressure: 122.5, rpm: 0.0, timestamp: '2026-10-18T10:15:00' }
  ],
  alerts: [
    { id: 1, machineId: 1, type: 'OVERHEATING', severity: 'CRITICAL', message: 'Spindle temperature exceeded 85°C safety threshold', resolved: false, createdAt: '2026-10-18T10:30:00', telemetryId: 3 },
    { id: 2, machineId: 1, type: 'VIBRATION_WARNING', severity: 'MEDIUM', message: 'Axis-Z vibration approaching warning limit', resolved: true, createdAt: '2026-10-18T09:15:00', telemetryId: 2 }
  ],
  maintenance: [
    { id: 1, machineId: 3, type: 'PREVENTIVE', description: 'Quarterly hydraulic fluid change and valve seal check', scheduledDate: '2026-10-25', completedDate: null, status: 'SCHEDULED', technician: 'Robert Vance', createdAt: '2026-10-01T08:00:00' },
    { id: 2, machineId: 1, type: 'CORRECTIVE', description: 'Replace worn spindle bearing following overheating alert', scheduledDate: '2026-10-18', completedDate: '2026-10-18', status: 'COMPLETED', technician: 'Sarah Jenkins', createdAt: '2026-10-18T10:45:00' }
  ],
  production: [
    { id: 1, machineId: 1, productName: 'Engine Block Castings #A4', quantityProduced: 450, quantityRejected: 12, productionStart: '2026-10-18T06:00:00', productionEnd: '2026-10-18T14:00:00', status: 'COMPLETED' },
    { id: 2, machineId: 2, productName: 'Chassis Bracket Joints #W12', quantityProduced: 1200, quantityRejected: 5, productionStart: '2026-10-18T07:00:00', productionEnd: null, status: 'IN_PROGRESS' }
  ],
  energy: [
    { id: 1, machineId: 1, energyConsumption: 142.5, recordedAt: '2026-10-18T10:00:00' },
    { id: 2, machineId: 1, energyConsumption: 148.0, recordedAt: '2026-10-18T11:00:00' },
    { id: 3, machineId: 2, energyConsumption: 98.2, recordedAt: '2026-10-18T10:00:00' },
    { id: 4, machineId: 2, energyConsumption: 102.4, recordedAt: '2026-10-18T11:00:00' }
  ]
};

// In-memory mock store that persists during session
class MockDataStore {
  constructor() {
    this.data = JSON.parse(JSON.stringify(INITIAL_DATA));
  }

  reset() {
    this.data = JSON.parse(JSON.stringify(INITIAL_DATA));
  }

  getDashboardSummary() {
    const totalPlants = this.data.plants.length;
    const totalMachines = this.data.machines.length;
    const activeMachines = this.data.machines.filter(m => m.status === 'ACTIVE' || m.status === 'RUNNING').length;
    const totalSensors = this.data.sensors.length;
    const unresolvedAlerts = this.data.alerts.filter(a => !a.resolved).length;
    const totalProduction = this.data.production.reduce((acc, p) => acc + (p.quantityProduced || 0), 0);
    const rejectedProduction = this.data.production.reduce((acc, p) => acc + (p.quantityRejected || 0), 0);
    const totalEnergyConsumption = this.data.energy.reduce((acc, e) => acc + (e.energyConsumption || 0), 0);

    return {
      totalPlants,
      totalMachines,
      activeMachines,
      totalSensors,
      unresolvedAlerts,
      totalProduction,
      rejectedProduction,
      totalEnergyConsumption: Math.round(totalEnergyConsumption * 10) / 10
    };
  }

  getMachineStatusCounts() {
    let active = 0;
    let inactive = 0;
    let maintenance = 0;
    for (const m of this.data.machines) {
      const s = (m.status || '').toUpperCase();
      if (s === 'ACTIVE' || s === 'RUNNING') active++;
      else if (s === 'MAINTENANCE') maintenance++;
      else inactive++;
    }
    return { active, inactive, maintenance };
  }

  getMachineHealth(machineId) {
    const id = Number(machineId);
    const machine = this.data.machines.find(m => m.id === id);
    const telemetry = this.data.telemetry.filter(t => t.machineId === id);
    const latestTelem = telemetry.length > 0 ? telemetry[telemetry.length - 1] : null;
    const unresolved = this.data.alerts.filter(a => a.machineId === id && !a.resolved);
    const critical = unresolved.filter(a => (a.severity || '').toUpperCase() === 'CRITICAL').length;
    const high = unresolved.filter(a => (a.severity || '').toUpperCase() === 'HIGH').length;
    const medium = unresolved.filter(a => (a.severity || '').toUpperCase() === 'MEDIUM').length;
    const low = unresolved.filter(a => (a.severity || '').toUpperCase() === 'LOW').length;

    let healthState = 'HEALTHY';
    if (critical > 0) healthState = 'CRITICAL';
    else if (high > 0 || (latestTelem && latestTelem.temperature > 80)) healthState = 'WARNING';

    return {
      machineId: id,
      machineName: machine ? machine.name : `Machine #${id}`,
      machineType: machine ? machine.type : 'Industrial Equipment',
      machineStatus: machine ? machine.status : 'ACTIVE',
      healthState,
      latestTelemetryTimestamp: latestTelem ? latestTelem.timestamp : new Date().toISOString(),
      temperature: latestTelem ? latestTelem.temperature : 65.0,
      vibration: latestTelem ? latestTelem.vibration : 1.2,
      pressure: latestTelem ? latestTelem.pressure : 45.0,
      rpm: latestTelem ? latestTelem.rpm : 3000.0,
      totalUnresolvedAlertCount: unresolved.length,
      criticalAlertCount: critical,
      highAlertCount: high,
      mediumAlertCount: medium,
      lowAlertCount: low,
      severityCounts: { CRITICAL: critical, HIGH: high, MEDIUM: medium, LOW: low },
      contributingReasons: critical > 0 ? ['Spindle temperature critically elevated (>85°C)', 'High mechanical vibration detected'] : ['Operating inside normal tolerance envelope'],
      generatedAt: new Date().toISOString()
    };
  }

  getPredictiveAssessment(machineId) {
    const id = Number(machineId);
    const machine = this.data.machines.find(m => m.id === id);
    const health = this.getMachineHealth(id);
    const isCritical = health.healthState === 'CRITICAL';

    return {
      machineId: id,
      machineName: machine ? machine.name : `Machine #${id}`,
      machineType: machine ? machine.type : 'CNC Equipment',
      machineStatus: machine ? machine.status : 'ACTIVE',
      riskCategory: isCritical ? 'HIGH_RISK' : 'OPTIMAL',
      dataSufficiency: 'SUFFICIENT',
      assessmentTimestamp: new Date().toISOString(),
      latestTelemetryTimestamp: health.latestTelemetryTimestamp,
      telemetryStale: false,
      evaluatedReadingsCount: 15,
      trendFindings: isCritical 
        ? ['Thermal gradient +0.8°C/min over last 3 intervals', 'High frequency vibration spikes on Z-axis'] 
        : ['Steady state harmonic vibration', 'Thermal dissipation within normal parameters'],
      evidence: isCritical
        ? ['Bearing friction coefficient elevated by 24%', 'Peak vibration 6.5 mm/s exceeds ISO 10816 Class II threshold']
        : ['Sensory variance < 4% across running baseline'],
      recommendedAction: isCritical
        ? 'Schedule immediate bearing inspection and lubrication replenishment within 12 operating hours'
        : 'Continue standard maintenance interval; next review in 14 days',
      explanation: isCritical
        ? 'Predictive models indicate 82% probability of bearing seizure within 48 hours without corrective action.'
        : 'All operating parameters align with healthy baseline metrics.',
      totalUnresolvedAlertCount: health.totalUnresolvedAlertCount,
      criticalAlertCount: health.criticalAlertCount,
      highAlertCount: health.highAlertCount,
      mediumAlertCount: health.mediumAlertCount,
      lowAlertCount: health.lowAlertCount,
      alertSeverityCounts: health.severityCounts,
      maintenanceScheduled: false,
      existingMaintenanceSummary: null,
      advisoryNotice: 'Model confidence score: 94.2% based on real-time edge telemetry.'
    };
  }
}

export const mockStore = new MockDataStore();
