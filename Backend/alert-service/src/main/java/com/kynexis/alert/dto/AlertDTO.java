package com.kynexis.alert.dto;

import java.io.Serializable;
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
public class AlertDTO implements Serializable {
    private static final long serialVersionUID = 1L;

    private Long id;
    private String type;
    private String severity;
    private String message;
    private boolean resolved;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    private Long machineId;
    private Long telemetryId;

    public MachineRef getMachine() {
        if (machineId == null) return null;
        return new MachineRef(machineId);
    }

    public TelemetryRef getTelemetry() {
        if (telemetryId == null) return null;
        return new TelemetryRef(telemetryId);
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class MachineRef implements Serializable {
        private Long id;
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class TelemetryRef implements Serializable {
        private Long id;
    }
}
