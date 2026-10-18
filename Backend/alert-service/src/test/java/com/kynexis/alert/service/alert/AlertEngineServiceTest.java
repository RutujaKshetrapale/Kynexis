package com.kynexis.alert.service.alert;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
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
import com.kynexis.alert.common.dto.event.MachineTelemetryRecorded;

@ExtendWith(MockitoExtension.class)
class AlertEngineServiceTest {

    @Mock
    private AlertRepository alertRepository;

    @Mock
    private AlertService alertService;

    private AlertEngineProperties properties;
    private AlertEngineService alertEngineService;
    private TemperatureHighRule temperatureHighRule;
    private TemperatureLowRule temperatureLowRule;
    private PressureLowRule pressureLowRule;
    private MachineStatusRule machineStatusRule;

    @BeforeEach
    void setUp() {
        properties = new AlertEngineProperties();
        properties.setEnabled(true);
        properties.setTemperatureHighEnabled(true);
        properties.setTemperatureHighThreshold(85.0);
        properties.setTemperatureHighSeverity("HIGH");

        properties.setTemperatureLowEnabled(true);
        properties.setTemperatureLowThreshold(0.0);
        properties.setTemperatureLowSeverity("MEDIUM");

        properties.setPressureLowEnabled(true);
        properties.setPressureLowThreshold(10.0);
        properties.setPressureLowSeverity("MEDIUM");

        properties.setMachineStatusEnabled(true);

        temperatureHighRule = new TemperatureHighRule();
        temperatureLowRule = new TemperatureLowRule();
        pressureLowRule = new PressureLowRule();
        machineStatusRule = new MachineStatusRule();

        alertEngineService = new AlertEngineService(
                properties,
                alertRepository,
                alertService,
                List.of(temperatureHighRule, temperatureLowRule, pressureLowRule, machineStatusRule));
    }

    @Test
    @DisplayName("Evaluate telemetry - Temperature > 85 creates new alert")
    void testEvaluateTelemetryBreachedNewAlert() {
        MachineTelemetryRecorded reading = MachineTelemetryRecorded.builder()
                .machineId(1L)
                .telemetryId(50L)
                .temperature(92.0)
                .vibration(0.5)
                .pressure(50.0)
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
        assertTrue(results.stream().anyMatch(a -> "TEMPERATURE_HIGH".equals(a.getType())));
        verify(alertService).create(any(AlertRequest.class));
    }

    @Test
    @DisplayName("Evaluate telemetry - Duplicate suppression when identical active alert already exists")
    void testEvaluateTelemetryDuplicateSuppression() {
        MachineTelemetryRecorded reading = MachineTelemetryRecorded.builder()
                .machineId(1L)
                .telemetryId(50L)
                .temperature(92.0)
                .vibration(0.5)
                .pressure(50.0)
                .rpm(1500.0)
                .build();

        String expectedMessage = String.format("Temperature of %.2f°C exceeded high threshold of %.2f°C", 92.0, 85.0);
        Alert existingAlert = Alert.builder()
                .id(100L)
                .machineId(1L)
                .type("TEMPERATURE_HIGH")
                .severity("HIGH")
                .message(expectedMessage)
                .resolved(false)
                .build();

        when(alertRepository.findFirstByMachineIdAndTypeAndResolvedFalseOrderByCreatedAtDesc(1L, "TEMPERATURE_HIGH"))
                .thenReturn(Optional.of(existingAlert));

        List<AlertDTO> results = alertEngineService.evaluateTelemetryReading(reading);

        // Neither create nor update should be called because severity & message are unchanged
        verify(alertService, never()).create(any(AlertRequest.class));
        verify(alertService, never()).update(anyLong(), any(AlertRequest.class));
    }

