package com.kynexis.alert.consumer;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.kynexis.alert.entity.ProcessedEvent;
import com.kynexis.alert.repository.ProcessedEventRepository;
import com.kynexis.alert.service.alert.AlertEngineService;
import com.kynexis.alert.common.dto.event.MachineTelemetryRecorded;

class TelemetryEventConsumerTest {

    private AlertEngineService alertEngineService;
    private ProcessedEventRepository processedEventRepository;
    private TelemetryEventConsumer consumer;

    @BeforeEach
    void setUp() {
        alertEngineService = mock(AlertEngineService.class);
        processedEventRepository = mock(ProcessedEventRepository.class);
        consumer = new TelemetryEventConsumer(alertEngineService, processedEventRepository);
    }

    @Test
    @DisplayName("Should process new telemetry event and record in processed_events")
    void shouldProcessNewEvent() {
        MachineTelemetryRecorded event = MachineTelemetryRecorded.builder()
                .eventId("event-unique-1")
                .machineId(1L)
                .temperature(90.0)
                .build();

        when(processedEventRepository.existsByEventId("event-unique-1")).thenReturn(false);

        consumer.consumeTelemetryEvent(event);

        verify(alertEngineService, times(1)).evaluateTelemetryReading(event);
        verify(processedEventRepository, times(1)).save(any(ProcessedEvent.class));
    }

    @Test
    @DisplayName("Should discard duplicate telemetry event idempotently without re-evaluation")
    void shouldDiscardDuplicateEvent() {
        MachineTelemetryRecorded event = MachineTelemetryRecorded.builder()
                .eventId("event-already-processed")
                .machineId(1L)
                .temperature(95.0)
                .build();

        when(processedEventRepository.existsByEventId("event-already-processed")).thenReturn(true);

        consumer.consumeTelemetryEvent(event);

        verify(alertEngineService, never()).evaluateTelemetryReading(any());
        verify(processedEventRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should rethrow exception on processing failure for consumer retry and DLQ routing")
    void shouldRethrowOnProcessingFailure() {
        MachineTelemetryRecorded event = MachineTelemetryRecorded.builder()
                .eventId("event-failing")
                .machineId(1L)
                .temperature(100.0)
                .build();

        when(processedEventRepository.existsByEventId("event-failing")).thenReturn(false);
        doThrow(new RuntimeException("DB error during alert evaluation"))
                .when(alertEngineService).evaluateTelemetryReading(event);

        assertThrows(RuntimeException.class, () -> consumer.consumeTelemetryEvent(event));
        verify(processedEventRepository, never()).save(any());
    }
}
