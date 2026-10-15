package com.example.demo.service;

import java.time.LocalDateTime;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicBoolean;

import org.apache.kafka.clients.producer.RecordMetadata;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.example.demo.config.KynexisKafkaProperties;
import com.example.demo.dto.event.KynexisEvent;
import com.example.demo.dto.event.MachineAlertCreated;
import com.example.demo.dto.event.MachineAlertResolved;
import com.example.demo.dto.event.MachineAlertUpdated;
import com.example.demo.dto.event.MachineTelemetryRecorded;
import com.example.demo.entity.Alert;
import com.example.demo.entity.Telemetry;
import com.example.demo.logging.LoggingConstants;

import lombok.extern.slf4j.Slf4j;

/**
 * Service responsible for publishing KYNEXIS domain events to Apache Kafka.
 *
 * Implements transaction-aware publication:
 * - If an active database transaction is in progress, publishing is deferred until
 *   the transaction commits (afterCommit) to prevent ghost events on rollback.
 * - If no transaction is active, publishing executes immediately after persistence.
 *
 * Note on delivery guarantee: An after-commit publisher without a transactional outbox
 * pattern provides at-most-once delivery across crashes (if the JVM crashes after
 * database commit but before Kafka send, the event could be lost).
 */
@Slf4j
@Service
public class KafkaEventPublisherService {

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final KynexisKafkaProperties properties;

    public KafkaEventPublisherService(
            @Autowired(required = false) KafkaTemplate<String, Object> kafkaTemplate,
            KynexisKafkaProperties properties) {
        this.kafkaTemplate = kafkaTemplate;
        this.properties = properties;
    }

    /**
     * Publishes a MachineTelemetryRecorded event to Kafka.
     */
    public CompletableFuture<SendResult<String, Object>> publishTelemetryRecorded(Telemetry telemetry) {
        if (telemetry == null) {
            log.warn("Cannot publish telemetry event: telemetry is null");
            return CompletableFuture.completedFuture(null);
        }

        Long machineId = telemetry.getMachine() != null ? telemetry.getMachine().getId() : null;
        if (machineId == null) {
            log.warn("Cannot publish telemetry event: machineId is null for telemetryId={}", telemetry.getId());
            return CompletableFuture.completedFuture(null);
        }

        MachineTelemetryRecorded event = MachineTelemetryRecorded.builder()
                .eventId(UUID.randomUUID().toString())
                .eventType(MachineTelemetryRecorded.EVENT_TYPE)
                .schemaVersion(MachineTelemetryRecorded.SCHEMA_VERSION)
                .timestamp(LocalDateTime.now())
                .machineId(machineId)
                .telemetryId(telemetry.getId())
                .temperature(telemetry.getTemperature())
                .vibration(telemetry.getVibration())
                .pressure(telemetry.getPressure())
                .rpm(telemetry.getRpm())
                .telemetryTimestamp(telemetry.getTimestamp())
                .correlationId(getCorrelationId())
                .build();

        String topic = properties.getTopics().getMachineTelemetry();
        String partitionKey = String.valueOf(machineId);

        return publishAfterCommitOrImmediately(topic, partitionKey, event);
    }

    /**
     * Publishes a MachineAlertCreated event to Kafka.
     */
    public CompletableFuture<SendResult<String, Object>> publishAlertCreated(Alert alert) {
        if (alert == null) {
            log.warn("Cannot publish alert created event: alert is null");
            return CompletableFuture.completedFuture(null);
        }

        Long machineId = alert.getMachine() != null ? alert.getMachine().getId() : null;
        Long telemetryId = alert.getTelemetry() != null ? alert.getTelemetry().getId() : null;

        MachineAlertCreated event = MachineAlertCreated.builder()
                .eventId(UUID.randomUUID().toString())
                .eventType(MachineAlertCreated.EVENT_TYPE)
                .schemaVersion(MachineAlertCreated.SCHEMA_VERSION)
                .timestamp(LocalDateTime.now())
                .machineId(machineId)
                .alertId(alert.getId())
                .alertType(alert.getType())
                .severity(alert.getSeverity())
                .message(alert.getMessage())
                .resolved(alert.isResolved())
                .alertCreatedAt(alert.getCreatedAt())
                .telemetryId(telemetryId)
                .correlationId(getCorrelationId())
                .build();

        String topic = properties.getTopics().getMachineAlerts();
        String partitionKey = machineId != null ? String.valueOf(machineId) : "unknown";

        return publishAfterCommitOrImmediately(topic, partitionKey, event);
    }

    /**
     * Publishes a MachineAlertUpdated event to Kafka.
     */
    public CompletableFuture<SendResult<String, Object>> publishAlertUpdated(Alert alert) {
        if (alert == null) {
            log.warn("Cannot publish alert updated event: alert is null");
            return CompletableFuture.completedFuture(null);
        }

        Long machineId = alert.getMachine() != null ? alert.getMachine().getId() : null;
        Long telemetryId = alert.getTelemetry() != null ? alert.getTelemetry().getId() : null;

        MachineAlertUpdated event = MachineAlertUpdated.builder()
                .eventId(UUID.randomUUID().toString())
                .eventType(MachineAlertUpdated.EVENT_TYPE)
                .schemaVersion(MachineAlertUpdated.SCHEMA_VERSION)
                .timestamp(LocalDateTime.now())
                .machineId(machineId)
                .alertId(alert.getId())
                .alertType(alert.getType())
                .severity(alert.getSeverity())
                .message(alert.getMessage())
                .resolved(alert.isResolved())
                .alertCreatedAt(alert.getCreatedAt())
                .telemetryId(telemetryId)
                .correlationId(getCorrelationId())
                .build();

        String topic = properties.getTopics().getMachineAlerts();
        String partitionKey = machineId != null ? String.valueOf(machineId) : "unknown";

        return publishAfterCommitOrImmediately(topic, partitionKey, event);
    }

