package com.example.demo.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import com.example.demo.config.MachineHealthProperties;
import com.example.demo.dto.MachineHealthResponse;
import com.example.demo.entity.Alert;
import com.example.demo.entity.Machine;
import com.example.demo.entity.Telemetry;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.model.HealthState;
import com.example.demo.repository.AlertRepository;
import com.example.demo.repository.MachineRepository;
import com.example.demo.repository.TelemetryRepository;

@ExtendWith(MockitoExtension.class)
class MachineHealthServiceTest {

    @Mock
    private MachineRepository machineRepository;

    @Mock
    private TelemetryRepository telemetryRepository;

    @Mock
    private AlertRepository alertRepository;

    private MachineHealthProperties healthProperties;
    private MachineHealthService machineHealthService;

    private Machine machine1;
    private Telemetry telemetry1;

    @BeforeEach
    void setUp() {
        healthProperties = new MachineHealthProperties();
        machineHealthService = new MachineHealthService(
                machineRepository,
                telemetryRepository,
                alertRepository,
                healthProperties
        );

        machine1 = new Machine();
        machine1.setName("CNC Mill 01");
        machine1.setType("CNC");
        machine1.setStatus("RUNNING");
        try {
            var field = Machine.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(machine1, 1L);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        telemetry1 = new Telemetry();
        telemetry1.setMachine(machine1);
        telemetry1.setTemperature(72.0);
        telemetry1.setVibration(1.5);
        telemetry1.setPressure(45.0);
        telemetry1.setRpm(2500.0);
        telemetry1.setTimestamp(LocalDateTime.of(2026, 10, 10, 12, 0));
    }

    @Test
    @DisplayName("Scenario 1: Machine with telemetry and no unresolved alerts is HEALTHY")
    void testMachineWithTelemetryAndNoAlertsIsHealthy() {
        when(machineRepository.findById(1L)).thenReturn(Optional.of(machine1));
        when(telemetryRepository.findTopByMachineIdOrderByTimestampDesc(1L)).thenReturn(Optional.of(telemetry1));
        when(alertRepository.findByMachineIdAndResolvedFalse(1L)).thenReturn(List.of());

        MachineHealthResponse response = machineHealthService.getMachineHealth(1L);

        assertNotNull(response);
        assertEquals(HealthState.HEALTHY.name(), response.getHealthState());
        assertEquals(72.0, response.getTemperature());
        assertEquals(0, response.getTotalUnresolvedAlertCount());
        assertTrue(response.getContributingReasons().get(0).contains("operating normally"));
    }

    @Test
    @DisplayName("Scenario 2: Machine with unresolved HIGH or MEDIUM alert is DEGRADED")
    void testMachineWithHighOrMediumAlertIsDegraded() {
        when(machineRepository.findById(1L)).thenReturn(Optional.of(machine1));
        when(telemetryRepository.findTopByMachineIdOrderByTimestampDesc(1L)).thenReturn(Optional.of(telemetry1));

        Alert highAlert = new Alert();
        highAlert.setMachine(machine1);
        highAlert.setType("OVERHEATING");
        highAlert.setSeverity("HIGH");
        highAlert.setMessage("Temperature exceeded safety limit");
        highAlert.setResolved(false);

        when(alertRepository.findByMachineIdAndResolvedFalse(1L)).thenReturn(List.of(highAlert));

        MachineHealthResponse response = machineHealthService.getMachineHealth(1L);

        assertEquals(HealthState.DEGRADED.name(), response.getHealthState());
        assertEquals(1, response.getHighAlertCount());
        assertEquals(1, response.getTotalUnresolvedAlertCount());
        assertTrue(response.getContributingReasons().stream().anyMatch(r -> r.contains("OVERHEATING") || r.contains("HIGH")));
    }

    @Test
    @DisplayName("Scenario 3: Machine with unresolved CRITICAL alert is CRITICAL")
    void testMachineWithCriticalAlertIsCritical() {
        when(machineRepository.findById(1L)).thenReturn(Optional.of(machine1));
        when(telemetryRepository.findTopByMachineIdOrderByTimestampDesc(1L)).thenReturn(Optional.of(telemetry1));

        Alert criticalAlert = new Alert();
        criticalAlert.setMachine(machine1);
        criticalAlert.setType("ABNORMAL_MACHINE_STATUS");
        criticalAlert.setSeverity("CRITICAL");
        criticalAlert.setMessage("Machine entered OFFLINE status");
        criticalAlert.setResolved(false);

        when(alertRepository.findByMachineIdAndResolvedFalse(1L)).thenReturn(List.of(criticalAlert));

        MachineHealthResponse response = machineHealthService.getMachineHealth(1L);

        assertEquals(HealthState.CRITICAL.name(), response.getHealthState());
        assertEquals(1, response.getCriticalAlertCount());
        assertTrue(response.getContributingReasons().stream().anyMatch(r -> r.contains("CRITICAL")));
    }

    @Test
    @DisplayName("Scenario 4: Machine without telemetry is UNKNOWN (not incorrectly classified as HEALTHY)")
    void testMachineWithoutTelemetryIsUnknown() {
        when(machineRepository.findById(1L)).thenReturn(Optional.of(machine1));
        when(telemetryRepository.findTopByMachineIdOrderByTimestampDesc(1L)).thenReturn(Optional.empty());
        when(alertRepository.findByMachineIdAndResolvedFalse(1L)).thenReturn(List.of());

        MachineHealthResponse response = machineHealthService.getMachineHealth(1L);

        assertEquals(HealthState.UNKNOWN.name(), response.getHealthState());
        assertNull(response.getLatestTelemetryTimestamp());
        assertTrue(response.getContributingReasons().stream().anyMatch(r -> r.contains("No usable telemetry")));
    }

    @Test
    @DisplayName("Scenario 5: Alert severity counts and contributing reasons are accurate")
    void testAlertSeverityCountsAndReasonsAccurate() {
        when(machineRepository.findById(1L)).thenReturn(Optional.of(machine1));
        when(telemetryRepository.findTopByMachineIdOrderByTimestampDesc(1L)).thenReturn(Optional.of(telemetry1));

        Alert criticalAlert = new Alert();
        criticalAlert.setSeverity("CRITICAL");
        criticalAlert.setMessage("Emergency stop activated");

        Alert highAlert = new Alert();
        highAlert.setSeverity("HIGH");
        highAlert.setMessage("High pressure detected");

        Alert lowAlert = new Alert();
        lowAlert.setSeverity("LOW");
        lowAlert.setMessage("Minor maintenance notice");

        when(alertRepository.findByMachineIdAndResolvedFalse(1L)).thenReturn(List.of(criticalAlert, highAlert, lowAlert));

        MachineHealthResponse response = machineHealthService.getMachineHealth(1L);

        assertEquals(HealthState.CRITICAL.name(), response.getHealthState());
        assertEquals(3, response.getTotalUnresolvedAlertCount());
        assertEquals(1, response.getCriticalAlertCount());
        assertEquals(1, response.getHighAlertCount());
        assertEquals(0, response.getMediumAlertCount());
        assertEquals(1, response.getLowAlertCount());
        assertEquals(1, response.getSeverityCounts().get("CRITICAL"));
        assertEquals(1, response.getSeverityCounts().get("HIGH"));
        assertEquals(1, response.getSeverityCounts().get("LOW"));
    }

    @Test
    @DisplayName("Scenario 6: Resolved alerts do not affect calculated health")
    void testResolvedAlertsDoNotAffectHealth() {
        when(machineRepository.findById(1L)).thenReturn(Optional.of(machine1));
        when(telemetryRepository.findTopByMachineIdOrderByTimestampDesc(1L)).thenReturn(Optional.of(telemetry1));

        // findByMachineIdAndResolvedFalse returns empty list because all alerts are resolved
        when(alertRepository.findByMachineIdAndResolvedFalse(1L)).thenReturn(List.of());

        MachineHealthResponse response = machineHealthService.getMachineHealth(1L);

        assertEquals(HealthState.HEALTHY.name(), response.getHealthState());
        assertEquals(0, response.getTotalUnresolvedAlertCount());
    }

    @Test
    @DisplayName("Scenario 7: Disabled Phase 16 rules do not independently generate health conditions")
    void testDisabledPhase16RulesDoNotGenerateHealthConditions() {
        // Since Health Engine relies ONLY on persisted unresolved alerts and does not execute rules directly,
        // disabled rules which produce no alerts result in normal HEALTHY status
        when(machineRepository.findById(1L)).thenReturn(Optional.of(machine1));
        when(telemetryRepository.findTopByMachineIdOrderByTimestampDesc(1L)).thenReturn(Optional.of(telemetry1));
        when(alertRepository.findByMachineIdAndResolvedFalse(1L)).thenReturn(List.of());

        MachineHealthResponse response = machineHealthService.getMachineHealth(1L);

        assertEquals(HealthState.HEALTHY.name(), response.getHealthState());
    }

    @Test
    @DisplayName("Scenario 8: Nonexistent machine returns ResourceNotFoundException")
    void testNonexistentMachineReturnsNotFound() {
        when(machineRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> machineHealthService.getMachineHealth(99L));
    }

    @Test
    @DisplayName("Scenario 9: Health calculation does not create, resolve, or modify alerts (Read-Only)")
    void testHealthCalculationIsReadOnly() {
        when(machineRepository.findById(1L)).thenReturn(Optional.of(machine1));
        when(telemetryRepository.findTopByMachineIdOrderByTimestampDesc(1L)).thenReturn(Optional.of(telemetry1));
        when(alertRepository.findByMachineIdAndResolvedFalse(1L)).thenReturn(List.of());

        machineHealthService.getMachineHealth(1L);

        // Verify NO repository save or delete operations were executed
        verify(machineRepository, never()).save(any());
        verify(telemetryRepository, never()).save(any());
        verify(alertRepository, never()).save(any());
        verify(alertRepository, never()).delete(any());
    }

    @Test
    @DisplayName("Scenario 11: Bulk health pagination works correctly without N+1 queries")
    void testBulkHealthPagination() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Machine> machinePage = new PageImpl<>(List.of(machine1), pageable, 1);

        when(machineRepository.findAll(pageable)).thenReturn(machinePage);
        when(telemetryRepository.findLatestTelemetryByMachineIds(List.of(1L))).thenReturn(List.of(telemetry1));
        when(alertRepository.findByMachineIdInAndResolvedFalse(List.of(1L))).thenReturn(List.of());

        Page<MachineHealthResponse> resultPage = machineHealthService.getBulkMachineHealth(pageable);

        assertNotNull(resultPage);
        assertEquals(1, resultPage.getContent().size());
        MachineHealthResponse response = resultPage.getContent().get(0);
        assertEquals(1L, response.getMachineId());
        assertEquals(HealthState.HEALTHY.name(), response.getHealthState());

        // Verify batch queries executed instead of N+1 individual queries
        verify(telemetryRepository, times(1)).findLatestTelemetryByMachineIds(List.of(1L));
        verify(alertRepository, times(1)).findByMachineIdInAndResolvedFalse(List.of(1L));
    }
}
