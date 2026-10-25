import React, { useState } from 'react';
import { useAuth, SEED_USERS } from '../context/AuthContext';
import { 
  ShieldCheck, 
  User, 
  Database, 
  Server, 
  Layers, 
  CheckCircle2, 
  Network, 
  HardDrive
} from 'lucide-react';

export default function ProfileView() {
  const { user, switchDemoUser } = useAuth();

  const MICROSERVICES = [
    { name: 'API Gateway', port: 8080, route: '/api/*', desc: 'Edge routing, CORS, WebSocket bridge & aggregation controller', latency: '4ms' },
    { name: 'Authentication Service', port: 8081, route: '/api/auth/*', desc: 'JWT generation, password hashing & user persistence', latency: '7ms' },
    { name: 'Plant Service', port: 8082, route: '/api/plants/*', desc: 'Facility metadata, geographical locations & active state', latency: '6ms' },
    { name: 'Telemetry Service', port: 8083, route: '/api/telemetry/*', desc: 'High-frequency thermal, vibration & RPM readings', latency: '8ms' },
    { name: 'Alert Service', port: 8084, route: '/api/alerts/*', desc: 'Threshold breach evaluation & operational incident feed', latency: '5ms' },
    { name: 'Maintenance Service', port: 8085, route: '/api/maintenance/*, /api/machine-health/*', desc: 'Preventive/corrective work orders & predictive wear scores', latency: '9ms' },
    { name: 'Production Service', port: 8086, route: '/api/production/*', desc: 'Manufacturing batch run throughput & first-pass scrap yield', latency: '7ms' },
    { name: 'Energy Service', port: 8087, route: '/api/energy/*', desc: 'Continuous kilowatt-hour load & sub-metered power metrics', latency: '6ms' },
    { name: 'Machine Service', port: 8088, route: '/api/machines/*', desc: 'Fleet telemetry metadata, operational status & plant bindings', latency: '5ms' },
    { name: 'Sensor Service', port: 8089, route: '/api/sensors/*', desc: 'Sensor catalog, engineering units & hardware pairing', latency: '6ms' },
  ];

  const [selectedService, setSelectedService] = useState(MICROSERVICES[0]);

  return (
    <div className="page-container" style={{ paddingBottom: '3rem' }}>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-wrap">
          <div className="page-breadcrumbs">
            <span>System</span>
            <span>/</span>
            <span className="active">Architecture & Security</span>
          </div>
          <h1 className="page-title">
            <ShieldCheck size={22} style={{ color: 'var(--accent)' }} />
            Architecture, RBAC & Mesh Security
          </h1>
          <p className="page-description">
            Inspect the 10-microservice Spring Boot topology, signed JWT session details, and shared MySQL database architecture.
          </p>
        </div>
      </div>

      {/* Grid: Current User Profile + DB Architecture */}
      <div className="grid-cols-2" style={{ marginBottom: '1.5rem' }}>
        {/* User Card */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={18} style={{ color: 'var(--accent)' }} />
            Active Session Security Profile
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)',
              fontWeight: 800,
              fontSize: '1.35rem'
            }}>
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{user?.username}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {user?.username}@kynexis.industrial.com
              </div>
              <div style={{ marginTop: '0.35rem' }}>
                <span className="badge badge-active">{user?.role} ACCESS</span>
              </div>
            </div>
          </div>

          <div style={{
            padding: '0.85rem 1rem',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border)',
            fontSize: '0.8rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            marginBottom: '1.25rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Authentication Standard:</span>
              <strong style={{ color: 'var(--text-primary)' }}>HMAC-SHA256 Signed JWT</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Gateway Header Propagation:</span>
              <strong style={{ color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>Authorization: Bearer</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Internal Microservice Secret:</span>
              <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
                X-Internal-Secret (Verified)
              </strong>
            </div>
          </div>

          {/* Quick Persona Switcher */}
          <div>
            <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>
              Switch Persona to Test RBAC Permissions
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
              {SEED_USERS.map((seed) => {
                const isActive = user?.role === seed.role;
                return (
                  <button
                    key={seed.role}
                    type="button"
                    className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => switchDemoUser(seed.role)}
                    style={{ justifyContent: 'center' }}
                  >
                    {seed.label} ({seed.role})
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Database & Schema Resiliency Card */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Database size={18} style={{ color: 'var(--accent)' }} />
            Database & Idempotent Schema Architecture
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.825rem' }}>
            <div style={{
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border)'
            }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <HardDrive size={15} style={{ color: 'var(--accent)' }} />
                <span>Single MySQL Database: smart_factory_db</span>
              </div>
              <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                All 10 Spring Boot microservices bind to <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>smart_factory_db</code> with standard <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>SPRING_DATASOURCE_*</code> environment configuration.
              </div>
            </div>

            <div style={{
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border)'
            }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={15} style={{ color: 'var(--success)' }} />
                <span>Safe Non-Destructive DDL Migrations</span>
              </div>
              <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>schema.sql</code> uses strictly <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>CREATE TABLE IF NOT EXISTS</code> across all 11 tables.
              </div>
            </div>

            <div style={{
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border)'
            }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Layers size={15} style={{ color: 'var(--accent)' }} />
                <span>Idempotent Database Seed Scripts</span>
              </div>
              <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                All records execute using <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>INSERT IGNORE INTO</code>, preventing duplicate key violations.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive 10-Microservice Cluster Mesh */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Network size={18} style={{ color: 'var(--accent)' }} />
            10-Microservice Cluster Mesh & Endpoint Routing
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Click any microservice node below to inspect its Gateway routing proxy rules and internal endpoints
          </span>
        </div>

        {/* Microservices Node Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
          {MICROSERVICES.map((svc) => {
            const isSel = selectedService.name === svc.name;
            return (
              <div
                key={svc.name}
                onClick={() => setSelectedService(svc)}
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  background: isSel ? 'var(--surface-elevated)' : 'var(--background)',
                  border: `1px solid ${isSel ? 'var(--accent)' : 'var(--border)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isSel ? '0 0 12px rgba(57, 132, 255, 0.2)' : 'none'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: isSel ? 'var(--accent)' : 'var(--text-muted)', fontWeight: 700 }}>
                    PORT :{svc.port}
                  </span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--success)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    {svc.latency}
                  </span>
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: isSel ? '#FFFFFF' : 'var(--text-primary)' }}>
                  {svc.name}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Microservice Detail Inspector */}
        <div style={{
          padding: '1.25rem',
          background: 'var(--surface-elevated)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
              Inspected Microservice Architecture
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0.2rem 0' }}>
              {selectedService.name} (Port {selectedService.port})
            </h3>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: 0 }}>
              {selectedService.desc}
            </p>
          </div>

          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', background: 'var(--surface)', padding: '0.6rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--text-muted)' }}>Gateway Pattern: </span>
            <strong style={{ color: 'var(--accent)' }}>{selectedService.route}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
