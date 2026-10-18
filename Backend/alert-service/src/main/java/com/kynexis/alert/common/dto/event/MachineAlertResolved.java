package com.kynexis.alert.common.dto.event;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class MachineAlertResolved implements KynexisEvent {

    public static final String EVENT_TYPE = "MachineAlertResolved";
    public static final String SCHEMA_VERSION = "1.0";

    private String eventId;
    private String eventType;
    private String schemaVersion;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime timestamp;

    private Long machineId;
    private Long alertId;
    private String alertType;
    private String severity;
    private String message;
    private boolean resolved;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime alertCreatedAt;

    private Long telemetryId;
    private String correlationId;
}
