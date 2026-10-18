package com.kynexis.telemetry.common.dto.event;

import java.time.LocalDateTime;

public interface KynexisEvent {
    String getEventId();
    String getEventType();
    String getSchemaVersion();
    LocalDateTime getTimestamp();
    Long getMachineId();
    String getCorrelationId();
}
