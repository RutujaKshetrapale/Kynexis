import React from 'react';
import { useAuth, SEED_USERS } from '../context/AuthContext';
import { 
  ShieldCheck, 
  Server, 
  Database, 
  User, 
  Network 
} from 'lucide-react';

export const MICROSERVICES = [
  { name: 'api-gateway', port: 8080, route: '/api/dashboard/**', desc: 'Gateway proxy, JWT filter, dashboard aggregation' },
  { name: 'authentication-service', port: 8081, route: '/api/auth/**', desc: 'User registration, BCrypt, JWT generation' },
  { name: 'plant-service', port: 8082, route: '/api/plants/**', desc: 'Multi-site manufacturing plant registry' },
  { name: 'telemetry-service', port: 8083, route: '/api/telemetry/**', desc: 'IoT time-series streaming & threshold evaluation' },
  { name: 'alert-service', port: 8084, route: '/api/alerts/**', desc: 'Incident triage & severity alerting engine' },
  { name: 'maintenance-service', port: 8085, route: '/api/maintenance/**', desc: 'Work orders, health index & predictive AI' },
  { name: 'production-service', port: 8086, route: '/api/production/**', desc: 'Batch production tracking & scrap calculations' },
  { name: 'energy-service', port: 8087, route: '/api/energy/**', desc: 'Power meter logs (kWh) & ISO 50001 efficiency' },
  { name: 'machine-service', port: 8088, route: '/api/machines/**', desc: 'Machine asset fleet & plant association' },
  { name: 'sensor-service', port: 8089, route: '/api/sensors/**', desc: 'Sensor channels, metric types & physical units' },
];

export default function ProfileView() {
  const { user, switchDemoUser } = useAuth();

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <ShieldCheck style={{ color: 'var(--neon-emerald)' }} />
            System Architecture, Gateway & Session Security
          </h1>
          <p className="page-description">
            10-microservice topology breakdown, API Gateway routing matrix, and authenticated RBAC role permissions
          </p>
        </div>
      </div>

      {/* Grid: Current User Profile + DB Architecture */}
      <div className="grid-cols-2" style={{ marginBottom: '2rem' }}>
        {/* User Card */}
        <div className="card">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={18} style={{ color: 'var(--neon-cyan)' }} />
            Active Session Security Profile
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{
              width: 58,
              height: 58,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #00f2fe 0%, #a855f7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#06080e',
              fontWeight: 800,
              fontSize: '1.5rem',
              boxShadow: '0 0 20px rgba(0, 242, 254, 0.4)'
            }}>
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{user?.username}</div>
              <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                {user?.username}@kynexis.industrial.com
              </div>
              <div style={{ marginTop: '0.35rem' }}>
                <span className="badge badge-active">{user?.role} ACCESS</span>
              </div>
            </div>
          </div>

          <div style={{
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.825rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Authentication Standard:</span>
              <strong style={{ color: 'var(--text-primary)' }}>HMAC-SHA256 JWT Token</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Gateway Token Injection:</span>
              <strong style={{ color: 'var(--neon-emerald)' }}>Authorization: Bearer [Header]</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Internal Service Secret:</span>
              <strong style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--neon-cyan)' }}>
                X-Internal-Secret (Verified)
              </strong>
            </div>
          </div>

          {/* Quick Persona Switcher in Card */}
          <div style={{ marginTop: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>
              Switch Persona to Test RBAC Endpoints
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
              {SEED_USERS.map((seed) => {
                const isActive = user?.role === seed.role;
                return (
                  <button
                    key={seed.role}
                    type="button"
                    className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => switchDemoUser(seed.role)}
                  >
                    {seed.label} ({seed.role})
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Database & Resiliency Card */}
        <div className="card">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Database size={18} style={{ color: 'var(--neon-blue)' }} />
            Database & Idempotent Schema Architecture
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
            <div style={{
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(0, 242, 254, 0.05)',
              border: '1px solid rgba(0, 242, 254, 0.2)'
            }}>
              <div style={{ fontWeight: 600, color: 'var(--neon-cyan)', marginBottom: '0.2rem' }}>
                Single Centralized MySQL Database: smart_factory_db
              </div>
              <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
                All 10 Spring Boot microservices bind to <code className="mono">smart_factory_db</code> with standard <code className="mono">SPRING_DATASOURCE_*</code> environment variables.
              </div>
            </div>

            <div style={{
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(16, 185, 129, 0.05)',
              border: '1px solid rgba(16, 185, 129, 0.2)'
            }}>
              <div style={{ fontWeight: 600, color: '#34d399', marginBottom: '0.2rem' }}>
                Safe Non-Destructive Migrations
              </div>
              <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
                <code className="mono">schema.sql</code> uses strictly <code className="mono">CREATE TABLE IF NOT EXISTS</code> across all 11 tables. Destructive resets isolated to <code className="mono">reset_dev_db.sql</code>.
              </div>
            </div>

            <div style={{
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(168, 85, 247, 0.05)',
              border: '1px solid rgba(168, 85, 247, 0.2)'
            }}>
              <div style={{ fontWeight: 600, color: '#c084fc', marginBottom: '0.2rem' }}>
                Idempotent Seed Scripts
              </div>
              <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
                All seed records in <code className="mono">seed_data.sql</code> execute using safe <code className="mono">INSERT IGNORE INTO</code>, preventing duplicate key violations and data corruption.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 10 Microservices Routing Matrix */}
      <div className="card">
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Network size={18} style={{ color: 'var(--neon-cyan)' }} />
          The 10 Independent Spring Boot Microservices
        </h2>

        <div className="table-wrap">
          <table className="industrial-table">
            <thead>
              <tr>
                <th>Service Name</th>
                <th>Internal Port</th>
                <th>Gateway Proxy Route</th>
                <th>Core Responsibilities</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {MICROSERVICES.map((svc) => (
                <tr key={svc.name}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                      <Server size={14} style={{ color: 'var(--neon-cyan)' }} />
                      <span>{svc.name}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: 'var(--neon-purple)' }}>
                      :{svc.port}
                    </span>
                  </td>
                  <td>
                    <code className="mono" style={{ color: 'var(--neon-blue)', fontSize: '0.8rem' }}>
                      {svc.route}
                    </code>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                      {svc.desc}
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-healthy">
                      <span className="badge-dot" />
                      HEALTHY
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
