# KYNEXIS Database Ownership & Isolation Architecture

## 1. Domain Ownership Mapping

| Microservice | Owned Tables | Logical Boundary Description | Foreign References Managed |
| :--- | :--- | :--- | :--- |
| **`authentication-service`** | `users` | User accounts, credentials (BCrypt), RBAC role assignments | None |
| **`plant-service`** | `plants` | Manufacturing plant registry and facility metadata | None |
| **`machine-service`** | `machines` | Machine equipment registration, status, and plant association | Internal foreign key: `machines.plant_id -> plants.id` |
| **`sensor-service`** | `sensors` | IoT sensor configuration, metadata, and machine association | Internal foreign key: `sensors.machine_id -> machines.id` |
| **`telemetry-service`** | `telemetry`, `outbox_events` | Time-series raw operational sensor telemetry and transactional outbox for reliable event dispatch | Stores foreign `machine_id` (validated via HTTP check to `machine-service`) |
| **`alert-service`** | `alerts`, `processed_events` | Threshold breaches, rule evaluation state, incident lifecycle, and idempotency dedup log | Stores foreign `machine_id` and optional `telemetry_id` |
| **`maintenance-service`** | `maintenance` | Maintenance work orders, scheduling, technician logs, predictive health assessments | Stores foreign `machine_id` |
| **`production-service`** | `production` | Output metrics, reject ratios, batch tracking | Stores foreign `machine_id` |
| **`energy-service`** | `energy` | Kilowatt-hour energy consumption records, efficiency metrics | Stores foreign `machine_id` |
| **`api-gateway`** | *Read model / in-memory cache* | Request routing, JWT validation, and aggregated operational KPI dashboards | Aggregates data via HTTP REST clients from downstream services |

---

## 2. Shared-Database Boundary Enforcement (Transitional Phase)

During the transitional architecture:
1. **Zero Cross-Service JPA Relationships:**
   - No JPA `@ManyToOne` or `@JoinColumn` exists between entities across different microservices.
   - Cross-domain entity links are strictly maintained as primitive scalar identifiers (`Long machineId`, `Long telemetryId`).
2. **Zero Direct Foreign Table Access:**
   - No service contains `@Table` mappings or Spring Data Repositories for tables owned by another service.
   - For instance, `telemetry-service` has zero repository or entity for `plants` or `machines`. It validates machine existence solely by calling `GET /api/machines/{id}/exists` on `plant-machine-service`.
3. **Hibernate DDL Enforcement:**
   - All services configure `spring.jpa.hibernate.ddl-auto=none` to strictly prohibit altering, dropping, or mutating foreign schemas at runtime.
4. **Internal Communication Security:**
   - Microservice-to-microservice REST communication is secured via mutual `X-Internal-Secret` verification and correlation ID propagation.

---

## 3. Dedicated Database Migration Roadmap

```
+-----------------------------------------------------------------------------------------+
|                                    Current Phase                                        |
|                          Transitional Shared Physical MySQL                             |
|                           (smart_factory_db on Port 3306)                               |
|        Isolated tables per service boundary, enforced via Spring Data JPA isolation    |
+--------------------------------------------+--------------------------------------------+
                                             |
                                             v
+-----------------------------------------------------------------------------------------+
|                                      Phase 2                                            |
|                           Separate MySQL Schemas per Service                            |
|             (kynexis_identity, kynexis_plant_machine, kynexis_telemetry, etc.)           |
|                Separate database users with restricted schema-level GRANTs              |
+--------------------------------------------+--------------------------------------------+
                                             |
                                             v
+-----------------------------------------------------------------------------------------+
|                                      Target Phase                                       |
|                   Fully Independent Databases & Storage Engines                         |
|   Telemetry -> Time-series store (TimescaleDB / ClickHouse)                             |
|   Dashboard -> In-memory materialized views (Redis / ClickHouse)                        |
|   Core Entities -> Independent MySQL / PostgreSQL instances                             |
+-----------------------------------------------------------------------------------------+
```

### Transition Steps for Dedicated Schemas:
1. **Schema Separation:**
   - Execute `CREATE SCHEMA kynexis_identity;`, `CREATE SCHEMA kynexis_plant_machine;`, `CREATE SCHEMA kynexis_telemetry;`, `CREATE SCHEMA kynexis_alert;`, `CREATE SCHEMA kynexis_maintenance;`, `CREATE SCHEMA kynexis_production_energy;`.
2. **User Grants:**
   - Provision dedicated DB credentials per microservice granting `SELECT, INSERT, UPDATE, DELETE` only on its respective schema.
3. **Zero Code Changes Required:**
   - Because all microservices already use decoupled scalar IDs and REST client APIs, no Java code modifications are necessary—only the `SPRING_DATASOURCE_URL` in each service's configuration needs updating to point to its respective schema.
