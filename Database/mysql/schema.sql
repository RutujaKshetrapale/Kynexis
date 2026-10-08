-- ============================================================
-- KYNEXIS — Connected Industrial Intelligence
-- Database Schema for MySQL 8.x
-- Database: smart_factory_db
-- ============================================================

CREATE DATABASE IF NOT EXISTS smart_factory_db;
USE smart_factory_db;

-- Drop tables in reverse dependency order if needed during setup
DROP TABLE IF EXISTS energy;
DROP TABLE IF EXISTS production;
DROP TABLE IF EXISTS maintenance;
DROP TABLE IF EXISTS alerts;
DROP TABLE IF EXISTS telemetry;
DROP TABLE IF EXISTS sensors;
DROP TABLE IF EXISTS machines;
DROP TABLE IF EXISTS plants;
DROP TABLE IF EXISTS users;

-- ============================================================
-- 1. PLANTS TABLE
-- ============================================================
CREATE TABLE plants (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(150) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    INDEX idx_plant_location (location),
    INDEX idx_plant_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. MACHINES TABLE
-- ============================================================
CREATE TABLE machines (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(100) NOT NULL,
    status VARCHAR(30) NOT NULL,
    plant_id BIGINT NOT NULL,
    CONSTRAINT fk_machine_plant FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE RESTRICT,
    INDEX idx_machine_plant (plant_id),
    INDEX idx_machine_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. SENSORS TABLE
-- ============================================================
CREATE TABLE sensors (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    machine_id BIGINT NOT NULL,
    CONSTRAINT fk_sensor_machine FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE RESTRICT,
    INDEX idx_sensor_machine (machine_id),
    INDEX idx_sensor_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. TELEMETRY TABLE
-- ============================================================
CREATE TABLE telemetry (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. ALERTS TABLE
-- ============================================================
CREATE TABLE alerts (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 6. MAINTENANCE TABLE
-- ============================================================
CREATE TABLE maintenance (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 7. PRODUCTION TABLE
-- ============================================================
CREATE TABLE production (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 8. ENERGY TABLE
-- ============================================================
CREATE TABLE energy (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    energy_consumption DOUBLE NOT NULL,
    recorded_at DATETIME NOT NULL,
    machine_id BIGINT NOT NULL,
    CONSTRAINT fk_energy_machine FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE RESTRICT,
    INDEX idx_energy_machine (machine_id),
    INDEX idx_energy_recorded_at (recorded_at),
    INDEX idx_energy_machine_recorded (machine_id, recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 9. USERS TABLE
-- ============================================================
CREATE TABLE users (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
