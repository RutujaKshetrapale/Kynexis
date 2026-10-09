package com.example.demo.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import com.example.demo.dto.AlertRequest;
import com.example.demo.entity.Alert;
import com.example.demo.entity.Machine;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.repository.AlertRepository;
import com.example.demo.repository.MachineRepository;

class AlertServiceTest {

    @Mock
    private AlertRepository alertRepository;

    @Mock
    private MachineRepository machineRepository;

    @Mock
    private WebSocketEventPublisherService webSocketEventPublisherService;

    @InjectMocks
    private AlertService alertService;

    private Machine machine;
    private Alert alert;
    private AlertRequest request;

    @BeforeEach
    void setUp() {

        MockitoAnnotations.openMocks(this);

        machine = new Machine();
        machine.setName("CNC Machine 01");
        machine.setType("CNC");
        machine.setStatus("RUNNING");

        request = new AlertRequest();
        request.setMachineId(1L);
        request.setType("HIGH_TEMPERATURE");
        request.setSeverity("CRITICAL");
        request.setMessage("Machine temperature is too high");
        request.setResolved(false);

        alert = new Alert();
        alert.setMachine(machine);
        alert.setType("HIGH_TEMPERATURE");
        alert.setSeverity("CRITICAL");
        alert.setMessage("Machine temperature is too high");
        alert.setResolved(false);
        alert.setCreatedAt(LocalDateTime.now());
    }

    // =========================
    // CREATE ALERT
    // =========================

    @Test
    @DisplayName("Should create alert successfully")
    void shouldCreateAlertSuccessfully() {

        when(machineRepository.findById(1L))
                .thenReturn(Optional.of(machine));

        when(alertRepository.save(any(Alert.class)))
                .thenAnswer(
                        invocation ->
                                invocation.getArgument(0)
                );

        Alert result = alertService.create(request);

        assertNotNull(result);
        assertEquals("HIGH_TEMPERATURE", result.getType());
        assertEquals("CRITICAL", result.getSeverity());
        assertEquals(
                "Machine temperature is too high",
                result.getMessage()
        );
        assertFalse(result.isResolved());
        assertNotNull(result.getCreatedAt());
        assertEquals(machine, result.getMachine());

        verify(machineRepository, times(1))
                .findById(1L);

        verify(alertRepository, times(1))
                .save(any(Alert.class));
    }

    @Test
    @DisplayName("Should throw exception when machine does not exist while creating alert")
    void shouldThrowExceptionWhenMachineDoesNotExistWhileCreatingAlert() {

        when(machineRepository.findById(1L))
                .thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> alertService.create(request)
        );

        verify(machineRepository, times(1))
                .findById(1L);

