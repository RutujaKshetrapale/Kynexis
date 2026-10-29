# KYNEXIS — Microservices Migration Inventory

## 1. Overview & Strategy

This document serves as the authoritative migration inventory mapping every existing controller endpoint, business service, Spring Data repository, JPA entity, Kafka event publisher/consumer, and test suite from the monolithic Spring Boot application (`SpringBoot-Factory-Application`) to its corresponding target microservice module.

### Migration Principles
1. **Zero Downtime & Zero Regression**: The original monolithic application remains 100% intact and verified while microservices are extracted into dedicated modules.
2. **Independent Deployment**: Every extracted service is an independent Spring Boot application with its own entry point (`main` class), runtime port, configuration properties, and test suite.
3. **Dedicated Table Ownership**: Each service only accesses its logically owned database tables through its own persistence boundary.
4. **DTO-Based Network Boundaries**: No JPA entities or Hibernate proxies leak across service boundaries.
5. **Decoupled Asynchronous Streaming**: Telemetry ingestion streams `MachineTelemetryRecorded` to Kafka; Alert Management consumes this event asynchronously to evaluate rules without in-process coupling.
6. **Edge Ingress via API Gateway**: An API Gateway operates on the standard public port `8080`, performing TLS termination, JWT validation, and identity header propagation (`X-User-Id`, `X-User-Roles`, `X-Request-ID`) to internal microservices.

---

## 2. Microservice Module Inventory & Port Allocation

| Module Directory | Artifact ID | Port | Bounded Context | Primary Database Tables |
|---|---|---|---|---|
| `Backend/kynexis-common` | `kynexis-common` | N/A (Library) | Shared Contracts & Events | None |
| `Backend/api-gateway` | `api-gateway` | `8080` | Edge Ingress & Routing | None |
| `Backend/identity-service` | `identity-service` | `8081` | Identity & Access | `users` |
| `Backend/plant-machine-service` | `plant-machine-service` | `8082` | Plant & Machine Management | `plants`, `machines`, `sensors` |
| `Backend/telemetry-service` | `telemetry-service` | `8083` | Telemetry Ingestion | `telemetry` |
| `Backend/alert-service` | `alert-service` | `8084` | Alert Management | `alerts` |
| `Backend/maintenance-service` | `maintenance-service` | `8085` | Health & Predictive Maintenance | `maintenance` |
| `Backend/production-energy-service` | `production-energy-service` | `8086` | Production & Energy Tracking | `production`, `energy` |
| `Backend/dashboard-service` | `dashboard-service` | `8087` | Dashboard Aggregation | None (Redis Cache) |
| `Backend/SpringBoot-Factory-Application` | `SpringBoot-Factory-Application` | `8090` (Reference) | Monolithic Migration Baseline | `smart_factory_db` (All) |

---

## 3. Comprehensive Domain-by-Domain Mapping

### 3.1 Identity & Access Service (`identity-service`)
- **Port**: `8081`
- **Application Entry Point**: `com.kynexis.identity.IdentityServiceApplication`
- **Database Tables**: `users`
- **Entities**:
  - `com.kynexis.identity.entity.User`
  - `com.kynexis.identity.entity.Role`
- **Repositories**:
  - `com.kynexis.identity.repository.UserRepository`
- **Services**:
  - `com.kynexis.identity.service.AuthService`
  - `com.kynexis.identity.security.JwtService`
- **Controllers & Endpoints**:
  - `POST /api/auth/register` — User registration with BCrypt password encoding
  - `POST /api/auth/login` — Authentication and JWT token issuance
- **DTOs**:
  - `LoginRequest`, `LoginResponse`, `RegisterRequest`, `UserResponse`
- **Security & Authorization**:
  - Stateless Spring Security filter chain with public access to `/api/auth/**`.
- **Existing Tests Mapped**:
  - `AuthControllerTest`, `AuthControllerMockMvcTest`, `AuthServiceTest`, `UserRepositoryTest`, `AuthIntegrationTest`, `LoginRequestValidationTest`, `RegisterRequestValidationTest`.

---

