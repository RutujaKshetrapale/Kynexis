package com.kynexis.alert.service.alert;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.kynexis.alert.config.AlertEngineProperties;
import com.kynexis.alert.dto.AlertDTO;
import com.kynexis.alert.dto.AlertRequest;
import com.kynexis.alert.entity.Alert;
import com.kynexis.alert.repository.AlertRepository;
import com.kynexis.alert.service.AlertService;
import com.kynexis.common.dto.event.MachineTelemetryRecorded;

@ExtendWith(MockitoExtension.class)
class AlertEngineServiceTest {

    @Mock
    private AlertRepository alertRepository;

    @Mock
    private AlertService alertService;

    private AlertEngineProperties properties;
    private AlertEngineService alertEngineService;
    private TemperatureHighRule temperatureHighRule;

    @BeforeEach
    void setUp() {
        properties = new AlertEngineProperties();
        properties.setEnabled(true);
        properties.setTemperatureHighEnabled(true);
        properties.setTemperatureHighThreshold(85.0);
        properties.setTemperatureHighSeverity("HIGH");

        temperatureHighRule = new TemperatureHighRule();
        alertEngineService = new AlertEngineService(
                properties, alertRepository, alertService, List.of(temperatureHighRule));
    }

    @Test
    @DisplayName("Evaluate telemetry - Temperature > 85 creates new alert")
    void testEvaluateTelemetryBreachedNewAlert() {
        MachineTelemetryRecorded reading = MachineTelemetryRecorded.builder()
                .machineId(1L)
                .telemetryId(50L)
                .temperature(92.0)
                .vibration(0.5)
                .pressure(2.0)
                .rpm(1500.0)
                .build();

        when(alertRepository.findFirstByMachineIdAndTypeAndResolvedFalseOrderByCreatedAtDesc(1L, "TEMPERATURE_HIGH"))
                .thenReturn(Optional.empty());

        AlertDTO alertDTO = AlertDTO.builder()
                .id(1L)
                .machineId(1L)
                .type("TEMPERATURE_HIGH")
                .severity("HIGH")
                .message("High temp")
                .build();

        when(alertService.create(any(AlertRequest.class))).thenReturn(alertDTO);

        List<AlertDTO> results = alertEngineService.evaluateTelemetryReading(reading);

        assertNotNull(results);
        assertEquals(1, results.size());
        assertEquals("TEMPERATURE_HIGH", results.get(0).getType());
        verify(alertService).create(any(AlertRequest.class));
    }

    @Test
    @DisplayName("Evaluate telemetry - Normal temperature auto-resolves existing active alert")
    void testEvaluateTelemetryAutoResolve() {
        MachineTelemetryRecorded reading = MachineTelemetryRecorded.builder()
                .machineId(1L)
                .telemetryId(51L)
                .temperature(70.0) // normal
                .vibration(0.5)
                .pressure(2.0)
                .rpm(1500.0)
                .build();

        Alert activeAlert = Alert.builder()
                .id(1L)
                .machineId(1L)
                .type("TEMPERATURE_HIGH")
                .severity("HIGH")
                .resolved(false)
                .build();

        when(alertRepository.findFirstByMachineIdAndTypeAndResolvedFalseOrderByCreatedAtDesc(1L, "TEMPERATURE_HIGH"))
                .thenReturn(Optional.of(activeAlert));

        AlertDTO resolvedDTO = AlertDTO.builder()
                .id(1L)
                .machineId(1L)
                .type("TEMPERATURE_HIGH")
                .resolved(true)
                .build();

        when(alertService.resolveAlert(1L)).thenReturn(resolvedDTO);

        List<AlertDTO> results = alertEngineService.evaluateTelemetryReading(reading);

        assertNotNull(results);
        assertEquals(1, results.size());
        assertTrue(results.get(0).isResolved());
        verify(alertService).resolveAlert(1L);
    }
}
