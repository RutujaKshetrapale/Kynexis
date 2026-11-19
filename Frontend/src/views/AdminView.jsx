import React, { useState, useEffect } from 'react';
import {
  Shield,
  Building2,
  Cpu,
  Users,
  AlertTriangle,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Lock,
  Unlock,
  Zap,
  AlertOctagon,
  Gauge,
  Wrench,
  Power,
  Calendar,
  User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  plantsApi,
  machinesApi,
  authApi,
  alertsApi,
  sensorsApi,
  maintenanceApi
} from '../services/api';

const SENSOR_TYPES = [
  { type: 'TEMPERATURE', unit: '°C' },
  { type: 'VIBRATION', unit: 'mm/s' },
  { type: 'PRESSURE', unit: 'bar' },
  { type: 'RPM', unit: 'RPM' },
  { type: 'POWER', unit: 'kW' }
];

const MAINT_TYPES = ['PREVENTIVE', 'CORRECTIVE', 'PREDICTIVE', 'CALIBRATION', 'INSPECTION'];
const MAINT_STATUSES = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

function getTodayDateString() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toDateString(val) {
  if (!val) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(val)) return val.slice(0, 10);
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return getTodayDateString();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function ensureFutureOrPresentDate(dateStr) {
  const today = getTodayDateString();
  const normalized = toDateString(dateStr);
  if (!normalized || normalized < today) return today;
  return normalized;
}

