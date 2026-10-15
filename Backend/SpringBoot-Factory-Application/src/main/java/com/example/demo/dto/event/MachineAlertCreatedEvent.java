package com.example.demo.dto.event;

import lombok.NoArgsConstructor;

/**
 * Alias subclass for MachineAlertCreated.
 */
@NoArgsConstructor
public class MachineAlertCreatedEvent extends MachineAlertCreated {

    public MachineAlertCreatedEvent(MachineAlertCreated source) {
        super(source.getEventId(), source.getEventType(), source.getSchemaVersion(),
                source.getTimestamp(), source.getMachineId(), source.getAlertId(),
                source.getAlertType(), source.getSeverity(), source.getMessage(),
                source.isResolved(), source.getAlertCreatedAt(), source.getTelemetryId(),
                source.getCorrelationId());
    }
}
