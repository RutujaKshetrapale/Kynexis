package com.kynexis.common.dto.event;

import java.time.LocalDate;
import java.time.LocalDateTime;

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
public class FactoryEventDTO<T> {
    private String eventType;
    private LocalDateTime timestamp;
    private Long machineId;
    private String requestId;
    private T payload;

    public record MachineStatusPayload(Long id, String name, String type, String status, Long plantId) {}
    public record TelemetryPayload(Long id, Long machineId, Double temperature, Double vibration, Double pressure, Double rpm, LocalDateTime timestamp) {}
    public record AlertPayload(Long id, Long machineId, String type, String severity, String message, boolean resolved, LocalDateTime createdAt) {}
    public record MaintenancePayload(Long id, Long machineId, String type, String description, LocalDate scheduledDate, LocalDate completedDate, String status, String technician, LocalDateTime createdAt) {}
}
