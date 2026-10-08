package com.example.demo.service;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.LocalDate;
import java.time.LocalDateTime;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.example.demo.exception.BusinessValidationException;

class DomainValidationServiceTest {

    private DomainValidationService service;

    @BeforeEach
    void setUp() {
        service = new DomainValidationService();
    }

    @Test
    @DisplayName("Validate Machine Status")
    void testMachineStatus() {
        assertDoesNotThrow(() -> service.validateMachineStatus("RUNNING"));
        assertDoesNotThrow(() -> service.validateMachineStatus("idle"));
        assertThrows(BusinessValidationException.class, () -> service.validateMachineStatus(null));
        assertThrows(BusinessValidationException.class, () -> service.validateMachineStatus("INVALID"));
    }

    @Test
    @DisplayName("Validate Production Status")
    void testProductionStatus() {
        assertDoesNotThrow(() -> service.validateProductionStatus("PLANNED"));
        assertDoesNotThrow(() -> service.validateProductionStatus("COMPLETED"));
        assertThrows(BusinessValidationException.class, () -> service.validateProductionStatus(""));
        assertThrows(BusinessValidationException.class, () -> service.validateProductionStatus("UNKNOWN"));
    }

    @Test
    @DisplayName("Validate Maintenance Status")
    void testMaintenanceStatus() {
        assertDoesNotThrow(() -> service.validateMaintenanceStatus("SCHEDULED"));
        assertThrows(BusinessValidationException.class, () -> service.validateMaintenanceStatus(""));
        assertThrows(BusinessValidationException.class, () -> service.validateMaintenanceStatus("WRONG"));
    }

    @Test
    @DisplayName("Validate Maintenance Dates")
    void testMaintenanceDates() {
        LocalDate now = LocalDate.now();
        assertDoesNotThrow(() -> service.validateMaintenanceDates(now, now.plusDays(1)));
        assertDoesNotThrow(() -> service.validateMaintenanceDates(now, null));
        assertThrows(BusinessValidationException.class, () -> service.validateMaintenanceDates(null, now));
        assertThrows(BusinessValidationException.class, () -> service.validateMaintenanceDates(now, now.minusDays(1)));
    }

    @Test
    @DisplayName("Validate Production Dates")
    void testProductionDates() {
        LocalDateTime start = LocalDateTime.now();
        assertDoesNotThrow(() -> service.validateProductionDates(start, start.plusHours(1)));
        assertDoesNotThrow(() -> service.validateProductionDates(start, null));
        assertThrows(BusinessValidationException.class, () -> service.validateProductionDates(null, start));
        assertThrows(BusinessValidationException.class, () -> service.validateProductionDates(start, start.minusHours(1)));
    }

    @Test
    @DisplayName("Validate Production Quantities")
    void testProductionQuantities() {
        assertDoesNotThrow(() -> service.validateProductionQuantities(100, 5));
        assertThrows(BusinessValidationException.class, () -> service.validateProductionQuantities(-1, 0));
        assertThrows(BusinessValidationException.class, () -> service.validateProductionQuantities(100, -1));
        assertThrows(BusinessValidationException.class, () -> service.validateProductionQuantities(50, 100));
    }

    @Test
    @DisplayName("Validate Telemetry")
    void testTelemetry() {
        assertDoesNotThrow(() -> service.validateTelemetry(25.0, 0.5, 1.0, 1500.0));
        assertThrows(BusinessValidationException.class, () -> service.validateTelemetry(null, 0.5, 1.0, 1500.0));
        assertThrows(BusinessValidationException.class, () -> service.validateTelemetry(25.0, -0.1, 1.0, 1500.0));
        assertThrows(BusinessValidationException.class, () -> service.validateTelemetry(300.0, 0.5, 1.0, 1500.0));
    }

    @Test
    @DisplayName("Validate Energy")
    void testEnergy() {
        assertDoesNotThrow(() -> service.validateEnergy(120.5));
        assertThrows(BusinessValidationException.class, () -> service.validateEnergy(null));
        assertThrows(BusinessValidationException.class, () -> service.validateEnergy(-5.0));
    }

    @Test
    @DisplayName("Validate Alert Severity")
    void testAlertSeverity() {
        assertDoesNotThrow(() -> service.validateAlertSeverity("HIGH"));
        assertThrows(BusinessValidationException.class, () -> service.validateAlertSeverity(""));
        assertThrows(BusinessValidationException.class, () -> service.validateAlertSeverity("EXTREME"));
    }
}