### 3.2 Plant & Machine Service (`plant-machine-service`)
- **Port**: `8082`
- **Application Entry Point**: `com.kynexis.plantmachine.PlantMachineServiceApplication`
- **Database Tables**: `plants`, `machines`, `sensors`
- **Entities**:
  - `com.kynexis.plantmachine.entity.Plant`
  - `com.kynexis.plantmachine.entity.Machine`
  - `com.kynexis.plantmachine.entity.Sensor`
- **Repositories**:
  - `com.kynexis.plantmachine.repository.PlantRepository`
  - `com.kynexis.plantmachine.repository.MachineRepository`
  - `com.kynexis.plantmachine.repository.SensorRepository`
- **Services**:
  - `com.kynexis.plantmachine.service.PlantService`
  - `com.kynexis.plantmachine.service.MachineService`
  - `com.kynexis.plantmachine.service.SensorService`
  - `com.kynexis.plantmachine.service.DomainValidationService`
- **Controllers & Endpoints**:
  - `CRUD /api/plants/**`
  - `CRUD /api/machines/**` (including `/status/{status}`, `/plant/{plantId}`, `/search`)
  - `CRUD /api/sensors/**` (including `/machine/{machineId}`, `/active`)
  - **Internal Cross-Service Endpoints**:
    - `GET /api/machines/{id}/exists` — Used by Telemetry, Alert, and Maintenance services to verify machine existence.
    - `GET /api/machines/{id}/summary` — Returns `MachineSummaryDTO` across service boundaries.
    - `GET /api/machines/count` — Used by Dashboard service.
- **DTOs**:
  - `PlantRequest`, `MachineRequest`, `SensorRequest`, `MachineSummaryDTO`
- **Existing Tests Mapped**:
  - `PlantControllerTest`, `MachineControllerTest`, `SensorControllerTest`, `PlantServiceTest`, `MachineServiceTest`, `SensorServiceTest`, `PlantRepositoryTest`, `MachineRepositoryTest`, `SensorRepositoryTest`, `PlantIntegrationTest`, `MachineIntegrationTest`, `SensorIntegrationTest`.

---

### 3.3 Telemetry Service (`telemetry-service`)
- **Port**: `8083`
- **Application Entry Point**: `com.kynexis.telemetry.TelemetryServiceApplication`
- **Database Tables**: `telemetry`
- **Entities**:
  - `com.kynexis.telemetry.entity.Telemetry` (stores `machineId` as foreign identifier)
- **Repositories**:
  - `com.kynexis.telemetry.repository.TelemetryRepository`
- **Services**:
  - `com.kynexis.telemetry.service.TelemetryService`
  - `com.kynexis.telemetry.service.DomainValidationService`
  - `com.kynexis.telemetry.service.KafkaEventPublisherService`
  - `com.kynexis.telemetry.client.MachineServiceClient` (HTTP client querying `plant-machine-service` for machine existence)
- **Controllers & Endpoints**:
  - `POST /api/telemetry` — Ingests readings, validates ranges, persists, and streams to Kafka
  - `GET /api/telemetry/**` — Historical queries by machine, ID, and timestamp range
  - **Internal Cross-Service Endpoints**:
    - `GET /api/telemetry/machine/{machineId}/latest` — Latest reading for health scoring
    - `GET /api/telemetry/machine/{machineId}/recent?limit=10` — Recent readings for trend evaluation
- **Kafka Domain Events Published**:
  - `MachineTelemetryRecorded` -> Topic: `kynexis.machine-telemetry` (Murmur2 partition key: `machineId`)
- **Existing Tests Mapped**:
  - `TelemetryControllerTest`, `TelemetryControllerMockMvcTest`, `TelemetryServiceTest`, `TelemetryRepositoryTest`, `TelemetryIntegrationTest`, `KafkaTransactionalPublicationTest`.

---

### 3.4 Alert Management Service (`alert-service`)
- **Port**: `8084`
- **Application Entry Point**: `com.kynexis.alert.AlertServiceApplication`
- **Database Tables**: `alerts`
- **Entities**:
  - `com.kynexis.alert.entity.Alert` (stores `machineId` and nullable `telemetryId` as foreign identifiers)
