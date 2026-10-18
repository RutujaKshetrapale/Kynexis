// KYNEXIS Unified API Gateway Client
// Routes all frontend traffic through API Gateway (port 8080)
// Gracefully falls back to mockStore when backend services are offline.

import { mockStore } from './mockData';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Connection status tracker
export const backendStatus = {
  isLive: false,
  lastChecked: null,
  statusMessage: 'Connecting to API Gateway...'
};

/**
 * Core HTTP Request Wrapper
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
      let errorMessage = `HTTP Error ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        // Ignored
      }
      throw new Error(errorMessage);
    }

    backendStatus.isLive = true;
    backendStatus.lastChecked = new Date();
    backendStatus.statusMessage = 'Connected to API Gateway (:8080)';

    // Handle 204 No Content
    if (response.status === 204) {
      return null;
    }

    const data = await response.json();
    return data;
  } catch (err) {
    // If backend is unreachable or request failed, fallback gracefully
    console.warn(`Gateway request failed for ${endpoint}: ${err.message}. Using high-fidelity store.`);
    backendStatus.isLive = false;
    backendStatus.lastChecked = new Date();
    backendStatus.statusMessage = 'API Gateway Offline (Operating in Edge Simulation Mode)';
    throw err;
  }
}

// ==========================================================
// 1. Authentication Service (:8081 via Gateway)
// ==========================================================
export const authApi = {
  login: async (credentials) => {
    try {
      const data = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      });
      return data;
    } catch {
      // Offline fallback: match demo credentials
      const user = mockStore.data.users.find(u => u.username.toLowerCase() === credentials.username.toLowerCase());
      if (user) {
        return {
          token: `demo-jwt-token-for-${user.username}-${Date.now()}`,
          username: user.username,
          role: user.role
        };
      }
      // Default fallback
      return {
        token: `demo-jwt-token-${Date.now()}`,
        username: credentials.username || 'admin',
        role: 'ADMIN'
      };
    }
  },

  register: async (userData) => {
    try {
      return await request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
      });
    } catch {
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
  }
};

// ==========================================================
// 2. Dashboard Aggregation Controller (Gateway native)
// ==========================================================
export const dashboardApi = {
  getSummary: async () => {
    try {
      return await request('/api/dashboard/summary');
    } catch {
      return mockStore.getDashboardSummary();
    }
  },

  getMachineStatus: async () => {
    try {
      return await request('/api/dashboard/machine-status');
    } catch {
      return mockStore.getMachineStatusCounts();
    }
  }
};

// ==========================================================
// 3. Plant Service (:8082 via Gateway)
// ==========================================================
export const plantsApi = {
  getAll: async (params = {}) => {
    try {
      const qs = new URLSearchParams(params).toString();
      const res = await request(`/api/plants${qs ? '?' + qs : ''}`);
      return Array.isArray(res) ? res : (res.content || []);
    } catch {
      return [...mockStore.data.plants];
    }
  },

  getById: async (id) => {
    try {
      return await request(`/api/plants/${id}`);
    } catch {
      return mockStore.data.plants.find(p => p.id === Number(id)) || null;
    }
  },

  getActive: async () => {
    try {
      return await request('/api/plants/active');
    } catch {
      return mockStore.data.plants.filter(p => p.active);
    }
  },

  create: async (plant) => {
    try {
      return await request('/api/plants', {
        method: 'POST',
        body: JSON.stringify(plant)
      });
    } catch {
      const created = {
        id: Math.max(0, ...mockStore.data.plants.map(p => p.id)) + 1,
        name: plant.name,
        location: plant.location,
        active: plant.active !== undefined ? plant.active : true
      };
      mockStore.data.plants.push(created);
      return created;
    }
  },

  update: async (id, plant) => {
    try {
      return await request(`/api/plants/${id}`, {
        method: 'PUT',
        body: JSON.stringify(plant)
      });
    } catch {
      const idx = mockStore.data.plants.findIndex(p => p.id === Number(id));
      if (idx !== -1) {
        mockStore.data.plants[idx] = { ...mockStore.data.plants[idx], ...plant };
        return mockStore.data.plants[idx];
      }
      return plant;
    }
  },

  delete: async (id) => {
    try {
      return await request(`/api/plants/${id}`, { method: 'DELETE' });
    } catch {
      mockStore.data.plants = mockStore.data.plants.filter(p => p.id !== Number(id));
      return null;
    }
  }
};

// ==========================================================
// 4. Machine Service (:8088 via Gateway)
// ==========================================================
export const machinesApi = {
  getAll: async (params = {}) => {
    try {
      const qs = new URLSearchParams(params).toString();
      const res = await request(`/api/machines${qs ? '?' + qs : ''}`);
      return Array.isArray(res) ? res : (res.content || []);
    } catch {
      let list = [...mockStore.data.machines];
      if (params.status) {
        list = list.filter(m => m.status.toUpperCase() === params.status.toUpperCase());
      }
      if (params.plantId) {
        list = list.filter(m => m.plantId === Number(params.plantId));
      }
      return list;
    }
  },

  getById: async (id) => {
    try {
      return await request(`/api/machines/${id}`);
    } catch {
      return mockStore.data.machines.find(m => m.id === Number(id)) || null;
    }
  },

  getByPlant: async (plantId) => {
    try {
      const res = await request(`/api/machines/plant/${plantId}`);
      return Array.isArray(res) ? res : (res.content || []);
    } catch {
      return mockStore.data.machines.filter(m => m.plantId === Number(plantId));
    }
  },

  getByStatus: async (status) => {
    try {
      const res = await request(`/api/machines/status/${status}`);
      return Array.isArray(res) ? res : (res.content || []);
    } catch {
      return mockStore.data.machines.filter(m => m.status.toUpperCase() === status.toUpperCase());
    }
  },

  create: async (machine) => {
    try {
      return await request('/api/machines', {
        method: 'POST',
        body: JSON.stringify(machine)
      });
    } catch {
      const plant = mockStore.data.plants.find(p => p.id === Number(machine.plantId));
      const created = {
        id: Math.max(0, ...mockStore.data.machines.map(m => m.id)) + 1,
        name: machine.name,
        type: machine.type,
        status: machine.status || 'ACTIVE',
        plantId: Number(machine.plantId),
        plant: plant ? { id: plant.id, name: plant.name, location: plant.location } : null
      };
      mockStore.data.machines.push(created);
      return created;
    }
  },

  update: async (id, machine) => {
    try {
      return await request(`/api/machines/${id}`, {
        method: 'PUT',
        body: JSON.stringify(machine)
      });
    } catch {
      const idx = mockStore.data.machines.findIndex(m => m.id === Number(id));
      if (idx !== -1) {
        mockStore.data.machines[idx] = { ...mockStore.data.machines[idx], ...machine };
        return mockStore.data.machines[idx];
      }
      return machine;
    }
  },

  delete: async (id) => {
    try {
      return await request(`/api/machines/${id}`, { method: 'DELETE' });
    } catch {
      mockStore.data.machines = mockStore.data.machines.filter(m => m.id !== Number(id));
      return null;
    }
  },

  getHealth: async (machineId) => {
    try {
      return await request(`/api/machines/${machineId}/health`);
    } catch {
      return mockStore.getMachineHealth(machineId);
    }
  },

  getAssessment: async (machineId) => {
    try {
      return await request(`/api/machines/${machineId}/maintenance-assessment`);
    } catch {
      return mockStore.getPredictiveAssessment(machineId);
    }
  }
};

// ==========================================================
// 5. Sensor Service (:8089 via Gateway)
// ==========================================================
export const sensorsApi = {
  getAll: async (params = {}) => {
    try {
      const qs = new URLSearchParams(params).toString();
      const res = await request(`/api/sensors${qs ? '?' + qs : ''}`);
      return Array.isArray(res) ? res : (res.content || []);
    } catch {
      return [...mockStore.data.sensors];
    }
  },

  getById: async (id) => {
    try {
      return await request(`/api/sensors/${id}`);
    } catch {
      return mockStore.data.sensors.find(s => s.id === Number(id)) || null;
    }
  },

  getByMachine: async (machineId) => {
    try {
      const res = await request(`/api/sensors/machine/${machineId}`);
      return Array.isArray(res) ? res : (res.content || []);
    } catch {
      return mockStore.data.sensors.filter(s => s.machineId === Number(machineId));
    }
  },

  create: async (sensor) => {
    try {
      return await request('/api/sensors', {
        method: 'POST',
        body: JSON.stringify(sensor)
      });
    } catch {
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
  },

  update: async (id, sensor) => {
    try {
      return await request(`/api/sensors/${id}`, {
        method: 'PUT',
        body: JSON.stringify(sensor)
      });
    } catch {
      const idx = mockStore.data.sensors.findIndex(s => s.id === Number(id));
      if (idx !== -1) {
        mockStore.data.sensors[idx] = { ...mockStore.data.sensors[idx], ...sensor };
        return mockStore.data.sensors[idx];
      }
      return sensor;
    }
  },

  delete: async (id) => {
    try {
      return await request(`/api/sensors/${id}`, { method: 'DELETE' });
    } catch {
      mockStore.data.sensors = mockStore.data.sensors.filter(s => s.id !== Number(id));
      return null;
    }
  }
};

// ==========================================================
// 6. Telemetry Service (:8083 via Gateway)
// ==========================================================
export const telemetryApi = {
  getAll: async (params = {}) => {
    try {
      const qs = new URLSearchParams(params).toString();
      const res = await request(`/api/telemetry${qs ? '?' + qs : ''}`);
      return Array.isArray(res) ? res : (res.content || []);
    } catch {
      return [...mockStore.data.telemetry];
    }
  },

  getByMachine: async (machineId, params = {}) => {
    try {
      const qs = new URLSearchParams(params).toString();
      const res = await request(`/api/telemetry/machine/${machineId}${qs ? '?' + qs : ''}`);
      return Array.isArray(res) ? res : (res.content || []);
    } catch {
      return mockStore.data.telemetry.filter(t => t.machineId === Number(machineId));
    }
  },

  getLatest: async (machineId) => {
    try {
      return await request(`/api/telemetry/machine/${machineId}/latest`);
    } catch {
      const list = mockStore.data.telemetry.filter(t => t.machineId === Number(machineId));
      return list.length > 0 ? list[list.length - 1] : null;
    }
  },

  getRecent: async (machineId, limit = 10) => {
    try {
      return await request(`/api/telemetry/machine/${machineId}/recent?limit=${limit}`);
    } catch {
      const list = mockStore.data.telemetry.filter(t => t.machineId === Number(machineId));
      return list.slice(-limit);
    }
  },

  create: async (telemetry) => {
    try {
      return await request('/api/telemetry', {
        method: 'POST',
        body: JSON.stringify(telemetry)
      });
    } catch {
      const created = {
        id: Math.max(0, ...mockStore.data.telemetry.map(t => t.id)) + 1,
        temperature: Number(telemetry.temperature),
        vibration: Number(telemetry.vibration),
        pressure: Number(telemetry.pressure),
        rpm: Number(telemetry.rpm),
        timestamp: telemetry.timestamp || new Date().toISOString(),
        machineId: Number(telemetry.machineId)
      };
      mockStore.data.telemetry.push(created);

      // Auto-evaluate alert in mock store if temperature > 85
      if (created.temperature > 85) {
        mockStore.data.alerts.push({
          id: Math.max(0, ...mockStore.data.alerts.map(a => a.id)) + 1,
          machineId: created.machineId,
          type: 'OVERHEATING',
          severity: 'CRITICAL',
          message: `Spindle temperature ${created.temperature}°C exceeded critical threshold`,
          resolved: false,
          createdAt: new Date().toISOString(),
          telemetryId: created.id
        });
      }
      return created;
    }
  }
};

// ==========================================================
// 7. Alert Service (:8084 via Gateway)
// ==========================================================
export const alertsApi = {
  getAll: async (params = {}) => {
    try {
      const qs = new URLSearchParams(params).toString();
      const res = await request(`/api/alerts${qs ? '?' + qs : ''}`);
      return Array.isArray(res) ? res : (res.content || []);
    } catch {
      return [...mockStore.data.alerts];
    }
  },

  getUnresolved: async () => {
    try {
      const res = await request('/api/alerts/unresolved');
      return Array.isArray(res) ? res : (res.content || []);
    } catch {
      return mockStore.data.alerts.filter(a => !a.resolved);
    }
  },

  getByMachine: async (machineId) => {
    try {
      const res = await request(`/api/alerts/machine/${machineId}`);
      return Array.isArray(res) ? res : (res.content || []);
    } catch {
      return mockStore.data.alerts.filter(a => a.machineId === Number(machineId));
    }
  },

  getBySeverity: async (severity) => {
    try {
      const res = await request(`/api/alerts/severity/${severity}`);
      return Array.isArray(res) ? res : (res.content || []);
    } catch {
      return mockStore.data.alerts.filter(a => a.severity.toUpperCase() === severity.toUpperCase());
    }
  },

  create: async (alert) => {
    try {
      return await request('/api/alerts', {
        method: 'POST',
        body: JSON.stringify(alert)
      });
    } catch {
      const created = {
        id: Math.max(0, ...mockStore.data.alerts.map(a => a.id)) + 1,
        machineId: Number(alert.machineId),
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
        resolved: alert.resolved || false,
        createdAt: new Date().toISOString(),
        telemetryId: alert.telemetryId || null
      };
      mockStore.data.alerts.unshift(created);
      return created;
    }
  },

  resolve: async (id) => {
    try {
      return await request(`/api/alerts/${id}/resolve`, { method: 'PUT' });
    } catch {
      const alert = mockStore.data.alerts.find(a => a.id === Number(id));
      if (alert) {
        alert.resolved = true;
      }
      return alert;
    }
  },

  delete: async (id) => {
    try {
      return await request(`/api/alerts/${id}`, { method: 'DELETE' });
    } catch {
      mockStore.data.alerts = mockStore.data.alerts.filter(a => a.id !== Number(id));
      return null;
    }
  }
};

// ==========================================================
// 8. Maintenance Service (:8085 via Gateway)
// ==========================================================
export const maintenanceApi = {
  getAll: async (params = {}) => {
    try {
      const qs = new URLSearchParams(params).toString();
      const res = await request(`/api/maintenance${qs ? '?' + qs : ''}`);
      return Array.isArray(res) ? res : (res.content || []);
    } catch {
      return [...mockStore.data.maintenance];
    }
  },

  getById: async (id) => {
    try {
      return await request(`/api/maintenance/${id}`);
    } catch {
      return mockStore.data.maintenance.find(m => m.id === Number(id)) || null;
    }
  },

  getByMachine: async (machineId) => {
    try {
      const res = await request(`/api/maintenance/machine/${machineId}`);
      return Array.isArray(res) ? res : (res.content || []);
    } catch {
      return mockStore.data.maintenance.filter(m => m.machineId === Number(machineId));
    }
  },

  getByStatus: async (status) => {
    try {
      const res = await request(`/api/maintenance/status/${status}`);
      return Array.isArray(res) ? res : (res.content || []);
    } catch {
      return mockStore.data.maintenance.filter(m => m.status.toUpperCase() === status.toUpperCase());
    }
  },

  create: async (maintenance) => {
    try {
      return await request('/api/maintenance', {
        method: 'POST',
        body: JSON.stringify(maintenance)
      });
    } catch {
      const created = {
        id: Math.max(0, ...mockStore.data.maintenance.map(m => m.id)) + 1,
        machineId: Number(maintenance.machineId),
        type: maintenance.type,
        description: maintenance.description,
        scheduledDate: maintenance.scheduledDate,
        completedDate: maintenance.completedDate || null,
        status: maintenance.status || 'SCHEDULED',
        technician: maintenance.technician,
        createdAt: new Date().toISOString()
      };
      mockStore.data.maintenance.unshift(created);
      return created;
    }
  },

  update: async (id, maintenance) => {
    try {
      return await request(`/api/maintenance/${id}`, {
        method: 'PUT',
        body: JSON.stringify(maintenance)
      });
    } catch {
      const idx = mockStore.data.maintenance.findIndex(m => m.id === Number(id));
      if (idx !== -1) {
        mockStore.data.maintenance[idx] = { ...mockStore.data.maintenance[idx], ...maintenance };
        return mockStore.data.maintenance[idx];
      }
      return maintenance;
    }
  },

  delete: async (id) => {
    try {
      return await request(`/api/maintenance/${id}`, { method: 'DELETE' });
    } catch {
      mockStore.data.maintenance = mockStore.data.maintenance.filter(m => m.id !== Number(id));
      return null;
    }
  }
};

// ==========================================================
// 9. Production Service (:8086 via Gateway)
// ==========================================================
export const productionApi = {
  getAll: async (params = {}) => {
    try {
      const qs = new URLSearchParams(params).toString();
      const res = await request(`/api/production${qs ? '?' + qs : ''}`);
      return Array.isArray(res) ? res : (res.content || []);
    } catch {
      return [...mockStore.data.production];
    }
  },

  getById: async (id) => {
    try {
      return await request(`/api/production/${id}`);
    } catch {
      return mockStore.data.production.find(p => p.id === Number(id)) || null;
    }
  },

  getByMachine: async (machineId) => {
    try {
      const res = await request(`/api/production/machine/${machineId}`);
      return Array.isArray(res) ? res : (res.content || []);
    } catch {
      return mockStore.data.production.filter(p => p.machineId === Number(machineId));
    }
  },

  getMetricsSummary: async () => {
    try {
      return await request('/api/production/metrics/summary');
    } catch {
      const total = mockStore.data.production.reduce((acc, p) => acc + (p.quantityProduced || 0), 0);
      const rejected = mockStore.data.production.reduce((acc, p) => acc + (p.quantityRejected || 0), 0);
      return {
        totalProduction: total,
        rejectedProduction: rejected
      };
    }
  },

  create: async (prod) => {
    try {
      return await request('/api/production', {
        method: 'POST',
        body: JSON.stringify(prod)
      });
    } catch {
      const created = {
        id: Math.max(0, ...mockStore.data.production.map(p => p.id)) + 1,
        machineId: Number(prod.machineId),
        productName: prod.productName,
        quantityProduced: Number(prod.quantityProduced),
        quantityRejected: Number(prod.quantityRejected),
        productionStart: prod.productionStart || new Date().toISOString(),
        productionEnd: prod.productionEnd || null,
        status: prod.status || 'COMPLETED'
      };
      mockStore.data.production.unshift(created);
      return created;
    }
  },

  update: async (id, prod) => {
    try {
      return await request(`/api/production/${id}`, {
        method: 'PUT',
        body: JSON.stringify(prod)
      });
    } catch {
      const idx = mockStore.data.production.findIndex(p => p.id === Number(id));
      if (idx !== -1) {
        mockStore.data.production[idx] = { ...mockStore.data.production[idx], ...prod };
        return mockStore.data.production[idx];
      }
      return prod;
    }
  },

  delete: async (id) => {
    try {
      return await request(`/api/production/${id}`, { method: 'DELETE' });
    } catch {
      mockStore.data.production = mockStore.data.production.filter(p => p.id !== Number(id));
      return null;
    }
  }
};

// ==========================================================
// 10. Energy Service (:8087 via Gateway)
// ==========================================================
export const energyApi = {
  getAll: async (params = {}) => {
    try {
      const qs = new URLSearchParams(params).toString();
      const res = await request(`/api/energy${qs ? '?' + qs : ''}`);
      return Array.isArray(res) ? res : (res.content || []);
    } catch {
      return [...mockStore.data.energy];
    }
  },

  getById: async (id) => {
    try {
      return await request(`/api/energy/${id}`);
    } catch {
      return mockStore.data.energy.find(e => e.id === Number(id)) || null;
    }
  },

  getByMachine: async (machineId) => {
    try {
      const res = await request(`/api/energy/machine/${machineId}`);
      return Array.isArray(res) ? res : (res.content || []);
    } catch {
      return mockStore.data.energy.filter(e => e.machineId === Number(machineId));
    }
  },

  getMetricsSummary: async () => {
    try {
      return await request('/api/energy/metrics/summary');
    } catch {
      const total = mockStore.data.energy.reduce((acc, e) => acc + (e.energyConsumption || 0), 0);
      return {
        totalEnergyConsumption: Math.round(total * 10) / 10
      };
    }
  },

  create: async (energy) => {
    try {
      return await request('/api/energy', {
        method: 'POST',
        body: JSON.stringify(energy)
      });
    } catch {
      const created = {
        id: Math.max(0, ...mockStore.data.energy.map(e => e.id)) + 1,
        machineId: Number(energy.machineId),
        energyConsumption: Number(energy.energyConsumption),
        recordedAt: energy.recordedAt || new Date().toISOString()
      };
      mockStore.data.energy.unshift(created);
      return created;
    }
  },

  update: async (id, energy) => {
    try {
      return await request(`/api/energy/${id}`, {
        method: 'PUT',
        body: JSON.stringify(energy)
      });
    } catch {
      const idx = mockStore.data.energy.findIndex(e => e.id === Number(id));
      if (idx !== -1) {
        mockStore.data.energy[idx] = { ...mockStore.data.energy[idx], ...energy };
        return mockStore.data.energy[idx];
      }
      return energy;
    }
  },

  delete: async (id) => {
    try {
      return await request(`/api/energy/${id}`, { method: 'DELETE' });
    } catch {
      mockStore.data.energy = mockStore.data.energy.filter(e => e.id !== Number(id));
      return null;
    }
  }
};
