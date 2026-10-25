# KYNEXIS — Quick Start & Development Workflow Guide

Welcome to **KYNEXIS — Connected Industrial Intelligence**.  
This repository consists of 10 decoupled Spring Boot microservices, an API Gateway, a React 19 / Vite frontend, and a single MySQL 8.x schema (`smart_factory_db`).

---

## ⚡ 1. Rapid Development Commands

| Workflow Mode | Command | Startup Speed | Description |
|---|---|---|---|
| **Mode A: Frontend-Only** | `.\scripts\dev-start.ps1 -Mode Frontend` | **~1 second** | Starts Vite server on `:5173`. Instant feedback, zero Java compilation, no Docker required. |
| **Mode B: Full-Stack** | `.\scripts\dev-start.ps1 -Mode FullStack` | **< 2 minutes cold**<br>*(~2s warm)* | Starts all 10 microservices with JVM tuning, health checks, and Vite frontend. |
| **Backend-Only** | `.\scripts\dev-start.ps1 -Mode Backend` | **~90 seconds** | Starts all 10 Java microservices + API Gateway without launching the frontend. |
| **Check Health & Ports** | `.\scripts\dev-status.ps1` | **< 1 second** | Displays live HTTP health and latency for all 10 services and frontend. |
| **Safe Shutdown** | `.\scripts\dev-stop.ps1` | **< 2 seconds** | Stops processes tracked in `.kynexis-dev.pid`. Use `-All` to clear all ports. |

---

## 🌐 2. Service & Port Matrix

| Service | Port | Health Endpoint | Owning Domain | Key Dependencies |
|---|:---:|---|---|---|
| **Frontend UI** | `5173` | `http://localhost:5173/` | React 19, Vite, Lucide Icons | API Gateway (`:8080`) |
| **API Gateway** | `8080` | `http://localhost:8080/actuator/health` | Central Reverse Proxy & Dashboard Aggregator | Downstream Services (`8081`–`8089`) |
| **Authentication Service** | `8081` | `http://localhost:8081/actuator/health` | User Registration, BCrypt, JWT Generation | MySQL (`users` table) |
| **Plant Service** | `8082` | `http://localhost:8082/actuator/health` | Manufacturing Facilities & Campus Management | MySQL (`plants` table) |
| **Telemetry Service** | `8083` | `http://localhost:8083/actuator/health` | IoT Sensor Telemetry Ingestion & Outbox Events | MySQL (`telemetry`, `outbox_events`), Kafka |
| **Alert Service** | `8084` | `http://localhost:8084/actuator/health` | Anomaly Detection, Rule Engine, Deduplication | MySQL (`alerts`, `processed_events`), Kafka |
| **Maintenance Service** | `8085` | `http://localhost:8085/actuator/health` | Work Orders, Predictive Maintenance Schedules | MySQL (`maintenance` table) |
| **Production Service** | `8086` | `http://localhost:8086/actuator/health` | Production Batches, Quality & Reject Metrics | MySQL (`production` table) |
| **Energy Service** | `8087` | `http://localhost:8087/actuator/health` | Power & kWh Consumption Tracking | MySQL (`energy` table) |
| **Machine Service** | `8088` | `http://localhost:8088/actuator/health` | Industrial Equipment Inventory & Status | MySQL (`machines` table), Plant Service |
| **Sensor Service** | `8089` | `http://localhost:8089/actuator/health` | Hardware Sensors Attached to Machinery | MySQL (`sensors` table), Machine Service |

---

## 🔑 3. Default Credentials

* **Web UI URL**: [http://localhost:5173](http://localhost:5173)
* **API Gateway URL**: [http://localhost:8080](http://localhost:8080)
* **Database**: `smart_factory_db` on MySQL localhost:3306
* **Database Username**: `root`
* **Default Database Password**: Configured in `.env` (Defaults to `21011017`)
* **Default Web Seed Accounts**:
  * **System Admin**: `admin` / `Admin@123` *(Full system & deletion rights)*
  * **Lead Engineer**: `engineer` / `engineer123` *(Plant, machine, telemetry ops)*
  * **Floor Operator**: `operator` / `operator123` *(Telemetry feeds & viewing)*
  * **Plant Manager**: `manager` / `Manager@123` *(Audits & KPI dashboards)*

---

## 🚀 4. How to Start an Individual Microservice

When developing a single service (e.g., `machine-service`), you can run it directly with tuned developer flags:

```powershell
# Set database credentials in environment
$env:SPRING_DATASOURCE_PASSWORD = "21011017"

# Run target jar with low-memory tiered compilation
java -Xms64m -Xmx256m -XX:+TieredCompilation -XX:TieredStopAtLevel=1 -jar Backend\machine-service\target\machine-service-0.0.1-SNAPSHOT.jar
```

---

## 🐳 5. Docker Workflow

The root `docker-compose.yml` has been updated with:
1. **Configurable Host Ports**: `${MYSQL_HOST_PORT:-3306}` and `${KAFKA_HOST_PORT:-9092}` to avoid port conflicts with host services.
2. **Dual-Listener Kafka**: Internal container access on `kafka:29092` and host access on `localhost:9092`.
3. **Optimized Health Checks**: Fast, non-blocking curl health checks (`10s` interval, `15s` start period).
4. **JVM Memory Limits**: `-Xms64m -Xmx256m -XX:TieredStopAtLevel=1` ensuring all containers fit comfortably in local RAM.

### Running Infrastructure in Docker (Host Services Strategy)
If you prefer running MySQL and Kafka in Docker while running the Java code on the host:
```powershell
docker compose up -d mysql kafka
.\scripts\dev-start.ps1 -Mode FullStack
```

### Full Docker Compose Run
```powershell
# Ensure local JARs exist first (runs in ~13s)
cd Backend
mvn package -DskipTests -T 1C
cd ..

# Start containers (reuses cached layers)
docker compose up -d
```

---

## 🛠️ 6. Troubleshooting & Diagnostics

### Problem: Port Conflict on Port 3306
* **Cause**: Windows service `MySQL82` is already running locally on port 3306.
* **Solution**: Either use the local MySQL service directly (set password in `.env`), or change the Docker port via environment:
  ```powershell
  $env:MYSQL_HOST_PORT = "3307"
  docker compose up -d mysql
  ```

### Problem: MySQL "Access denied for user 'root'"
* **Solution**: Update the password in `.env`:
  ```ini
  SPRING_DATASOURCE_PASSWORD=21011017
  ```
  Or pass it directly:
  ```powershell
  .\scripts\dev-start.ps1 -Mode FullStack -DbPassword "21011017"
  ```

### Problem: Services Running Slowly or High Memory Usage
* **Root Cause**: Default Java 21 heap allocates 25% of system RAM per JVM (~2 GB each). Ten untuned JVMs consume ~10 GB and trigger OS pagefile thrashing.
* **Solution**: Always use the provided `dev-start.ps1` script, which enforces `-Xms64m -Xmx256m -XX:TieredStopAtLevel=1`. Total memory for all 10 services combined is reduced to ~1,035 MB (~1 GB).

### Problem: Clean Shutdown / Clear Stale Processes
```powershell
.\scripts\dev-stop.ps1 -All
```
