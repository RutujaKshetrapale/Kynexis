// KYNEXIS Authentication Context & State Management
// Integrates with real Backend Authentication Service (:8081 via Gateway :8080)
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export const SEED_USERS = [
  {
    username: 'admin',
    password: 'Admin@123',
    role: 'ADMIN',
    label: 'System Admin',
    title: 'Enterprise Administrator',
    color: '#F2C811',
    bgColor: 'rgba(242, 200, 17, 0.08)',
    borderColor: 'rgba(242, 200, 17, 0.35)',
    glowColor: 'rgba(242, 200, 17, 0.25)',
    desc: 'Full platform governance, node provisioning, microservice configurations & security administration.',
    permissions: [
      'Full Read, Write & Delete Access',
      'Plant & Machine Provisioning',
      'Alert Resolution & Dismissal',
      'System Security & RBAC Policies'
    ]
  },
  {
    username: 'manager',
    password: 'Admin@123',
    role: 'MANAGER',
    label: 'Plant Manager',
    title: 'Operations & Production Manager',
    color: '#A855F7',
    bgColor: 'rgba(168, 85, 247, 0.08)',
    borderColor: 'rgba(168, 85, 247, 0.35)',
    glowColor: 'rgba(168, 85, 247, 0.25)',
    desc: 'Executive analytics, overall OEE targets, shift productivity summaries & plant scheduling.',
    permissions: [
      'Executive KPI & BI Dashboards',
      'Production Targets & Batch Schedules',
      'Energy Audits & Demand Curves',
      'Cross-Plant Performance Reviews'
    ]
  },
  {
    username: 'engineer',
    password: 'Admin@123',
    role: 'ENGINEER',
    label: 'Lead Engineer',
    title: 'Process & Reliability Engineer',
    color: '#00BCF2',
    bgColor: 'rgba(0, 188, 242, 0.08)',
    borderColor: 'rgba(0, 188, 242, 0.35)',
    glowColor: 'rgba(0, 188, 242, 0.25)',
    desc: 'High-frequency telemetry analysis, sensor calibration thresholds & predictive maintenance.',
    permissions: [
      'Real-time Telemetry & Anomaly Diagnostics',
      'Sensor Calibration & Alert Thresholds',
      'Machine Health Degradation Scoring',
      'Preventive Maintenance Work Orders'
    ]
  },
  {
    username: 'operator',
    password: 'Admin@123',
    role: 'OPERATOR',
    label: 'Floor Operator',
    title: 'Workstation Floor Operator',
    color: '#10B981',
    bgColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
    glowColor: 'rgba(16, 185, 129, 0.25)',
    desc: 'Machine workstation execution, active batch progress logging & shift incident reporting.',
    permissions: [
      'Active Workstation Telemetry View',
      'Shift Batch Execution & Scrap Logging',
      'Real-time Machine Status Verification',
      'Maintenance Incident Flagging'
    ]
  }
];

const isTokenValid = (token) => {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp && payload.exp * 1000 < Date.now() + 30000) {
      return false; // Expired
    }
    return true;
  } catch {
    return false;
  }
};

const getInitialUser = () => {
  try {
    const savedUserStr = localStorage.getItem('kynexis_user');
    const savedToken = localStorage.getItem('kynexis_token');
    if (savedUserStr && isTokenValid(savedToken)) {
      return JSON.parse(savedUserStr);
    }
  } catch { }
  return null;
};

const OPERATOR_PLANTS_STORAGE_KEY = 'kynexis_operator_plants';

function readOperatorPlantsMap() {
  try {
    return JSON.parse(localStorage.getItem(OPERATOR_PLANTS_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeOperatorPlantsMap(map) {
  try {
    localStorage.setItem(OPERATOR_PLANTS_STORAGE_KEY, JSON.stringify(map));
  } catch { }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getInitialUser);
  const [loading, setLoading] = useState(false);
  const [operatorPlants, setOperatorPlants] = useState(readOperatorPlantsMap);

  const getOperatorPlantId = (username) => {
    const key = (username || 'operator').toLowerCase();
    const val = operatorPlants[key];
    return val ? Number(val) : 1;
  };

  const setOperatorPlantAssignment = (username, plantId) => {
    const key = (username || 'operator').toLowerCase();
    const numericId = Number(plantId) || 1;
    setOperatorPlants(prev => {
      const next = { ...prev, [key]: numericId };
      writeOperatorPlantsMap(next);
      return next;
    });
  };

  const assignedPlantId = user ? getOperatorPlantId(user.username) : 1;

  useEffect(() => {
    // Check if stored token is still valid on startup
    const savedUserStr = localStorage.getItem('kynexis_user');
    const savedToken = localStorage.getItem('kynexis_token');
    if (savedUserStr && isTokenValid(savedToken)) {
      try {
        setUser(JSON.parse(savedUserStr));
      } catch {
        setUser(null);
      }
    } else {
      // Clear any invalid session
      localStorage.removeItem('kynexis_token');
      localStorage.removeItem('kynexis_user');
      setUser(null);
    }
  }, []);

  const login = async (username, password, assignedPlantOverride = null) => {
    setLoading(true);
    try {
      const res = await authApi.login({ username, password });
      const userData = {
        username: res.username || username,
        role: (res.role || 'OPERATOR').toUpperCase(),
        token: res.token
      };
      if (assignedPlantOverride != null) {
        setOperatorPlantAssignment(userData.username, assignedPlantOverride);
      }
      localStorage.setItem('kynexis_token', userData.token);
      localStorage.setItem('kynexis_user', JSON.stringify(userData));
      setUser(userData);
      return userData;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    const res = await authApi.register(userData);
    if ((userData.role || '').toUpperCase() === 'OPERATOR' && userData.assignedPlantId) {
      setOperatorPlantAssignment(userData.username, userData.assignedPlantId);
    }
    return res;
  };

  const logout = () => {
    localStorage.removeItem('kynexis_token');
    localStorage.removeItem('kynexis_user');
    setUser(null);
  };

  const switchDemoUser = async (roleOrUsername, assignedPlantOverride = null) => {
    const found = SEED_USERS.find(
      u => u.role.toLowerCase() === roleOrUsername.toLowerCase() ||
        u.username.toLowerCase() === roleOrUsername.toLowerCase()
    ) || SEED_USERS[0];

    try {
      return await login(found.username, found.password, assignedPlantOverride);
    } catch (e) {
      console.warn('Switch persona error:', e);
      throw e;
    }
  };

  const hasRole = (allowedRoles) => {
    if (!user) return false;
    if (typeof allowedRoles === 'string') {
      return user.role.toUpperCase() === allowedRoles.toUpperCase();
    }
    if (Array.isArray(allowedRoles)) {
      return allowedRoles.map(r => r.toUpperCase()).includes(user.role.toUpperCase());
    }
    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        register,
        logout,
        switchDemoUser,
        hasRole,
        assignedPlantId,
        getOperatorPlantId,
        setOperatorPlantAssignment,
        seedUsers: SEED_USERS
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
