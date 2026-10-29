# KYNEXIS — Phase 20: Apache Kafka Event Streaming

## 1. Overview & Role in KYNEXIS

KYNEXIS is a connected industrial intelligence platform operating in a smart manufacturing plant. In Phase 20, **Apache Kafka** is introduced as an event-streaming backbone to decouple critical telemetry ingestion and alert lifecycle events from downstream asynchronous consumers (such as predictive maintenance background workers, real-time analytics pipelines, long-term archival storage, and external ERP/MES integrations).

### Core Goals:
- **Asynchronous Decoupling**: Offload downstream processing from the critical synchronous HTTP request path.
- **Reliable Domain Event Publication**: Stream `MachineTelemetryRecorded`, `MachineAlertCreated`, `MachineAlertUpdated`, and `MachineAlertResolved` events.
- **Transaction-Aware Boundary**: Guarantee that events are published only after database operations commit (`afterCommit` synchronization), avoiding ghost notifications if a transaction rolls back.
- **Deterministic Partitioning**: Ensure per-machine ordering by keying events by `machineId`.
- **Microservices-Ready Foundation**: Establish stable event contracts and infrastructure without prematurely decomposing the application into separate microservices.

---

## 2. Producer Architecture & Event Flow

```text
       HTTP Ingestion (REST)
                 │
                 ▼
         Domain Validation
                 │
                 ▼
      Database Persistence (JPA)
        (Telemetry / Alert Save)
                 │
                 ├──────────────────────────┐
                 │                          │
                 ▼                          ▼
      WebSocket Notification       Transaction Boundary Check
      (SimpMessagingTemplate)      (TransactionSynchronizationManager)
                                            │
                                  ┌─────────┴─────────┐
                                  │ Active Tx?        │
                                  ▼                   ▼
                           [YES: AFTER_COMMIT]    [NO: IMMEDIATE]
                                  │                   │
                                  └─────────┬─────────┘
                                            │
                                            ▼
                                  KafkaEventPublisherService
                                   (Non-blocking Async Send)
                                            │
                                            ▼
                                   Apache Kafka Broker
                          (Partition Key = String.valueOf(machineId))
                                     /             \
                                    /               \
                                   ▼                 ▼
             kynexis.machine-telemetry          kynexis.machine-alerts
```

### Publication Flow:
1. **Telemetry Lifecycle**:
   - `POST /api/telemetry` received by `TelemetryController` -> delegated to `TelemetryService.create(request)`.
   - Domain validation verifies sensor ranges.
   - Entity is persisted to MySQL/H2 via `telemetryRepository.save(telemetry)`.
   - In-memory WebSocket update is dispatched via `webSocketEventPublisherService.publishTelemetry(savedTelemetry)`.
   - Kafka event is triggered via `kafkaEventPublisherService.publishTelemetryRecorded(savedTelemetry)`.
   - If a surrounding transaction is active, Kafka send is registered as an `afterCommit` synchronization hook.
   - If alert engine evaluates telemetry and triggers alert creation/resolution, corresponding alert events are published.
2. **Alert Lifecycle**:
   - Triggered via `AlertService.create` or `AlertService.update` (either from `AlertEngineService` rule evaluation or manual REST API actions).
   - Entity is persisted via `alertRepository.save(alert)`.
   - In-memory WebSocket update is dispatched via `webSocketEventPublisherService.publishAlert(...)`.
   - If `alert.isResolved() == true`: `kafkaEventPublisherService.publishAlertResolved(savedAlert)` is dispatched.
   - If `alert.isResolved() == false` on create: `kafkaEventPublisherService.publishAlertCreated(savedAlert)` is dispatched.
   - If `alert.isResolved() == false` on update: `kafkaEventPublisherService.publishAlertUpdated(savedAlert)` is dispatched.

---

## 3. Topic Design & Partition-Key Strategy

### Topic Definitions

| Topic Name | Default Configuration | Purpose |
|------------|-----------------------|---------|
| `kynexis.machine-telemetry` | `kynexis.kafka.topics.machine-telemetry` | Time-series sensor telemetry readings (temperature, vibration, pressure, RPM) |
| `kynexis.machine-alerts` | `kynexis.kafka.topics.machine-alerts` | Machine alert lifecycle events (creation, severity updates, and resolution) |