export default function AdminView() {
  const { user, hasRole, switchDemoUser, getOperatorPlantId, setOperatorPlantAssignment } = useAuth();

  const isAdmin = hasRole('ADMIN') || user?.role === 'ADMIN';

  // Navigation Subtabs
  const [activeTab, setActiveTab] = useState('facilities');

  // Live Data States
  const [plants, setPlants] = useState([]);
  const [machines, setMachines] = useState([]);
  const [users, setUsers] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [maintenanceOrders, setMaintenanceOrders] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Modals state
  const [showPlantModal, setShowPlantModal] = useState(false);
  const [newPlant, setNewPlant] = useState({ name: '', location: '', active: true });

  const [showMachineModal, setShowMachineModal] = useState(false);
  const [newMachine, setNewMachine] = useState({ name: '', type: 'CNC', plantId: '1', status: 'RUNNING' });

  const [showUserModal, setShowUserModal] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', email: '', password: 'User@123', role: 'OPERATOR', assignedPlantId: '1' });

  const [showSensorModal, setShowSensorModal] = useState(false);
  const [newSensor, setNewSensor] = useState({ name: '', type: 'TEMPERATURE', unit: '°C', machineId: '1', active: true });

  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [newOrder, setNewOrder] = useState({
    machineId: '1',
    type: 'PREVENTIVE',
    description: '',
    scheduledDate: getTodayDateString(),
    status: 'SCHEDULED',
    technician: 'Lead Systems Engineer'
  });

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
      const [plantsData, machinesData, usersData, sensorsData, maintData, alertsData] = await Promise.all([
        plantsApi.getAll().catch(() => []),
        machinesApi.getAll().catch(() => []),
        authApi.getUsers().catch(() => []),
        sensorsApi.getAll().catch(() => []),
        maintenanceApi.getAll().catch(() => []),
        alertsApi.getAll().catch(() => [])
      ]);

      const machList = Array.isArray(machinesData) ? machinesData : (machinesData?.content || []);
      setPlants(Array.isArray(plantsData) ? plantsData : (plantsData?.content || []));
      setMachines(machList);
      setUsers(Array.isArray(usersData) ? usersData : (usersData?.content || []));
      setSensors(Array.isArray(sensorsData) ? sensorsData : (sensorsData?.content || []));
      setMaintenanceOrders(Array.isArray(maintData) ? maintData : (maintData?.content || []));
      setAlerts(Array.isArray(alertsData) ? alertsData : (alertsData?.content || []));

      if (machList.length > 0) {
        setNewSensor(prev => prev.machineId === '1' ? { ...prev, machineId: String(machList[0].id) } : prev);
        setNewOrder(prev => prev.machineId === '1' ? { ...prev, machineId: String(machList[0].id) } : prev);
      }
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
      if (newUser.role === 'OPERATOR') {
        setOperatorPlantAssignment(newUser.username.trim(), Number(newUser.assignedPlantId) || 1);
      }
      showToast(`User '${newUser.username}' registered with role ${newUser.role}`);
      setShowUserModal(false);
      setNewUser({ username: '', email: '', password: 'User@123', role: 'OPERATOR', assignedPlantId: String(plants[0]?.id || '1') });
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

  // 5. Sensor Actions
  const handleCreateSensor = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast('Access Denied: Only ROLE_ADMIN can provision sensors', 'error');
      return;
    }
    if (!newSensor.name.trim()) {
      showToast('Sensor Label is required', 'error');
      return;
    }

    setActionLoading(true);
    try {
      await sensorsApi.create({
        name: newSensor.name.trim(),
        type: newSensor.type,
        unit: newSensor.unit || '°C',
        machineId: Number(newSensor.machineId) || 1,
        active: newSensor.active
      });
      showToast(`Sensor '${newSensor.name}' provisioned successfully`);
      setShowSensorModal(false);
      setNewSensor({
        name: '',
        type: 'TEMPERATURE',
        unit: '°C',
        machineId: machines.length > 0 ? String(machines[0].id) : '1',
        active: true
      });
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to provision sensor', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleSensorStatus = async (sensor) => {
    if (!isAdmin) {
      showToast('Access Denied: Only ROLE_ADMIN can modify sensor calibration state', 'error');
      return;
    }
    const nextActive = !(sensor.active !== false);
    setSensors(prev => prev.map(s => (s.id === sensor.id ? { ...s, active: nextActive } : s)));
    try {
      await sensorsApi.update(sensor.id, {
        name: sensor.name || `${sensor.type} Sensor #${sensor.id}`,
        type: sensor.type || 'TEMPERATURE',
        unit: sensor.unit || '°C',
        machineId: Number(sensor.machineId || sensor.machine?.id || 1),
        active: nextActive
      });
      showToast(`Sensor '${sensor.name || sensor.id}' marked ${nextActive ? 'CALIBRATED' : 'STANDBY'}`);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to update sensor status', 'error');
      fetchData();
    }
  };

  const handleDeleteSensor = async (sensorId, sensorName) => {
    if (!isAdmin) {
      showToast('Access Denied: Only ROLE_ADMIN can decommission sensors', 'error');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete sensor '${sensorName}'?`)) {
      return;
    }
    try {
      await sensorsApi.delete(sensorId);
      showToast(`Sensor '${sensorName}' decommissioned`);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to delete sensor', 'error');
    }
  };

  // 6. Maintenance Actions
  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast('Access Denied: Only ROLE_ADMIN can create work orders', 'error');
      return;
    }
    if (!newOrder.description.trim() || newOrder.description.trim().length < 5) {
      showToast('Description must be at least 5 characters', 'error');
      return;
    }
    if (!newOrder.technician.trim() || newOrder.technician.trim().length < 2) {
      showToast('Technician name is required', 'error');
      return;
    }

    const schedDate = ensureFutureOrPresentDate(newOrder.scheduledDate);
    setActionLoading(true);
    try {
      await maintenanceApi.create({
        machineId: Number(newOrder.machineId) || 1,
        type: newOrder.type,
        description: newOrder.description.trim(),
        scheduledDate: schedDate,
        completedDate: newOrder.status === 'COMPLETED' ? schedDate : null,
        status: newOrder.status,
        technician: newOrder.technician.trim()
      });
      showToast(`Maintenance work order (${newOrder.type}) created`);
      setShowMaintenanceModal(false);
      setNewOrder({
        machineId: machines.length > 0 ? String(machines[0].id) : '1',
        type: 'PREVENTIVE',
        description: '',
        scheduledDate: getTodayDateString(),
        status: 'SCHEDULED',
        technician: 'Lead Systems Engineer'
      });
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to create work order', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleOrderStatus = async (order) => {
    if (!isAdmin) {
      showToast('Access Denied: Only ROLE_ADMIN can update work order status', 'error');
      return;
    }
    const isComplete = (order.status || '').toUpperCase() === 'COMPLETED';
    const nextStatus = isComplete ? 'IN_PROGRESS' : 'COMPLETED';
    const schedDate = ensureFutureOrPresentDate(order.scheduledDate);
    const today = getTodayDateString();
    const nextCompDate = nextStatus === 'COMPLETED' ? (today >= schedDate ? today : schedDate) : null;
    const desc = (order.description || order.task || 'Preventive maintenance check').trim();
    const safeDesc = desc.length >= 5 ? desc : `${desc} check`;
    const tech = (order.technician || order.assignedTo || 'Lead Systems Engineer').trim();

    setMaintenanceOrders(prev => prev.map(o => (o.id === order.id ? { ...o, status: nextStatus, completedDate: nextCompDate } : o)));
    try {
      await maintenanceApi.update(order.id, {
        machineId: Number(order.machineId || order.machine?.id || 1),
        type: (order.type || 'PREVENTIVE').toUpperCase(),
        description: safeDesc,
        scheduledDate: schedDate,
        completedDate: nextCompDate,
        status: nextStatus,
        technician: tech.length >= 2 ? tech : 'Lead Systems Engineer'
      });
      showToast(`Work order WO-${String(order.id).padStart(3, '0')} marked ${nextStatus}`);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to update work order', 'error');
      fetchData();
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!isAdmin) {
      showToast('Access Denied: Only ROLE_ADMIN can delete work orders', 'error');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete work order WO-${String(orderId).padStart(3, '0')}?`)) {
      return;
    }
    try {
      await maintenanceApi.delete(orderId);
      showToast(`Work order WO-${String(orderId).padStart(3, '0')} deleted`);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to delete work order', 'error');
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
              Central topology management, role-based authorization, sensors &amp; maintenance governance
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
          className={`pbi-admin-tab-btn ${activeTab === 'sensors' ? 'active' : ''}`}
          onClick={() => setActiveTab('sensors')}
        >
          <Gauge size={15} />
          <span>Sensors ({sensors.length})</span>
        </button>

        <button
          type="button"
          className={`pbi-admin-tab-btn ${activeTab === 'maintenance' ? 'active' : ''}`}
          onClick={() => setActiveTab('maintenance')}
        >
          <Wrench size={15} />
          <span>Maintenance ({maintenanceOrders.length})</span>
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
                  <th style={{ width: '76px' }}>User ID</th>
                  <th>Username</th>
                  <th>Enterprise Email</th>
                  <th>Current Role</th>
                  <th>Change Role (RBAC)</th>
                  <th>Assigned Plant</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const roleUpper = (u.role || 'OPERATOR').toUpperCase();
                  const roleColor = roleUpper === 'ADMIN' ? '#F2C811' : (roleUpper === 'MANAGER' ? '#A855F7' : (roleUpper === 'ENGINEER' ? '#00BCF2' : '#10B981'));
                  const assignedPid = getOperatorPlantId(u.username);

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
                      <td>
                        {roleUpper === 'OPERATOR' ? (
                          <select
                            aria-label={`Assigned plant for operator ${u.username}`}
                            value={String(assignedPid)}
                            disabled={!isAdmin}
                            onChange={(e) => {
                              const pid = Number(e.target.value);
                              setOperatorPlantAssignment(u.username, pid);
                              const pName = plants.find(p => p.id === pid)?.name || `Plant #${pid}`;
                              showToast(`Operator @${u.username} assigned to ${pName}`);
                            }}
                            style={{
                              background: 'rgba(16, 185, 129, 0.1)',
                              border: '1px solid rgba(16, 185, 129, 0.4)',
                              color: '#6EE7B7',
                              borderRadius: '4px',
                              padding: '3px 8px',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              cursor: isAdmin ? 'pointer' : 'not-allowed',
                              fontFamily: 'inherit'
                            }}
                          >
                            {plants.map(p => (
                              <option key={p.id} value={String(p.id)} style={{ background: '#111724', color: '#FFFFFF' }}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span style={{ color: '#64748B', fontSize: '11.5px' }}>All Facilities</span>
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
      {/* DOMAIN 4: SENSORS */}
      {/* ============================================================== */}
      {activeTab === 'sensors' && (
        <div className="pbi-visual-card">
          <div className="pbi-visual-header">
            <div>
              <div className="pbi-visual-title">IoT Transducer Sensors &amp; Calibration</div>
            </div>

            <div className="pbi-visual-actions">
              <button
                type="button"
                className="pbi-btn-action-sm pbi-btn-action-gold"
                disabled={!isAdmin}
                onClick={() => setShowSensorModal(true)}
                title={isAdmin ? 'Provision new IoT sensor' : 'Admin authorization required'}
              >
                <Plus size={14} />
                <span>Provision Sensor</span>
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table className="pbi-matrix-table" style={{ width: '100%', tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th style={{ width: '76px', padding: '10px 8px' }}>Sensor ID</th>
                  <th style={{ padding: '10px 10px' }}>Sensor &amp; Modality</th>
                  <th style={{ padding: '10px 10px' }}>Bound Machine</th>
                  <th style={{ width: '68px', padding: '10px 8px', textAlign: 'center' }}>Unit</th>
                  <th style={{ width: '108px', padding: '10px 8px' }}>Status</th>
                  <th style={{ width: '170px', textAlign: 'right', padding: '10px 14px', whiteSpace: 'nowrap' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sensors.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#94A3B8' }}>
                      No sensors provisioned.
                    </td>
                  </tr>
                )}
                {sensors.map((s) => {
                  const assignedMach = machines.find(m => m.id === Number(s.machineId || s.machine?.id));
                  const isActive = s.active !== false;

                  return (
                    <tr key={s.id}>
                      <td style={{ padding: '10px 8px', fontFamily: 'var(--pbi-font-mono)', color: '#F59E0B', fontWeight: 700, fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                        SEN-{String(s.id).padStart(3, '0')}
                      </td>
                      <td style={{ padding: '10px 10px' }}>
                        <div style={{ fontWeight: 700, fontSize: '12.5px', color: '#FFFFFF' }}>
                          {s.name || `${s.type} Sensor #${s.id}`}
                        </div>
                        <span style={{
                          fontFamily: 'var(--pbi-font-mono)',
                          fontSize: '10px',
                          fontWeight: 700,
                          color: '#F59E0B',
                          background: 'rgba(245, 158, 11, 0.12)',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          padding: '1px 5px',
                          borderRadius: '3px',
                          display: 'inline-block',
                          marginTop: '2px'
                        }}>
                          {s.type}
                        </span>
                      </td>
                      <td style={{ padding: '10px 10px', color: '#CBD5E1', fontSize: '12.5px' }}>
                        {assignedMach ? assignedMach.name : `Machine #${s.machineId || 1}`}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center', fontFamily: 'var(--pbi-font-mono)', color: '#38BDF8', fontWeight: 700, fontSize: '11.5px' }}>
                        {s.unit || '°C'}
                      </td>
                      <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>
                        <span className={`pbi-status-pill ${isActive ? 'pbi-status-online' : 'pbi-status-offline'}`}>
                          <span className="pbi-status-dot" />
                          <span>{isActive ? 'CALIBRATED' : 'STANDBY'}</span>
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '5px' }}>
                          <button
                            type="button"
                            className={`pbi-btn-action-sm ${isActive ? 'pbi-btn-toggle-offline' : 'pbi-btn-toggle-online'}`}
                            disabled={!isAdmin}
                            onClick={() => handleToggleSensorStatus(s)}
                          >
                            <Power size={11} />
                            <span>{isActive ? 'Standby' : 'Calibrate'}</span>
                          </button>
                          <button
                            type="button"
                            className="pbi-btn-action-sm pbi-btn-action-danger"
                            disabled={!isAdmin}
                            onClick={() => handleDeleteSensor(s.id, s.name || `SEN-${s.id}`)}
                          >
                            <Trash2 size={11} />
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
      {/* DOMAIN 5: MAINTENANCE */}
      {/* ============================================================== */}
      {activeTab === 'maintenance' && (
        <div className="pbi-visual-card">
          <div className="pbi-visual-header">
            <div>
              <div className="pbi-visual-title">Maintenance Work Orders &amp; Dispatch</div>
            </div>

            <div className="pbi-visual-actions">
              <button
                type="button"
                className="pbi-btn-action-sm pbi-btn-action-gold"
                disabled={!isAdmin}
                onClick={() => {
                  setNewOrder(prev => ({ ...prev, scheduledDate: getTodayDateString() }));
                  setShowMaintenanceModal(true);
                }}
                title={isAdmin ? 'Schedule new maintenance work order' : 'Admin authorization required'}
              >
                <Plus size={14} />
                <span>Create Order</span>
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table className="pbi-matrix-table" style={{ width: '100%', tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th style={{ width: '74px', padding: '10px 8px' }}>Order ID</th>
                  <th style={{ width: '165px', padding: '10px 8px' }}>Asset &amp; Type</th>
                  <th style={{ padding: '10px 10px' }}>Description &amp; Dispatch</th>
                  <th style={{ width: '108px', padding: '10px 8px' }}>Status</th>
                  <th style={{ width: '165px', textAlign: 'right', padding: '10px 14px', whiteSpace: 'nowrap' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {maintenanceOrders.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: '#94A3B8' }}>
                      No maintenance work orders scheduled.
                    </td>
                  </tr>
                )}
                {maintenanceOrders.map((o) => {
                  const statusUpper = (o.status || 'SCHEDULED').toUpperCase();
                  const isComplete = statusUpper === 'COMPLETED';
                  const machId = Number(o.machineId || o.machine?.id || 1);
                  const assignedMach = machines.find(m => m.id === machId);
                  const maintType = (o.type || 'PREVENTIVE').toUpperCase();
                  const typeColor = maintType === 'CORRECTIVE' ? '#EF4444' : (maintType === 'PREDICTIVE' ? '#F59E0B' : '#00BCF2');

                  return (
                    <tr key={o.id}>
                      <td style={{ padding: '10px 8px', fontFamily: 'var(--pbi-font-mono)', color: '#EC4899', fontWeight: 700, fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                        WO-{String(o.id).padStart(3, '0')}
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        <div style={{ fontWeight: 700, fontSize: '12.5px', color: '#FFFFFF' }}>
                          {assignedMach ? assignedMach.name : `Machine #${machId}`}
                        </div>
                        <span style={{
                          color: typeColor,
                          background: `${typeColor}15`,
                          border: `1px solid ${typeColor}40`,
                          padding: '1px 5px',
                          borderRadius: '3px',
                          fontFamily: 'var(--pbi-font-mono)',
                          fontSize: '10px',
                          fontWeight: 700,
                          display: 'inline-block',
                          marginTop: '2px'
                        }}>
                          {maintType}
                        </span>
                      </td>
                      <td style={{ padding: '10px 10px' }}>
                        <div style={{ color: '#E2E8F0', fontSize: '12.5px', lineHeight: 1.35 }}>
                          {o.description || o.task || 'Preventive maintenance check'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '3px', fontSize: '11px', color: '#94A3B8' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <User size={11} color="#EC4899" />
                            <span>{o.technician || o.assignedTo || 'Lead Systems Engineer'}</span>
                          </span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--pbi-font-mono)', fontSize: '10.5px', color: '#64748B' }}>
                            <Calendar size={11} />
                            <span>{o.scheduledDate ? toDateString(o.scheduledDate) : 'Immediate'}</span>
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>
                        <span className={`pbi-status-pill ${isComplete ? 'pbi-status-running' : (statusUpper === 'IN_PROGRESS' ? 'pbi-status-idle' : 'pbi-status-maintenance')}`}>
                          <span className="pbi-status-dot" />
                          <span>{statusUpper}</span>
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '5px' }}>
                          <button
                            type="button"
                            className={`pbi-btn-action-sm ${isComplete ? 'pbi-btn-toggle-offline' : 'pbi-btn-toggle-online'}`}
                            disabled={!isAdmin}
                            onClick={() => handleToggleOrderStatus(o)}
                          >
                            {isComplete ? <Power size={11} /> : <CheckCircle2 size={11} />}
                            <span>{isComplete ? 'Reopen' : 'Done'}</span>
                          </button>
                          <button
                            type="button"
                            className="pbi-btn-action-sm pbi-btn-action-danger"
                            disabled={!isAdmin}
                            onClick={() => handleDeleteOrder(o.id)}
                          >
                            <Trash2 size={11} />
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

                {newUser.role === 'OPERATOR' && (
                  <div className="pbi-form-group">
                    <label className="pbi-form-label" htmlFor="reg-assigned-plant">Assigned Manufacturing Plant</label>
                    <select
                      id="reg-assigned-plant"
                      className="pbi-form-input"
                      value={newUser.assignedPlantId}
                      onChange={(e) => setNewUser({ ...newUser, assignedPlantId: e.target.value })}
                    >
                      {plants.map(p => (
                        <option key={p.id} value={String(p.id)}>
                          {p.name} ({p.location})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
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

      {/* ============================================================== */}
      {/* MODAL 4: PROVISION NEW SENSOR */}
      {/* ============================================================== */}
      {showSensorModal && (
        <div className="pbi-modal-backdrop" onClick={() => setShowSensorModal(false)}>
          <div className="pbi-modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="pbi-modal-header">
              <div className="pbi-modal-title">
                <Gauge size={16} color="#F59E0B" />
                <span>Provision New IoT Sensor</span>
              </div>
              <button type="button" className="pbi-modal-close" onClick={() => setShowSensorModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSensor}>
              <div className="pbi-modal-body">
                <div className="pbi-form-group">
                  <label className="pbi-form-label" htmlFor="admin-sensor-name">Sensor Label</label>
                  <input
                    id="admin-sensor-name"
                    type="text"
                    className="pbi-form-input"
                    placeholder="e.g. Spindle Thermal Probe #12"
                    value={newSensor.name}
                    onChange={(e) => setNewSensor({ ...newSensor, name: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="pbi-form-group">
                    <label className="pbi-form-label" htmlFor="admin-sensor-type">Modality</label>
                    <select
                      id="admin-sensor-type"
                      className="pbi-form-input"
                      value={newSensor.type}
                      onChange={(e) => {
                        const found = SENSOR_TYPES.find(t => t.type === e.target.value);
                        setNewSensor({ ...newSensor, type: e.target.value, unit: found ? found.unit : newSensor.unit });
                      }}
                    >
                      {SENSOR_TYPES.map(st => (
                        <option key={st.type} value={st.type}>{st.type}</option>
                      ))}
                    </select>
                  </div>

                  <div className="pbi-form-group">
                    <label className="pbi-form-label" htmlFor="admin-sensor-unit">Unit</label>
                    <input
                      id="admin-sensor-unit"
                      type="text"
                      className="pbi-form-input"
                      value={newSensor.unit}
                      onChange={(e) => setNewSensor({ ...newSensor, unit: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="pbi-form-group">
                  <label className="pbi-form-label" htmlFor="admin-sensor-machine">Bound Machine Asset</label>
                  <select
                    id="admin-sensor-machine"
                    className="pbi-form-input"
                    value={newSensor.machineId}
                    onChange={(e) => setNewSensor({ ...newSensor, machineId: e.target.value })}
                  >
                    {machines.length === 0 && <option value="1">Machine #1</option>}
                    {machines.map(m => (
                      <option key={m.id} value={String(m.id)}>
                        MCH-{String(m.id).padStart(3, '0')} — {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pbi-modal-footer">
                <button type="button" className="pbi-ribbon-btn" onClick={() => setShowSensorModal(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="pbi-btn-action-sm pbi-btn-action-gold"
                  style={{ height: '32px', padding: '0 16px' }}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Provisioning...' : 'Provision Sensor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 5: CREATE MAINTENANCE WORK ORDER */}
      {/* ============================================================== */}
      {showMaintenanceModal && (
        <div className="pbi-modal-backdrop" onClick={() => setShowMaintenanceModal(false)}>
          <div className="pbi-modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="pbi-modal-header">
              <div className="pbi-modal-title">
                <Wrench size={16} color="#EC4899" />
                <span>Create Maintenance Work Order</span>
              </div>
              <button type="button" className="pbi-modal-close" onClick={() => setShowMaintenanceModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOrder}>
              <div className="pbi-modal-body">
                <div className="pbi-form-group">
                  <label className="pbi-form-label" htmlFor="admin-order-machine">Target Machine Asset</label>
                  <select
                    id="admin-order-machine"
                    className="pbi-form-input"
                    value={newOrder.machineId}
                    onChange={(e) => setNewOrder({ ...newOrder, machineId: e.target.value })}
                  >
                    {machines.length === 0 && <option value="1">Machine #1</option>}
                    {machines.map(m => (
                      <option key={m.id} value={String(m.id)}>
                        MCH-{String(m.id).padStart(3, '0')} — {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="pbi-form-group">
                    <label className="pbi-form-label" htmlFor="admin-order-type">Type</label>
                    <select
                      id="admin-order-type"
                      className="pbi-form-input"
                      value={newOrder.type}
                      onChange={(e) => setNewOrder({ ...newOrder, type: e.target.value })}
                    >
                      {MAINT_TYPES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div className="pbi-form-group">
                    <label className="pbi-form-label" htmlFor="admin-order-status">Status</label>
                    <select
                      id="admin-order-status"
                      className="pbi-form-input"
                      value={newOrder.status}
                      onChange={(e) => setNewOrder({ ...newOrder, status: e.target.value })}
                    >
                      {MAINT_STATUSES.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="pbi-form-group">
                    <label className="pbi-form-label" htmlFor="admin-order-tech">Technician</label>
                    <input
                      id="admin-order-tech"
                      type="text"
                      className="pbi-form-input"
                      value={newOrder.technician}
                      onChange={(e) => setNewOrder({ ...newOrder, technician: e.target.value })}
                      required
                    />
                  </div>

                  <div className="pbi-form-group">
                    <label className="pbi-form-label" htmlFor="admin-order-date">Scheduled Date</label>
                    <input
                      id="admin-order-date"
                      type="date"
                      min={getTodayDateString()}
                      className="pbi-form-input"
                      value={newOrder.scheduledDate}
                      onChange={(e) => setNewOrder({ ...newOrder, scheduledDate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="pbi-form-group">
                  <label className="pbi-form-label" htmlFor="admin-order-desc">Description</label>
                  <textarea
                    id="admin-order-desc"
                    rows={3}
                    className="pbi-form-input"
                    style={{ height: 'auto', padding: '10px 12px', resize: 'vertical' }}
                    placeholder="e.g. Preventive spindle lubrication and bearing inspection"
                    value={newOrder.description}
                    onChange={(e) => setNewOrder({ ...newOrder, description: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="pbi-modal-footer">
                <button type="button" className="pbi-ribbon-btn" onClick={() => setShowMaintenanceModal(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="pbi-btn-action-sm pbi-btn-action-gold"
                  style={{ height: '32px', padding: '0 16px' }}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Creating...' : 'Create Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

