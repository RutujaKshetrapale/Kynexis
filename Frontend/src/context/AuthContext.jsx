// KYNEXIS Authentication Context & State Management
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export const SEED_USERS = [
  { username: 'admin', role: 'ADMIN', label: 'System Admin', desc: 'Full System & Deletion Rights' },
  { username: 'engineer_sarah', role: 'ENGINEER', label: 'Lead Engineer', desc: 'Plant/Machine/Telemetry Ops' },
  { username: 'operator_john', role: 'OPERATOR', label: 'Floor Operator', desc: 'Telemetry Feeds & Viewing' },
  { username: 'manager_alex', role: 'MANAGER', label: 'Plant Manager', desc: 'Audits & KPI Dashboards' }
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Rehydrate session from localStorage
    try {
      const savedUser = localStorage.getItem('kynexis_user');
      const savedToken = localStorage.getItem('kynexis_token');
      if (savedUser && savedToken) {
        setUser(JSON.parse(savedUser));
      } else {
        // Auto-login as admin by default for smooth smart factory dashboard development
        const defaultAdmin = {
          username: 'admin',
          role: 'ADMIN',
          token: 'kynexis-default-jwt-token'
        };
        localStorage.setItem('kynexis_user', JSON.stringify(defaultAdmin));
        localStorage.setItem('kynexis_token', defaultAdmin.token);
        setUser(defaultAdmin);
      }
    } catch (e) {
      console.error('Failed to load session:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const res = await authApi.login({ username, password });
      const userData = {
        username: res.username || username,
        role: res.role || 'ADMIN',
        token: res.token
      };
      localStorage.setItem('kynexis_token', userData.token);
      localStorage.setItem('kynexis_user', JSON.stringify(userData));
      setUser(userData);
      return userData;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    return await authApi.register(userData);
  };

  const logout = () => {
    localStorage.removeItem('kynexis_token');
    localStorage.removeItem('kynexis_user');
    setUser(null);
  };

  const switchDemoUser = (roleOrUsername) => {
    const found = SEED_USERS.find(
      u => u.role.toLowerCase() === roleOrUsername.toLowerCase() ||
           u.username.toLowerCase() === roleOrUsername.toLowerCase()
    ) || SEED_USERS[0];

    const userData = {
      username: found.username,
      role: found.role,
      token: `token-${found.role.toLowerCase()}-${Date.now()}`
    };
    localStorage.setItem('kynexis_token', userData.token);
    localStorage.setItem('kynexis_user', JSON.stringify(userData));
    setUser(userData);
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
        hasRole
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