### Partition Key Strategy:
- **Key**: `String.valueOf(machineId)`
- **Partitioning Rule**: Using the standard Kafka Murmur2 partitioner, all events for a given `machineId` are consistently routed to the same partition within each topic.
- **Ordering Guarantee**: Kafka guarantees strict chronological order **within a single partition**. Keying by `machineId` ensures that telemetry readings and alert status transitions for the same machine are processed sequentially in exact temporal order.
- **Global Ordering Caveat**: Ordering across different machines (different partitions) is not guaranteed and must not be assumed by downstream consumers.

---

## 4. Event DTO Schemas

All event contracts reside in `com.example.demo.dto.event` and implement the `KynexisEvent` interface. They use Jackson JSON serialization with `JavaTimeModule` support (ISO-8601 formatting). No JPA entities, database relationships, passwords, secrets, or JWTs are serialized.

> [!NOTE]
> **Timestamp Types**: All event timestamp fields (`timestamp`, `telemetryTimestamp`, and `alertCreatedAt`) are implemented as `java.time.LocalDateTime` formatted as ISO-8601 local date-time strings (`yyyy-MM-dd'T'HH:mm:ss`) using `@JsonFormat`. They represent local plant time aligned with the underlying JPA entities (`Telemetry.timestamp` and `Alert.createdAt`), rather than UTC `Instant` or epoch milliseconds. Downstream consumers should parse these fields as ISO-8601 local date-time strings.

### Common Contract (`KynexisEvent`):
- `eventId`: `String` (UUID) — Globally unique identifier for event deduplication.
- `eventType`: `String` — Event type discriminator name.
- `schemaVersion`: `String` — Semantic schema version (current: `"1.0"`).
- `timestamp`: `LocalDateTime` (ISO-8601 string, pattern `"yyyy-MM-dd'T'HH:mm:ss"`) — Timestamp when the event was generated.
- `machineId`: `Long` — Unique ID of the affected machine asset (used as Kafka partition key).
- `correlationId`: `String` — Distributed correlation / request ID extracted from SLF4J MDC (`X-Request-ID`).

### 1. `MachineTelemetryRecorded`
Published when new machine sensor telemetry is ingested and persisted.
- `eventId`: `String` (UUID)
- `eventType`: `String` (`"MachineTelemetryRecorded"`)
- `schemaVersion`: `String` (`"1.0"`)
- `timestamp`: `LocalDateTime` (`"yyyy-MM-dd'T'HH:mm:ss"`) — Event creation timestamp
- `machineId`: `Long` — Machine asset identifier
- `telemetryId`: `Long` — Persisted telemetry record identifier
- `temperature`: `Double` — Temperature reading (°C)
- `vibration`: `Double` — Vibration reading (mm/s)
- `pressure`: `Double` — Pressure reading (bar)
- `rpm`: `Double` — Rotational speed reading (RPM)
- `telemetryTimestamp`: `LocalDateTime` (`"yyyy-MM-dd'T'HH:mm:ss"`) — Ingestion/sensor timestamp
- `correlationId`: `String` — Request tracing ID (nullable)

```json
{
  "eventId": "3de53984-76c8-4ac2-b866-97c38d032ddf",
  "eventType": "MachineTelemetryRecorded",
  "schemaVersion": "1.0",
  "timestamp": "2026-10-15T10:00:00",
  "machineId": 42,
  "telemetryId": 1001,
  "temperature": 80.5,
  "vibration": 1.1,
  "pressure": 50.0,
  "rpm": 3100.0,
  "telemetryTimestamp": "2026-10-15T10:00:00",
  "correlationId": "test-req-telemetry-1"
}
```

