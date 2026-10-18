# KYNEXIS — Database Maintenance & Setup (MySQL)

This directory maintains the canonical database schema and development seed data for **KYNEXIS — Connected Industrial Intelligence**.

---

## 1. Database Overview

* **Database Name**: `smart_factory_db`
* **Target RDBMS**: MySQL 8.0 / 8.x
* **Charset**: `utf8mb4`
* **Collation**: `utf8mb4_unicode_ci`
* **Storage Engine**: `InnoDB`
* **Total Tables**: 11

### Schema Architecture

```text
               +---------------+
               |    plants     |
               +---------------+
                       | 1
                       |
                       | *
               +---------------+
               |   machines    |
               +---------------+
            /      |       |       \
          *        *       *        *
  +---------+ +--------+ +------+ +-------------+ +----------+ +--------+
  | sensors | |telemetry| |energy| |maintenance | |production| | alerts |
  +---------+ +--------+ +------+ +-------------+ +----------+ +--------+
                 |                                                 |
                 * (outbox_events)                                 * (processed_events)
```

---

## 2. Table Index & Microservice Ownership

| # | Table Name | Owning Microservice | Purpose | Foreign Keys |
|---|------------|---------------------|---------|--------------|
| 1 | `plants` | `plant-service` | Industrial manufacturing sites and facility locations | None |
| 2 | `machines` | `machine-service` | Industrial equipment and machinery assets | `plant_id` → `plants(id)` |
| 3 | `sensors` | `sensor-service` | IoT sensors attached to machinery | `machine_id` → `machines(id)` |
| 4 | `telemetry` | `telemetry-service` | Real-time sensor metrics (temperature, vibration, pressure, RPM) | `machine_id` → `machines(id)` |
| 5 | `outbox_events` | `telemetry-service` | Transactional outbox for dual-write prevention to Kafka | None |
| 6 | `alerts` | `alert-service` | System alerts and threshold warnings | `machine_id` → `machines(id)`, `telemetry_id` → `telemetry(id)` |
| 7 | `processed_events` | `alert-service` | Idempotent event processing tracker for deduplication | None |
| 8 | `maintenance` | `maintenance-service` | Preventive and corrective maintenance work orders | `machine_id` → `machines(id)` |
| 9 | `production` | `production-service` | Manufacturing batch outputs and quality metrics | `machine_id` → `machines(id)` |
| 10 | `energy` | `energy-service` | Kilowatt-hour energy consumption records | `machine_id` → `machines(id)` |
| 11 | `users` | `authentication-service` | User authentication, RBAC roles (`ADMIN`, `ENGINEER`, `OPERATOR`, `MANAGER`) | None |

---

## 3. Setup Instructions

### Prerequisites
- MySQL 8.0+ Server installed and running locally or on server
- MySQL Client command-line interface (`mysql`)

### Execution via MySQL CLI

1. **Clone & Navigate**:
   ```bash
   cd Kynexis/Database/mysql
   ```

2. **Execute Non-Destructive Schema Creation**:
   ```bash
   mysql -u <DB_USERNAME> -p < schema.sql
   ```

3. **Execute Repeatable Development Seed Data**:
   ```bash
   mysql -u <DB_USERNAME> -p < seed_data.sql
   ```

4. **Development-Only Database Reset** *(Optional - Drops and recreates all tables)*:
   ```bash
   mysql -u <DB_USERNAME> -p < reset_dev_db.sql
   ```

---

## 4. Development Credentials & Security

### Seed Users
The development seed data includes sample accounts for testing all RBAC roles:

* **Admin**: `admin` / `Password123!`
* **Engineer**: `engineer_sarah` / `Password123!`
* **Operator**: `operator_john` / `Password123!`
* **Manager**: `manager_alex` / `Password123!`

> **Security Note**: Never use seed users or default development password hashes in production environments.

### Spring Boot Configuration
In `application.properties`, configure credentials via environment variables:

```properties
spring.datasource.url=${DB_URL:jdbc:mysql://localhost:3306/smart_factory_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Kolkata}
spring.datasource.username=${DB_USERNAME:root}
spring.datasource.password=${DB_PASSWORD:}
```
