package com.example.demo.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import com.example.demo.dto.TelemetryRequest;
import com.example.demo.entity.Machine;
import com.example.demo.entity.Telemetry;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.repository.MachineRepository;
import com.example.demo.repository.TelemetryRepository;
import com.example.demo.service.alert.AlertEngineService;

@ExtendWith(MockitoExtension.class)
class TelemetryServiceTest {

    @Mock
    private TelemetryRepository telemetryRepository;

    @Mock
    private MachineRepository machineRepository;

    @Mock
    private DomainValidationService domainValidationService;

    @Mock
    private WebSocketEventPublisherService webSocketEventPublisherService;

    @Mock
    private AlertEngineService alertEngineService;

    @InjectMocks
    private TelemetryService telemetryService;


    private Telemetry telemetry;
    private Machine machine;
    private TelemetryRequest request;

    private LocalDateTime timestamp;

    @BeforeEach
    void setUp() {

        timestamp =
                LocalDateTime.of(
                        2026,
                        9,
                        11,
                        10,
                        30
                );

        machine = new Machine();

        machine.setName("CNC Machine 01");
        machine.setType("CNC");
        machine.setStatus("RUNNING");

        telemetry = new Telemetry();

        telemetry.setMachine(machine);
        telemetry.setTemperature(75.5);
        telemetry.setVibration(2.5);
        telemetry.setPressure(5.5);
        telemetry.setRpm(1500.0);
        telemetry.setTimestamp(timestamp);

        request = new TelemetryRequest();

        request.setMachineId(1L);
        request.setTemperature(75.5);
        request.setVibration(2.5);
        request.setPressure(5.5);
        request.setRpm(1500.0);
        request.setTimestamp(timestamp);
    }

    // =========================================================
    // CREATE
    // =========================================================

    @Test
    @DisplayName("Should create telemetry successfully")
    void shouldCreateTelemetrySuccessfully() {

        when(machineRepository.findById(1L))
                .thenReturn(Optional.of(machine));

        doNothing()
                .when(domainValidationService)
                .validateTelemetry(
                        75.5,
                        2.5,
                        5.5,
                        1500.0
                );

        when(telemetryRepository.save(any(Telemetry.class)))
                .thenReturn(telemetry);

        Telemetry result =
                telemetryService.create(request);

        assertNotNull(result);
        assertEquals(75.5, result.getTemperature());
        assertEquals(2.5, result.getVibration());
        assertEquals(5.5, result.getPressure());
        assertEquals(1500.0, result.getRpm());
        assertEquals(machine, result.getMachine());

        verify(domainValidationService, times(1))
                .validateTelemetry(
                        75.5,
                        2.5,
                        5.5,
                        1500.0
                );

        verify(telemetryRepository, times(1))
                .save(any(Telemetry.class));
    }

    @Test
    @DisplayName("Should throw exception when machine does not exist")
    void shouldThrowExceptionWhenMachineDoesNotExist() {

        when(machineRepository.findById(1L))
                .thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> telemetryService.create(request)
        );

        verify(domainValidationService, never())
                .validateTelemetry(
                        any(),
                        any(),
                        any(),
                        any()
                );

