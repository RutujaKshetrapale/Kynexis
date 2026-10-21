// KYNEXIS Authentication Context & State Management
// Integrates with real Backend Authentication Service (:8081 via Gateway :8080)
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export const SEED_USERS = [
  { username: 'admin', password: 'Admin@123', role: 'ADMIN', label: 'System Admin', desc: 'Full System & Deletion Rights' },
  { username: 'engineer', password: 'engineer123', role: 'ENGINEER', label: 'Lead Engineer', desc: 'Plant/Machine/Telemetry Ops' },
  { username: 'operator', password: 'operator123', role: 'OPERATOR', label: 'Floor Operator', desc: 'Telemetry Feeds & Viewing' },
  { username: 'manager', password: 'Manager@123', role: 'MANAGER', label: 'Plant Manager', desc: 'Audits & KPI Dashboards' }
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Rehydrate session from localStorage or perform real initial login
    async function initSession() {
      try {
        const savedUserStr = localStorage.getItem('kynexis_user');
        const savedToken = localStorage.getItem('kynexis_token');

        // Verify token is genuine (valid JWT has 3 base64 parts starting with ey)
        const isGenuineJwt = savedToken && savedToken.startsWith('ey') && savedToken.split('.').length === 3;

        if (savedUserStr && isGenuineJwt) {
          setUser(JSON.parse(savedUserStr));
        } else {
          // Perform real automated login with root admin credentials
          const res = await authApi.login({ username: 'admin', password: 'Admin@123' });
          const adminUser = {
            username: res.username || 'admin',
            role: res.role || 'ADMIN',
            token: res.token
          };
          localStorage.setItem('kynexis_user', JSON.stringify(adminUser));
          localStorage.setItem('kynexis_token', adminUser.token);
          setUser(adminUser);
        }
      } catch (e) {
        console.error('Session initialization error:', e);
      } finally {
        setLoading(false);
      }
    }

    initSession();
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

  const switchDemoUser = async (roleOrUsername) => {
    const found = SEED_USERS.find(
      u => u.role.toLowerCase() === roleOrUsername.toLowerCase() ||
           u.username.toLowerCase() === roleOrUsername.toLowerCase()
    ) || SEED_USERS[0];

    try {
      await login(found.username, found.password);
    } catch (e) {
      console.warn('Switch persona error:', e);
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
