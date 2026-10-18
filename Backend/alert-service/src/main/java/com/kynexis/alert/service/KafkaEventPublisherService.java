package com.kynexis.alert.service;

import java.time.LocalDateTime;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Service;

import com.kynexis.alert.entity.Alert;
import com.kynexis.alert.common.dto.event.MachineAlertCreated;
import com.kynexis.alert.common.dto.event.MachineAlertResolved;
import com.kynexis.alert.common.dto.event.MachineAlertUpdated;
import com.kynexis.alert.common.logging.LoggingConstants;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class KafkaEventPublisherService {

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final String topic;

    public KafkaEventPublisherService(
            @Autowired(required = false) KafkaTemplate<String, Object> kafkaTemplate,
            @Value("${kynexis.kafka.topics.machine-alerts:kynexis.machine-alerts}") String topic) {
        this.kafkaTemplate = kafkaTemplate;
        this.topic = topic;
    }

    public CompletableFuture<SendResult<String, Object>> publishAlertCreated(Alert alert) {
        if (alert == null || alert.getMachineId() == null) {
            return CompletableFuture.completedFuture(null);
        }

        MachineAlertCreated event = MachineAlertCreated.builder()
                .eventId(UUID.randomUUID().toString())
                .eventType(MachineAlertCreated.EVENT_TYPE)
                .schemaVersion(MachineAlertCreated.SCHEMA_VERSION)
                .timestamp(LocalDateTime.now())
                .machineId(alert.getMachineId())
                .alertId(alert.getId())
                .alertType(alert.getType())
                .severity(alert.getSeverity())
                .message(alert.getMessage())
                .resolved(alert.isResolved())
                .alertCreatedAt(alert.getCreatedAt())
                .telemetryId(alert.getTelemetryId())
                .correlationId(getCorrelationId())
                .build();

        return sendEvent(String.valueOf(alert.getMachineId()), event);
    }

    public CompletableFuture<SendResult<String, Object>> publishAlertUpdated(Alert alert) {
        if (alert == null || alert.getMachineId() == null) {
            return CompletableFuture.completedFuture(null);
        }

        MachineAlertUpdated event = MachineAlertUpdated.builder()
                .eventId(UUID.randomUUID().toString())
                .eventType(MachineAlertUpdated.EVENT_TYPE)
                .schemaVersion(MachineAlertUpdated.SCHEMA_VERSION)
                .timestamp(LocalDateTime.now())
                .machineId(alert.getMachineId())
                .alertId(alert.getId())
                .alertType(alert.getType())
                .severity(alert.getSeverity())
                .message(alert.getMessage())
                .resolved(alert.isResolved())
                .alertCreatedAt(alert.getCreatedAt())
                .telemetryId(alert.getTelemetryId())
                .correlationId(getCorrelationId())
                .build();

        return sendEvent(String.valueOf(alert.getMachineId()), event);
    }

    public CompletableFuture<SendResult<String, Object>> publishAlertResolved(Alert alert) {
        if (alert == null || alert.getMachineId() == null) {
            return CompletableFuture.completedFuture(null);
        }

        MachineAlertResolved event = MachineAlertResolved.builder()
                .eventId(UUID.randomUUID().toString())
                .eventType(MachineAlertResolved.EVENT_TYPE)
                .schemaVersion(MachineAlertResolved.SCHEMA_VERSION)
                .timestamp(LocalDateTime.now())
                .machineId(alert.getMachineId())
                .alertId(alert.getId())
                .alertType(alert.getType())
                .severity(alert.getSeverity())
                .message(alert.getMessage())
                .resolved(true)
                .alertCreatedAt(alert.getCreatedAt())
                .telemetryId(alert.getTelemetryId())
                .correlationId(getCorrelationId())
                .build();

        return sendEvent(String.valueOf(alert.getMachineId()), event);
    }

    private CompletableFuture<SendResult<String, Object>> sendEvent(String partitionKey, Object event) {
        if (kafkaTemplate == null) {
            log.debug("KafkaTemplate not configured; skipping publish for topic={} key={}", topic, partitionKey);
            return CompletableFuture.completedFuture(null);
        }

        try {
            return kafkaTemplate.send(topic, partitionKey, event)
                    .whenComplete((result, ex) -> {
                        if (ex != null) {
                            log.error("Failed to publish event to topic={} key={}: {}", topic, partitionKey, ex.getMessage(), ex);
                        } else {
                            log.info("Successfully published event to topic={} partition={} offset={}",
                                    topic, result.getRecordMetadata().partition(), result.getRecordMetadata().offset());
                        }
                    });
        } catch (Exception ex) {
            log.error("Exception during Kafka send to topic={}: {}", topic, ex.getMessage(), ex);
            CompletableFuture<SendResult<String, Object>> future = new CompletableFuture<>();
            future.completeExceptionally(ex);
            return future;
        }
    }

    private String getCorrelationId() {
        String correlationId = MDC.get(LoggingConstants.CORRELATION_ID_MDC_KEY);
        return correlationId != null ? correlationId : UUID.randomUUID().toString();
    }
}
