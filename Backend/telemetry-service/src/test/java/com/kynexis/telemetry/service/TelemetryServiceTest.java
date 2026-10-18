package com.kynexis.telemetry.service;

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

import com.kynexis.telemetry.common.exception.ResourceNotFoundException;
import com.kynexis.telemetry.client.MachineServiceClient;
import com.kynexis.telemetry.dto.TelemetryDTO;
import com.kynexis.telemetry.dto.TelemetryRequest;
import com.kynexis.telemetry.entity.Telemetry;
import com.kynexis.telemetry.repository.TelemetryRepository;

@ExtendWith(MockitoExtension.class)
class TelemetryServiceTest {

    @Mock
    private TelemetryRepository telemetryRepository;

    @Mock
    private MachineServiceClient machineServiceClient;

    @Mock
    private DomainValidationService domainValidationService;

    @Mock
    private KafkaEventPublisherService kafkaEventPublisherService;

    @InjectMocks
    private TelemetryService telemetryService;

    private TelemetryRequest request;
    private Telemetry telemetry;

    @BeforeEach
    void setUp() {
        request = TelemetryRequest.builder()
                .machineId(1L)
                .temperature(75.5)
                .vibration(0.4)
                .pressure(2.1)
                .rpm(1500.0)
                .timestamp(LocalDateTime.of(2026, 10, 8, 10, 0, 0))
                .build();

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
    @DisplayName("Create telemetry - Success publishes to Kafka and returns DTO")
    void testCreateTelemetrySuccess() {
        when(machineServiceClient.machineExists(1L)).thenReturn(true);
        when(telemetryRepository.save(any(Telemetry.class))).thenReturn(telemetry);

        TelemetryDTO dto = telemetryService.create(request);

        assertNotNull(dto);
        assertEquals(100L, dto.getId());
        assertEquals(1L, dto.getMachineId());
        assertEquals(75.5, dto.getTemperature());
        verify(domainValidationService).validateTelemetry(75.5, 0.4, 2.1, 1500.0);
        verify(kafkaEventPublisherService).publishTelemetryRecorded(telemetry);
    }

    @Test
    @DisplayName("Create telemetry - Machine not found throws ResourceNotFoundException")
    void testCreateTelemetryMachineNotFound() {
        when(machineServiceClient.machineExists(1L)).thenReturn(false);

        assertThrows(ResourceNotFoundException.class, () -> telemetryService.create(request));
        verify(telemetryRepository, never()).save(any());
        verify(kafkaEventPublisherService, never()).publishTelemetryRecorded(any());
    }

    @Test
    @DisplayName("Get latest by machine - Success")
    void testGetLatestByMachine() {
        when(telemetryRepository.findTopByMachineIdOrderByTimestampDesc(1L)).thenReturn(Optional.of(telemetry));

        Optional<TelemetryDTO> result = telemetryService.getLatestByMachine(1L);

        assertTrue(result.isPresent());
        assertEquals(100L, result.get().getId());
    }
}
