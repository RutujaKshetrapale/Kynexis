package com.kynexis.alert.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.time.LocalDateTime;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.kynexis.alert.dto.AlertDTO;
import com.kynexis.alert.dto.AlertRequest;
import com.kynexis.alert.entity.Alert;
import com.kynexis.alert.repository.AlertRepository;
import com.kynexis.common.exception.ResourceNotFoundException;

@ExtendWith(MockitoExtension.class)
class AlertServiceTest {

    @Mock
    private AlertRepository alertRepository;

    @Mock
    private KafkaEventPublisherService kafkaEventPublisherService;

    @InjectMocks
    private AlertService alertService;

    private AlertRequest alertRequest;
    private Alert alert;

    @BeforeEach
    void setUp() {
        alertRequest = AlertRequest.builder()
                .machineId(1L)
                .type("TEMPERATURE_HIGH")
                .severity("HIGH")
                .message("High temperature warning")
                .resolved(false)
                .build();

        alert = Alert.builder()
                .id(10L)
                .machineId(1L)
                .type("TEMPERATURE_HIGH")
                .severity("HIGH")
                .message("High temperature warning")
                .resolved(false)
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("Create alert - Success publishes to Kafka")
    void testCreateAlertSuccess() {
        when(alertRepository.save(any(Alert.class))).thenReturn(alert);

        AlertDTO result = alertService.create(alertRequest);

        assertNotNull(result);
        assertEquals(10L, result.getId());
        assertEquals("TEMPERATURE_HIGH", result.getType());
        assertEquals("HIGH", result.getSeverity());
        assertFalse(result.isResolved());
        verify(kafkaEventPublisherService).publishAlertCreated(alert);
    }

    @Test
    @DisplayName("Resolve alert - Success sets resolved to true and publishes event")
    void testResolveAlertSuccess() {
        when(alertRepository.findById(10L)).thenReturn(Optional.of(alert));
        when(alertRepository.save(any(Alert.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AlertDTO resolved = alertService.resolveAlert(10L);

        assertNotNull(resolved);
        assertTrue(resolved.isResolved());
        verify(kafkaEventPublisherService).publishAlertResolved(any(Alert.class));
    }

    @Test
    @DisplayName("Get by ID - Not found throws ResourceNotFoundException")
    void testGetByIdNotFound() {
        when(alertRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> alertService.getById(99L));
    }
}
