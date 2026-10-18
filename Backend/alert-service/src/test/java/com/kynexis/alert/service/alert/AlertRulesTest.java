package com.kynexis.alert.service.alert;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.kynexis.alert.config.AlertEngineProperties;
import com.kynexis.alert.common.dto.event.MachineTelemetryRecorded;

class AlertRulesTest {

    private AlertEngineProperties properties;
    private TemperatureLowRule temperatureLowRule;
    private PressureLowRule pressureLowRule;
    private MachineStatusRule machineStatusRule;

    @BeforeEach
    void setUp() {
        properties = new AlertEngineProperties();
        properties.setEnabled(true);

        properties.setTemperatureLowEnabled(true);
        properties.setTemperatureLowThreshold(0.0);
        properties.setTemperatureLowSeverity("MEDIUM");

        properties.setPressureLowEnabled(true);
        properties.setPressureLowThreshold(10.0);
        properties.setPressureLowSeverity("MEDIUM");

        properties.setMachineStatusEnabled(true);

        temperatureLowRule = new TemperatureLowRule();
        pressureLowRule = new PressureLowRule();
        machineStatusRule = new MachineStatusRule();
    }

    // --- TemperatureLowRule Tests ---

    @Test
    @DisplayName("TemperatureLowRule - Normal reading above threshold does not breach")
    void testTemperatureNormalReading() {
        MachineTelemetryRecorded reading = MachineTelemetryRecorded.builder()
                .machineId(1L)
                .temperature(25.0)
                .build();

        EvaluationResult result = temperatureLowRule.evaluateTelemetry(reading, properties);
        assertFalse(result.isBreached());
    }

    @Test
    @DisplayName("TemperatureLowRule - Exact threshold boundary does not breach")
    void testTemperatureExactThreshold() {
        MachineTelemetryRecorded reading = MachineTelemetryRecorded.builder()
                .machineId(1L)
                .temperature(0.0)
                .build();

        EvaluationResult result = temperatureLowRule.evaluateTelemetry(reading, properties);
        assertFalse(result.isBreached(), "Exact threshold 0.0 should not be considered below threshold");
    }

    @Test
    @DisplayName("TemperatureLowRule - Below threshold triggers breach with configured severity")
    void testTemperatureBelowThresholdBreached() {
        MachineTelemetryRecorded reading = MachineTelemetryRecorded.builder()
                .machineId(1L)
                .temperature(-5.0)
                .build();

        EvaluationResult result = temperatureLowRule.evaluateTelemetry(reading, properties);
        assertTrue(result.isBreached());
        assertEquals("MEDIUM", result.getSeverity());
        assertTrue(result.getMessage().contains("below minimum threshold"));
    }

    @Test
    @DisplayName("TemperatureLowRule - Null reading or null temperature safely ignored")
    void testTemperatureNullReading() {
        assertFalse(temperatureLowRule.evaluateTelemetry(null, properties).isBreached());

        MachineTelemetryRecorded reading = MachineTelemetryRecorded.builder()
                .machineId(1L)
                .temperature(null)
                .build();
        assertFalse(temperatureLowRule.evaluateTelemetry(reading, properties).isBreached());
    }

    @Test
    @DisplayName("TemperatureLowRule - Disabled rule returns false from isEnabled")
    void testTemperatureRuleDisabled() {
        properties.setTemperatureLowEnabled(false);
        assertFalse(temperatureLowRule.isEnabled(properties));
    }

    // --- PressureLowRule Tests ---

    @Test
    @DisplayName("PressureLowRule - Normal reading above threshold does not breach")
    void testPressureNormalReading() {
        MachineTelemetryRecorded reading = MachineTelemetryRecorded.builder()
                .machineId(2L)
                .pressure(50.0)
                .build();

        EvaluationResult result = pressureLowRule.evaluateTelemetry(reading, properties);
        assertFalse(result.isBreached());
    }

    @Test
    @DisplayName("PressureLowRule - Exact threshold boundary does not breach")
    void testPressureExactThreshold() {
        MachineTelemetryRecorded reading = MachineTelemetryRecorded.builder()
                .machineId(2L)
                .pressure(10.0)
                .build();

        EvaluationResult result = pressureLowRule.evaluateTelemetry(reading, properties);
        assertFalse(result.isBreached());
    }

    @Test
    @DisplayName("PressureLowRule - Below threshold triggers breach with configured severity")
    void testPressureBelowThresholdBreached() {
        MachineTelemetryRecorded reading = MachineTelemetryRecorded.builder()
                .machineId(2L)
                .pressure(8.5)
                .build();

        EvaluationResult result = pressureLowRule.evaluateTelemetry(reading, properties);
        assertTrue(result.isBreached());
        assertEquals("MEDIUM", result.getSeverity());
        assertTrue(result.getMessage().contains("below minimum operational threshold"));
    }

    @Test
    @DisplayName("PressureLowRule - Null pressure reading safely returns ok")
    void testPressureNullReading() {
        assertFalse(pressureLowRule.evaluateTelemetry(null, properties).isBreached());

        MachineTelemetryRecorded reading = MachineTelemetryRecorded.builder()
                .machineId(2L)
                .pressure(null)
                .build();
        assertFalse(pressureLowRule.evaluateTelemetry(reading, properties).isBreached());
    }

    // --- MachineStatusRule Tests ---

    @Test
    @DisplayName("MachineStatusRule - OFFLINE status triggers CRITICAL breach")
    void testMachineOfflineTriggersCritical() {
        EvaluationResult result = machineStatusRule.evaluateMachineStatus(10L, "CNC Lathe", "OFFLINE", properties);
        assertTrue(result.isBreached());
        assertEquals("CRITICAL", result.getSeverity());
        assertTrue(result.getMessage().contains("entered OFFLINE status"));
    }

    @Test
    @DisplayName("MachineStatusRule - STOPPED status triggers HIGH breach")
    void testMachineStoppedTriggersHigh() {
        EvaluationResult result = machineStatusRule.evaluateMachineStatus(10L, "CNC Lathe", "STOPPED", properties);
        assertTrue(result.isBreached());
        assertEquals("HIGH", result.getSeverity());
        assertTrue(result.getMessage().contains("entered STOPPED status"));
    }

    @Test
    @DisplayName("MachineStatusRule - MAINTENANCE status triggers MEDIUM breach")
    void testMachineMaintenanceTriggersMedium() {
        EvaluationResult result = machineStatusRule.evaluateMachineStatus(10L, "CNC Lathe", "MAINTENANCE", properties);
        assertTrue(result.isBreached());
        assertEquals("MEDIUM", result.getSeverity());
        assertTrue(result.getMessage().contains("entered MAINTENANCE status"));
    }

    @Test
    @DisplayName("MachineStatusRule - RUNNING or ACTIVE status returns ok (normal condition)")
    void testMachineRunningReturnsOk() {
        EvaluationResult running = machineStatusRule.evaluateMachineStatus(10L, "CNC Lathe", "RUNNING", properties);
        assertFalse(running.isBreached());

        EvaluationResult active = machineStatusRule.evaluateMachineStatus(10L, "CNC Lathe", "ACTIVE", properties);
        assertFalse(active.isBreached());
    }

    @Test
    @DisplayName("MachineStatusRule - Null machineId or null status safely returns ok")
    void testMachineStatusNullSafe() {
        assertFalse(machineStatusRule.evaluateMachineStatus(null, "CNC", "OFFLINE", properties).isBreached());
        assertFalse(machineStatusRule.evaluateMachineStatus(10L, "CNC", null, properties).isBreached());
    }
}
