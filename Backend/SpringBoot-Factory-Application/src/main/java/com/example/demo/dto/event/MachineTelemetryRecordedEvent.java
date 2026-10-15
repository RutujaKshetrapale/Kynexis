package com.example.demo.dto.event;

import lombok.NoArgsConstructor;

/**
 * Alias subclass for MachineTelemetryRecorded.
 */
@NoArgsConstructor
public class MachineTelemetryRecordedEvent extends MachineTelemetryRecorded {

    public MachineTelemetryRecordedEvent(MachineTelemetryRecorded source) {
        super(source.getEventId(), source.getEventType(), source.getSchemaVersion(),
                source.getTimestamp(), source.getMachineId(), source.getTelemetryId(),
                source.getTemperature(), source.getVibration(), source.getPressure(),
                source.getRpm(), source.getTelemetryTimestamp(), source.getCorrelationId());
    }
}