    @Test
    @DisplayName("Evaluate telemetry - Low temperature creates LOW_TEMPERATURE alert")
    void testEvaluateTelemetryLowTemperatureBreached() {
        MachineTelemetryRecorded reading = MachineTelemetryRecorded.builder()
                .machineId(1L)
                .telemetryId(52L)
                .temperature(-5.0)
                .vibration(0.5)
                .pressure(50.0)
                .rpm(1500.0)
                .build();

        when(alertRepository.findFirstByMachineIdAndTypeAndResolvedFalseOrderByCreatedAtDesc(1L, "LOW_TEMPERATURE"))
                .thenReturn(Optional.empty());

        AlertDTO lowTempDTO = AlertDTO.builder()
                .id(2L)
                .machineId(1L)
                .type("LOW_TEMPERATURE")
                .severity("MEDIUM")
                .build();

        when(alertService.create(any(AlertRequest.class))).thenReturn(lowTempDTO);

        List<AlertDTO> results = alertEngineService.evaluateTelemetryReading(reading);

        assertNotNull(results);
        assertTrue(results.stream().anyMatch(a -> "LOW_TEMPERATURE".equals(a.getType())));
    }

    @Test
    @DisplayName("Evaluate telemetry - Low pressure creates LOW_PRESSURE alert")
    void testEvaluateTelemetryLowPressureBreached() {
        MachineTelemetryRecorded reading = MachineTelemetryRecorded.builder()
                .machineId(1L)
                .telemetryId(53L)
                .temperature(25.0)
                .vibration(0.5)
                .pressure(4.0)
                .rpm(1500.0)
                .build();

        when(alertRepository.findFirstByMachineIdAndTypeAndResolvedFalseOrderByCreatedAtDesc(1L, "LOW_PRESSURE"))
                .thenReturn(Optional.empty());

        AlertDTO lowPressDTO = AlertDTO.builder()
                .id(3L)
                .machineId(1L)
                .type("LOW_PRESSURE")
                .severity("MEDIUM")
                .build();

        when(alertService.create(any(AlertRequest.class))).thenReturn(lowPressDTO);

        List<AlertDTO> results = alertEngineService.evaluateTelemetryReading(reading);

        assertNotNull(results);
        assertTrue(results.stream().anyMatch(a -> "LOW_PRESSURE".equals(a.getType())));
    }

    @Test
    @DisplayName("Evaluate machine status - OFFLINE creates ABNORMAL_MACHINE_STATUS CRITICAL alert")
    void testEvaluateMachineStatusOffline() {
        when(alertRepository.findFirstByMachineIdAndTypeAndResolvedFalseOrderByCreatedAtDesc(1L, "ABNORMAL_MACHINE_STATUS"))
                .thenReturn(Optional.empty());

        AlertDTO statusDTO = AlertDTO.builder()
                .id(5L)
                .machineId(1L)
                .type("ABNORMAL_MACHINE_STATUS")
                .severity("CRITICAL")
                .message("Machine 'CNC Mill' (ID: 1) entered OFFLINE status")
                .build();

        when(alertService.create(any(AlertRequest.class))).thenReturn(statusDTO);

        List<AlertDTO> results = alertEngineService.evaluateMachineStatus(1L, "CNC Mill", "OFFLINE");

        assertNotNull(results);
        assertEquals(1, results.size());
        assertEquals("ABNORMAL_MACHINE_STATUS", results.get(0).getType());
        assertEquals("CRITICAL", results.get(0).getSeverity());
        verify(alertService).create(any(AlertRequest.class));
    }

    @Test
    @DisplayName("Evaluate machine status - RUNNING auto-resolves existing active alert")
    void testEvaluateMachineStatusRecoveryResolvesAlert() {
        Alert activeStatusAlert = Alert.builder()
                .id(5L)
                .machineId(1L)
                .type("ABNORMAL_MACHINE_STATUS")
                .severity("CRITICAL")
                .resolved(false)
                .build();

        when(alertRepository.findFirstByMachineIdAndTypeAndResolvedFalseOrderByCreatedAtDesc(1L, "ABNORMAL_MACHINE_STATUS"))
                .thenReturn(Optional.of(activeStatusAlert));

        AlertDTO resolvedDTO = AlertDTO.builder()
                .id(5L)
                .machineId(1L)
                .type("ABNORMAL_MACHINE_STATUS")
                .resolved(true)
                .build();

        when(alertService.resolveAlert(5L)).thenReturn(resolvedDTO);

        List<AlertDTO> results = alertEngineService.evaluateMachineStatus(1L, "CNC Mill", "RUNNING");

        assertNotNull(results);
        assertEquals(1, results.size());
        assertTrue(results.get(0).isResolved());
        verify(alertService).resolveAlert(5L);
    }
}
