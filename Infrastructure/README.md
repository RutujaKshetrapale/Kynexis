# KYNEXIS Infrastructure & Orchestration

This directory houses infrastructure configuration and documentation for orchestrating the **10 KYNEXIS Backend Microservices** along with supporting databases and message brokers.

---

## 1. Architecture & Port Mapping

| Service | Port | Base Path | Description |
|---|---|---|---|
| `api-gateway` | `8080` | `/api/**`, `/ws/**` | Gateway routing, JWT auth filter, dashboard aggregation BFF, WebSocket broker |
| `authentication-service` | `8081` | `/api/auth/**` | Registration, login, JWT issuance and validation, role enforcement |
| `plant-service` | `8082` | `/api/plants/**` | Manufacturing plant registry and facility metadata |
| `machine-service` | `8088` | `/api/machines/**` | Machine equipment registration, status, and plant association |
| `sensor-service` | `8089` | `/api/sensors/**` | IoT sensor configuration, metadata, and machine association |
| `telemetry-service` | `8083` | `/api/telemetry/**` | Ingests sensor metrics, validates readings, Kafka event publishing with transactional outbox |
| `alert-service` | `8084` | `/api/alerts/**` | Threshold evaluation, alert management, idempotent event consumption |
| `maintenance-service` | `8085` | `/api/maintenance/**` | Maintenance work orders, schedules, machine health assessments |
| `production-service` | `8086` | `/api/production/**` | Production records, batch tracking, target & output calculations |
| `energy-service` | `8087` | `/api/energy/**` | Energy consumption logs, efficiency calculations, KPI reporting |
| `mysql` | `3306` | - | Central MySQL 8.0 instance for `smart_factory_db` |
| `redis` | `6379` | - | High-speed caching store for rate limiting / cache |
| `kafka` | `9092` | - | Event backbone for telemetry and alert streaming |

---

## 2. Docker Compose Deployment

The root `docker-compose.yml` coordinates the complete system:

```bash
# Validate Compose configuration
docker compose config

# Build JAR artifacts before running containers
cd Backend
mvn clean package -DskipTests
cd ..

# Start all infrastructure and microservices
docker compose up -d --build

# Inspect running container health status
docker compose ps

# View logs for a specific service
docker compose logs -f telemetry-service
```

---

## 3. Database Initialization

The MySQL container mounts:
- `Database/mysql/schema.sql` -> `/docker-entrypoint-initdb.d/01_schema.sql`
- `Database/mysql/seed_data.sql` -> `/docker-entrypoint-initdb.d/02_seed_data.sql`

On initial launch, `smart_factory_db` is automatically created with tables and seeded accounts (`admin`, `engineer_sarah`, `operator_john`, `manager_alex`).

---

## 4. Security Configuration

All services accept the following environment variables for secrets:
- `JWT_SECRET`: Signing secret for HS256 JWT tokens.
- `INTERNAL_API_SECRET`: Shared header `X-Internal-Secret` for direct inter-service verification.
- `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`: Database credentials.