- **Repositories**:
  - `com.kynexis.alert.repository.AlertRepository`
- **Services**:
  - `com.kynexis.alert.service.AlertService`
  - `com.kynexis.alert.service.alert.AlertEngineService`
  - `com.kynexis.alert.service.alert.AlertRule` (`TemperatureHighRule`, `MachineStatusRule`, etc.)
  - `com.kynexis.alert.service.KafkaEventPublisherService`
  - `com.kynexis.alert.consumer.TelemetryEventConsumer` (REAL Kafka consumer listening to `kynexis.machine-telemetry` to trigger `AlertEngineService`)
- **Controllers & Endpoints**:
  - `CRUD /api/alerts/**`
  - `GET /api/alerts/unresolved`
  - `GET /api/alerts/machine/{machineId}`
  - `GET /api/alerts/severity/{severity}`
  - `PUT /api/alerts/{id}/resolve`
  - **Internal Cross-Service Endpoints**:
    - `GET /api/alerts/machine/{machineId}/unresolved` — For Health & Predictive Maintenance
    - `GET /api/alerts/count/unresolved` — For Dashboard Aggregator
- **Kafka Domain Events Published**:
  - `MachineAlertCreated`, `MachineAlertUpdated`, `MachineAlertResolved` -> Topic: `kynexis.machine-alerts`
- **Kafka Events Consumed**:
  - `MachineTelemetryRecorded` from `kynexis.machine-telemetry`
- **Existing Tests Mapped**:
  - `AlertControllerTest`, `AlertControllerMockMvcTest`, `AlertServiceTest`, `AlertRepositoryTest`, `AlertIntegrationTest`, `AlertKafkaEventIntegrationTest`, `AlertEngineServiceTest`, `AlertEngineIntegrationTest`.

---

### 3.5 Asset Health & Predictive Maintenance Service (`maintenance-service`)
- **Port**: `8085`
- **Application Entry Point**: `com.kynexis.maintenance.MaintenanceServiceApplication`
- **Database Tables**: `maintenance`
- **Entities**:
  - `com.kynexis.maintenance.entity.Maintenance` (stores `machineId` as foreign identifier)
- **Repositories**:
  - `com.kynexis.maintenance.repository.MaintenanceRepository`
- **Services**:
  - `com.kynexis.maintenance.service.MaintenanceService`
  - `com.kynexis.maintenance.service.MachineHealthService` (queries `plant-machine-service`, `telemetry-service`, and `alert-service` via HTTP client)
  - `com.kynexis.maintenance.service.PredictiveMaintenanceService` (evaluates multi-day telemetry trends and maintenance history)
- **Controllers & Endpoints**:
  - `CRUD /api/maintenance/**`
  - `GET /api/machine-health/{machineId}`
  - `GET /api/machine-health` (bulk paginated)
  - `GET /api/predictive-maintenance/{machineId}`
  - `GET /api/predictive-maintenance` (bulk paginated with risk filter)
- **DTOs**:
  - `MaintenanceRequest`, `MachineHealthResponse`, `PredictiveMaintenanceResponse`
- **Existing Tests Mapped**:
  - `MaintenanceControllerTest`, `MaintenanceControllerMockMvcTest`, `MaintenanceServiceTest`, `MaintenanceRepositoryTest`, `MaintenanceIntegrationTest`, `MachineHealthServiceTest`, `MachineHealthIntegrationTest`, `PredictiveMaintenanceServiceTest`, `PredictiveMaintenanceIntegrationTest`.

---

### 3.6 Production & Energy Service (`production-energy-service`)
- **Port**: `8086`
- **Application Entry Point**: `com.kynexis.productionenergy.ProductionEnergyServiceApplication`
- **Database Tables**: `production`, `energy`
- **Entities**:
  - `com.kynexis.productionenergy.entity.Production`
  - `com.kynexis.productionenergy.entity.Energy`
- **Repositories**:
  - `com.kynexis.productionenergy.repository.ProductionRepository`
  - `com.kynexis.productionenergy.repository.EnergyRepository`
- **Services**:
  - `com.kynexis.productionenergy.service.ProductionService`
  - `com.kynexis.productionenergy.service.EnergyService`