### 2. `MachineAlertCreated`
Published when an alert rule triggers a new alert condition.
- `eventId`: `String` (UUID)
- `eventType`: `String` (`"MachineAlertCreated"`)
- `schemaVersion`: `String` (`"1.0"`)
- `timestamp`: `LocalDateTime` (`"yyyy-MM-dd'T'HH:mm:ss"`) — Event creation timestamp
- `machineId`: `Long` — Machine asset identifier
- `alertId`: `Long` — Alert record identifier
- `alertType`: `String` — Rule/alert category (e.g., `"TEMPERATURE_HIGH"`)
- `severity`: `String` — Alert severity (`"LOW"`, `"MEDIUM"`, `"HIGH"`, `"CRITICAL"`)
- `message`: `String` — Human-readable alert summary
- `resolved`: `boolean` — Current alert status (`false`)
- `alertCreatedAt`: `LocalDateTime` (`"yyyy-MM-dd'T'HH:mm:ss"`) — Timestamp when alert entity was created
- `telemetryId`: `Long` — Associated telemetry identifier (nullable)
- `correlationId`: `String` — Request tracing ID (nullable)

```json
{
  "eventId": "5309e80c-bdb4-43b3-b245-5c14c6569070",
  "eventType": "MachineAlertCreated",
  "schemaVersion": "1.0",
  "timestamp": "2026-10-15T10:05:00",
  "machineId": 43,
  "alertId": 501,
  "alertType": "TEMPERATURE_HIGH",
  "severity": "HIGH",
  "message": "Spindle overheat detected",
  "resolved": false,
  "alertCreatedAt": "2026-10-15T10:05:00",
  "telemetryId": 2001,
  "correlationId": "test-req-alert-create"
}
```

### 3. `MachineAlertUpdated`
Published on meaningful alert state or severity updates.
- `eventId`: `String` (UUID)
- `eventType`: `String` (`"MachineAlertUpdated"`)
- `schemaVersion`: `String` (`"1.0"`)
- `timestamp`: `LocalDateTime` (`"yyyy-MM-dd'T'HH:mm:ss"`) — Event creation timestamp
- `machineId`: `Long` — Machine asset identifier
- `alertId`: `Long` — Alert record identifier
- `alertType`: `String` — Rule/alert category
- `severity`: `String` — Updated severity
- `message`: `String` — Updated message summary
- `resolved`: `boolean` — Current alert status (`false`)
- `alertCreatedAt`: `LocalDateTime` (`"yyyy-MM-dd'T'HH:mm:ss"`) — Timestamp when alert entity was created
- `telemetryId`: `Long` — Associated telemetry identifier (nullable)
- `correlationId`: `String` — Request tracing ID (nullable)

```json
{
  "eventId": "b87e60cf-5c1c-46ff-98a4-9d55f19e9a6e",
  "eventType": "MachineAlertUpdated",
  "schemaVersion": "1.0",
  "timestamp": "2026-10-15T10:10:00",
  "machineId": 44,
  "alertId": 502,
  "alertType": "VIBRATION_HIGH",
  "severity": "CRITICAL",
  "message": "Bearing vibration exceeded critical limit",
  "resolved": false,
  "alertCreatedAt": "2026-10-15T10:10:00",
  "telemetryId": null,
  "correlationId": "test-req-alert-update"
}
```

### 4. `MachineAlertResolved`
Published when an open alert is marked as resolved.
- `eventId`: `String` (UUID)
- `eventType`: `String` (`"MachineAlertResolved"`)
- `schemaVersion`: `String` (`"1.0"`)
- `timestamp`: `LocalDateTime` (`"yyyy-MM-dd'T'HH:mm:ss"`) — Event creation timestamp
- `machineId`: `Long` — Machine asset identifier
- `alertId`: `Long` — Alert record identifier
- `alertType`: `String` — Rule/alert category
- `severity`: `String` — Alert severity
- `message`: `String` — Resolution message summary
- `resolved`: `boolean` — Current alert status (`true`)
- `alertCreatedAt`: `LocalDateTime` (`"yyyy-MM-dd'T'HH:mm:ss"`) — Timestamp when alert entity was created
- `telemetryId`: `Long` — Associated telemetry identifier (nullable)
- `correlationId`: `String` — Request tracing ID (nullable)