        verify(alertRepository, never())
                .save(any(Alert.class));
    }

    // =========================
    // GET ALL ALERTS
    // =========================

    @Test
    @DisplayName("Should get all alerts")
    void shouldGetAllAlerts() {

        Alert alert1 = new Alert();
        alert1.setType("HIGH_TEMPERATURE");
        alert1.setSeverity("CRITICAL");
        alert1.setMessage("Temperature is high");

        Alert alert2 = new Alert();
        alert2.setType("HIGH_VIBRATION");
        alert2.setSeverity("WARNING");
        alert2.setMessage("Vibration is high");

        List<Alert> alerts =
                Arrays.asList(alert1, alert2);

        when(alertRepository.findAll())
                .thenReturn(alerts);

        List<Alert> result =
                alertService.getAll();

        assertNotNull(result);
        assertEquals(2, result.size());
        assertEquals(
                "HIGH_TEMPERATURE",
                result.get(0).getType()
        );
        assertEquals(
                "HIGH_VIBRATION",
                result.get(1).getType()
        );

        verify(alertRepository, times(1))
                .findAll();
    }

    @Test
    @DisplayName("Should return empty list when no alerts exist")
    void shouldReturnEmptyListWhenNoAlertsExist() {

        when(alertRepository.findAll())
                .thenReturn(Collections.emptyList());

        List<Alert> result =
                alertService.getAll();

        assertNotNull(result);
        assertTrue(result.isEmpty());

        verify(alertRepository, times(1))
                .findAll();
    }

    // =========================
    // GET ALL ALERTS - PAGINATED
    // =========================

    @Test
    @DisplayName("Should get all alerts with pagination")
    void shouldGetAllAlertsWithPagination() {

        Pageable pageable =
                PageRequest.of(0, 10);

        List<Alert> alerts =
                Arrays.asList(alert);

        Page<Alert> page =
                new PageImpl<>(alerts, pageable, 1);

        when(alertRepository.findAll(pageable))
                .thenReturn(page);

        Page<Alert> result =
                alertService.getAll(pageable);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals(1, result.getContent().size());
        assertEquals(0, result.getNumber());
        assertEquals(10, result.getSize());

        verify(alertRepository, times(1))
                .findAll(pageable);
    }

    // =========================
    // GET ALERT BY ID
    // =========================

    @Test
    @DisplayName("Should get alert by id")
    void shouldGetAlertById() {

        when(alertRepository.findById(1L))
                .thenReturn(Optional.of(alert));

        Alert result =
                alertService.getById(1L);

        assertNotNull(result);
        assertEquals(
                "HIGH_TEMPERATURE",
                result.getType()
        );
        assertEquals(
                "CRITICAL",
                result.getSeverity()
        );

        verify(alertRepository, times(1))
                .findById(1L);
    }

    @Test
    @DisplayName("Should throw exception when alert is not found")
    void shouldThrowExceptionWhenAlertIsNotFound() {

        when(alertRepository.findById(999L))
                .thenReturn(Optional.empty());

        ResourceNotFoundException exception =
                assertThrows(
                        ResourceNotFoundException.class,
                        () -> alertService.getById(999L)
                );

        assertEquals(
                "ALERT NOT FOUND: 999",
                exception.getMessage()
        );

        verify(alertRepository, times(1))
                .findById(999L);
    }

    // =========================
    // GET ALERTS BY MACHINE
    // =========================

    @Test
    @DisplayName("Should get alerts by machine")
    void shouldGetAlertsByMachine() {

        when(machineRepository.existsById(1L))
                .thenReturn(true);

        List<Alert> alerts =
                Arrays.asList(alert);

        when(alertRepository.findByMachineId(1L))
                .thenReturn(alerts);

        List<Alert> result =
                alertService.getByMachine(1L);

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(
                "HIGH_TEMPERATURE",
                result.get(0).getType()
        );

        verify(machineRepository, times(1))
                .existsById(1L);

        verify(alertRepository, times(1))
                .findByMachineId(1L);
    }

    @Test
    @DisplayName("Should throw exception when machine does not exist while getting alerts")
    void shouldThrowExceptionWhenMachineDoesNotExistWhileGettingAlerts() {

        when(machineRepository.existsById(999L))
                .thenReturn(false);

        ResourceNotFoundException exception =
                assertThrows(
                        ResourceNotFoundException.class,
                        () -> alertService.getByMachine(999L)
                );

        assertEquals(
                "MACHINE NOT FOUND: 999",
                exception.getMessage()
        );

        verify(machineRepository, times(1))
                .existsById(999L);

        verify(alertRepository, never())
                .findByMachineId(999L);
    }

    // =========================
    // GET ALERTS BY MACHINE
    // PAGINATED
    // =========================

    @Test
    @DisplayName("Should get alerts by machine with pagination")
    void shouldGetAlertsByMachineWithPagination() {

        Pageable pageable =
                PageRequest.of(0, 5);

        Page<Alert> page =
                new PageImpl<>(
                        Arrays.asList(alert),
                        pageable,
                        1
                );

        when(machineRepository.existsById(1L))
                .thenReturn(true);

        when(alertRepository.findByMachineId(
                1L,
                pageable))
                .thenReturn(page);

        Page<Alert> result =
                alertService.getByMachine(
                        1L,
                        pageable
                );

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals(1, result.getContent().size());
        assertEquals(0, result.getNumber());
        assertEquals(5, result.getSize());

        verify(machineRepository, times(1))
                .existsById(1L);

        verify(alertRepository, times(1))
                .findByMachineId(
                        1L,
                        pageable
                );
    }

    @Test
    @DisplayName("Should throw exception when machine does not exist for paginated alerts")
    void shouldThrowExceptionWhenMachineDoesNotExistForPaginatedAlerts() {

        Pageable pageable =
                PageRequest.of(0, 5);

        when(machineRepository.existsById(999L))
                .thenReturn(false);

        assertThrows(
                ResourceNotFoundException.class,
                () -> alertService.getByMachine(
                        999L,
                        pageable
                )
        );

        verify(machineRepository, times(1))
                .existsById(999L);

        verify(alertRepository, never())
                .findByMachineId(
                        999L,
                        pageable
                );
    }

    // =========================
    // GET UNRESOLVED ALERTS
    // =========================

    @Test
    @DisplayName("Should get unresolved alerts")
    void shouldGetUnresolvedAlerts() {

        Alert unresolvedAlert = new Alert();
        unresolvedAlert.setType("HIGH_VIBRATION");
        unresolvedAlert.setSeverity("WARNING");
        unresolvedAlert.setMessage("High vibration detected");
        unresolvedAlert.setResolved(false);

        when(alertRepository.findByResolvedFalse())
                .thenReturn(
                        Arrays.asList(unresolvedAlert)
                );

        List<Alert> result =
                alertService.getUnresolved();

        assertNotNull(result);
        assertEquals(1, result.size());
        assertFalse(result.get(0).isResolved());

        verify(alertRepository, times(1))
                .findByResolvedFalse();
    }

    @Test
    @DisplayName("Should return empty list when no unresolved alerts exist")
    void shouldReturnEmptyListWhenNoUnresolvedAlertsExist() {

        when(alertRepository.findByResolvedFalse())
                .thenReturn(Collections.emptyList());

        List<Alert> result =
                alertService.getUnresolved();

        assertNotNull(result);
        assertTrue(result.isEmpty());

        verify(alertRepository, times(1))
                .findByResolvedFalse();
    }

    // =========================
    // GET UNRESOLVED ALERTS
    // PAGINATED
    // =========================

    @Test
    @DisplayName("Should get unresolved alerts with pagination")
    void shouldGetUnresolvedAlertsWithPagination() {

        Pageable pageable =
                PageRequest.of(0, 10);

        Page<Alert> page =
                new PageImpl<>(
                        Arrays.asList(alert),
                        pageable,
                        1
                );

        when(alertRepository.findByResolvedFalse(pageable))
                .thenReturn(page);

        Page<Alert> result =
                alertService.getUnresolved(pageable);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals(1, result.getContent().size());

        verify(alertRepository, times(1))
                .findByResolvedFalse(pageable);
    }

    // =========================
    // GET ALERTS BY SEVERITY
    // =========================

    @Test
    @DisplayName("Should get alerts by severity")
    void shouldGetAlertsBySeverity() {

        when(alertRepository.findBySeverity("CRITICAL"))
                .thenReturn(Arrays.asList(alert));

        List<Alert> result =
                alertService.getBySeverity("CRITICAL");

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(
                "CRITICAL",
                result.get(0).getSeverity()
        );

        verify(alertRepository, times(1))
                .findBySeverity("CRITICAL");
    }

    @Test
    @DisplayName("Should return empty list when no alerts match severity")
    void shouldReturnEmptyListWhenNoAlertsMatchSeverity() {

        when(alertRepository.findBySeverity("INFO"))
                .thenReturn(Collections.emptyList());

        List<Alert> result =
                alertService.getBySeverity("INFO");

        assertNotNull(result);
        assertTrue(result.isEmpty());

        verify(alertRepository, times(1))
                .findBySeverity("INFO");
    }

    // =========================
    // GET ALERTS BY SEVERITY
    // PAGINATED
    // =========================

    @Test
    @DisplayName("Should get alerts by severity with pagination")
    void shouldGetAlertsBySeverityWithPagination() {

        Pageable pageable =
                PageRequest.of(0, 10);

        Page<Alert> page =
                new PageImpl<>(
                        Arrays.asList(alert),
                        pageable,
                        1
                );

        when(alertRepository.findBySeverity(
                "CRITICAL",
                pageable))
                .thenReturn(page);

        Page<Alert> result =
                alertService.getBySeverity(
                        "CRITICAL",
                        pageable
                );

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals(1, result.getContent().size());

        verify(alertRepository, times(1))
                .findBySeverity(
                        "CRITICAL",
                        pageable
                );
    }

    // =========================
    // UPDATE ALERT
    // =========================

    @Test
    @DisplayName("Should update alert successfully")
    void shouldUpdateAlertSuccessfully() {

        when(alertRepository.findById(1L))
                .thenReturn(Optional.of(alert));

        when(machineRepository.findById(1L))
                .thenReturn(Optional.of(machine));

        request.setType("HIGH_VIBRATION");
        request.setSeverity("WARNING");
        request.setMessage("Machine vibration is high");
        request.setResolved(true);

        when(alertRepository.save(any(Alert.class)))
                .thenAnswer(
                        invocation ->
                                invocation.getArgument(0)
                );

        Alert result =
                alertService.update(
                        1L,
                        request
                );

        assertNotNull(result);
        assertEquals(
                "HIGH_VIBRATION",
                result.getType()
        );
        assertEquals(
                "WARNING",
                result.getSeverity()
        );
        assertEquals(
                "Machine vibration is high",
                result.getMessage()
        );
        assertTrue(result.isResolved());
        assertEquals(machine, result.getMachine());

        verify(alertRepository, times(1))
                .findById(1L);

        verify(machineRepository, times(1))
                .findById(1L);

        verify(alertRepository, times(1))
                .save(any(Alert.class));
    }

    @Test
    @DisplayName("Should throw exception when alert does not exist while updating")
    void shouldThrowExceptionWhenAlertDoesNotExistWhileUpdating() {

        when(alertRepository.findById(999L))
                .thenReturn(Optional.empty());

        ResourceNotFoundException exception =
                assertThrows(
                        ResourceNotFoundException.class,
                        () -> alertService.update(
                                999L,
                                request
                        )
                );

        assertEquals(
                "ALERT NOT FOUND: 999",
                exception.getMessage()
        );

        verify(alertRepository, times(1))
                .findById(999L);

        verify(machineRepository, never())
                .findById(any(Long.class));

        verify(alertRepository, never())
                .save(any(Alert.class));
    }

    @Test
    @DisplayName("Should throw exception when machine does not exist while updating alert")
    void shouldThrowExceptionWhenMachineDoesNotExistWhileUpdatingAlert() {

        when(alertRepository.findById(1L))
                .thenReturn(Optional.of(alert));

        when(machineRepository.findById(999L))
                .thenReturn(Optional.empty());

        request.setMachineId(999L);

        ResourceNotFoundException exception =
                assertThrows(
                        ResourceNotFoundException.class,
                        () -> alertService.update(
                                1L,
                                request
                        )
                );

        assertEquals(
                "MACHINE NOT FOUND: 999",
                exception.getMessage()
        );

        verify(alertRepository, times(1))
                .findById(1L);

        verify(machineRepository, times(1))
                .findById(999L);

        verify(alertRepository, never())
                .save(any(Alert.class));
    }

    // =========================
    // DELETE ALERT
    // =========================

    @Test
    @DisplayName("Should delete alert successfully")
    void shouldDeleteAlertSuccessfully() {

        when(alertRepository.findById(1L))
                .thenReturn(Optional.of(alert));

        alertService.delete(1L);

        verify(alertRepository, times(1))
                .findById(1L);

        verify(alertRepository, times(1))
                .delete(alert);
    }

    @Test
    @DisplayName("Should throw exception when alert does not exist while deleting")
    void shouldThrowExceptionWhenAlertDoesNotExistWhileDeleting() {

        when(alertRepository.findById(999L))
                .thenReturn(Optional.empty());

        ResourceNotFoundException exception =
                assertThrows(
                        ResourceNotFoundException.class,
                        () -> alertService.delete(999L)
                );

        assertEquals(
                "ALERT NOT FOUND: 999",
                exception.getMessage()
        );

        verify(alertRepository, times(1))
                .findById(999L);

        verify(alertRepository, never())
                .delete(any(Alert.class));
    }
}