    /**
     * Publishes a MachineAlertResolved event to Kafka.
     */
    public CompletableFuture<SendResult<String, Object>> publishAlertResolved(Alert alert) {
        if (alert == null) {
            log.warn("Cannot publish alert resolved event: alert is null");
            return CompletableFuture.completedFuture(null);
        }

        Long machineId = alert.getMachine() != null ? alert.getMachine().getId() : null;
        Long telemetryId = alert.getTelemetry() != null ? alert.getTelemetry().getId() : null;

        MachineAlertResolved event = MachineAlertResolved.builder()
                .eventId(UUID.randomUUID().toString())
                .eventType(MachineAlertResolved.EVENT_TYPE)
                .schemaVersion(MachineAlertResolved.SCHEMA_VERSION)
                .timestamp(LocalDateTime.now())
                .machineId(machineId)
                .alertId(alert.getId())
                .alertType(alert.getType())
                .severity(alert.getSeverity())
                .message(alert.getMessage())
                .resolved(true)
                .alertCreatedAt(alert.getCreatedAt())
                .telemetryId(telemetryId)
                .correlationId(getCorrelationId())
                .build();

        String topic = properties.getTopics().getMachineAlerts();
        String partitionKey = machineId != null ? String.valueOf(machineId) : "unknown";

        return publishAfterCommitOrImmediately(topic, partitionKey, event);
    }

    /**
     * Executes publication either after the current database transaction commits,
     * or immediately if no transaction is active.
     */
    private CompletableFuture<SendResult<String, Object>> publishAfterCommitOrImmediately(
            String topic, String key, KynexisEvent event) {

        if (!properties.isEnabled() || kafkaTemplate == null) {
            log.debug("Kafka publishing disabled or KafkaTemplate unavailable. Skipping eventType={} machineId={}",
                    event.getEventType(), event.getMachineId());
            return CompletableFuture.completedFuture(null);
        }

        CompletableFuture<SendResult<String, Object>> resultFuture = new CompletableFuture<>();

        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            log.debug("Active transaction detected. Registering transaction synchronization for eventType={} eventId={}",
                    event.getEventType(), event.getEventId());

            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                private final AtomicBoolean executed = new AtomicBoolean(false);

                @Override
                public void afterCommit() {
                    if (executed.compareAndSet(false, true)) {
                        sendToKafkaAsync(topic, key, event, resultFuture);
                    }
                }

                @Override
                public void afterCompletion(int status) {
                    if (status != TransactionSynchronization.STATUS_COMMITTED) {
                        if (executed.compareAndSet(false, true)) {
                            log.warn("Transaction rolled back or uncommitted (status={}). Kafka event publication skipped for eventType={} eventId={}",
                                    status, event.getEventType(), event.getEventId());
                            resultFuture.completeExceptionally(new IllegalStateException(
                                    "Transaction rolled back or uncommitted (status=" + status + "); Kafka event publication cancelled for eventId=" + event.getEventId()));
                        }
                    }
                }
            });
        } else {
            sendToKafkaAsync(topic, key, event, resultFuture);
        }

        return resultFuture;
    }

    /**
     * Asynchronously delivers the event record to the Kafka broker.
     */
    private void sendToKafkaAsync(
            String topic,
            String key,
            KynexisEvent event,
            CompletableFuture<SendResult<String, Object>> resultFuture) {

        try {
            log.info("Sending Kafka event topic={} key={} eventType={} eventId={}",
                    topic, key, event.getEventType(), event.getEventId());

            CompletableFuture<SendResult<String, Object>> sendFuture = kafkaTemplate.send(topic, key, event);
            if (sendFuture == null) {
                log.warn("KafkaTemplate.send returned null future for topic={} key={} eventId={}", topic, key, event.getEventId());
                resultFuture.complete(null);
                return;
            }

            sendFuture.whenComplete((result, ex) -> {
                if (ex != null) {
                    log.error("Failed to publish event to Kafka topic={} key={} eventId={} eventType={}: {}",
                            topic, key, event.getEventId(), event.getEventType(), ex.getMessage(), ex);
                    resultFuture.completeExceptionally(ex);
                } else {
                    RecordMetadata metadata = result != null ? result.getRecordMetadata() : null;
                    if (metadata != null) {
                        log.info("Successfully published Kafka event topic={} partition={} offset={} eventId={}",
                                metadata.topic(), metadata.partition(), metadata.offset(), event.getEventId());
                    } else {
                        log.info("Successfully published Kafka event topic={} key={} eventId={}",
                                topic, key, event.getEventId());
                    }
                    resultFuture.complete(result);
                }
            });
        } catch (Exception ex) {
            log.error("Immediate exception while initiating Kafka send for topic={} key={} eventId={}: {}",
                    topic, key, event.getEventId(), ex.getMessage(), ex);
            resultFuture.completeExceptionally(ex);
        }
    }

    private String getCorrelationId() {
        String correlationId = MDC.get(LoggingConstants.CORRELATION_ID_KEY);
        return (correlationId != null && !correlationId.isBlank()) ? correlationId : null;
    }
}
