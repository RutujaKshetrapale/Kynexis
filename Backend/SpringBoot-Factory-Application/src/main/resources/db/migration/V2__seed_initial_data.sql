-- ============================================================
-- KYNEXIS — Connected Industrial Intelligence
-- Flyway Migration V2: Development Reference Seed Data
-- Database target: MySQL 8.x / smart_factory_db
-- ============================================================

-- ============================================================
-- 1. USERS (Development-Only BCrypt Hashes)
-- ============================================================
INSERT IGNORE INTO users (id, username, email, password, role, active) VALUES
(1, 'admin', 'admin@kynexis.industrial.com', '$2a$10$e.xKjQG1f5n8O0Y/fT/xEOeL4eY3l5mOqR0mY9yY4cZ5bQ6aW7vC.', 'ADMIN', TRUE),
(2, 'engineer_sarah', 'sarah.engineer@kynexis.industrial.com', '$2a$10$e.xKjQG1f5n8O0Y/fT/xEOeL4eY3l5mOqR0mY9yY4cZ5bQ6aW7vC.', 'ENGINEER', TRUE),
(3, 'operator_john', 'john.operator@kynexis.industrial.com', '$2a$10$e.xKjQG1f5n8O0Y/fT/xEOeL4eY3l5mOqR0mY9yY4cZ5bQ6aW7vC.', 'OPERATOR', TRUE),
(4, 'manager_alex', 'alex.manager@kynexis.industrial.com', '$2a$10$e.xKjQG1f5n8O0Y/fT/xEOeL4eY3l5mOqR0mY9yY4cZ5bQ6aW7vC.', 'MANAGER', TRUE);

-- ============================================================
-- 2. PLANTS
-- ============================================================
INSERT IGNORE INTO plants (id, name, location, active) VALUES
(1, 'Pune Automotive Hub', 'Pune, Maharashtra, India', TRUE),
(2, 'Munich Smart Factory', 'Munich, Bavaria, Germany', TRUE),
(3, 'Detroit Assembly Plant', 'Detroit, Michigan, USA', TRUE);

-- ============================================================
-- 3. MACHINES
-- ============================================================
INSERT IGNORE INTO machines (id, name, type, status, plant_id) VALUES
(1, 'CNC Milling Station Alpha', 'CNC Mill', 'RUNNING', 1),
(2, 'Robotic Welding Arm W-100', 'Robotic Welder', 'RUNNING', 1),
(3, 'Hydraulic Stamping Press P-500', 'Stamping Press', 'MAINTENANCE', 1),
(4, 'Automated Injection Molder M-40', 'Injection Molder', 'IDLE', 2),
(5, 'Laser Cutter Station LC-9', 'Laser Cutter', 'RUNNING', 3);

-- ============================================================
-- 4. SENSORS
-- ============================================================
INSERT IGNORE INTO sensors (id, name, type, unit, active, machine_id) VALUES
(1, 'Spindle Thermal Sensor', 'Temperature', '°C', TRUE, 1),
(2, 'Vibration Monitor Axis-Z', 'Vibration', 'mm/s', TRUE, 1),
(3, 'Hydraulic Pressure Gauge', 'Pressure', 'PSI', TRUE, 3),
(4, 'Tachometer Motor RPM', 'RPM', 'RPM', TRUE, 1),
(5, 'Welding Tip Thermal Sensor', 'Temperature', '°C', TRUE, 2);

-- ============================================================
-- 5. TELEMETRY
-- ============================================================
INSERT IGNORE INTO telemetry (id, temperature, vibration, pressure, rpm, timestamp, machine_id) VALUES
(1, 68.5, 1.2, 45.0, 3200.0, '2026-10-08 10:00:00', 1),
(2, 72.1, 2.8, 46.2, 3250.0, '2026-10-08 10:15:00', 1),
(3, 89.4, 6.5, 48.0, 3400.0, '2026-10-08 10:30:00', 1),
(4, 55.0, 0.8, 120.0, 0.0, '2026-10-08 10:00:00', 2),
(5, 56.2, 0.9, 122.5, 0.0, '2026-10-08 10:15:00', 2);

-- ============================================================
-- 6. ALERTS
-- ============================================================
INSERT IGNORE INTO alerts (id, type, severity, message, resolved, created_at, machine_id, telemetry_id) VALUES
(1, 'OVERHEATING', 'HIGH', 'Spindle temperature exceeded 85°C safety threshold', FALSE, '2026-10-08 10:30:00', 1, 3),
(2, 'VIBRATION_WARNING', 'MEDIUM', 'Axis-Z vibration approaching warning limit', TRUE, '2026-10-08 09:15:00', 1, 2);

-- ============================================================
-- 7. MAINTENANCE
-- ============================================================
INSERT IGNORE INTO maintenance (id, type, description, scheduled_date, completed_date, status, technician, created_at, machine_id) VALUES
(1, 'PREVENTIVE', 'Quarterly hydraulic fluid change and valve seal check', '2026-10-10', NULL, 'SCHEDULED', 'Robert Vance', '2026-10-01 08:00:00', 3),
(2, 'CORRECTIVE', 'Replace worn spindle bearing following overheating alert', '2026-10-08', '2026-10-08', 'COMPLETED', 'Sarah Jenkins', '2026-10-08 10:45:00', 1);

-- ============================================================
-- 8. PRODUCTION
-- ============================================================
INSERT IGNORE INTO production (id, product_name, quantity_produced, quantity_rejected, production_start, production_end, status, machine_id) VALUES
(1, 'Engine Block Castings #A4', 450, 12, '2026-10-08 06:00:00', '2026-10-08 14:00:00', 'COMPLETED', 1),
(2, 'Chassis Bracket Joints #W12', 1200, 5, '2026-10-08 07:00:00', NULL, 'IN_PROGRESS', 2);

-- ============================================================
-- 9. ENERGY
-- ============================================================
INSERT IGNORE INTO energy (id, energy_consumption, recorded_at, machine_id) VALUES
(1, 142.5, '2026-10-08 10:00:00', 1),
(2, 148.0, '2026-10-08 11:00:00', 1),
(3, 98.2, '2026-10-08 10:00:00', 2),
(4, 102.4, '2026-10-08 11:00:00', 2);
