package com.example.demo.dto.event;

import lombok.NoArgsConstructor;

/**
 * Alias subclass for MachineAlertResolved.
 */
@NoArgsConstructor
public class MachineAlertResolvedEvent extends MachineAlertResolved {

    public MachineAlertResolvedEvent(MachineAlertResolved source) {
        super(source.getEventId(), source.getEventType(), source.getSchemaVersion(),
                source.getTimestamp(), source.getMachineId(), source.getAlertId(),
                source.getAlertType(), source.getSeverity(), source.getMessage(),
                source.isResolved(), source.getAlertCreatedAt(), source.getTelemetryId(),
                source.getCorrelationId());
    }
}
