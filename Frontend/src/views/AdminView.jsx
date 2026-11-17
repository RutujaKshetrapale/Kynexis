import React, { useState, useEffect } from 'react';
import {
  Shield,
  Building2,
  Cpu,
  Users,
  Network,
  AlertTriangle,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Lock,
  Unlock,
  ExternalLink,
  ChevronRight,
  Server,
  Zap,
  Activity,
  Layers,
  Sparkles,
  UserCheck,
  AlertOctagon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  plantsApi,
  machinesApi,
  authApi,
  alertsApi,
  useBackendStatus
} from '../services/api';

const MICROSERVICES_CONFIG = [
  { name: 'API Gateway', port: 8080, route: '/api/*', protocol: 'HTTP/REST', desc: 'Central routing & JWT filter gateway' },
  { name: 'Auth Service', port: 8081, route: '/api/auth/*', protocol: 'Spring Security + JWT', desc: 'Authentication & RBAC governance' },
  { name: 'Plant Service', port: 8082, route: '/api/plants/*', protocol: 'Spring Data JPA / MySQL', desc: 'Facility topology & metadata' },
  { name: 'Telemetry Service', port: 8083, route: '/api/telemetry/*', protocol: 'High-Frequency Stream', desc: 'Machine telemetry time-series' },
  { name: 'Alert Service', port: 8084, route: '/api/alerts/*', protocol: 'Event Evaluation', desc: 'Anomaly detection & escalation' },
  { name: 'Maintenance Service', port: 8085, route: '/api/maintenance/*', protocol: 'Work Order Flow', desc: 'Predictive health & work orders' },
  { name: 'Production Service', port: 8086, route: '/api/production/*', protocol: 'Batch Processing', desc: 'Work order batches & scrap rate' },
  { name: 'Energy Service', port: 8087, route: '/api/energy/*', protocol: 'Continuous Metering', desc: 'Power demand & tariff curve' },
  { name: 'Machine Service', port: 8088, route: '/api/machines/*', protocol: 'Asset Lifecycle', desc: 'Fleet assets & status tracking' },
  { name: 'Sensor Service', port: 8089, route: '/api/sensors/*', protocol: 'Calibration Matrix', desc: 'Sensor threshold calibration' }
];