        verify(telemetryRepository, never())
                .save(any(Telemetry.class));
    }

    // =========================================================
    // GET ALL
    // =========================================================

    @Test
    @DisplayName("Should get all telemetry")
    void shouldGetAllTelemetry() {

        when(telemetryRepository.findAll())
                .thenReturn(List.of(telemetry));

        List<Telemetry> result =
                telemetryService.getAll();

        assertEquals(1, result.size());
    }

    @Test
    @DisplayName("Should get all telemetry with pagination")
    void shouldGetAllTelemetryWithPagination() {

        Pageable pageable = PageRequest.of(0, 10);

        when(telemetryRepository.findAll(pageable))
                .thenReturn(
                        new PageImpl<>(List.of(telemetry))
                );

        Page<Telemetry> result =
                telemetryService.getAll(pageable);

        assertEquals(1, result.getContent().size());
    }

    // =========================================================
    // GET BY ID
    // =========================================================

    @Test
    @DisplayName("Should get telemetry by id")
    void shouldGetTelemetryById() {

        when(telemetryRepository.findById(1L))
                .thenReturn(Optional.of(telemetry));

        Telemetry result =
                telemetryService.getById(1L);

        assertNotNull(result);
        assertEquals(
                75.5,
                result.getTemperature()
        );
    }

    @Test
    @DisplayName("Should throw exception when telemetry does not exist")
    void shouldThrowExceptionWhenTelemetryDoesNotExist() {

        when(telemetryRepository.findById(1L))
                .thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> telemetryService.getById(1L)
        );
    }

    // =========================================================
    // GET BY MACHINE
    // =========================================================

    @Test
    @DisplayName("Should get telemetry by machine")
    void shouldGetTelemetryByMachine() {

        when(machineRepository.existsById(1L))
                .thenReturn(true);

        when(telemetryRepository.findByMachineId(1L))
                .thenReturn(List.of(telemetry));

        List<Telemetry> result =
                telemetryService.getByMachine(1L);

        assertEquals(1, result.size());
    }

    @Test
    @DisplayName("Should get telemetry by machine with pagination")
    void shouldGetTelemetryByMachineWithPagination() {

        Pageable pageable = PageRequest.of(0, 10);

        when(machineRepository.existsById(1L))
                .thenReturn(true);

        when(telemetryRepository.findByMachineId(
                1L,
                pageable))
                .thenReturn(
                        new PageImpl<>(List.of(telemetry))
                );

        Page<Telemetry> result =
                telemetryService.getByMachine(
                        1L,
                        pageable
                );

        assertEquals(1, result.getContent().size());
    }

    @Test
    @DisplayName("Should throw exception when machine does not exist")
    void shouldThrowExceptionWhenMachineDoesNotExistForGet() {

        when(machineRepository.existsById(1L))
                .thenReturn(false);

        assertThrows(
                ResourceNotFoundException.class,
                () -> telemetryService.getByMachine(1L)
        );
    }

    // =========================================================
    // MACHINE + DATE RANGE
    // =========================================================

    @Test
    @DisplayName("Should get telemetry by machine and date range")
    void shouldGetTelemetryByMachineAndDateRange() {

        LocalDateTime start =
                timestamp.minusHours(1);

        LocalDateTime end =
                timestamp.plusHours(1);

        when(machineRepository.existsById(1L))
                .thenReturn(true);

        when(telemetryRepository
                .findByMachineIdAndTimestampBetween(
                        1L,
                        start,
                        end))
                .thenReturn(List.of(telemetry));

        List<Telemetry> result =
                telemetryService
                        .getByMachineAndDateRange(
                                1L,
                                start,
                                end
                        );

        assertEquals(1, result.size());
    }

    @Test
    @DisplayName("Should get telemetry by machine and date range with pagination")
    void shouldGetTelemetryByMachineAndDateRangeWithPagination() {

        LocalDateTime start =
                timestamp.minusHours(1);

        LocalDateTime end =
                timestamp.plusHours(1);

        Pageable pageable = PageRequest.of(0, 10);

        when(machineRepository.existsById(1L))
                .thenReturn(true);

        when(telemetryRepository
                .findByMachineIdAndTimestampBetween(
                        1L,
                        start,
                        end,
                        pageable))
                .thenReturn(
                        new PageImpl<>(List.of(telemetry))
                );

        Page<Telemetry> result =
                telemetryService
                        .getByMachineAndDateRange(
                                1L,
                                start,
                                end,
                                pageable
                        );

        assertEquals(1, result.getContent().size());
    }

    // =========================================================
    // DATE RANGE
    // =========================================================

    @Test
    @DisplayName("Should get telemetry by date range")
    void shouldGetTelemetryByDateRange() {

        LocalDateTime start =
                timestamp.minusHours(1);

        LocalDateTime end =
                timestamp.plusHours(1);

        when(telemetryRepository
                .findByTimestampBetween(start, end))
                .thenReturn(List.of(telemetry));

        List<Telemetry> result =
                telemetryService
                        .getByDateRange(
                                start,
                                end
                        );

        assertEquals(1, result.size());
    }

    @Test
    @DisplayName("Should get telemetry by date range with pagination")
    void shouldGetTelemetryByDateRangeWithPagination() {

        LocalDateTime start =
                timestamp.minusHours(1);

        LocalDateTime end =
                timestamp.plusHours(1);

        Pageable pageable = PageRequest.of(0, 10);

        when(telemetryRepository
                .findByTimestampBetween(
                        start,
                        end,
                        pageable))
                .thenReturn(
                        new PageImpl<>(List.of(telemetry))
                );

        Page<Telemetry> result =
                telemetryService
                        .getByDateRange(
                                start,
                                end,
                                pageable
                        );

        assertEquals(1, result.getContent().size());
    }

    // =========================================================
    // LATEST
    // =========================================================

    @Test
    @DisplayName("Should get latest telemetry by machine")
    void shouldGetLatestTelemetryByMachine() {

        when(machineRepository.existsById(1L))
                .thenReturn(true);

        when(telemetryRepository
                .findTop10ByMachineIdOrderByTimestampDesc(1L))
                .thenReturn(List.of(telemetry));

        List<Telemetry> result =
                telemetryService
                        .getLatestByMachine(1L);

        assertEquals(1, result.size());
    }

    @Test
    @DisplayName("Should throw exception when latest telemetry machine does not exist")
    void shouldThrowExceptionWhenLatestTelemetryMachineDoesNotExist() {

        when(machineRepository.existsById(1L))
                .thenReturn(false);

        assertThrows(
                ResourceNotFoundException.class,
                () -> telemetryService.getLatestByMachine(1L)
        );
    }
}