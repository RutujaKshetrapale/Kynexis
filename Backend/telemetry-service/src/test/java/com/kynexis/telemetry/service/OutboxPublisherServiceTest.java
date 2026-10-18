package com.kynexis.telemetry.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kynexis.common.dto.event.MachineTelemetryRecorded;
import com.kynexis.telemetry.entity.OutboxEvent;
import com.kynexis.telemetry.entity.OutboxStatus;
import com.kynexis.telemetry.repository.OutboxEventRepository;

class OutboxPublisherServiceTest {

    private OutboxEventRepository outboxEventRepository;
    private KafkaTemplate<String, Object> kafkaTemplate;
    private ObjectMapper objectMapper;
    private OutboxPublisherService outboxPublisherService;

    @BeforeEach
    void setUp() {
        outboxEventRepository = mock(OutboxEventRepository.class);
        kafkaTemplate = mock(KafkaTemplate.class);
        objectMapper = new ObjectMapper().findAndRegisterModules();
        outboxPublisherService = new OutboxPublisherService(outboxEventRepository, kafkaTemplate, objectMapper);
    }

    @Test
    @DisplayName("Should publish pending outbox event successfully and mark PUBLISHED")
    void shouldPublishPendingEventSuccessfully() throws Exception {
        MachineTelemetryRecorded event = MachineTelemetryRecorded.builder()
                .eventId("event-123")
                .eventType(MachineTelemetryRecorded.EVENT_TYPE)
                .machineId(1L)
                .telemetryId(10L)
                .temperature(75.0)
                .build();

        String payload = objectMapper.writeValueAsString(event);

        OutboxEvent outboxEvent = OutboxEvent.builder()
                .id(1L)
                .eventId("event-123")
                .eventType(MachineTelemetryRecorded.EVENT_TYPE)
                .topic("kynexis.machine-telemetry")
                .partitionKey("1")
                .payload(payload)
                .status(OutboxStatus.PENDING)
                .retryCount(0)
                .createdAt(LocalDateTime.now())
                .build();

        when(outboxEventRepository.findTop50ByStatusOrderByCreatedAtAsc(OutboxStatus.PENDING))
                .thenReturn(List.of(outboxEvent));
        when(outboxEventRepository.findById(1L)).thenReturn(Optional.of(outboxEvent));

        CompletableFuture<SendResult<String, Object>> future = CompletableFuture.completedFuture(mock(SendResult.class));
        when(kafkaTemplate.send(eq("kynexis.machine-telemetry"), eq("1"), any())).thenReturn(future);

        outboxPublisherService.pollAndPublishPending();

        verify(kafkaTemplate, times(1)).send(eq("kynexis.machine-telemetry"), eq("1"), any());
        assertEquals(OutboxStatus.PUBLISHED, outboxEvent.getStatus());
    }

    @Test
    @DisplayName("Should handle Kafka failure by incrementing retry count")
    void shouldHandlePublishFailure() throws Exception {
        MachineTelemetryRecorded event = MachineTelemetryRecorded.builder()
                .eventId("event-failed")
                .machineId(2L)
                .build();

        String payload = objectMapper.writeValueAsString(event);

        OutboxEvent outboxEvent = OutboxEvent.builder()
                .id(2L)
                .eventId("event-failed")
                .topic("kynexis.machine-telemetry")
                .partitionKey("2")
                .payload(payload)
                .status(OutboxStatus.PENDING)
                .retryCount(0)
                .build();

        when(outboxEventRepository.findById(2L)).thenReturn(Optional.of(outboxEvent));

        CompletableFuture<SendResult<String, Object>> failedFuture = new CompletableFuture<>();
        failedFuture.completeExceptionally(new RuntimeException("Kafka broker down"));
        when(kafkaTemplate.send(eq("kynexis.machine-telemetry"), eq("2"), any())).thenReturn(failedFuture);

        outboxPublisherService.publishEvent(outboxEvent);

        assertEquals(1, outboxEvent.getRetryCount());
        assertEquals(OutboxStatus.PENDING, outboxEvent.getStatus());
    }
}