```json
{
  "eventId": "8e0f6ee5-1a20-41ab-a44b-bd2ac2af96ef",
  "eventType": "MachineAlertResolved",
  "schemaVersion": "1.0",
  "timestamp": "2026-10-15T10:15:00",
  "machineId": 45,
  "alertId": 503,
  "alertType": "TEMPERATURE_HIGH",
  "severity": "HIGH",
  "message": "Spindle temperature back to normal (Auto-resolved)",
  "resolved": true,
  "alertCreatedAt": "2026-10-15T10:15:00",
  "telemetryId": null,
  "correlationId": "test-req-alert-resolved"
}
```

---

## 5. Local Kafka Startup & Application Configuration

### Local Setup via Docker / Docker Compose

If running Kafka locally via Docker:

```bash
# Start Apache Kafka with KRaft (or Zookeeper)
docker run -d --name kynexis-kafka \
  -p 9092:9092 \
  -e KAFKA_NODE_ID=1 \
  -e KAFKA_PROCESS_ROLES=broker,controller \
  -e KAFKA_LISTENERS=PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093 \
  -e KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9092 \
  -e KAFKA_CONTROLLER_LISTENER_NAMES=CONTROLLER \
  -e KAFKA_LISTENER_SECURITY_PROTOCOL_MAP=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT \
  -e KAFKA_CONTROLLER_QUORUM_VOTERS=1@localhost:9093 \
  -e KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1 \
  -e KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR=1 \
  -e KAFKA_TRANSACTION_STATE_LOG_MIN_ISR=1 \
  -e KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS=0 \
  -e CLUSTER_ID=4L622nShTZaegaYzy-5xAw \
  apache/kafka:latest
```

### Application Configuration & Environment Variable Overrides

In `src/main/resources/application.properties`:

```properties
spring.kafka.bootstrap-servers=${KAFKA_BOOTSTRAP_SERVERS:localhost:9092}
spring.kafka.producer.acks=${KAFKA_PRODUCER_ACKS:all}
spring.kafka.producer.retries=${KAFKA_PRODUCER_RETRIES:3}
spring.kafka.producer.properties.enable.idempotence=${KAFKA_PRODUCER_IDEMPOTENCE:true}
spring.kafka.producer.properties.delivery.timeout.ms=${KAFKA_DELIVERY_TIMEOUT_MS:120000}
spring.kafka.producer.properties.request.timeout.ms=${KAFKA_REQUEST_TIMEOUT_MS:30000}
spring.kafka.producer.properties.retry.backoff.ms=${KAFKA_RETRY_BACKOFF_MS:1000}

kynexis.kafka.enabled=${KYNEXIS_KAFKA_ENABLED:true}
kynexis.kafka.bootstrap-servers=${KAFKA_BOOTSTRAP_SERVERS:localhost:9092}
kynexis.kafka.acks=${KAFKA_PRODUCER_ACKS:all}
kynexis.kafka.retries=${KAFKA_PRODUCER_RETRIES:3}
kynexis.kafka.delivery-timeout-ms=${KAFKA_DELIVERY_TIMEOUT_MS:120000}
kynexis.kafka.request-timeout-ms=${KAFKA_REQUEST_TIMEOUT_MS:30000}
kynexis.kafka.retry-backoff-ms=${KAFKA_RETRY_BACKOFF_MS:1000}
kynexis.kafka.enable-idempotence=${KAFKA_PRODUCER_IDEMPOTENCE:true}
kynexis.kafka.topics.machine-telemetry=${KAFKA_TOPIC_TELEMETRY:kynexis.machine-telemetry}
kynexis.kafka.topics.machine-alerts=${KAFKA_TOPIC_ALERTS:kynexis.machine-alerts}

management.health.kafka.enabled=${MANAGEMENT_HEALTH_KAFKA_ENABLED:false}
```

---

## 6. How to Inspect Published Events

### CLI Inspection using `kafka-console-consumer`

#### Inspect Telemetry Events:
```bash
kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic kynexis.machine-telemetry \
  --from-beginning \
  --property print.key=true \
  --property print.timestamp=true
```

#### Inspect Alert Events:
```bash
kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic kynexis.machine-alerts \
  --from-beginning \
  --property print.key=true \
  --property print.timestamp=true
```

---

## 7. Failure Handling & Known Delivery Limitations