export default function AdminView() {
  const { user, hasRole, switchDemoUser } = useAuth();
  const { isLive } = useBackendStatus();

  const isAdmin = hasRole('ADMIN') || user?.role === 'ADMIN';

  // Navigation Subtabs
  const [activeTab, setActiveTab] = useState('facilities');

  // Live Data States
  const [plants, setPlants] = useState([]);
  const [machines, setMachines] = useState([]);
  const [users, setUsers] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Modals state
  const [showPlantModal, setShowPlantModal] = useState(false);
  const [newPlant, setNewPlant] = useState({ name: '', location: '', active: true });

  const [showMachineModal, setShowMachineModal] = useState(false);
  const [newMachine, setNewMachine] = useState({ name: '', type: 'CNC', plantId: '1', status: 'RUNNING' });

  const [showUserModal, setShowUserModal] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', email: '', password: 'User@123', role: 'OPERATOR' });

  const [actionLoading, setActionLoading] = useState(false);

  // Helper for toast notifications
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch all domain data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [plantsData, machinesData, usersData, alertsData] = await Promise.all([
        plantsApi.getAll().catch(() => []),
        machinesApi.getAll().catch(() => []),
        authApi.getUsers().catch(() => []),
        alertsApi.getAll().catch(() => [])
      ]);

      setPlants(Array.isArray(plantsData) ? plantsData : (plantsData?.content || []));
      setMachines(Array.isArray(machinesData) ? machinesData : (machinesData?.content || []));
      setUsers(Array.isArray(usersData) ? usersData : (usersData?.content || []));
      setAlerts(Array.isArray(alertsData) ? alertsData : (alertsData?.content || []));
    } catch (err) {
      console.error('Failed to load admin data:', err);
      showToast('Error syncing with backend gateway (:8080)', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 1. Plant Actions
  const handleCreatePlant = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast('Access Denied: Only ROLE_ADMIN can create facilities', 'error');
      return;
    }
    if (!newPlant.name.trim() || !newPlant.location.trim()) {
      showToast('Facility Name and Location are required', 'error');
      return;
    }

    setActionLoading(true);
    try {
      await plantsApi.create({
        name: newPlant.name.trim(),
        location: newPlant.location.trim(),
        active: newPlant.active
      });
      showToast(`Facility '${newPlant.name}' provisioned successfully`);
      setShowPlantModal(false);
      setNewPlant({ name: '', location: '', active: true });
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to create plant', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTogglePlantStatus = async (plant) => {
    if (!isAdmin) {
      showToast('Access Denied: Only ROLE_ADMIN can modify plant status', 'error');
      return;
    }

    try {
      await plantsApi.update(plant.id, {
        name: plant.name,
        location: plant.location,
        active: !plant.active
      });
      showToast(`Facility '${plant.name}' marked ${!plant.active ? 'ONLINE' : 'OFFLINE'}`);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to toggle plant status', 'error');
    }
  };

  const handleDeletePlant = async (plantId, plantName) => {
    if (!isAdmin) {
      showToast('Access Denied: Only ROLE_ADMIN can delete facilities', 'error');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete facility '${plantName}'?`)) {
      return;
    }

    try {
      await plantsApi.delete(plantId);
      showToast(`Facility '${plantName}' deleted`);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to delete plant', 'error');
    }
  };

  // 2. Machine Actions
  const handleCreateMachine = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast('Access Denied: Only ROLE_ADMIN can provision machines', 'error');
      return;
    }
    if (!newMachine.name.trim()) {
      showToast('Machine Name is required', 'error');
      return;
    }

    setActionLoading(true);
    try {
      await machinesApi.create({
        name: newMachine.name.trim(),
        type: newMachine.type,
        plantId: Number(newMachine.plantId) || 1,
        status: newMachine.status
      });
      showToast(`Machine '${newMachine.name}' provisioned`);
      setShowMachineModal(false);
      setNewMachine({ name: '', type: 'CNC', plantId: '1', status: 'RUNNING' });
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to provision machine', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteMachine = async (machineId, machineName) => {
    if (!isAdmin) {
      showToast('Access Denied: Only ROLE_ADMIN can decommission machines', 'error');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete machine '${machineName}'?`)) {
      return;
    }

    try {
      await machinesApi.delete(machineId);
      showToast(`Machine '${machineName}' removed from fleet`);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to delete machine', 'error');
    }
  };

  // 3. User Actions
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast('Access Denied: Only ROLE_ADMIN can create enterprise accounts', 'error');
      return;
    }
    if (!newUser.username.trim() || !newUser.email.trim()) {
      showToast('Username and Email are required', 'error');
      return;
    }

    setActionLoading(true);
    try {
      await authApi.register({
        username: newUser.username.trim(),
        email: newUser.email.trim(),
        password: newUser.password,
        role: newUser.role
      });
      showToast(`User '${newUser.username}' registered with role ${newUser.role}`);
      setShowUserModal(false);
      setNewUser({ username: '', email: '', password: 'User@123', role: 'OPERATOR' });
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to register user', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    if (!isAdmin) {
      showToast('Access Denied: Only ROLE_ADMIN can modify user roles', 'error');
      return;
    }

    try {
      await authApi.updateUserRole(userId, newRole);
      showToast(`User role updated to ${newRole}`);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to update user role', 'error');
    }
  };

  // 4. Alert Actions
  const handleResolveAlert = async (alertId) => {
    if (!isAdmin) {
      showToast('Access Denied: Only ROLE_ADMIN can resolve system alerts', 'error');
      return;
    }

    try {
      await alertsApi.resolve(alertId);
      showToast(`Alert #${alertId} resolved`);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to resolve alert', 'error');
    }
  };

  return (
    <div className="pbi-admin-container">
      {/* Toast Notification */}
      {toast && (
        <div className={`pbi-toast-notification ${toast.type === 'error' ? 'pbi-toast-error' : 'pbi-toast-success'}`}>
          {toast.type === 'error' ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Identity Banner */}
      <div className="pbi-admin-top-banner">
        <div className="pbi-admin-top-left">
          <div className="pbi-admin-top-icon">
            <Shield size={24} />
          </div>
          <div>
            <div className="pbi-admin-top-title">
              Administration Console
            </div>
            <div className="pbi-admin-top-desc">
              Central topology management, role-based authorization, node provisioning &amp; mesh health
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isAdmin ? (
            <div className="pbi-admin-auth-tag pbi-admin-auth-granted">
              <Unlock size={14} />
              <span>Full Authority: ROLE_ADMIN</span>
            </div>
          ) : (
            <div className="pbi-admin-auth-tag pbi-admin-auth-denied">
              <Lock size={14} />
              <span>Restricted: ROLE_{user?.role || 'OPERATOR'}</span>
            </div>
          )}
        </div>
      </div>

      {/* RBAC Authorization Guard Notice when not Admin */}
      {!isAdmin && (
        <div className="pbi-guard-banner">
          <div className="pbi-guard-banner-icon">
            <AlertOctagon size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF', marginBottom: '4px' }}>
              Access Restricted — Administrative Authorization Required
            </div>
            <div style={{ fontSize: '12.5px', color: '#FFB3A1', lineHeight: 1.5, marginBottom: '12px' }}>
              You are currently authenticated as <strong>{user?.username}</strong> with role <strong>ROLE_{user?.role || 'OPERATOR'}</strong>.
              Administrative provisioning (creating facilities, adding machines, delegating user roles, or deleting records) requires <strong>ROLE_ADMIN</strong>.
            </div>
            <button
              type="button"
              className="pbi-btn-action-sm pbi-btn-action-gold"
              onClick={() => switchDemoUser('ADMIN')}
              style={{ height: '32px', padding: '0 14px' }}
            >
              <Zap size={14} />
              <span>Switch to System Admin (ROLE_ADMIN) to Unlock</span>
            </button>
          </div>
        </div>
      )}

      {/* Subtab Navigation (Chiclet Slicers) */}
      <div className="pbi-admin-tabs">
        <button
          type="button"
          className={`pbi-admin-tab-btn ${activeTab === 'facilities' ? 'active' : ''}`}
          onClick={() => setActiveTab('facilities')}
        >
          <Building2 size={15} />
          <span>Facilities ({plants.length})</span>
        </button>

        <button
          type="button"
          className={`pbi-admin-tab-btn ${activeTab === 'machines' ? 'active' : ''}`}
          onClick={() => setActiveTab('machines')}
        >
          <Cpu size={15} />
          <span>Machines ({machines.length})</span>
        </button>

        <button
          type="button"
          className={`pbi-admin-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={15} />
          <span>Users &amp; RBAC ({users.length})</span>
        </button>

        <button
          type="button"
          className={`pbi-admin-tab-btn ${activeTab === 'mesh' ? 'active' : ''}`}
          onClick={() => setActiveTab('mesh')}
        >
          <Server size={15} />
          <span>Mesh Nodes (10)</span>
        </button>

        <button
          type="button"
          className={`pbi-admin-tab-btn ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          <AlertTriangle size={15} />
          <span>System Alerts ({alerts.filter(a => !a.resolved).length})</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* DOMAIN 1: FACILITIES & PLANTS */}
      {/* ============================================================== */}
      {activeTab === 'facilities' && (
        <div className="pbi-visual-card">
          <div className="pbi-visual-header">
            <div>
              <div className="pbi-visual-title">Manufacturing Plant Topology &amp; Status</div>
              <div className="pbi-visual-subtitle">
                Authorized CRUD operations for plant locations and cascading operational states
              </div>
            </div>

            <div className="pbi-visual-actions">
              <button
                type="button"
                className="pbi-btn-action-sm pbi-btn-action-gold"
                disabled={!isAdmin}
                onClick={() => setShowPlantModal(true)}
                title={isAdmin ? 'Provision new manufacturing facility' : 'Admin authorization required'}
              >
                <Plus size={14} />
                <span>Provision Facility</span>
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="pbi-matrix-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Facility ID</th>
                  <th>Facility Name</th>
                  <th>Location</th>
                  <th>Assigned Machines</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right', width: '220px' }}>Authorizations &amp; Actions</th>
                </tr>
              </thead>
              <tbody>
                {plants.map((plant) => {
                  const plantMachines = machines.filter(m => Number(m.plantId) === plant.id || Number(m.plant?.id) === plant.id);
                  const isPlantActive = plant.active !== false;

                  return (
                    <tr key={plant.id}>
                      <td style={{ fontFamily: 'var(--pbi-font-mono)', color: '#94A3B8' }}>
                        FAC-{String(plant.id).padStart(3, '0')}
                      </td>
                      <td style={{ fontWeight: 700, color: '#FFFFFF' }}>
                        {plant.name}
                      </td>
                      <td style={{ color: '#CBD5E1' }}>
                        {plant.location}
                      </td>
                      <td>
                        <span style={{
                          background: 'rgba(255,255,255,0.06)',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          color: '#FFFFFF'
                        }}>
                          {plantMachines.length} units
                        </span>
                      </td>
                      <td>
                        <span className={`pbi-status-pill ${isPlantActive ? 'pbi-status-online' : 'pbi-status-offline'}`}>
                          <span className="pbi-status-dot" />
                          <span>{isPlantActive ? 'ONLINE' : 'OFFLINE'}</span>
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            className={`pbi-btn-action-sm ${isPlantActive ? 'pbi-btn-toggle-offline' : 'pbi-btn-toggle-online'}`}
                            disabled={!isAdmin}
                            onClick={() => handleTogglePlantStatus(plant)}
                            title={isPlantActive ? 'Take plant offline' : 'Bring plant online'}
                          >
                            <span>{isPlantActive ? 'Mark Offline' : 'Mark Online'}</span>
                          </button>

                          <button
                            type="button"
                            className="pbi-btn-action-sm pbi-btn-action-danger"
                            disabled={!isAdmin}
                            onClick={() => handleDeletePlant(plant.id, plant.name)}
                            title="Delete facility (Admin only)"
                          >
                            <Trash2 size={13} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* DOMAIN 2: MACHINE FLEET */}
      {/* ============================================================== */}
      {activeTab === 'machines' && (
        <div className="pbi-visual-card">
          <div className="pbi-visual-header">
            <div>
              <div className="pbi-visual-title">Machine Fleet Provisioning Matrix</div>
              <div className="pbi-visual-subtitle">
                Configure production assets, assign to facilities, and set target operational status
              </div>
            </div>

            <div className="pbi-visual-actions">
              <button
                type="button"
                className="pbi-btn-action-sm pbi-btn-action-gold"
                disabled={!isAdmin}
                onClick={() => setShowMachineModal(true)}
                title={isAdmin ? 'Provision new machine' : 'Admin authorization required'}
              >
                <Plus size={14} />
                <span>Provision Machine</span>
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="pbi-matrix-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>ID</th>
                  <th>Asset Name</th>
                  <th>Machine Type</th>
                  <th>Assigned Facility</th>
                  <th>Operational Status</th>
                  <th style={{ textAlign: 'right', width: '160px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {machines.map((m) => {
                  const assignedPlant = plants.find(p => p.id === (Number(m.plantId) || Number(m.plant?.id)));
                  const statusClass = m.status === 'RUNNING' ? 'pbi-status-running' : (m.status === 'IDLE' ? 'pbi-status-idle' : 'pbi-status-maintenance');

                  return (
                    <tr key={m.id}>
                      <td style={{ fontFamily: 'var(--pbi-font-mono)', color: '#94A3B8' }}>
                        #{m.id}
                      </td>
                      <td style={{ fontWeight: 700, color: '#FFFFFF' }}>
                        {m.name}
                      </td>
                      <td>
                        <span style={{
                          fontFamily: 'var(--pbi-font-mono)',
                          fontSize: '11px',
                          color: '#00BCF2',
                          background: 'rgba(0,188,242,0.1)',
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}>
                          {m.type || 'CNC'}
                        </span>
                      </td>
                      <td style={{ color: '#CBD5E1' }}>
                        {assignedPlant ? assignedPlant.name : `Plant #${m.plantId || 1}`}
                      </td>
                      <td>
                        <span className={`pbi-status-pill ${statusClass}`}>
                          <span className="pbi-status-dot" />
                          <span>{m.status}</span>
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="pbi-btn-action-sm pbi-btn-action-danger"
                          disabled={!isAdmin}
                          onClick={() => handleDeleteMachine(m.id, m.name)}
                          title="Decommission machine (Admin only)"
                        >
                          <Trash2 size={13} />
                          <span>Delete</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* DOMAIN 3: USERS & RBAC */}
      {/* ============================================================== */}
      {activeTab === 'users' && (
        <div className="pbi-visual-card">
          <div className="pbi-visual-header">
            <div>
              <div className="pbi-visual-title">Enterprise Accounts &amp; RBAC Governance</div>
              <div className="pbi-visual-subtitle">
                Manage registered user accounts, assign roles, and delegate security permissions
              </div>
            </div>

            <div className="pbi-visual-actions">
              <button
                type="button"
                className="pbi-btn-action-sm pbi-btn-action-gold"
                disabled={!isAdmin}
                onClick={() => setShowUserModal(true)}
                title={isAdmin ? 'Register new user account' : 'Admin authorization required'}
              >
                <Plus size={14} />
                <span>Register User</span>
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="pbi-matrix-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>User ID</th>
                  <th>Username</th>
                  <th>Enterprise Email</th>
                  <th>Current Role</th>
                  <th>Change Role (RBAC)</th>
                  <th style={{ textAlign: 'right' }}>Account Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const roleUpper = (u.role || 'OPERATOR').toUpperCase();
                  const roleColor = roleUpper === 'ADMIN' ? '#F2C811' : (roleUpper === 'MANAGER' ? '#A855F7' : (roleUpper === 'ENGINEER' ? '#00BCF2' : '#10B981'));

                  return (
                    <tr key={u.id}>
                      <td style={{ fontFamily: 'var(--pbi-font-mono)', color: '#94A3B8' }}>
                        USR-{String(u.id).padStart(3, '0')}
                      </td>
                      <td style={{ fontWeight: 700, color: '#FFFFFF' }}>
                        @{u.username}
                      </td>
                      <td style={{ color: '#CBD5E1', fontFamily: 'var(--pbi-font-mono)', fontSize: '12px' }}>
                        {u.email || `${u.username}@kynexis-plant.com`}
                      </td>
                      <td>
                        <span style={{
                          color: roleColor,
                          background: `${roleColor}18`,
                          border: `1px solid ${roleColor}44`,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 700
                        }}>
                          ROLE_{roleUpper}
                        </span>
                      </td>
                      <td>
                        <select
                          aria-label={`Change role for user ${u.username}`}
                          value={roleUpper}
                          disabled={!isAdmin || u.username === 'admin'}
                          onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                          style={{
                            background: '#111724',
                            border: '1px solid var(--pbi-border)',
                            color: '#FFFFFF',
                            borderRadius: '4px',
                            padding: '3px 8px',
                            fontSize: '11.5px',
                            cursor: isAdmin ? 'pointer' : 'not-allowed',
                            fontFamily: 'inherit'
                          }}
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="MANAGER">MANAGER</option>
                          <option value="ENGINEER">ENGINEER</option>
                          <option value="OPERATOR">OPERATOR</option>
                        </select>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="pbi-status-pill pbi-status-running">
                          <span className="pbi-status-dot" />
                          <span>Active Session</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* DOMAIN 4: MICROSERVICES MESH */}
      {/* ============================================================== */}
      {activeTab === 'mesh' && (
        <div>
          <div style={{
            background: 'var(--pbi-visual-bg)',
            border: '1px solid var(--pbi-border)',
            borderRadius: '8px',
            padding: '16px 20px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF' }}>
                Spring Cloud &amp; Microservices Architecture (10 Nodes)
              </div>
              <div style={{ fontSize: '11.5px', color: '#94A3B8' }}>
                Every domain operates as an autonomous Spring Boot service wired via API Gateway (:8080)
              </div>
            </div>

            <div className="pbi-admin-auth-tag pbi-admin-auth-granted">
              <span>All 10 Microservices Online</span>
            </div>
          </div>

          <div className="pbi-mesh-grid">
            {MICROSERVICES_CONFIG.map((srv, idx) => (
              <div key={idx} className="pbi-mesh-card">
                <div className="pbi-mesh-card-header">
                  <span className="pbi-mesh-card-name">{srv.name}</span>
                  <span className="pbi-mesh-card-port">:{srv.port}</span>
                </div>
                <div className="pbi-mesh-card-route">{srv.route}</div>
                <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '10px', flex: 1 }}>
                  {srv.desc}
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '8px',
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  fontSize: '10.5px'
                }}>
                  <span style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} />
                    Healthy
                  </span>
                  <span style={{ color: '#64748B', fontFamily: 'var(--pbi-font-mono)' }}>HTTP 200</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* DOMAIN 5: SYSTEM ALERTS */}
      {/* ============================================================== */}
      {activeTab === 'alerts' && (
        <div className="pbi-visual-card">
          <div className="pbi-visual-header">
            <div>
              <div className="pbi-visual-title">System Alerts Log</div>
              <div className="pbi-visual-subtitle">
                System-level alerts generated across plants, telemetry feeds, and threshold breaches
              </div>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="pbi-matrix-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Alert ID</th>
                  <th>Severity</th>
                  <th>Incident Type</th>
                  <th>Message</th>
                  <th>Machine Asset</th>
                  <th>Timestamp</th>
                  <th style={{ textAlign: 'right', width: '140px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((a) => {
                  const isHigh = a.severity === 'HIGH' || a.severity === 'CRITICAL';
                  const sevColor = isHigh ? '#D83B01' : (a.severity === 'WARNING' ? '#F59E0B' : '#00BCF2');

                  return (
                    <tr key={a.id}>
                      <td style={{ fontFamily: 'var(--pbi-font-mono)', color: '#94A3B8' }}>
                        ALT-{String(a.id).padStart(3, '0')}
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
                        Machine #{a.machineId || a.machine?.id || '—'}
                      </td>
                      <td style={{ color: '#64748B', fontSize: '11px' }}>
                        {a.createdAt ? new Date(a.createdAt).toLocaleString() : 'Just now'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {a.resolved ? (
                          <span style={{ color: '#10B981', fontSize: '11px', fontWeight: 600 }}>
                            ✓ Resolved
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="pbi-btn-action-sm pbi-btn-action-primary"
                            disabled={!isAdmin}
                            onClick={() => handleResolveAlert(a.id)}
                            title="Resolve incident (Admin only)"
                          >
                            <span>Resolve</span>
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
      )}

      {/* ============================================================== */}
      {/* MODAL 1: PROVISION NEW FACILITY */}
      {/* ============================================================== */}
      {showPlantModal && (
        <div className="pbi-modal-backdrop" onClick={() => setShowPlantModal(false)}>
          <div className="pbi-modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="pbi-modal-header">
              <div className="pbi-modal-title">
                <Building2 size={16} color="#F2C811" />
                <span>Provision New Manufacturing Facility</span>
              </div>
              <button
                type="button"
                className="pbi-modal-close"
                onClick={() => setShowPlantModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePlant}>
              <div className="pbi-modal-body">
                <div className="pbi-form-group">
                  <label className="pbi-form-label" htmlFor="facility-name-input">Facility Name</label>
                  <input
                    id="facility-name-input"
                    type="text"
                    className="pbi-form-input"
                    placeholder="e.g. Hyderabad Advanced Plant 04"
                    value={newPlant.name}
                    onChange={(e) => setNewPlant({ ...newPlant, name: e.target.value })}
                    required
                  />
                </div>

                <div className="pbi-form-group">
                  <label className="pbi-form-label" htmlFor="facility-location-input">Location / Regional Zone</label>
                  <input
                    id="facility-location-input"
                    type="text"
                    className="pbi-form-input"
                    placeholder="e.g. HITEC City, Telangana, IN"
                    value={newPlant.location}
                    onChange={(e) => setNewPlant({ ...newPlant, location: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                  <input
                    type="checkbox"
                    id="plant-active-chk"
                    checked={newPlant.active}
                    onChange={(e) => setNewPlant({ ...newPlant, active: e.target.checked })}
                  />
                  <label htmlFor="plant-active-chk" style={{ fontSize: '12px', color: '#CBD5E1', cursor: 'pointer' }}>
                    Activate immediately upon provisioning
                  </label>
                </div>
              </div>

              <div className="pbi-modal-footer">
                <button
                  type="button"
                  className="pbi-ribbon-btn"
                  onClick={() => setShowPlantModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="pbi-btn-action-sm pbi-btn-action-gold"
                  style={{ height: '32px', padding: '0 16px' }}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Provisioning...' : 'Provision Facility'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: PROVISION NEW MACHINE */}
      {/* ============================================================== */}
      {showMachineModal && (
        <div className="pbi-modal-backdrop" onClick={() => setShowMachineModal(false)}>
          <div className="pbi-modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="pbi-modal-header">
              <div className="pbi-modal-title">
                <Cpu size={16} color="#00BCF2" />
                <span>Provision Fleet Machine Asset</span>
              </div>
              <button
                type="button"
                className="pbi-modal-close"
                onClick={() => setShowMachineModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMachine}>
              <div className="pbi-modal-body">
                <div className="pbi-form-group">
                  <label className="pbi-form-label" htmlFor="machine-asset-name">Machine Asset Name</label>
                  <input
                    id="machine-asset-name"
                    type="text"
                    className="pbi-form-input"
                    placeholder="e.g. 5-Axis CNC Milling Center 04"
                    value={newMachine.name}
                    onChange={(e) => setNewMachine({ ...newMachine, name: e.target.value })}
                    required
                  />
                </div>

                <div className="pbi-form-group">
                  <label className="pbi-form-label" htmlFor="machine-type-select">Machine Type</label>
                  <select
                    id="machine-type-select"
                    className="pbi-form-input"
                    value={newMachine.type}
                    onChange={(e) => setNewMachine({ ...newMachine, type: e.target.value })}
                    style={{ paddingRight: '12px' }}
                  >
                    <option value="CNC">CNC Milling / Lathe</option>
                    <option value="ROBOTIC_ARM">Robotic Articulated Arm</option>
                    <option value="INJECTION_MOLD">High-Pressure Injection Mold</option>
                    <option value="PACKAGING">Automated Packaging Sorter</option>
                    <option value="WELDING">Laser Welding Cell</option>
                  </select>
                </div>

                <div className="pbi-form-group">
                  <label className="pbi-form-label" htmlFor="machine-plant-select">Assign to Facility</label>
                  <select
                    id="machine-plant-select"
                    className="pbi-form-input"
                    value={newMachine.plantId}
                    onChange={(e) => setNewMachine({ ...newMachine, plantId: e.target.value })}
                    style={{ paddingRight: '12px' }}
                  >
                    {plants.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.location})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pbi-form-group">
                  <label className="pbi-form-label" htmlFor="machine-initial-status">Initial Status</label>
                  <select
                    id="machine-initial-status"
                    className="pbi-form-input"
                    value={newMachine.status}
                    onChange={(e) => setNewMachine({ ...newMachine, status: e.target.value })}
                    style={{ paddingRight: '12px' }}
                  >
                    <option value="RUNNING">RUNNING (Production)</option>
                    <option value="IDLE">IDLE (Standby)</option>
                    <option value="MAINTENANCE">MAINTENANCE (Calibration)</option>
                  </select>
                </div>
              </div>

              <div className="pbi-modal-footer">
                <button
                  type="button"
                  className="pbi-ribbon-btn"
                  onClick={() => setShowMachineModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="pbi-btn-action-sm pbi-btn-action-gold"
                  style={{ height: '32px', padding: '0 16px' }}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Provisioning...' : 'Provision Machine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: REGISTER NEW ENTERPRISE USER */}
      {/* ============================================================== */}
      {showUserModal && (
        <div className="pbi-modal-backdrop" onClick={() => setShowUserModal(false)}>
          <div className="pbi-modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="pbi-modal-header">
              <div className="pbi-modal-title">
                <Users size={16} color="#A855F7" />
                <span>Register Enterprise User Account</span>
              </div>
              <button
                type="button"
                className="pbi-modal-close"
                onClick={() => setShowUserModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser}>
              <div className="pbi-modal-body">
                <div className="pbi-form-group">
                  <label className="pbi-form-label" htmlFor="reg-username">Username</label>
                  <input
                    id="reg-username"
                    type="text"
                    className="pbi-form-input"
                    placeholder="e.g. rahul_sharma"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    required
                  />
                </div>

                <div className="pbi-form-group">
                  <label className="pbi-form-label" htmlFor="reg-email">Enterprise Email</label>
                  <input
                    id="reg-email"
                    type="email"
                    className="pbi-form-input"
                    placeholder="e.g. rahul@smartfactory.com"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    required
                  />
                </div>

                <div className="pbi-form-group">
                  <label className="pbi-form-label" htmlFor="reg-password">Temporary Password</label>
                  <input
                    id="reg-password"
                    type="text"
                    className="pbi-form-input"
                    placeholder="Default: User@123"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    required
                  />
                </div>

                <div className="pbi-form-group">
                  <label className="pbi-form-label" htmlFor="reg-role">Initial Operational Role</label>
                  <select
                    id="reg-role"
                    className="pbi-form-input"
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    style={{ paddingRight: '12px' }}
                  >
                    <option value="OPERATOR">OPERATOR (Floor Technician)</option>
                    <option value="ENGINEER">ENGINEER (Process &amp; Reliability)</option>
                    <option value="MANAGER">MANAGER (Plant &amp; Production)</option>
                    <option value="ADMIN">ADMIN (System Administrator)</option>
                  </select>
                </div>
              </div>

              <div className="pbi-modal-footer">
                <button
                  type="button"
                  className="pbi-ribbon-btn"
                  onClick={() => setShowUserModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="pbi-btn-action-sm pbi-btn-action-gold"
                  style={{ height: '32px', padding: '0 16px' }}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Registering...' : 'Register User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

