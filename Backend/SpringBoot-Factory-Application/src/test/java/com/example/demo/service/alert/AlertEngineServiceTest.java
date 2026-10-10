package com.example.demo.service.alert;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
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

        // Use reflection or standard mock setup to assign IDs
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

    @Test
    @DisplayName("Telemetry within configured limits does not create an alert")
    void testNormalTelemetryNoAlert() {
        Telemetry telemetry = new Telemetry();
        telemetry.setMachine(machine1);
        telemetry.setTemperature(70.0);
        telemetry.setVibration(2.0);
        telemetry.setPressure(50.0);
        telemetry.setRpm(3000.0);
        telemetry.setTimestamp(LocalDateTime.now());

        when(alertRepository.findFirstByMachineIdAndTypeAndResolvedFalseOrderByCreatedAtDesc(anyLong(), anyString()))
                .thenReturn(Optional.empty());

        List<Alert> alerts = alertEngineService.evaluateTelemetry(telemetry);

        assertTrue(alerts.isEmpty());
        verify(alertService, never()).create(any(AlertRequest.class), any());
    }

    @Test
    @DisplayName("Telemetry breaching high temperature threshold creates OVERHEATING alert")
    void testTemperatureHighBreachCreatesAlert() {
        Telemetry telemetry = new Telemetry();
        telemetry.setMachine(machine1);
        telemetry.setTemperature(92.5); // Breaches 85.0
        telemetry.setVibration(2.0);
        telemetry.setPressure(50.0);
        telemetry.setRpm(3000.0);

        when(alertRepository.findFirstByMachineIdAndTypeAndResolvedFalseOrderByCreatedAtDesc(eq(1L), anyString()))
                .thenReturn(Optional.empty());

        Alert createdAlert = new Alert();
        createdAlert.setType("OVERHEATING");
        createdAlert.setSeverity("HIGH");
        createdAlert.setMachine(machine1);

        when(alertService.create(any(AlertRequest.class), eq(telemetry))).thenReturn(createdAlert);

        List<Alert> alerts = alertEngineService.evaluateTelemetry(telemetry);

        assertEquals(1, alerts.size());
        assertEquals("OVERHEATING", alerts.get(0).getType());

        ArgumentCaptor<AlertRequest> requestCaptor = ArgumentCaptor.forClass(AlertRequest.class);
        verify(alertService).create(requestCaptor.capture(), eq(telemetry));
        AlertRequest req = requestCaptor.getValue();
        assertEquals(1L, req.getMachineId());
        assertEquals("OVERHEATING", req.getType());
        assertEquals("HIGH", req.getSeverity());
        assertFalse(req.isResolved());
        assertTrue(req.getMessage().contains("92.5"));
    }

    @Test
    @DisplayName("Telemetry breaching low threshold triggers appropriate rule (LOW_TEMPERATURE and LOW_PRESSURE)")
    void testBelowMinimumConditionTriggersRule() {
        Telemetry telemetry = new Telemetry();
        telemetry.setMachine(machine1);
        telemetry.setTemperature(-5.0); // Below 0.0
        telemetry.setVibration(1.0);
        telemetry.setPressure(5.0); // Below 10.0
        telemetry.setRpm(1000.0);

        when(alertRepository.findFirstByMachineIdAndTypeAndResolvedFalseOrderByCreatedAtDesc(eq(1L), anyString()))
                .thenReturn(Optional.empty());

        Alert lowTempAlert = new Alert();
        lowTempAlert.setType("LOW_TEMPERATURE");
        Alert lowPressAlert = new Alert();
        lowPressAlert.setType("LOW_PRESSURE");

        when(alertService.create(any(AlertRequest.class), eq(telemetry)))
                .thenReturn(lowTempAlert)
                .thenReturn(lowPressAlert);

        List<Alert> alerts = alertEngineService.evaluateTelemetry(telemetry);

        assertEquals(2, alerts.size());
        verify(alertService, times(2)).create(any(AlertRequest.class), eq(telemetry));
    }

    @Test
    @DisplayName("Repeated breaches for same machine and rule do not create duplicate active alerts")
    void testRepeatedBreachesDeduplicated() {
        Telemetry telemetry1 = new Telemetry();
        telemetry1.setMachine(machine1);
        telemetry1.setTemperature(90.0);
        telemetry1.setVibration(2.0);
        telemetry1.setPressure(50.0);
        telemetry1.setRpm(3000.0);

        Alert existingActiveAlert = new Alert();
        existingActiveAlert.setType("OVERHEATING");
        existingActiveAlert.setSeverity("HIGH");
        existingActiveAlert.setMessage("Spindle/machine temperature of 90.0°C exceeded safety threshold of 85.0°C");
        existingActiveAlert.setMachine(machine1);
        existingActiveAlert.setResolved(false);

        when(alertRepository.findFirstByMachineIdAndTypeAndResolvedFalseOrderByCreatedAtDesc(eq(1L), eq("OVERHEATING")))
                .thenReturn(Optional.of(existingActiveAlert));
        when(alertRepository.findFirstByMachineIdAndTypeAndResolvedFalseOrderByCreatedAtDesc(eq(1L), argThat(s -> !s.equals("OVERHEATING"))))
                .thenReturn(Optional.empty());

        List<Alert> alerts = alertEngineService.evaluateTelemetry(telemetry1);

        // Active alert reused/updated; NO new alert created via alertService.create
        verify(alertService, never()).create(any(AlertRequest.class), any());
    }

    @Test
    @DisplayName("Separate machines are evaluated independently")
    void testSeparateMachinesEvaluatedIndependently() {
        Telemetry telemetryM1 = new Telemetry();
        telemetryM1.setMachine(machine1);
        telemetryM1.setTemperature(95.0);
        telemetryM1.setVibration(1.0);
        telemetryM1.setPressure(50.0);
        telemetryM1.setRpm(2000.0);

        Telemetry telemetryM2 = new Telemetry();
        telemetryM2.setMachine(machine2);
        telemetryM2.setTemperature(70.0);
        telemetryM2.setVibration(8.0); // High vibration on machine 2
        telemetryM2.setPressure(50.0);
        telemetryM2.setRpm(2000.0);

        when(alertRepository.findFirstByMachineIdAndTypeAndResolvedFalseOrderByCreatedAtDesc(anyLong(), anyString()))
                .thenReturn(Optional.empty());

        Alert alertM1 = new Alert();
        alertM1.setType("OVERHEATING");
        when(alertService.create(any(AlertRequest.class), eq(telemetryM1))).thenReturn(alertM1);

        Alert alertM2 = new Alert();
        alertM2.setType("HIGH_VIBRATION");
        when(alertService.create(any(AlertRequest.class), eq(telemetryM2))).thenReturn(alertM2);

        List<Alert> alertsM1 = alertEngineService.evaluateTelemetry(telemetryM1);
        List<Alert> alertsM2 = alertEngineService.evaluateTelemetry(telemetryM2);

        assertEquals(1, alertsM1.size());
        assertEquals("OVERHEATING", alertsM1.get(0).getType());

        assertEquals(1, alertsM2.size());
        assertEquals("HIGH_VIBRATION", alertsM2.get(0).getType());
    }

    @Test
    @DisplayName("Different rules for the same machine are handled correctly")
    void testMultipleRulesSameMachine() {
        Telemetry telemetry = new Telemetry();
        telemetry.setMachine(machine1);
        telemetry.setTemperature(90.0); // Overheating
        telemetry.setVibration(7.0);   // High vibration
        telemetry.setPressure(50.0);
        telemetry.setRpm(4000.0);      // High RPM

        when(alertRepository.findFirstByMachineIdAndTypeAndResolvedFalseOrderByCreatedAtDesc(eq(1L), anyString()))
                .thenReturn(Optional.empty());

        when(alertService.create(any(AlertRequest.class), eq(telemetry)))
                .thenAnswer(inv -> {
                    AlertRequest req = inv.getArgument(0);
                    Alert a = new Alert();
                    a.setType(req.getType());
                    return a;
                });

        List<Alert> alerts = alertEngineService.evaluateTelemetry(telemetry);

        assertEquals(3, alerts.size()); // OVERHEATING, HIGH_VIBRATION, HIGH_RPM
        verify(alertService, times(3)).create(any(AlertRequest.class), eq(telemetry));
    }

    @Test
    @DisplayName("Missing or invalid telemetry is handled safely without throwing exception")
    void testMissingOrInvalidTelemetryHandledSafely() {
        // Null telemetry
        assertDoesNotThrow(() -> alertEngineService.evaluateTelemetry(null));

        // Telemetry with null machine
        Telemetry noMachine = new Telemetry();
        assertDoesNotThrow(() -> alertEngineService.evaluateTelemetry(noMachine));

        // Telemetry with null metric fields
        Telemetry nullMetrics = new Telemetry();
        nullMetrics.setMachine(machine1);
        assertDoesNotThrow(() -> alertEngineService.evaluateTelemetry(nullMetrics));
    }

    @Test
    @DisplayName("Alert auto-resolves when condition clears")
    void testAlertAutoResolvesWhenConditionClears() {
        // Telemetry back to normal range
        Telemetry normalTelemetry = new Telemetry();
        normalTelemetry.setMachine(machine1);
        normalTelemetry.setTemperature(72.0); // Normal
        normalTelemetry.setVibration(1.5);   // Normal
        normalTelemetry.setPressure(45.0);   // Normal
        normalTelemetry.setRpm(2500.0);     // Normal

        Alert existingActiveAlert = new Alert();
        try {
            var field = Alert.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(existingActiveAlert, 100L);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        existingActiveAlert.setType("OVERHEATING");
        existingActiveAlert.setSeverity("HIGH");
        existingActiveAlert.setMessage("Previous breach");
        existingActiveAlert.setMachine(machine1);
        existingActiveAlert.setResolved(false);

        when(alertRepository.findFirstByMachineIdAndTypeAndResolvedFalseOrderByCreatedAtDesc(eq(1L), eq("OVERHEATING")))
                .thenReturn(Optional.of(existingActiveAlert));
        when(alertRepository.findFirstByMachineIdAndTypeAndResolvedFalseOrderByCreatedAtDesc(eq(1L), argThat(s -> !s.equals("OVERHEATING"))))
                .thenReturn(Optional.empty());

        Alert resolvedAlert = new Alert();
        resolvedAlert.setType("OVERHEATING");
        resolvedAlert.setResolved(true);

        when(alertService.update(eq(100L), any(AlertRequest.class))).thenReturn(resolvedAlert);

        List<Alert> alerts = alertEngineService.evaluateTelemetry(normalTelemetry);

        assertEquals(1, alerts.size());
        assertTrue(alerts.get(0).isResolved());

        ArgumentCaptor<AlertRequest> captor = ArgumentCaptor.forClass(AlertRequest.class);
        verify(alertService).update(eq(100L), captor.capture());
        assertTrue(captor.getValue().isResolved());
    }

    @Test
    @DisplayName("Abnormal machine status creates alert and auto-resolves on status recovery")
    void testMachineStatusAlertAndResolution() {
        machine1.setStatus("OFFLINE");

        when(alertRepository.findFirstByMachineIdAndTypeAndResolvedFalseOrderByCreatedAtDesc(eq(1L), eq("ABNORMAL_MACHINE_STATUS")))
                .thenReturn(Optional.empty());

        Alert createdAlert = new Alert();
        createdAlert.setType("ABNORMAL_MACHINE_STATUS");

        when(alertService.create(any(AlertRequest.class), eq(null))).thenReturn(createdAlert);

        List<Alert> alerts = alertEngineService.evaluateMachine(machine1);

        assertEquals(1, alerts.size());
        verify(alertService).create(any(AlertRequest.class), eq(null));

        // Now update machine back to RUNNING
        machine1.setStatus("RUNNING");
        Alert activeMachineAlert = new Alert();
        try {
            var field = Alert.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(activeMachineAlert, 200L);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        activeMachineAlert.setType("ABNORMAL_MACHINE_STATUS");
        activeMachineAlert.setMachine(machine1);
        activeMachineAlert.setResolved(false);

        when(alertRepository.findFirstByMachineIdAndTypeAndResolvedFalseOrderByCreatedAtDesc(eq(1L), eq("ABNORMAL_MACHINE_STATUS")))
                .thenReturn(Optional.of(activeMachineAlert));

        Alert resolvedAlert = new Alert();
        resolvedAlert.setType("ABNORMAL_MACHINE_STATUS");
        resolvedAlert.setResolved(true);

        when(alertService.update(eq(200L), any(AlertRequest.class))).thenReturn(resolvedAlert);

        List<Alert> resolvedAlerts = alertEngineService.evaluateMachine(machine1);

        assertEquals(1, resolvedAlerts.size());
        assertTrue(resolvedAlerts.get(0).isResolved());
    }
}
