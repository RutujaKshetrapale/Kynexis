// KYNEXIS Unified API Gateway Client
// Routes all frontend traffic through API Gateway (port 8080)
// Supports explicit Live Database Mode vs. Demo/Simulation Mode.

import { useState, useEffect } from 'react';
import { mockStore } from './mockData';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Demo mode flag (stored in localStorage, default is FALSE for real database mode)
let demoMode = localStorage.getItem('kynexis_demo_mode') === 'true';

export function isDemoMode() {
  return demoMode;
}

export function setDemoMode(val) {
  demoMode = !!val;
  localStorage.setItem('kynexis_demo_mode', String(demoMode));
  backendStatus.isDemo = demoMode;
  backendStatus.statusMessage = demoMode 
    ? 'Demo Mode Active (Synthetic Fixtures)'
    : (backendStatus.isLive ? 'Live Database Connected (:8080)' : 'Live Mode (Connecting...)');
  notifyStatusListeners();
}

const statusListeners = new Set();

function notifyStatusListeners() {
  statusListeners.forEach((listener) => {
    try {
      listener({ ...backendStatus, isDemo: demoMode, setDemoMode });
    } catch (e) {
      console.error('Error notifying status listener:', e);
    }
  });
}

// Connection status tracker
export const backendStatus = {
  isLive: false,
  isDemo: demoMode,
  lastChecked: null,
  statusMessage: demoMode ? 'Demo Mode Active (Synthetic Fixtures)' : 'Connecting to API Gateway...'
};

export function subscribeBackendStatus(listener) {
  statusListeners.add(listener);
  listener({ ...backendStatus, isDemo: demoMode, setDemoMode });
  return () => statusListeners.delete(listener);
}

export function useBackendStatus() {
  const [status, setStatus] = useState(() => ({ ...backendStatus, isDemo: demoMode, setDemoMode }));
  useEffect(() => {
    return subscribeBackendStatus(setStatus);
  }, []);
  return status;
}

