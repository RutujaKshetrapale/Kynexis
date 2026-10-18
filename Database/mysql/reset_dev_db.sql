-- ============================================================
-- KYNEXIS — Connected Industrial Intelligence
-- DEVELOPMENT-ONLY DATABASE RESET SCRIPT
-- Database: smart_factory_db
-- WARNING: This script drops all tables and reinitializes the database.
-- DO NOT RUN IN PRODUCTION OR AGAINST PERSISTENT DATA VOLUMES!
-- ============================================================

CREATE DATABASE IF NOT EXISTS smart_factory_db;
USE smart_factory_db;

-- Drop all tables in reverse dependency order
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS outbox_events;
DROP TABLE IF EXISTS processed_events;
DROP TABLE IF EXISTS energy;
DROP TABLE IF EXISTS production;
DROP TABLE IF EXISTS maintenance;
DROP TABLE IF EXISTS alerts;
DROP TABLE IF EXISTS telemetry;
DROP TABLE IF EXISTS sensors;
DROP TABLE IF EXISTS machines;
DROP TABLE IF EXISTS plants;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- Run schema creation
SOURCE schema.sql;

-- Run development seed data
SOURCE seed_data.sql;
