package com.example.demo.dto.event;

import lombok.NoArgsConstructor;

/**
 * Alias subclass for MachineAlertUpdated.
 */
@NoArgsConstructor
public class MachineAlertUpdatedEvent extends MachineAlertUpdated {

    public MachineAlertUpdatedEvent(MachineAlertUpdated source) {
        super(source.getEventId(), source.getEventType(), source.getSchemaVersion(),
                source.getTimestamp(), source.getMachineId(), source.getAlertId(),
                source.getAlertType(), source.getSeverity(), source.getMessage(),
                source.isResolved(), source.getAlertCreatedAt(), source.getTelemetryId(),
                source.getCorrelationId());
    }
}
