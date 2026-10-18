package com.kynexis.gateway.service;

import java.time.LocalDateTime;

import org.slf4j.MDC;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import com.kynexis.gateway.common.logging.LoggingConstants;
import com.kynexis.gateway.dto.event.FactoryEventDTO;
import com.kynexis.gateway.dto.event.FactoryEventDTO.AlertPayload;
import com.kynexis.gateway.dto.event.FactoryEventDTO.MachineStatusPayload;
import com.kynexis.gateway.dto.event.FactoryEventDTO.MaintenancePayload;
import com.kynexis.gateway.dto.event.FactoryEventDTO.TelemetryPayload;

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

    public void publishMachineStatus(MachineStatusPayload payload) {
        if (payload == null) return;
        log.info("WebSocket broadcasting machine status: machineId={} status={}", payload.id(), payload.status());

        FactoryEventDTO<MachineStatusPayload> event = FactoryEventDTO.<MachineStatusPayload>builder()
                .eventType("MACHINE_STATUS_UPDATED")
                .timestamp(LocalDateTime.now())
                .machineId(payload.id())
                .requestId(getCorrelationId())
                .payload(payload)
                .build();

        messagingTemplate.convertAndSend(TOPIC_MACHINE_STATUS, event);
    }

    public void publishTelemetry(TelemetryPayload payload) {
        if (payload == null) return;
        log.info("WebSocket broadcasting telemetry: machineId={} telemetryId={}", payload.machineId(), payload.id());

        FactoryEventDTO<TelemetryPayload> event = FactoryEventDTO.<TelemetryPayload>builder()
                .eventType("TELEMETRY_RECORDED")
                .timestamp(payload.timestamp() != null ? payload.timestamp() : LocalDateTime.now())
                .machineId(payload.machineId())
                .requestId(getCorrelationId())
                .payload(payload)
                .build();

        messagingTemplate.convertAndSend(TOPIC_TELEMETRY, event);
    }

    public void publishAlert(AlertPayload payload) {
        if (payload == null) return;
        log.info("WebSocket broadcasting alert: alertId={} severity={} type={}",
                payload.id(), payload.severity(), payload.type());

        FactoryEventDTO<AlertPayload> event = FactoryEventDTO.<AlertPayload>builder()
                .eventType("ALERT_CREATED")
                .timestamp(payload.createdAt() != null ? payload.createdAt() : LocalDateTime.now())
                .machineId(payload.machineId())
                .requestId(getCorrelationId())
                .payload(payload)
                .build();

        messagingTemplate.convertAndSend(TOPIC_ALERTS, event);
    }

    public void publishMaintenance(MaintenancePayload payload) {
        if (payload == null) return;
        log.info("WebSocket broadcasting maintenance: maintenanceId={} status={}", payload.id(), payload.status());

        FactoryEventDTO<MaintenancePayload> event = FactoryEventDTO.<MaintenancePayload>builder()
                .eventType("MAINTENANCE_UPDATED")
                .timestamp(payload.createdAt() != null ? payload.createdAt() : LocalDateTime.now())
                .machineId(payload.machineId())
                .requestId(getCorrelationId())
                .payload(payload)
                .build();

        messagingTemplate.convertAndSend(TOPIC_MAINTENANCE, event);
    }

    private String getCorrelationId() {
        String correlationId = MDC.get(LoggingConstants.CORRELATION_ID_MDC_KEY);
        return correlationId != null ? correlationId : MDC.get(LoggingConstants.CORRELATION_ID_KEY);
    }
}
