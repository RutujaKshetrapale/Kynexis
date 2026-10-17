package com.kynexis.alert.consumer;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import com.kynexis.alert.service.alert.AlertEngineService;
import com.kynexis.common.dto.event.MachineTelemetryRecorded;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class TelemetryEventConsumer {

    private final AlertEngineService alertEngineService;

    public TelemetryEventConsumer(AlertEngineService alertEngineService) {
        this.alertEngineService = alertEngineService;
    }

    @KafkaListener(
            topics = "${kynexis.kafka.topics.machine-telemetry:kynexis.machine-telemetry}",
            groupId = "${spring.kafka.consumer.group-id:alert-service-group}")
    public void consumeTelemetryEvent(MachineTelemetryRecorded event) {
        if (event == null) {
            log.warn("Received null telemetry event from Kafka");
            return;
        }

        log.info("Received MachineTelemetryRecorded event: machineId={} temp={} vib={} press={} rpm={}",
                event.getMachineId(), event.getTemperature(), event.getVibration(), event.getPressure(), event.getRpm());

        try {
            alertEngineService.evaluateTelemetryReading(event);
        } catch (Exception ex) {
            log.error("Failed to process telemetry event for machineId={}: {}", event.getMachineId(), ex.getMessage(), ex);
        }
    }
}
