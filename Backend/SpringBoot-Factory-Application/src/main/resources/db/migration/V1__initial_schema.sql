-- ============================================================
-- KYNEXIS — Connected Industrial Intelligence
-- Flyway Migration V1: Initial Database Schema
-- Database target: MySQL 8.x / smart_factory_db
-- ============================================================

-- ============================================================
-- 1. PLANTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS plants (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(150) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    INDEX idx_plant_location (location),
    INDEX idx_plant_active (active)
);

-- ============================================================
-- 2. MACHINES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS machines (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(100) NOT NULL,
    status VARCHAR(30) NOT NULL,
    plant_id BIGINT NOT NULL,
    CONSTRAINT fk_machine_plant FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE RESTRICT,
    INDEX idx_machine_plant (plant_id),
    INDEX idx_machine_status (status)
);

-- ============================================================
-- 3. SENSORS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS sensors (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    machine_id BIGINT NOT NULL,
    CONSTRAINT fk_sensor_machine FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE RESTRICT,
    INDEX idx_sensor_machine (machine_id),
    INDEX idx_sensor_active (active)
);

-- ============================================================
-- 4. TELEMETRY TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS telemetry (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    temperature DOUBLE NOT NULL,
    vibration DOUBLE NOT NULL,
    pressure DOUBLE NOT NULL,
    rpm DOUBLE NOT NULL,
    timestamp DATETIME NOT NULL,
    machine_id BIGINT NOT NULL,
    CONSTRAINT fk_telemetry_machine FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE RESTRICT,
    INDEX idx_telemetry_machine (machine_id),
    INDEX idx_telemetry_timestamp (timestamp),
    INDEX idx_telemetry_machine_timestamp (machine_id, timestamp)
);

-- ============================================================
-- 5. ALERTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS alerts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    severity VARCHAR(30) NOT NULL,
    message VARCHAR(500) NOT NULL,
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL,
    machine_id BIGINT NOT NULL,
    telemetry_id BIGINT NULL,
    CONSTRAINT fk_alert_machine FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE RESTRICT,
    CONSTRAINT fk_alert_telemetry FOREIGN KEY (telemetry_id) REFERENCES telemetry(id) ON DELETE SET NULL,
    INDEX idx_alert_machine (machine_id),
    INDEX idx_alert_severity (severity),
    INDEX idx_alert_resolved (resolved),
    INDEX idx_alert_created_at (created_at)
);

-- ============================================================
-- 6. MAINTENANCE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS maintenance (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    description VARCHAR(500) NOT NULL,
    scheduled_date DATE NOT NULL,
    completed_date DATE NULL,
    status VARCHAR(30) NOT NULL,
    technician VARCHAR(100) NOT NULL,
    created_at DATETIME NOT NULL,
    machine_id BIGINT NOT NULL,
    CONSTRAINT fk_maintenance_machine FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE RESTRICT,
    INDEX idx_maintenance_machine (machine_id),
    INDEX idx_maintenance_status (status),
    INDEX idx_maintenance_scheduled (scheduled_date)
);

-- ============================================================
-- 7. PRODUCTION TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS production (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_name VARCHAR(100) NOT NULL,
    quantity_produced INT NOT NULL,
    quantity_rejected INT NOT NULL,
    production_start DATETIME NOT NULL,
    production_end DATETIME NULL,
    status VARCHAR(30) NOT NULL,
    machine_id BIGINT NOT NULL,
    CONSTRAINT fk_production_machine FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE RESTRICT,
    INDEX idx_production_machine (machine_id),
    INDEX idx_production_status (status),
    INDEX idx_production_start (production_start)
);

-- ============================================================
-- 8. ENERGY TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS energy (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    energy_consumption DOUBLE NOT NULL,
    recorded_at DATETIME NOT NULL,
    machine_id BIGINT NOT NULL,
    CONSTRAINT fk_energy_machine FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE RESTRICT,
    INDEX idx_energy_machine (machine_id),
    INDEX idx_energy_recorded_at (recorded_at),
    INDEX idx_energy_machine_recorded (machine_id, recorded_at)
);

-- ============================================================
-- 9. USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(150) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uk_user_username UNIQUE (username),
    CONSTRAINT uk_user_email UNIQUE (email),
    INDEX idx_user_role (role),
    INDEX idx_user_active (active)
);
