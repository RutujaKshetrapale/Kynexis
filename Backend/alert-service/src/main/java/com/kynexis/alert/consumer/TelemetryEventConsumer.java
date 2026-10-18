package com.kynexis.alert.consumer;

import java.time.LocalDateTime;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import com.kynexis.alert.entity.ProcessedEvent;
import com.kynexis.alert.repository.ProcessedEventRepository;
import com.kynexis.alert.service.alert.AlertEngineService;
import com.kynexis.common.dto.event.MachineTelemetryRecorded;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class TelemetryEventConsumer {

    private final AlertEngineService alertEngineService;
    private final ProcessedEventRepository processedEventRepository;

    public TelemetryEventConsumer(
            AlertEngineService alertEngineService,
            @Autowired(required = false) ProcessedEventRepository processedEventRepository) {
        this.alertEngineService = alertEngineService;
        this.processedEventRepository = processedEventRepository;
    }

    public TelemetryEventConsumer(AlertEngineService alertEngineService) {
        this(alertEngineService, null);
    }

    @KafkaListener(
            topics = "${kynexis.kafka.topics.machine-telemetry:kynexis.machine-telemetry}",
            groupId = "${spring.kafka.consumer.group-id:alert-service-group}")
    public void consumeTelemetryEvent(MachineTelemetryRecorded event) {
        if (event == null) {
            log.warn("Received null telemetry event from Kafka");
            return;
        }

        // Idempotency check: discard duplicates
        String eventId = event.getEventId();
        if (eventId != null && processedEventRepository != null && processedEventRepository.existsByEventId(eventId)) {
            log.warn("Duplicate telemetry event detected with eventId={}; discarding idempotently", eventId);
            return;
        }

        log.info("Processing MachineTelemetryRecorded event: eventId={} machineId={} temp={} vib={} press={} rpm={}",
                eventId, event.getMachineId(), event.getTemperature(), event.getVibration(), event.getPressure(), event.getRpm());

        try {
            alertEngineService.evaluateTelemetryReading(event);

            // Record successful processing for idempotency
            if (eventId != null && processedEventRepository != null) {
                processedEventRepository.save(ProcessedEvent.builder()
                        .eventId(eventId)
                        .eventType(event.getEventType() != null ? event.getEventType() : MachineTelemetryRecorded.EVENT_TYPE)
                        .processedAt(LocalDateTime.now())
                        .build());
            }
        } catch (Exception ex) {
            log.error("Failed to process telemetry event for machineId={} eventId={}: {}",
                    event.getMachineId(), eventId, ex.getMessage(), ex);
            // Rethrow so DefaultErrorHandler triggers retry and DLQ routing
            throw new RuntimeException("Telemetry event processing failed for eventId=" + eventId, ex);
        }
    }
}