/**
 * Core HTTP Request Wrapper (Calls API Gateway)
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('kynexis_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const url = `${BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        // Ignored
      }
      throw new Error(errorMessage);
    }

    const wasLive = backendStatus.isLive;
    backendStatus.isLive = true;
    backendStatus.lastChecked = new Date();
    backendStatus.statusMessage = 'Live Database Connected (:8080)';
    if (!wasLive) {
      notifyStatusListeners();
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return null;
    }

    const data = await response.json();
    return data;
  } catch (err) {
    const wasLive = backendStatus.isLive;
    backendStatus.isLive = false;
    backendStatus.lastChecked = new Date();
    backendStatus.statusMessage = `Gateway Error: ${err.message}`;
    if (wasLive) {
      notifyStatusListeners();
    }
    // In live mode, NEVER silently swallow errors with mock data!
    throw err;
  }
}

// ==========================================================
// 1. Authentication Service (:8081 via Gateway)
// ==========================================================
export const authApi = {
  login: async (credentials) => {
    if (isDemoMode()) {
      const user = mockStore.data.users.find(u => u.username.toLowerCase() === credentials.username.toLowerCase());
      return {
        token: `demo-jwt-token-for-${user?.username || credentials.username}-${Date.now()}`,
        username: user?.username || credentials.username,
        role: user?.role || 'ADMIN'
      };
    }
    return await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  },

  register: async (userData) => {
    if (isDemoMode()) {
      const newUser = {
        id: mockStore.data.users.length + 1,
        username: userData.username,
        email: userData.email,
        role: 'OPERATOR',
        active: true
      };
      mockStore.data.users.push(newUser);
      return newUser;
    }
    return await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }
};

// ==========================================================
// 2. Dashboard Aggregation Controller (Gateway native)
// ==========================================================
export const dashboardApi = {
  getSummary: async () => {
    if (isDemoMode()) {
      return mockStore.getDashboardSummary();
    }
    return await request('/api/dashboard/summary');
  },

  getMachineStatus: async () => {
    if (isDemoMode()) {
      return mockStore.getMachineStatusCounts();
    }
    return await request('/api/dashboard/machine-status');
  }
};

// ==========================================================
// 3. Plant Service (:8082 via Gateway) + Cascading Offline State
// ==========================================================

export function getOfflinePlantIds() {
  try {
    const raw = localStorage.getItem('kynexis_offline_plants');
    if (raw) return JSON.parse(raw);
  } catch {}
  return [3]; // Chennai facility is offline by default in seed
}

export function setPlantOfflineState(plantId, isOffline) {
  try {
    const current = new Set(getOfflinePlantIds().map(Number));
    if (isOffline) {
      current.add(Number(plantId));
    } else {
      current.delete(Number(plantId));
    }
    const updated = Array.from(current);
    localStorage.setItem('kynexis_offline_plants', JSON.stringify(updated));

    // Update in-memory mockStore if present
    if (mockStore && mockStore.data) {
      const plant = mockStore.data.plants.find(p => p.id === Number(plantId));
      if (plant) plant.active = !isOffline;

      const machs = mockStore.data.machines.filter(m => Number(m.plantId) === Number(plantId) || Number(m.plant?.id) === Number(plantId));
      const machIds = new Set(machs.map(m => m.id));
      mockStore.data.machines.forEach(m => {
        if (machIds.has(m.id)) {
          m.status = isOffline ? 'OFFLINE' : 'RUNNING';
        }
      });
      mockStore.data.sensors.forEach(s => {
        if (machIds.has(Number(s.machineId))) {
          s.active = !isOffline;
        }
      });
    }

    // Broadcast status change across all active React views
    window.dispatchEvent(new CustomEvent('kynexis-plant-status-change', { 
      detail: { plantId: Number(plantId), isOffline } 
    }));
    return updated;
  } catch (err) {
    console.error('Error updating plant offline status:', err);
    return [];
  }
}

export const plantsApi = {
  getAll: async (params = {}) => {
    if (isDemoMode()) {
      return [...mockStore.data.plants];
    }
    const qs = new URLSearchParams(params).toString();
    const res = await request(`/api/plants${qs ? '?' + qs : ''}`);
    return Array.isArray(res) ? res : (res?.content || []);
  },

  getById: async (id) => {
    if (isDemoMode()) {
      return mockStore.data.plants.find(p => p.id === Number(id)) || null;
    }
    return await request(`/api/plants/${id}`);
  },

  getActive: async () => {
    if (isDemoMode()) {
      return mockStore.data.plants.filter(p => p.active);
    }
    const res = await request('/api/plants/active');
    return Array.isArray(res) ? res : (res?.content || []);
  },

  create: async (plant) => {
    if (isDemoMode()) {
      const created = {
        id: Math.max(0, ...mockStore.data.plants.map(p => p.id)) + 1,
        name: plant.name,
        location: plant.location,
        active: plant.active !== undefined ? plant.active : true
      };
      mockStore.data.plants.push(created);
      return created;
    }
    return await request('/api/plants', {
      method: 'POST',
      body: JSON.stringify(plant)
    });
  },

  update: async (id, plant) => {
    if (plant.active !== undefined) {
      setPlantOfflineState(id, plant.active === false);
    }
    if (isDemoMode()) {
      const idx = mockStore.data.plants.findIndex(p => p.id === Number(id));
      if (idx !== -1) {
        mockStore.data.plants[idx] = { ...mockStore.data.plants[idx], ...plant };
        return mockStore.data.plants[idx];
      }
      return plant;
    }
    return await request(`/api/plants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(plant)
    });
  },

  delete: async (id) => {
    if (isDemoMode()) {
      mockStore.data.plants = mockStore.data.plants.filter(p => p.id !== Number(id));
      return null;
    }
    return await request(`/api/plants/${id}`, { method: 'DELETE' });
  }
};

// ==========================================================
// 4. Machine Service (:8088 via Gateway)
// ==========================================================
export const machinesApi = {
  getAll: async (params = {}) => {
    if (isDemoMode()) {
      let list = [...mockStore.data.machines];
      if (params.status) {
        list = list.filter(m => m.status.toUpperCase() === params.status.toUpperCase());
      }
      if (params.plantId) {
        list = list.filter(m => m.plantId === Number(params.plantId));
      }
      return list;
    }
    const qs = new URLSearchParams(params).toString();
    const res = await request(`/api/machines${qs ? '?' + qs : ''}`);
    return Array.isArray(res) ? res : (res?.content || []);
  },

  getById: async (id) => {
    if (isDemoMode()) {
      return mockStore.data.machines.find(m => m.id === Number(id)) || null;
    }
    return await request(`/api/machines/${id}`);
  },

  getByPlant: async (plantId) => {
    if (isDemoMode()) {
      return mockStore.data.machines.filter(m => m.plantId === Number(plantId));
    }
    const res = await request(`/api/machines/plant/${plantId}`);
    return Array.isArray(res) ? res : (res?.content || []);
  },

  getByStatus: async (status) => {
    if (isDemoMode()) {
      return mockStore.data.machines.filter(m => m.status.toUpperCase() === status.toUpperCase());
    }
    const res = await request(`/api/machines/status/${status}`);
    return Array.isArray(res) ? res : (res?.content || []);
  },

  create: async (machine) => {
    if (isDemoMode()) {
      const created = {
        id: Math.max(0, ...mockStore.data.machines.map(m => m.id)) + 1,
        name: machine.name,
        type: machine.type || 'CNC',
        status: machine.status || 'RUNNING',
        plantId: Number(machine.plantId) || 1
      };
      mockStore.data.machines.push(created);
      return created;
    }
    return await request('/api/machines', {
      method: 'POST',
      body: JSON.stringify(machine)
    });
  },

  update: async (id, machine) => {
    if (isDemoMode()) {
      const idx = mockStore.data.machines.findIndex(m => m.id === Number(id));
      if (idx !== -1) {
        mockStore.data.machines[idx] = { ...mockStore.data.machines[idx], ...machine };
        return mockStore.data.machines[idx];
      }
      return machine;
    }
    return await request(`/api/machines/${id}`, {
      method: 'PUT',
      body: JSON.stringify(machine)
    });
  },

  delete: async (id) => {
    if (isDemoMode()) {
      mockStore.data.machines = mockStore.data.machines.filter(m => m.id !== Number(id));
      return null;
    }
    return await request(`/api/machines/${id}`, { method: 'DELETE' });
  }
};

// ==========================================================
// 5. Sensor Service (:8089 via Gateway)
// ==========================================================
export const sensorsApi = {
  getAll: async (params = {}) => {
    if (isDemoMode()) {
      let list = [...mockStore.data.sensors];
      if (params.type) {
        list = list.filter(s => s.type.toUpperCase() === params.type.toUpperCase());
      }
      if (params.machineId) {
        list = list.filter(s => s.machineId === Number(params.machineId));
      }
      return list;
    }
    const qs = new URLSearchParams(params).toString();
    const res = await request(`/api/sensors${qs ? '?' + qs : ''}`);
    return Array.isArray(res) ? res : (res?.content || []);
  },

  getById: async (id) => {
    if (isDemoMode()) {
      return mockStore.data.sensors.find(s => s.id === Number(id)) || null;
    }
    return await request(`/api/sensors/${id}`);
  },

  getByMachine: async (machineId) => {
    if (isDemoMode()) {
      return mockStore.data.sensors.filter(s => s.machineId === Number(machineId));
    }
    const res = await request(`/api/sensors/machine/${machineId}`);
    return Array.isArray(res) ? res : (res?.content || []);
  },

  create: async (sensor) => {
    if (isDemoMode()) {
      const created = {
        id: Math.max(0, ...mockStore.data.sensors.map(s => s.id)) + 1,
        name: sensor.name,
        type: sensor.type,
        unit: sensor.unit,
        active: sensor.active !== undefined ? sensor.active : true,
        machineId: Number(sensor.machineId)
      };
      mockStore.data.sensors.push(created);
      return created;
    }
    return await request('/api/sensors', {
      method: 'POST',
      body: JSON.stringify(sensor)
    });
  },

  update: async (id, sensor) => {
    if (isDemoMode()) {
      const idx = mockStore.data.sensors.findIndex(s => s.id === Number(id));
      if (idx !== -1) {
        mockStore.data.sensors[idx] = { ...mockStore.data.sensors[idx], ...sensor };
        return mockStore.data.sensors[idx];
      }
      return sensor;
    }
    return await request(`/api/sensors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(sensor)
    });
  },

  delete: async (id) => {
    if (isDemoMode()) {
      mockStore.data.sensors = mockStore.data.sensors.filter(s => s.id !== Number(id));
      return null;
    }
    return await request(`/api/sensors/${id}`, { method: 'DELETE' });
  }
};

// ==========================================================
// 6. Telemetry Service (:8083 via Gateway)
// ==========================================================
export const telemetryApi = {
  getAll: async (params = {}) => {
    if (isDemoMode()) {
      return [...mockStore.data.telemetry];
    }
    const qs = new URLSearchParams(params).toString();
    const res = await request(`/api/telemetry${qs ? '?' + qs : ''}`);
    return Array.isArray(res) ? res : (res?.content || []);
  },

  getById: async (id) => {
    if (isDemoMode()) {
      return mockStore.data.telemetry.find(t => t.id === Number(id)) || null;
    }
    return await request(`/api/telemetry/${id}`);
  },

  getLatestByMachine: async (machineId) => {
    if (isDemoMode()) {
      const readings = mockStore.data.telemetry.filter(t => t.machineId === Number(machineId));
      return readings[0] || null;
    }
    return await request(`/api/telemetry/machine/${machineId}/latest`);
  },

  getHistoricalByMachine: async (machineId, params = {}) => {
    if (isDemoMode()) {
      return mockStore.data.telemetry.filter(t => t.machineId === Number(machineId));
    }
    const qs = new URLSearchParams(params).toString();
    const res = await request(`/api/telemetry/machine/${machineId}${qs ? '?' + qs : ''}`);
    return Array.isArray(res) ? res : (res?.content || []);
  },

  create: async (telemetry) => {
    if (isDemoMode()) {
      const created = {
        id: Math.max(0, ...mockStore.data.telemetry.map(t => t.id)) + 1,
        machineId: Number(telemetry.machineId),
        temperature: Number(telemetry.temperature),
        vibration: Number(telemetry.vibration),
        pressure: Number(telemetry.pressure),
        rpm: Number(telemetry.rpm),
        timestamp: new Date().toISOString()
      };
      mockStore.data.telemetry.unshift(created);
      return created;
    }
    return await request('/api/telemetry', {
      method: 'POST',
      body: JSON.stringify(telemetry)
    });
  }
};

// ==========================================================
// 7. Alert Service (:8084 via Gateway)
// ==========================================================
export const alertsApi = {
  getAll: async (params = {}) => {
    if (isDemoMode()) {
      let list = [...mockStore.data.alerts];
      if (params.resolved !== undefined) {
        list = list.filter(a => a.resolved === (params.resolved === 'true' || params.resolved === true));
      }
      return list;
    }
    const qs = new URLSearchParams(params).toString();
    const res = await request(`/api/alerts${qs ? '?' + qs : ''}`);
    return Array.isArray(res) ? res : (res?.content || []);
  },

  getById: async (id) => {
    if (isDemoMode()) {
      return mockStore.data.alerts.find(a => a.id === Number(id)) || null;
    }
    return await request(`/api/alerts/${id}`);
  },

  getUnresolved: async () => {
    if (isDemoMode()) {
      return mockStore.data.alerts.filter(a => !a.resolved);
    }
    const res = await request('/api/alerts/unresolved');
    return Array.isArray(res) ? res : (res?.content || []);
  },

  getBySeverity: async (severity) => {
    if (isDemoMode()) {
      return mockStore.data.alerts.filter(a => a.severity.toUpperCase() === severity.toUpperCase());
    }
    const res = await request(`/api/alerts/severity/${severity}`);
    return Array.isArray(res) ? res : (res?.content || []);
  },

  create: async (alert) => {
    const alertType = alert.type || alert.alertType || 'HIGH_TEMPERATURE';
    const payload = {
      machineId: Number(alert.machineId || 1),
      type: alertType,
      alertType: alertType,
      severity: alert.severity || 'WARNING',
      message: (alert.message && alert.message.trim()) 
        ? alert.message.trim() 
        : `${alertType} anomaly detected on Machine #${alert.machineId || 1}`,
      resolved: false
    };

    let result;
    if (isDemoMode()) {
      const created = {
        id: Math.max(0, ...mockStore.data.alerts.map(a => a.id)) + 1,
        ...payload,
        createdAt: new Date().toISOString()
      };
      mockStore.data.alerts.unshift(created);
      result = created;
    } else {
      result = await request('/api/alerts', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }

    try {
      window.dispatchEvent(new CustomEvent('kynexis-alerts-updated', { detail: { action: 'created', alert: result } }));
    } catch {}
    return result;
  },

  acknowledge: async (id) => {
    let result;
    if (isDemoMode()) {
      const a = mockStore.data.alerts.find(item => item.id === Number(id));
      if (a) a.acknowledged = true;
      result = a;
    } else {
      result = await request(`/api/alerts/${id}/acknowledge`, { method: 'PUT' });
    }
    try {
      window.dispatchEvent(new CustomEvent('kynexis-alerts-updated', { detail: { action: 'acknowledged', id } }));
    } catch {}
    return result;
  },

  resolve: async (id, resolutionNotes = 'Resolved by operator') => {
    let result;
    if (isDemoMode()) {
      const a = mockStore.data.alerts.find(item => item.id === Number(id));
      if (a) {
        a.resolved = true;
        a.resolvedAt = new Date().toISOString();
        a.resolutionNotes = resolutionNotes;
      }
      result = a;
    } else {
      result = await request(`/api/alerts/${id}/resolve`, {
        method: 'PUT',
        body: JSON.stringify({ resolutionNotes })
      });
    }
    try {
      window.dispatchEvent(new CustomEvent('kynexis-alerts-updated', { detail: { action: 'resolved', id } }));
    } catch {}
    return result;
  }
};

// ==========================================================
// 8. Maintenance Service (:8085 via Gateway)
// ==========================================================
export const maintenanceApi = {
  getAll: async (params = {}) => {
    if (isDemoMode()) {
      let list = [...mockStore.data.maintenance];
      if (params.status) {
        list = list.filter(m => m.status.toUpperCase() === params.status.toUpperCase());
      }
      return list;
    }
    const qs = new URLSearchParams(params).toString();
    const res = await request(`/api/maintenance${qs ? '?' + qs : ''}`);
    return Array.isArray(res) ? res : (res?.content || []);
  },

  getById: async (id) => {
    if (isDemoMode()) {
      return mockStore.data.maintenance.find(m => m.id === Number(id)) || null;
    }
    return await request(`/api/maintenance/${id}`);
  },

  getByStatus: async (status) => {
    if (isDemoMode()) {
      return mockStore.data.maintenance.filter(m => m.status.toUpperCase() === status.toUpperCase());
    }
    const res = await request(`/api/maintenance/status/${status}`);
    return Array.isArray(res) ? res : (res?.content || []);
  },

  create: async (record) => {
    if (isDemoMode()) {
      const created = {
        id: Math.max(0, ...mockStore.data.maintenance.map(m => m.id)) + 1,
        machineId: Number(record.machineId),
        type: record.type || 'PREVENTIVE',
        status: record.status || 'SCHEDULED',
        scheduledDate: record.scheduledDate,
        description: record.description || 'Maintenance work order',
        cost: Number(record.cost) || 150.0
      };
      mockStore.data.maintenance.unshift(created);
      return created;
    }
    return await request('/api/maintenance', {
      method: 'POST',
      body: JSON.stringify(record)
    });
  },

  update: async (id, record) => {
    if (isDemoMode()) {
      const idx = mockStore.data.maintenance.findIndex(m => m.id === Number(id));
      if (idx !== -1) {
        mockStore.data.maintenance[idx] = { ...mockStore.data.maintenance[idx], ...record };
        return mockStore.data.maintenance[idx];
      }
      return record;
    }
    return await request(`/api/maintenance/${id}`, {
      method: 'PUT',
      body: JSON.stringify(record)
    });
  },

  delete: async (id) => {
    if (isDemoMode()) {
      mockStore.data.maintenance = mockStore.data.maintenance.filter(m => m.id !== Number(id));
      return null;
    }
    return await request(`/api/maintenance/${id}`, { method: 'DELETE' });
  }
};

// ==========================================================
// 9. Production Service (:8086 via Gateway)
// ==========================================================
export const productionApi = {
  getAll: async (params = {}) => {
    if (isDemoMode()) {
      return [...mockStore.data.production];
    }
    const qs = new URLSearchParams(params).toString();
    const res = await request(`/api/production${qs ? '?' + qs : ''}`);
    return Array.isArray(res) ? res : (res?.content || []);
  },

  getById: async (id) => {
    if (isDemoMode()) {
      return mockStore.data.production.find(p => p.id === Number(id)) || null;
    }
    return await request(`/api/production/${id}`);
  },

  getMetricsSummary: async () => {
    if (isDemoMode()) {
      const total = mockStore.data.production.reduce((acc, p) => acc + (p.quantityProduced || 0), 0);
      const rejected = mockStore.data.production.reduce((acc, p) => acc + (p.quantityRejected || 0), 0);
      return { totalProduction: total, rejectedProduction: rejected };
    }
    return await request('/api/production/metrics/summary');
  },

  create: async (prod) => {
    if (isDemoMode()) {
      const created = {
        id: Math.max(0, ...mockStore.data.production.map(p => p.id)) + 1,
        machineId: Number(prod.machineId),
        productName: prod.productName,
        quantityProduced: Number(prod.quantityProduced),
        quantityRejected: Number(prod.quantityRejected) || 0,
        status: prod.status || 'IN_PROGRESS',
        productionStart: prod.productionStart || new Date().toISOString()
      };
      mockStore.data.production.unshift(created);
      return created;
    }
    return await request('/api/production', {
      method: 'POST',
      body: JSON.stringify(prod)
    });
  },

  update: async (id, prod) => {
    if (isDemoMode()) {
      const idx = mockStore.data.production.findIndex(p => p.id === Number(id));
      if (idx !== -1) {
        mockStore.data.production[idx] = { ...mockStore.data.production[idx], ...prod };
        return mockStore.data.production[idx];
      }
      return prod;
    }
    return await request(`/api/production/${id}`, {
      method: 'PUT',
      body: JSON.stringify(prod)
    });
  },

  delete: async (id) => {
    if (isDemoMode()) {
      mockStore.data.production = mockStore.data.production.filter(p => p.id !== Number(id));
      return null;
    }
    return await request(`/api/production/${id}`, { method: 'DELETE' });
  }
};

// ==========================================================
// 10. Energy Service (:8087 via Gateway)
// ==========================================================
export const energyApi = {
  getAll: async (params = {}) => {
    if (isDemoMode()) {
      return [...mockStore.data.energy];
    }
    const qs = new URLSearchParams(params).toString();
    const res = await request(`/api/energy${qs ? '?' + qs : ''}`);
    return Array.isArray(res) ? res : (res?.content || []);
  },

  getById: async (id) => {
    if (isDemoMode()) {
      return mockStore.data.energy.find(e => e.id === Number(id)) || null;
    }
    return await request(`/api/energy/${id}`);
  },

  getByMachine: async (machineId) => {
    if (isDemoMode()) {
      return mockStore.data.energy.filter(e => e.machineId === Number(machineId));
    }
    const res = await request(`/api/energy/machine/${machineId}`);
    return Array.isArray(res) ? res : (res?.content || []);
  },

  getMetricsSummary: async () => {
    if (isDemoMode()) {
      const total = mockStore.data.energy.reduce((acc, e) => acc + (e.energyConsumption || 0), 0);
      return {
        totalEnergyConsumption: Math.round(total * 10) / 10
      };
    }
    return await request('/api/energy/metrics/summary');
  },

  create: async (energy) => {
    if (isDemoMode()) {
      const created = {
        id: Math.max(0, ...mockStore.data.energy.map(e => e.id)) + 1,
        machineId: Number(energy.machineId),
        energyConsumption: Number(energy.energyConsumption),
        recordedAt: energy.recordedAt || new Date().toISOString()
      };
      mockStore.data.energy.unshift(created);
      return created;
    }
    return await request('/api/energy', {
      method: 'POST',
      body: JSON.stringify(energy)
    });
  },

  update: async (id, energy) => {
    if (isDemoMode()) {
      const idx = mockStore.data.energy.findIndex(e => e.id === Number(id));
      if (idx !== -1) {
        mockStore.data.energy[idx] = { ...mockStore.data.energy[idx], ...energy };
        return mockStore.data.energy[idx];
      }
      return energy;
    }
    return await request(`/api/energy/${id}`, {
      method: 'PUT',
      body: JSON.stringify(energy)
    });
  },

  delete: async (id) => {
    if (isDemoMode()) {
      mockStore.data.energy = mockStore.data.energy.filter(e => e.id !== Number(id));
      return null;
    }
    return await request(`/api/energy/${id}`, { method: 'DELETE' });
  }
};