- **Controllers & Endpoints**:
  - `CRUD /api/production/**` (including `/machine/{machineId}`, `/status/{status}`)
  - `CRUD /api/energy/**` (including `/machine/{machineId}`, `/range`)
  - **Internal Cross-Service Endpoints**:
    - `GET /api/production/metrics/summary` (total produced, total rejected)
    - `GET /api/energy/metrics/summary` (total consumption)
- **DTOs**:
  - `ProductionRequest`, `EnergyRequest`
- **Existing Tests Mapped**:
  - `ProductionControllerTest`, `EnergyControllerTest`, `ProductionServiceTest`, `EnergyServiceTest`, `ProductionRepositoryTest`, `EnergyRepositoryTest`, `ProductionIntegrationTest`, `EnergyIntegrationTest`.

---

### 3.7 Dashboard Aggregator Service (`dashboard-service`)
- **Port**: `8087`
- **Application Entry Point**: `com.kynexis.dashboard.DashboardServiceApplication`
- **Database Tables**: None (Uses Redis cache)
- **Services**:
  - `com.kynexis.dashboard.service.DashboardService` (aggregates metrics by querying `plant-machine-service`, `alert-service`, and `production-energy-service` via HTTP client with circuit-breaker fallback)
- **Controllers & Endpoints**:
  - `GET /api/dashboard/summary` — Cached executive summary
  - `GET /api/dashboard/machine-status` — Cached operational counts
- **DTOs**:
  - `DashboardSummaryResponse`, `DashboardMachineStatusResponse`
- **Existing Tests Mapped**:
  - `DashboardControllerTest`, `DashboardControllerMockMvcTest`, `DashboardServiceTest`, `DashboardCachingIntegrationTest`, `RedisCacheFallbackTest`, `RedisCacheSerializationTest`.

---

### 3.8 API Gateway (`api-gateway`)
- **Port**: `8080` (Standard public API port)
- **Application Entry Point**: `com.kynexis.gateway.ApiGatewayApplication`
- **Dependencies**: Spring Web MVC, Spring Security, JJWT (No incompatible Spring Cloud release train dependencies)
- **Routing Rules**:
  - Forward `/api/auth/**` -> `http://localhost:8081`
  - Forward `/api/plants/**`, `/api/machines/**`, `/api/sensors/**` -> `http://localhost:8082`
  - Forward `/api/telemetry/**` -> `http://localhost:8083`
  - Forward `/api/alerts/**` -> `http://localhost:8084`
  - Forward `/api/maintenance/**`, `/api/machine-health/**`, `/api/predictive-maintenance/**` -> `http://localhost:8085`
  - Forward `/api/production/**`, `/api/energy/**` -> `http://localhost:8086`
  - Forward `/api/dashboard/**` -> `http://localhost:8087`
- **Security & Identity Propagation**:
  - Validates client Bearer JWT on protected routes.
  - Generates/propagates `X-Request-ID`.
  - Injects `X-User-Id`, `X-User-Roles`, `X-User-Email` into internal downstream HTTP requests.
  - Strips external untrusted headers.
- **Actuator & OpenAPI**: Exposes `/actuator/health` and Swagger UI aggregating API docs.

---

## 4. Migration Execution Plan & Stages

1. **Stage 1: Multi-Module Root Setup & Common Contracts (`kynexis-common`)**
   - Create parent POM at `Backend/pom.xml`.
   - Create `kynexis-common` module containing event schemas, exceptions, shared DTOs, and correlation filters.
2. **Stage 2: Core Extraction (Identity, Plant-Machine, Production-Energy)**
   - Extract independent Spring Boot apps for low-coupling services.
3. **Stage 3: Event-Driven Pipeline (Telemetry & Alert Management)**
   - Extract `telemetry-service` (Kafka publisher) and `alert-service` (Kafka consumer).
4. **Stage 4: Composite Intelligence (Maintenance & Dashboard)**
   - Extract `maintenance-service` and `dashboard-service`.
5. **Stage 5: API Gateway & Integration Testing**
   - Deploy `api-gateway` and verify end-to-end routing through gateway with full automated test suite.
