package com.example.demo.architecture;

import java.util.List;

/**
 * Enumeration of KYNEXIS Bounded Contexts.
 *
 * Defines candidate microservice boundaries, logical table ownership,
 * and associated domain events for the KYNEXIS platform evolution.
 */
public enum BoundedContext {

    IDENTITY_AND_ACCESS(
            "Identity and Access",
            "Manages user identities, credentials, role assignments, authentication, and JWT issuance",
            List.of("users"),
            List.of("User", "Role"),
            List.of(),
            List.of()
    ),

    PLANT_AND_MACHINE(
            "Plant and Machine Management",
            "Maintains plant locations, machine assets, operational status, and sensor equipment registry",
            List.of("plants", "machines", "sensors"),
            List.of("Plant", "Machine", "Sensor"),
            List.of(),
            List.of()
    ),

    TELEMETRY(
            "Telemetry",
            "Handles high-throughput ingestion, validation, persistence, and querying of machine sensor readings",
            List.of("telemetry"),
            List.of("Telemetry"),
            List.of("MachineTelemetryRecorded"),
            List.of()
    ),

    ALERT_MANAGEMENT(
            "Alert Management",
            "Evaluates alert threshold rules, tracks active alerts, manages alert lifecycle transitions, and publishes alert events",
            List.of("alerts"),
            List.of("Alert"),
            List.of("MachineAlertCreated", "MachineAlertUpdated", "MachineAlertResolved"),
            List.of("MachineTelemetryRecorded")
    ),

    HEALTH_AND_PREDICTIVE_MAINTENANCE(
            "Health and Predictive Maintenance",
            "Assesses asset health states, evaluates telemetry trend anomalies, calculates failure risks, and tracks maintenance schedules",
            List.of("maintenance"),
            List.of("Maintenance", "MachineHealthResponse", "PredictiveMaintenanceResponse"),
            List.of(),
            List.of("MachineTelemetryRecorded", "MachineAlertCreated", "MachineAlertUpdated", "MachineAlertResolved")
    ),

    PRODUCTION_AND_ENERGY(
            "Production and Energy",
            "Tracks shop-floor manufacturing output, quality rejects, operational runs, and utility energy consumption",
            List.of("production", "energy"),
            List.of("Production", "Energy"),
            List.of(),
            List.of()
    ),

    DASHBOARD_AGGREGATION(
            "Dashboard Aggregation",
            "Read-oriented aggregation projection and caching layer providing executive summaries and machine fleet status",
            List.of(),
            List.of("DashboardSummaryResponse", "DashboardMachineStatusResponse"),
            List.of(),
            List.of("MachineTelemetryRecorded", "MachineAlertCreated", "MachineAlertResolved")
    );

    private final String displayName;
    private final String description;
    private final List<String> ownedTables;
    private final List<String> primaryEntities;
    private final List<String> publishedEvents;
    private final List<String> consumedEvents;

    BoundedContext(
            String displayName,
            String description,
            List<String> ownedTables,
            List<String> primaryEntities,
            List<String> publishedEvents,
            List<String> consumedEvents) {
        this.displayName = displayName;
        this.description = description;
        this.ownedTables = ownedTables;
        this.primaryEntities = primaryEntities;
        this.publishedEvents = publishedEvents;
        this.consumedEvents = consumedEvents;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getDescription() {
        return description;
    }

    public List<String> getOwnedTables() {
        return ownedTables;
    }

    public List<String> getPrimaryEntities() {
        return primaryEntities;
    }

    public List<String> getPublishedEvents() {
        return publishedEvents;
    }

    public List<String> getConsumedEvents() {
        return consumedEvents;
    }
}
