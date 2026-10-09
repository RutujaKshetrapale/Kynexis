package com.example.demo.service;

import java.time.LocalDate;
import java.time.LocalDateTime;

import org.slf4j.MDC;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import com.example.demo.dto.event.FactoryEventDTO;
import com.example.demo.entity.Alert;
import com.example.demo.entity.Machine;
import com.example.demo.entity.Maintenance;
import com.example.demo.entity.Telemetry;
import com.example.demo.logging.LoggingConstants;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class WebSocketEventPublisherService {

    public static final String TOPIC_MACHINE_STATUS = "/topic/machine-status";
    public static final String TOPIC_TELEMETRY = "/topic/telemetry";
    public static final String TOPIC_ALERTS = "/topic/alerts";
    public static final String TOPIC_MAINTENANCE = "/topic/maintenance";

    private final SimpMessagingTemplate messagingTemplate;

    public WebSocketEventPublisherService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void publishMachineStatus(Machine machine) {
        if (machine == null) return;
        log.info("Publishing machine status event machineId={} status={}", machine.getId(), machine.getStatus());

        Long plantId = machine.getPlant() != null ? machine.getPlant().getId() : null;

        FactoryEventDTO<MachineStatusPayload> event = FactoryEventDTO.<MachineStatusPayload>builder()
                .eventType("MACHINE_STATUS_UPDATED")
                .timestamp(LocalDateTime.now())
                .machineId(machine.getId())
                .requestId(MDC.get(LoggingConstants.CORRELATION_ID_KEY))
                .payload(new MachineStatusPayload(
                        machine.getId(),
                        machine.getName(),
                        machine.getType(),
                        machine.getStatus(),
                        plantId
                ))
                .build();

        messagingTemplate.convertAndSend(TOPIC_MACHINE_STATUS, event);
    }

    public void publishTelemetry(Telemetry telemetry) {
        if (telemetry == null) return;
        Long machineId = telemetry.getMachine() != null ? telemetry.getMachine().getId() : null;
        log.info("Publishing telemetry event machineId={} telemetryId={}", machineId, telemetry.getId());

        FactoryEventDTO<TelemetryPayload> event = FactoryEventDTO.<TelemetryPayload>builder()
                .eventType("TELEMETRY_RECORDED")
                .timestamp(telemetry.getTimestamp() != null ? telemetry.getTimestamp() : LocalDateTime.now())
                .machineId(machineId)
                .requestId(MDC.get(LoggingConstants.CORRELATION_ID_KEY))
                .payload(new TelemetryPayload(
                        telemetry.getId(),
                        machineId,
                        telemetry.getTemperature(),
                        telemetry.getVibration(),
                        telemetry.getPressure(),
                        telemetry.getRpm(),
                        telemetry.getTimestamp()
                ))
                .build();

        messagingTemplate.convertAndSend(TOPIC_TELEMETRY, event);
    }

    public void publishAlert(Alert alert) {
        if (alert == null) return;
        Long machineId = alert.getMachine() != null ? alert.getMachine().getId() : null;
        log.info("Publishing alert event alertId={} severity={}", alert.getId(), alert.getSeverity());

        FactoryEventDTO<AlertPayload> event = FactoryEventDTO.<AlertPayload>builder()
                .eventType("ALERT_CREATED")
                .timestamp(alert.getCreatedAt() != null ? alert.getCreatedAt() : LocalDateTime.now())
                .machineId(machineId)
                .requestId(MDC.get(LoggingConstants.CORRELATION_ID_KEY))
                .payload(new AlertPayload(
                        alert.getId(),
                        machineId,
                        alert.getType(),
                        alert.getSeverity(),
                        alert.getMessage(),
                        alert.isResolved(),
                        alert.getCreatedAt()
                ))
                .build();

        messagingTemplate.convertAndSend(TOPIC_ALERTS, event);
    }

    public void publishMaintenance(Maintenance maintenance) {
        if (maintenance == null) return;
        Long machineId = maintenance.getMachine() != null ? maintenance.getMachine().getId() : null;
        log.info("Publishing maintenance event maintenanceId={} status={}", maintenance.getId(), maintenance.getStatus());

        FactoryEventDTO<MaintenancePayload> event = FactoryEventDTO.<MaintenancePayload>builder()
                .eventType("MAINTENANCE_UPDATED")
                .timestamp(maintenance.getCreatedAt() != null ? maintenance.getCreatedAt() : LocalDateTime.now())
                .machineId(machineId)
                .requestId(MDC.get(LoggingConstants.CORRELATION_ID_KEY))
                .payload(new MaintenancePayload(
                        maintenance.getId(),
                        machineId,
                        maintenance.getType(),
                        maintenance.getDescription(),
                        maintenance.getScheduledDate(),
                        maintenance.getCompletedDate(),
                        maintenance.getStatus(),
                        maintenance.getTechnician(),
                        maintenance.getCreatedAt()
                ))
                .build();

        messagingTemplate.convertAndSend(TOPIC_MAINTENANCE, event);
    }

    public record MachineStatusPayload(Long id, String name, String type, String status, Long plantId) {}
    public record TelemetryPayload(Long id, Long machineId, Double temperature, Double vibration, Double pressure, Double rpm, LocalDateTime timestamp) {}
    public record AlertPayload(Long id, Long machineId, String type, String severity, String message, boolean resolved, LocalDateTime createdAt) {}
    public record MaintenancePayload(Long id, Long machineId, String type, String description, LocalDate scheduledDate, LocalDate completedDate, String status, String technician, LocalDateTime createdAt) {}
}