### Producer Resilience Settings:
- **`acks=all`**: Guarantees all in-sync replicas acknowledge message receipt before reporting success.
- **`enable.idempotence=true`**: Eliminates duplicate messages caused by producer retries across network blips.
- **Asynchronous Non-blocking**: `kafkaTemplate.send()` returns a `CompletableFuture` that does not block critical HTTP API execution.
- **Visible Failure Logging**: Callback logs any broker failures explicitly at `ERROR` level with the topic, partition key, and exception stack trace.

### Transaction Synchronization & Rollback Safety (Phase 20.1 Hardening):
- **Commit Phase (`afterCommit`)**: When an active database transaction commits successfully, Spring triggers `afterCommit()`. The publisher initiates the asynchronous Kafka send via `kafkaTemplate.send(...)` and completes the returned `CompletableFuture` upon broker acknowledgement.
- **Rollback Phase (`afterCompletion`)**: If the transaction rolls back or fails to commit (`status != STATUS_COMMITTED`), `afterCommit()` is skipped. Instead, `afterCompletion(status)` intercepts the rollback, cancels event publication, logs a warning, and completes the returned `CompletableFuture` exceptionally with an `IllegalStateException`.
- **Indefinite Hanging Prevention**: Callers awaiting or chaining onto the returned `CompletableFuture` are never left hanging indefinitely on rollback.
- **Single-Completion Invariant**: Synchronization callbacks are guarded by an `AtomicBoolean` compare-and-set latch, guaranteeing that transaction callbacks cannot execute duplicate Kafka sends or complete the future more than once.

### Known Delivery Limitation (Honest Architectural Disclosure):
> **Important Reliability Limitation**:
> KYNEXIS Phase 20 utilizes an **after-commit transaction synchronization** strategy (`TransactionSynchronizationManager.registerSynchronization` with `afterCommit`).
> - **Dual-Write Vulnerability**: If the application server or JVM crashes **after** the database transaction commits successfully but **before** the asynchronous Kafka send completes, the event will not be published to Kafka.
> - **Delivery Semantic**: This architecture provides **at-most-once** delivery across server crashes.
> - **Future Transactional Outbox**: If guaranteed at-least-once delivery becomes mandatory, a dedicated transactional outbox table (with an outbox poller or CDC debezium connector) must be introduced as an explicit architectural decision requiring database schema planning and approval. No outbox table is added in Phase 20.

---

## 8. Guidance for Future Consumers

Downstream applications can subscribe to KYNEXIS events without duplicating core factory business logic:

1. **Consumer Group Design**:
   - Each distinct downstream system (e.g. `predictive-maintenance-service`, `analytics-worker`, `compliance-archiver`) should use a separate `group.id` so all consumer groups receive a copy of every event.
2. **Idempotency via `eventId`**:
   - Consumers must use the unique `eventId` as an idempotency key to prevent double-processing if a rebalance occurs.
3. **Partition Ordering**:
   - Consumers processing a specific machine's partition will receive readings in exact chronological order.
4. **No Direct Entity Access Needed**:
   - Event payloads are self-contained with telemetry metrics and alert metadata. Consumers do not need direct access to the MySQL database.

---

## 9. Feature Status Matrix

| Component | Status | Notes |
|---|---|---|
| Spring Kafka dependency management | **Implemented** | Compatible with Spring Boot 4.0.7 / Java 21 |
| Centralized producer configuration | **Implemented** | `KafkaProducerConfig`, `KynexisKafkaProperties` |
| JSON serialization with Jackson | **Implemented** | Custom serializer with `JavaTimeModule` |
| Idempotent producer & `acks=all` | **Implemented** | Delivery timeouts and retry backoffs configured |
| Event DTO contracts | **Implemented** | `MachineTelemetryRecorded`, `MachineAlertCreated`, `MachineAlertUpdated`, `MachineAlertResolved` |
| After-commit synchronization | **Implemented** | Transaction-aware publication via `TransactionSynchronizationManager` |
| Per-machine partition keying | **Implemented** | Keyed by `machineId` |
| Automated tests with isolation | **Implemented** | No dependency on external Kafka broker |
| Transactional outbox pattern | **Future Work** | Documented as future architectural milestone |
| Kafka consumers in application | **Future Work** | Deferred to prevent premature microservice decomposition |
