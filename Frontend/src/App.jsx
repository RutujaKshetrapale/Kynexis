import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';

// Views
import LoginView from './views/LoginView';
import DashboardView from './views/DashboardView';
import PlantsView from './views/PlantsView';
import MachinesView from './views/MachinesView';
import SensorsView from './views/SensorsView';
import TelemetryView from './views/TelemetryView';
import AlertsView from './views/AlertsView';
import MaintenanceView from './views/MaintenanceView';
import ProductionView from './views/ProductionView';
import EnergyView from './views/EnergyView';
import ProfileView from './views/ProfileView';

export default function App() {
  const { isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState('ALL');

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner message="Initializing Smart Factory Security Session..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView onNavigate={setActiveTab} selectedPlant={selectedPlant} />;
      case 'plants':
        return <PlantsView />;
      case 'machines':
        return <MachinesView selectedPlant={selectedPlant} />;
      case 'sensors':
        return <SensorsView />;
      case 'telemetry':
        return <TelemetryView />;
      case 'alerts':
        return <AlertsView />;
      case 'maintenance':
        return <MaintenanceView />;
      case 'production':
        return <ProductionView />;
      case 'energy':
        return <EnergyView />;
      case 'profile':
        return <ProfileView />;
      default:
        return <DashboardView onNavigate={setActiveTab} selectedPlant={selectedPlant} />;
    }
  };

  return (
    <div className="app-container">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />
      <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Navbar 
          selectedPlant={selectedPlant} 
          setSelectedPlant={setSelectedPlant} 
          activeTab={activeTab} 
        />
        <main>
          <ErrorBoundary key={activeTab}>
            {renderActiveView()}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
