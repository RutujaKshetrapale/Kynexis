# KYNEXIS — 10 Backend Microservices Architecture Specification

## 1. Overview & Service Responsibilities

KYNEXIS backend is structured into exactly 10 independent microservices, each running as a standalone Spring Boot 4.0.7 / Java 21 application:

| # | Microservice | Port | Owning Package | Core Responsibility |
|---|---|---|---|---|
| 1 | **`api-gateway`** | `8080` | `com.kynexis.gateway` | Reverse proxy routing, JWT token extraction & validation, internal secret header injection, WebSocket broker (`/ws`), and dashboard BFF aggregation read model (`/api/dashboard/**`). |
| 2 | **`authentication-service`** | `8081` | `com.kynexis.auth` | User registration, login, BCrypt password hashing, JWT creation/validation, and RBAC role assignments (`ADMIN`, `ENGINEER`, `OPERATOR`, `MANAGER`). |
| 3 | **`plant-service`** | `8082` | `com.kynexis.plant` | Industrial plant and facility management, plant metadata, location registry, and activation lifecycle. |
| 4 | **`machine-service`** | `8088` | `com.kynexis.machine` | Machine asset registration, operational status tracking (`RUNNING`, `IDLE`, `MAINTENANCE`, `OFFLINE`), and plant association validation. |
| 5 | **`sensor-service`** | `8089` | `com.kynexis.sensor` | IoT sensor configuration, measurement units (`°C`, `mm/s`, `PSI`, `RPM`), and machine association. |
| 6 | **`telemetry-service`** | `8083` | `com.kynexis.telemetry` | High-frequency telemetry ingestion, reading validation, time-series persistence, and dual-write prevented Kafka event publishing via transactional outbox. |
| 7 | **`alert-service`** | `8084` | `com.kynexis.alert` | Industrial threshold evaluation, alert creation, acknowledgment, resolution, and idempotent telemetry event processing. |
| 8 | **`maintenance-service`** | `8085` | `com.kynexis.maintenance` | Preventive and corrective maintenance work orders, technician scheduling, and rule-based machine health assessment. |
| 9 | **`production-service`** | `8086` | `com.kynexis.production` | Batch production records, target vs. actual outputs, reject tracking, and yield efficiency calculations. |
| 10 | **`energy-service`** | `8087` | `com.kynexis.energy` | Energy consumption monitoring (kWh), specific energy consumption (SEC) metrics, and plant-level energy summaries. |

---

## 2. API Routing & Port Matrix

All client traffic is routed through **`api-gateway` on port `8080`**:

| Route Pattern | Target Microservice | Target Port | Description |
|---|---|---|---|
| `/api/auth/**` | `authentication-service` | `8081` | Authentication and user management |
| `/api/plants/**` | `plant-service` | `8082` | Plant facility operations |
| `/api/machines/**` | `machine-service` | `8088` | Machine asset operations |
| `/api/machines/{id}/health` | `maintenance-service` | `8085` | Machine operational health assessment |
| `/api/sensors/**` | `sensor-service` | `8089` | IoT sensor operations |
| `/api/telemetry/**` | `telemetry-service` | `8083` | Sensor reading ingestion & history |
| `/api/alerts/**` | `alert-service` | `8084` | Industrial alert lifecycle |
| `/api/maintenance/**` | `maintenance-service` | `8085` | Maintenance work orders |
| `/api/production/**` | `production-service` | `8086` | Production records & KPIs |
| `/api/energy/**` | `energy-service` | `8087` | Energy consumption & efficiency |
| `/api/dashboard/**` | `api-gateway` (Internal BFF) | `8080` | Aggregated dashboard summary & status |
| `/ws/**` | `api-gateway` (STOMP Broker) | `8080` | Real-time WebSocket notifications |

---

## 3. Database Schema & Table Ownership

The architecture connects to a single MySQL 8.x database: `smart_factory_db`. Table ownership is strictly partitioned with zero cross-service JPA relationships:

| Table | Owning Microservice | Schema Definition | Key Constraints |
|---|---|---|---|
| `users` | `authentication-service` | `Database/mysql/schema.sql` | `uk_user_username`, `uk_user_email` |
| `plants` | `plant-service` | `Database/mysql/schema.sql` | Primary key `id` |
| `machines` | `machine-service` | `Database/mysql/schema.sql` | `fk_machine_plant` (`plant_id` -> `plants.id`) |
| `sensors` | `sensor-service` | `Database/mysql/schema.sql` | `fk_sensor_machine` (`machine_id` -> `machines.id`) |
| `telemetry` | `telemetry-service` | `Database/mysql/schema.sql` | `fk_telemetry_machine` (`machine_id` -> `machines.id`) |
| `outbox_events` | `telemetry-service` | `Database/mysql/schema.sql` | Transactional outbox table for Kafka events |
| `alerts` | `alert-service` | `Database/mysql/schema.sql` | `fk_alert_machine`, `fk_alert_telemetry` |
| `processed_events` | `alert-service` | `Database/mysql/schema.sql` | Unique `event_id` for idempotent deduplication |
| `maintenance` | `maintenance-service` | `Database/mysql/schema.sql` | `fk_maintenance_machine` (`machine_id` -> `machines.id`) |
| `production` | `production-service` | `Database/mysql/schema.sql` | `fk_production_machine` (`machine_id` -> `machines.id`) |
| `energy` | `energy-service` | `Database/mysql/schema.sql` | `fk_energy_machine` (`machine_id` -> `machines.id`) |

---

## 4. Environment Variables & Security

| Variable | Default Value | Description |
|---|---|---|
| `SERVER_PORT` | Varies per service (`8080`–`8089`) | Local HTTP port for the microservice |
| `SPRING_DATASOURCE_URL` | `jdbc:mysql://localhost:3306/smart_factory_db?useSSL=false&allowPublicKeyRetrieval=true` | JDBC connection URL |
| `SPRING_DATASOURCE_USERNAME` | `root` | Database username |
| `SPRING_DATASOURCE_PASSWORD` | (empty or `root`) | Database password |
| `JWT_SECRET` | `SmartFactorySecretKeyForDevelopmentOnly123456789` | HMAC-SHA256 signing secret key |
| `INTERNAL_API_SECRET` | `KynexisInternalServiceCommunicationSecretKey2026` | Header `X-Internal-Secret` for direct inter-service verification |
| `SPRING_KAFKA_BOOTSTRAP_SERVERS` | `localhost:9092` | Kafka broker bootstrap list |

---

## 5. Startup & Execution Instructions

### Local Development (Maven)
Build all 10 microservices from the reactor:
```bash
cd Backend
mvn clean test
```

Start an individual service (e.g. `plant-service`):
```bash
cd Backend/plant-service
mvn spring-boot:run
```

### Containerized Environment (Docker Compose)
```bash
# Verify configuration
docker compose config

# Package JARs
cd Backend
mvn clean package -DskipTests
cd ..

# Start all 10 services and infrastructure
docker compose up -d --build
```

---

## 6. Known Architectural Considerations
- **Single Physical Database**: All services share `smart_factory_db`. While table ownership is logically partitioned at the JPA level, foreign keys at the MySQL level ensure referential integrity.
- **Service-to-Service REST Clients**: Services use non-blocking `RestClient` with 3-second connection and 5-second read timeouts, propagating `X-Correlation-ID` and `X-Internal-Secret`.
