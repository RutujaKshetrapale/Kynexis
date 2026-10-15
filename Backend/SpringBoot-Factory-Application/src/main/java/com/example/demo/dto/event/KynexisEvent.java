package com.example.demo.dto.event;

import java.time.LocalDateTime;

/**
 * Common contract for all KYNEXIS domain events published to Kafka.
 */
public interface KynexisEvent {

    /**
     * Unique identifier for this event instance (UUID).
     */
    String getEventId();

    /**
     * Event type discriminator (e.g., MachineTelemetryRecorded, MachineAlertCreated).
     */
    String getEventType();

    /**
     * Schema version for contract evolution (e.g., "1.0").
     */
    String getSchemaVersion();

    /**
     * Timestamp when the event was generated.
     */
    LocalDateTime getTimestamp();

    /**
     * Identifier of the machine associated with this event (used as Kafka partition key).
     */
    Long getMachineId();

    /**
     * Distributed correlation / request ID for end-to-end traceability.
     */
    String getCorrelationId();
}
