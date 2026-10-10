package com.example.demo.service.alert;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.example.demo.config.AlertEngineProperties;
import com.example.demo.dto.AlertRequest;
import com.example.demo.entity.Alert;
import com.example.demo.entity.Machine;
import com.example.demo.entity.Telemetry;
import com.example.demo.repository.AlertRepository;
import com.example.demo.service.AlertService;

@ExtendWith(MockitoExtension.class)
class AlertEngineServiceTest {

    @Mock
    private AlertRepository alertRepository;

    @Mock
    private AlertService alertService;

    private AlertEngineProperties properties;
    private AlertEngineService alertEngineService;

    private Machine machine1;
    private Machine machine2;

    @BeforeEach
    void setUp() {
        properties = new AlertEngineProperties();
        properties.setEnabled(true);
        properties.setTemperatureHighThreshold(85.0);
        properties.setTemperatureLowThreshold(0.0);
        properties.setVibrationHighThreshold(5.0);
        properties.setPressureHighThreshold(100.0);
        properties.setPressureLowThreshold(10.0);
        properties.setRpmHighThreshold(3500.0);
        properties.setMachineStatusEnabled(true);

        List<AlertRule> rules = List.of(
                new TemperatureHighRule(),
                new TemperatureLowRule(),
                new VibrationHighRule(),
                new PressureHighRule(),
                new PressureLowRule(),
                new RpmHighRule(),
                new MachineStatusRule()
        );

        alertEngineService = new AlertEngineService(
                properties,
                alertRepository,
                alertService,
                rules
        );

        machine1 = new Machine();
        machine1.setName("CNC Mill 01");
        machine1.setType("CNC");
        machine1.setStatus("RUNNING");

        try {
            var field = Machine.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(machine1, 1L);

            machine2 = new Machine();
            machine2.setName("Welding Arm W-100");
            machine2.setType("WELDER");
            machine2.setStatus("RUNNING");
            field.set(machine2, 2L);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    // ---------------------------------------------------------
    // Regression Test 1: High temp reading creates active alert
    // ---------------------------------------------------------
    @Test
    @DisplayName("Regression 1: High-temperature reading creates an active overheating alert")
    void testHighTemperatureCreatesActiveOverheatingAlert() {
        Telemetry telemetry = new Telemetry();
        telemetry.setMachine(machine1);
        telemetry.setTemperature(92.5); // Breaches 85.0°C safety threshold
        telemetry.setVibration(2.0);
        telemetry.setPressure(50.0);
        telemetry.setRpm(3000.0);

        when(alertRepository.findFirstByMachineIdAndTypeAndResolvedFalseOrderByCreatedAtDesc(eq(1L), eq("OVERHEATING")))
                .thenReturn(Optional.empty());

        Alert createdAlert = new Alert();
        createdAlert.setType("OVERHEATING");
        createdAlert.setSeverity("HIGH");
        createdAlert.setMachine(machine1);
        createdAlert.setResolved(false);

        when(alertService.create(any(AlertRequest.class), eq(telemetry))).thenReturn(createdAlert);

        List<Alert> alerts = alertEngineService.evaluateTelemetry(telemetry);

        assertEquals(1, alerts.size());
        assertEquals("OVERHEATING", alerts.get(0).getType());
        assertFalse(alerts.get(0).isResolved());

        ArgumentCaptor<AlertRequest> requestCaptor = ArgumentCaptor.forClass(AlertRequest.class);
        verify(alertService).create(requestCaptor.capture(), eq(telemetry));
        AlertRequest req = requestCaptor.getValue();
        assertEquals(1L, req.getMachineId());
        assertEquals("OVERHEATING", req.getType());
        assertEquals("HIGH", req.getSeverity());
        assertFalse(req.isResolved());
        assertTrue(req.getMessage().contains("92.5"));
    }

    // ---------------------------------------------------------
    // Regression Test 2: Machine status update does NOT resolve telemetry alert
    // ---------------------------------------------------------
    @Test
    @DisplayName("Regression 2: Updating machine status does NOT resolve active overheating alert")
    void testMachineStatusUpdateDoesNotResolveTelemetryAlert() {
        // Machine status changes to RUNNING
        machine1.setStatus("RUNNING");

        // Active overheating alert exists in DB
        Alert activeOverheatingAlert = new Alert();
        activeOverheatingAlert.setType("OVERHEATING");
        activeOverheatingAlert.setSeverity("HIGH");
        activeOverheatingAlert.setMessage("Spindle/machine temperature of 92.5°C exceeded safety threshold of 85.0°C");
        activeOverheatingAlert.setMachine(machine1);
        activeOverheatingAlert.setResolved(false);

        // evaluateMachine should only evaluate MACHINE_STATUS rules!
        List<Alert> alerts = alertEngineService.evaluateMachine(machine1);

        // Verify alertService.update was NEVER called to resolve OVERHEATING alert
        verify(alertService, never()).update(anyLong(), any(AlertRequest.class), any());
        verify(alertService, never()).update(anyLong(), any(AlertRequest.class));
        assertTrue(alerts.isEmpty(), "Evaluating machine status when status is RUNNING should produce no machine alerts and resolve no telemetry alerts");
    }

    // ---------------------------------------------------------
    // Regression Test 3: Machine update to normal resolves ONLY machine status alert
    // ---------------------------------------------------------
    @Test
    @DisplayName("Regression 3: Updating machine to normal status resolves ONLY relevant machine-status alert")
    void testMachineStatusUpdateResolvesOnlyMachineStatusAlert() {
        machine1.setStatus("RUNNING");

        Alert activeMachineStatusAlert = new Alert();
        try {
            var field = Alert.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(activeMachineStatusAlert, 101L);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        activeMachineStatusAlert.setType("ABNORMAL_MACHINE_STATUS");
        activeMachineStatusAlert.setMachine(machine1);
        activeMachineStatusAlert.setResolved(false);

        when(alertRepository.findFirstByMachineIdAndTypeAndResolvedFalseOrderByCreatedAtDesc(eq(1L), eq("ABNORMAL_MACHINE_STATUS")))
                .thenReturn(Optional.of(activeMachineStatusAlert));

        Alert resolvedMachineAlert = new Alert();
        resolvedMachineAlert.setType("ABNORMAL_MACHINE_STATUS");
        resolvedMachineAlert.setResolved(true);

        when(alertService.update(eq(101L), any(AlertRequest.class), eq(null))).thenReturn(resolvedMachineAlert);

        List<Alert> alerts = alertEngineService.evaluateMachine(machine1);

        assertEquals(1, alerts.size());
        assertTrue(alerts.get(0).isResolved());
        assertEquals("ABNORMAL_MACHINE_STATUS", alerts.get(0).getType());

        // Verify only 1 update call occurred (for machine status alert), no telemetry alerts touched
        verify(alertService, times(1)).update(eq(101L), any(AlertRequest.class), eq(null));
    }

    // ---------------------------------------------------------
    // Regression Test 4: Subsequent normal temp reading resolves overheating alert
    // ---------------------------------------------------------
    @Test
    @DisplayName("Regression 4: A subsequent valid normal temperature reading resolves overheating alert")
    void testNormalTemperatureReadingResolvesOverheatingAlert() {
        Telemetry normalTelemetry = new Telemetry();
        normalTelemetry.setMachine(machine1);
        normalTelemetry.setTemperature(75.0); // Normal <= 85.0°C
        normalTelemetry.setVibration(2.0);
        normalTelemetry.setPressure(50.0);
        normalTelemetry.setRpm(3000.0);

        Alert activeOverheatingAlert = new Alert();
        try {
            var field = Alert.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(activeOverheatingAlert, 202L);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        activeOverheatingAlert.setType("OVERHEATING");
        activeOverheatingAlert.setSeverity("HIGH");
        activeOverheatingAlert.setMessage("Spindle/machine temperature of 92.5°C exceeded safety threshold of 85.0°C");
        activeOverheatingAlert.setMachine(machine1);
        activeOverheatingAlert.setResolved(false);

        when(alertRepository.findFirstByMachineIdAndTypeAndResolvedFalseOrderByCreatedAtDesc(eq(1L), eq("OVERHEATING")))
                .thenReturn(Optional.of(activeOverheatingAlert));
        when(alertRepository.findFirstByMachineIdAndTypeAndResolvedFalseOrderByCreatedAtDesc(eq(1L), argThat(s -> !s.equals("OVERHEATING"))))
                .thenReturn(Optional.empty());

        Alert resolvedAlert = new Alert();
        resolvedAlert.setType("OVERHEATING");
        resolvedAlert.setResolved(true);

        when(alertService.update(eq(202L), any(AlertRequest.class), eq(normalTelemetry))).thenReturn(resolvedAlert);

        List<Alert> alerts = alertEngineService.evaluateTelemetry(normalTelemetry);

        assertEquals(1, alerts.size());
        assertTrue(alerts.get(0).isResolved());

        ArgumentCaptor<AlertRequest> captor = ArgumentCaptor.forClass(AlertRequest.class);
        verify(alertService).update(eq(202L), captor.capture(), eq(normalTelemetry));
        assertTrue(captor.getValue().isResolved());
    }

    // ---------------------------------------------------------
    // Regression Test 5: Repeated breach does not create duplicate active alert
    // ---------------------------------------------------------
    @Test
    @DisplayName("Regression 5: A repeated breach does not create a duplicate active alert")
    void testRepeatedBreachDoesNotCreateDuplicateActiveAlert() {
        Telemetry telemetry = new Telemetry();
        telemetry.setMachine(machine1);
        telemetry.setTemperature(92.5); // Same temp reading
        telemetry.setVibration(2.0);
        telemetry.setPressure(50.0);
        telemetry.setRpm(3000.0);

        String expectedMessage = String.format(
                "Spindle/machine temperature of %.1f°C exceeded safety threshold of %.1f°C",
                92.5, 85.0
        );

        Alert activeAlert = new Alert();
        try {
            var field = Alert.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(activeAlert, 303L);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        activeAlert.setType("OVERHEATING");
        activeAlert.setSeverity("HIGH");
        activeAlert.setMessage(expectedMessage);
        activeAlert.setMachine(machine1);
        activeAlert.setResolved(false);

        when(alertRepository.findFirstByMachineIdAndTypeAndResolvedFalseOrderByCreatedAtDesc(eq(1L), eq("OVERHEATING")))
                .thenReturn(Optional.of(activeAlert));
        when(alertRepository.findFirstByMachineIdAndTypeAndResolvedFalseOrderByCreatedAtDesc(eq(1L), argThat(s -> !s.equals("OVERHEATING"))))
                .thenReturn(Optional.empty());

        List<Alert> alerts = alertEngineService.evaluateTelemetry(telemetry);

        assertEquals(1, alerts.size());
        // Verify alertService.create was NEVER called (no duplicate active alert)
        verify(alertService, never()).create(any(AlertRequest.class), any());
        // Verify alertService.update was NOT called because state did not change
        verify(alertService, never()).update(anyLong(), any(AlertRequest.class), any());
    }

    // ---------------------------------------------------------
    // Regression Test 6: Meaningful update publishes WebSocket event
    // ---------------------------------------------------------
    @Test
    @DisplayName("Regression 6: A meaningful update to an existing alert publishes an appropriate WebSocket event")
    void testMeaningfulUpdatePublishesWebSocketEvent() {
        Telemetry higherTempTelemetry = new Telemetry();
        higherTempTelemetry.setMachine(machine1);
        higherTempTelemetry.setTemperature(98.0); // Temperature spiked to 98.0°C (new message)
        higherTempTelemetry.setVibration(2.0);
        higherTempTelemetry.setPressure(50.0);
        higherTempTelemetry.setRpm(3000.0);

        Alert existingActiveAlert = new Alert();
        try {
            var field = Alert.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(existingActiveAlert, 404L);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        existingActiveAlert.setType("OVERHEATING");
        existingActiveAlert.setSeverity("HIGH");
        existingActiveAlert.setMessage("Spindle/machine temperature of 90.0°C exceeded safety threshold of 85.0°C");
        existingActiveAlert.setMachine(machine1);
        existingActiveAlert.setResolved(false);

        when(alertRepository.findFirstByMachineIdAndTypeAndResolvedFalseOrderByCreatedAtDesc(eq(1L), eq("OVERHEATING")))
                .thenReturn(Optional.of(existingActiveAlert));
        when(alertRepository.findFirstByMachineIdAndTypeAndResolvedFalseOrderByCreatedAtDesc(eq(1L), argThat(s -> !s.equals("OVERHEATING"))))
                .thenReturn(Optional.empty());

        Alert updatedAlert = new Alert();
        updatedAlert.setType("OVERHEATING");
        updatedAlert.setSeverity("HIGH");
        updatedAlert.setMessage("Spindle/machine temperature of 98.0°C exceeded safety threshold of 85.0°C");

        when(alertService.update(eq(404L), any(AlertRequest.class), eq(higherTempTelemetry))).thenReturn(updatedAlert);

        List<Alert> alerts = alertEngineService.evaluateTelemetry(higherTempTelemetry);

        assertEquals(1, alerts.size());
        // Verify alertService.update WAS called (which persists & publishes WebSocket event)
        verify(alertService, times(1)).update(eq(404L), any(AlertRequest.class), eq(higherTempTelemetry));
    }

    // ---------------------------------------------------------
    // Regression Test 7: Unchanged alert does not generate duplicate notification
    // ---------------------------------------------------------
    @Test
    @DisplayName("Regression 7: An unchanged alert does not generate a duplicate update notification")
    void testUnchangedAlertDoesNotGenerateDuplicateNotification() {
        Telemetry sameTelemetry = new Telemetry();
        sameTelemetry.setMachine(machine1);
        sameTelemetry.setTemperature(92.5);
        sameTelemetry.setVibration(2.0);
        sameTelemetry.setPressure(50.0);
        sameTelemetry.setRpm(3000.0);

        String exactMessage = String.format(
                "Spindle/machine temperature of %.1f°C exceeded safety threshold of %.1f°C",
                92.5, 85.0
        );

        Alert existingAlert = new Alert();
        try {
            var field = Alert.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(existingAlert, 505L);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        existingAlert.setType("OVERHEATING");
        existingAlert.setSeverity("HIGH");
        existingAlert.setMessage(exactMessage);
        existingAlert.setMachine(machine1);
        existingAlert.setResolved(false);

        when(alertRepository.findFirstByMachineIdAndTypeAndResolvedFalseOrderByCreatedAtDesc(eq(1L), eq("OVERHEATING")))
                .thenReturn(Optional.of(existingAlert));
        when(alertRepository.findFirstByMachineIdAndTypeAndResolvedFalseOrderByCreatedAtDesc(eq(1L), argThat(s -> !s.equals("OVERHEATING"))))
                .thenReturn(Optional.empty());

        List<Alert> alerts = alertEngineService.evaluateTelemetry(sameTelemetry);

        assertEquals(1, alerts.size());
        // Verify alertService.update was NEVER called (no duplicate update/WebSocket notification)
        verify(alertService, never()).update(anyLong(), any(AlertRequest.class), any());
    }

    // ---------------------------------------------------------
    // Regression Test 8: Safe handling of null/missing telemetry
    // ---------------------------------------------------------
    @Test
    @DisplayName("Regression 8: Null or missing telemetry is handled safely without auto-resolving alerts")
    void testNullTelemetryHandledSafely() {
        assertDoesNotThrow(() -> alertEngineService.evaluateTelemetry(null));

        Telemetry noMachine = new Telemetry();
        assertDoesNotThrow(() -> alertEngineService.evaluateTelemetry(noMachine));

        // Ensure alertService.update is never called when telemetry is null
        verify(alertService, never()).update(anyLong(), any(AlertRequest.class), any());
    }
}
