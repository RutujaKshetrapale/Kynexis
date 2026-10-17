package com.kynexis.telemetry.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import java.time.LocalDateTime;
import java.util.concurrent.CompletableFuture;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;

import com.kynexis.common.dto.event.MachineTelemetryRecorded;
import com.kynexis.telemetry.entity.Telemetry;

@ExtendWith(MockitoExtension.class)
class KafkaEventPublisherServiceTest {

    @Mock
    private KafkaTemplate<String, Object> kafkaTemplate;

    private KafkaEventPublisherService publisherService;
    private Telemetry telemetry;

    @BeforeEach
    void setUp() {
        publisherService = new KafkaEventPublisherService(kafkaTemplate, "kynexis.machine-telemetry");

        telemetry = Telemetry.builder()
                .id(100L)
                .machineId(1L)
                .temperature(75.5)
                .vibration(0.4)
                .pressure(2.1)
                .rpm(1500.0)
                .timestamp(LocalDateTime.of(2026, 10, 8, 10, 0, 0))
                .build();
    }

    @Test
    @DisplayName("Publish telemetry - Sends event to Kafka with machineId key")
    void testPublishTelemetryRecorded() {
        CompletableFuture<SendResult<String, Object>> future = new CompletableFuture<>();
        when(kafkaTemplate.send(eq("kynexis.machine-telemetry"), eq("1"), any(MachineTelemetryRecorded.class)))
                .thenReturn(future);

        CompletableFuture<SendResult<String, Object>> result = publisherService.publishTelemetryRecorded(telemetry);

        assertNotNull(result);
        verify(kafkaTemplate).send(eq("kynexis.machine-telemetry"), eq("1"), any(MachineTelemetryRecorded.class));
    }

    @Test
    @DisplayName("Publish telemetry - Null telemetry returns completed future")
    void testPublishTelemetryNull() {
        CompletableFuture<SendResult<String, Object>> result = publisherService.publishTelemetryRecorded(null);
        assertNotNull(result);
        assertTrue(result.isDone());
        verify(kafkaTemplate, never()).send(any(), any(), any());
    }
}
