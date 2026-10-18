# KYNEXIS — Smart Factory Monitoring & Management Frontend

A real-time AI-powered industrial dashboard for manufacturing monitoring, IoT telemetry ingestion, and predictive maintenance.

---

## 🛠️ Technology Stack & Architecture

- **Core**: React 19 + Vite 8
- **Styling**: Pure Bespoke **Vanilla CSS** (`src/index.css`) featuring:
  - Cyber-Industrial Dark Theme (`#06080e`, `#0a0e17`, `#151e30`)
  - Glassmorphic translucent cards (`backdrop-filter: blur(14px)`)
  - Industrial Neon Accents (Cyan `#00f2fe`, Emerald `#10b981`, Amber `#f59e0b`, Crimson `#ef4444`, Purple `#a855f7`)
  - High-precision typography using Google Fonts (**Outfit** and **JetBrains Mono**)
- **Icons**: `lucide-react`
- **Backend Communication**: Unified client (`src/services/api.js`) targeting the **API Gateway** (`http://localhost:8080`), with auto-injected JWT `Authorization: Bearer <token>` and seamless offline edge simulation fallback.

---

## 🧭 Navigation & Domain Views

| View | Purpose | Associated Microservice |
| :--- | :--- | :--- |
| **Executive Dashboard** | 6 KPI cards, fleet status distribution progress bar, active critical alarm banner, edge telemetry ticker | `api-gateway` (:8080) |
| **Plants & Sites** | Facility registry, geolocation search, active channel toggles, CRUD modal | `plant-service` (:8082) |
| **Machines & Fleet** | Equipment inventory by plant, operating status filter, predictive health & AI diagnostics drawer | `machine-service` (:8088) |
| **IoT Sensor Catalog** | Physical sensor node channels, metric types (°C, mm/s, PSI, RPM), active toggles | `sensor-service` (:8089) |
| **Live Telemetry** | Interactive SVG time-series trend curves, historical readings table, edge packet simulator | `telemetry-service` (:8083) |
| **Alarms & Events** | Active incident triage board, severity filters (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`), one-click resolution | `alert-service` (:8084) |
| **Work Orders & AI** | Maintenance scheduling, certified technician assignments, AI predictive failure risk assessment | `maintenance-service` (:8085) |
| **Production Yield** | Gross output tracking, scrap defect rate calculation, batch creation modal | `production-service` (:8086) |
| **Energy Consumption** | Sub-meter power usage log (kWh), ISO 50001 efficiency index, peak load detection | `energy-service` (:8087) |
| **Gateway & Architecture**| 10-microservice routing matrix, session security profile, and MySQL schema specifications | System / Auth |

---

## 👥 Seed Personas & Role-Based Access Control (RBAC)

The interface includes a **1-click Persona Switcher** in the top navigation bar to test role permissions across the microservices:

1. **System Admin (`admin`)**: Unrestricted global write and delete access across all microservices.
2. **Lead Engineer (`engineer_sarah`)**: Equipment configuration, sensor onboarding, telemetry simulation, and maintenance scheduling.
3. **Floor Operator (`operator_john`)**: Shift operations, real-time sensor observation, and batch tracking.
4. **Plant Manager (`manager_alex`)**: Operational dashboards, scrap rates, power metrics, and auditing.

*Default development password for all seed accounts: `Password123!`*

---

## 🚀 Running Locally

### Development Server
```bash
cd Frontend
npm run dev
```
The application will launch on `http://localhost:5173` and automatically proxy `/api` requests to `http://localhost:8080`.

### Production Build
```bash
cd Frontend
npm run build
npm run preview
```
Production assets compile cleanly to `Frontend/dist/`.
