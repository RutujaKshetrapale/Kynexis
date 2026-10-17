package com.example.demo.architecture;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class BoundedContextDefinitionTest {

    @Test
    @DisplayName("Should define all 7 required KYNEXIS bounded contexts")
    void shouldDefineAllBoundedContexts() {
        BoundedContext[] contexts = BoundedContext.values();
        assertEquals(7, contexts.length);

        assertNotNull(BoundedContext.valueOf("IDENTITY_AND_ACCESS"));
        assertNotNull(BoundedContext.valueOf("PLANT_AND_MACHINE"));
        assertNotNull(BoundedContext.valueOf("TELEMETRY"));
        assertNotNull(BoundedContext.valueOf("ALERT_MANAGEMENT"));
        assertNotNull(BoundedContext.valueOf("HEALTH_AND_PREDICTIVE_MAINTENANCE"));
        assertNotNull(BoundedContext.valueOf("PRODUCTION_AND_ENERGY"));
        assertNotNull(BoundedContext.valueOf("DASHBOARD_AGGREGATION"));
    }

    @Test
    @DisplayName("Should enforce disjoint database table ownership across bounded contexts")
    void shouldEnforceDisjointTableOwnership() {
        Set<String> registeredTables = new HashSet<>();

        for (BoundedContext context : BoundedContext.values()) {
            assertNotNull(context.getDisplayName(), "Display name must not be null for " + context);
            assertFalse(context.getDescription().isBlank(), "Description must not be blank for " + context);

            for (String table : context.getOwnedTables()) {
                boolean isNew = registeredTables.add(table);
                assertTrue(isNew, "Duplicate table ownership detected for table '" + table + "' in " + context);
            }
        }

        // Verify the 8 core relational tables are covered
        Set<String> expectedTables = Set.of(
                "users", "plants", "machines", "sensors",
                "telemetry", "alerts", "maintenance", "production", "energy"
        );
        assertEquals(expectedTables, registeredTables, "All smart_factory_db tables must have explicit domain ownership");
    }

    @Test
    @DisplayName("Should verify published and consumed Kafka events match implemented schemas")
    void shouldVerifyEventContractReferences() {
        Set<String> validEventTypes = Set.of(
                "MachineTelemetryRecorded",
                "MachineAlertCreated",
                "MachineAlertUpdated",
                "MachineAlertResolved"
        );

        for (BoundedContext context : BoundedContext.values()) {
            for (String published : context.getPublishedEvents()) {
                assertTrue(validEventTypes.contains(published),
                        "Unknown published event '" + published + "' in context " + context);
            }
            for (String consumed : context.getConsumedEvents()) {
                assertTrue(validEventTypes.contains(consumed),
                        "Unknown consumed event '" + consumed + "' in context " + context);
            }
        }

        // Telemetry publishes telemetry events
        assertTrue(BoundedContext.TELEMETRY.getPublishedEvents().contains("MachineTelemetryRecorded"));

        // Alert Management publishes alert events and consumes telemetry
        assertTrue(BoundedContext.ALERT_MANAGEMENT.getPublishedEvents().contains("MachineAlertCreated"));
        assertTrue(BoundedContext.ALERT_MANAGEMENT.getPublishedEvents().contains("MachineAlertUpdated"));
        assertTrue(BoundedContext.ALERT_MANAGEMENT.getPublishedEvents().contains("MachineAlertResolved"));
        assertTrue(BoundedContext.ALERT_MANAGEMENT.getConsumedEvents().contains("MachineTelemetryRecorded"));
    }
}
