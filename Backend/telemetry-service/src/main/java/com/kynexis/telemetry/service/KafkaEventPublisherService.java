package com.kynexis.telemetry.service;

import java.time.LocalDateTime;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Service;

import com.kynexis.telemetry.common.dto.event.MachineTelemetryRecorded;
import com.kynexis.telemetry.common.logging.LoggingConstants;
import com.kynexis.telemetry.entity.Telemetry;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class KafkaEventPublisherService {

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final String topic;

    public KafkaEventPublisherService(
            @Autowired(required = false) KafkaTemplate<String, Object> kafkaTemplate,
            @Value("${kynexis.kafka.topics.machine-telemetry:kynexis.machine-telemetry}") String topic) {
        this.kafkaTemplate = kafkaTemplate;
        this.topic = topic;
    }

    public CompletableFuture<SendResult<String, Object>> publishTelemetryRecorded(Telemetry telemetry) {
        if (telemetry == null || telemetry.getMachineId() == null) {
            log.warn("Cannot publish telemetry event: telemetry or machineId is null");
            return CompletableFuture.completedFuture(null);
        }

        MachineTelemetryRecorded event = MachineTelemetryRecorded.builder()
                .eventId(UUID.randomUUID().toString())
                .eventType(MachineTelemetryRecorded.EVENT_TYPE)
                .schemaVersion(MachineTelemetryRecorded.SCHEMA_VERSION)
                .timestamp(LocalDateTime.now())
                .machineId(telemetry.getMachineId())
                .telemetryId(telemetry.getId())
                .temperature(telemetry.getTemperature())
                .vibration(telemetry.getVibration())
                .pressure(telemetry.getPressure())
                .rpm(telemetry.getRpm())
                .telemetryTimestamp(telemetry.getTimestamp())
                .correlationId(getCorrelationId())
                .build();

        String partitionKey = String.valueOf(telemetry.getMachineId());

        if (kafkaTemplate == null) {
            log.debug("KafkaTemplate not configured; skipping publish for topic={} key={}", topic, partitionKey);
            return CompletableFuture.completedFuture(null);
        }

        try {
            log.info("Publishing MachineTelemetryRecorded event to topic={} key={}", topic, partitionKey);
            return kafkaTemplate.send(topic, partitionKey, event)
                    .whenComplete((result, ex) -> {
                        if (ex != null) {
                            log.error("Failed to publish telemetry event to topic={} key={}: {}", topic, partitionKey, ex.getMessage(), ex);
                        } else {
                            log.info("Successfully published telemetry event to topic={} partition={} offset={}",
                                    topic,
                                    result.getRecordMetadata().partition(),
                                    result.getRecordMetadata().offset());
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
