package com.example.demo.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
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

import com.example.demo.dto.MaintenanceRequest;
import com.example.demo.entity.Machine;
import com.example.demo.entity.Maintenance;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.repository.MachineRepository;
import com.example.demo.repository.MaintenanceRepository;

@ExtendWith(MockitoExtension.class)
class MaintenanceServiceTest {

    @Mock
    private MaintenanceRepository maintenanceRepository;

    @Mock
    private MachineRepository machineRepository;

    @Mock
    private WebSocketEventPublisherService webSocketEventPublisherService;

    @InjectMocks
    private MaintenanceService maintenanceService;

    private Machine machine;

    private Maintenance maintenance;

    private MaintenanceRequest request;

    @BeforeEach
    void setUp() {

        machine = new Machine();

        machine.setName("CNC Machine 01");
        machine.setType("CNC");
        machine.setStatus("RUNNING");

        maintenance = new Maintenance();

        maintenance.setMachine(machine);
        maintenance.setType("PREVENTIVE");
        maintenance.setDescription(
                "Routine machine maintenance"
        );
        maintenance.setScheduledDate(
                LocalDate.of(2026, 9, 20)
        );
        maintenance.setCompletedDate(null);
        maintenance.setStatus("SCHEDULED");
        maintenance.setTechnician("John");

        request = new MaintenanceRequest();

        request.setMachineId(1L);
        request.setType("PREVENTIVE");
        request.setDescription(
                "Routine machine maintenance"
        );
        request.setScheduledDate(
                LocalDate.of(2026, 9, 20)
        );
        request.setCompletedDate(null);
        request.setStatus("SCHEDULED");
        request.setTechnician("John");
    }

    // =========================
    // CREATE
    // =========================

    @Test
    @DisplayName("Should create maintenance successfully")
    void shouldCreateMaintenanceSuccessfully() {

        when(machineRepository.findById(1L))
                .thenReturn(Optional.of(machine));

        when(maintenanceRepository.save(
                any(Maintenance.class)))
                .thenAnswer(
                        invocation ->
                                invocation.getArgument(0)
                );

        Maintenance result =
                maintenanceService.create(request);

        assertNotNull(result);

        assertEquals(
                machine,
                result.getMachine()
        );

        assertEquals(
                "PREVENTIVE",
                result.getType()
        );

        assertEquals(
                "Routine machine maintenance",
                result.getDescription()
        );

        assertEquals(
                LocalDate.of(2026, 9, 20),
                result.getScheduledDate()
        );

        assertEquals(
                "SCHEDULED",
                result.getStatus()
        );

        assertEquals(
                "John",
                result.getTechnician()
        );

        assertNotNull(
                result.getCreatedAt()
        );

        verify(
                machineRepository,
                times(1)
        ).findById(1L);

        verify(
                maintenanceRepository,
                times(1)
        ).save(any(Maintenance.class));
    }

    @Test
    @DisplayName("Should throw exception when machine does not exist during create")
    void shouldThrowExceptionWhenMachineDoesNotExistDuringCreate() {

        when(machineRepository.findById(1L))
                .thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> maintenanceService.create(request)
        );

        verify(
                machineRepository,
                times(1)
        ).findById(1L);

        verify(
                maintenanceRepository,
                never()
        ).save(any(Maintenance.class));
    }

    // =========================
    // GET ALL
    // =========================

    @Test
    @DisplayName("Should return all maintenance records")
    void shouldReturnAllMaintenanceRecords() {

        List<Maintenance> maintenanceList =
                List.of(maintenance);

        when(maintenanceRepository.findAll())
                .thenReturn(maintenanceList);

        List<Maintenance> result =
                maintenanceService.getAll();

        assertNotNull(result);

        assertEquals(
                1,
                result.size()
        );

        assertEquals(
                maintenance,
                result.get(0)
        );

        verify(
                maintenanceRepository,
                times(1)
        ).findAll();
    }

    // =========================
    // GET ALL WITH PAGINATION
    // =========================

    @Test
    @DisplayName("Should return paginated maintenance records")
    void shouldReturnPaginatedMaintenanceRecords() {

        Pageable pageable =
                PageRequest.of(0, 5);

        Page<Maintenance> page =
                new PageImpl<>(
                        List.of(maintenance),
                        pageable,
                        1
                );

        when(
                maintenanceRepository.findAll(pageable)
        ).thenReturn(page);

        Page<Maintenance> result =
                maintenanceService.getAll(pageable);

        assertNotNull(result);

        assertEquals(
                1,
                result.getTotalElements()
        );

        assertEquals(
                1,
                result.getContent().size()
        );

        assertEquals(
                maintenance,
                result.getContent().get(0)
        );

        verify(
                maintenanceRepository,
                times(1)
        ).findAll(pageable);
    }

    // =========================
    // GET BY ID
    // =========================

    @Test
    @DisplayName("Should return maintenance by id")
    void shouldReturnMaintenanceById() {

        when(
                maintenanceRepository.findById(1L)
        ).thenReturn(
                Optional.of(maintenance)
        );

        Maintenance result =
                maintenanceService.getById(1L);

        assertNotNull(result);

        assertEquals(
                maintenance,
                result
        );

        verify(
                maintenanceRepository,
                times(1)
        ).findById(1L);
    }

    @Test
    @DisplayName("Should throw exception when maintenance id does not exist")
    void shouldThrowExceptionWhenMaintenanceIdDoesNotExist() {

        when(
                maintenanceRepository.findById(1L)
        ).thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> maintenanceService.getById(1L)
        );

        verify(
                maintenanceRepository,
                times(1)
        ).findById(1L);
    }

    // =========================
    // GET BY MACHINE
    // =========================

    @Test
    @DisplayName("Should return maintenance records by machine")
    void shouldReturnMaintenanceByMachine() {

        when(
                machineRepository.existsById(1L)
        ).thenReturn(true);

        when(
                maintenanceRepository.findByMachineId(1L)
        ).thenReturn(
                List.of(maintenance)
        );

        List<Maintenance> result =
                maintenanceService.getByMachine(1L);

        assertNotNull(result);

        assertEquals(
                1,
                result.size()
        );

        assertEquals(
                maintenance,
                result.get(0)
        );

        verify(
                machineRepository,
                times(1)
        ).existsById(1L);

        verify(
                maintenanceRepository,
                times(1)
        ).findByMachineId(1L);
    }

    @Test
    @DisplayName("Should throw exception when machine does not exist while getting maintenance")
    void shouldThrowExceptionWhenMachineDoesNotExistWhileGettingMaintenance() {

        when(
                machineRepository.existsById(1L)
        ).thenReturn(false);

        assertThrows(
                ResourceNotFoundException.class,
                () -> maintenanceService.getByMachine(1L)
        );

        verify(
                machineRepository,
                times(1)
        ).existsById(1L);

        verify(
                maintenanceRepository,
                never()
        ).findByMachineId(1L);
    }

    // =========================
    // GET BY MACHINE WITH PAGINATION
    // =========================

    @Test
    @DisplayName("Should return paginated maintenance records by machine")
    void shouldReturnPaginatedMaintenanceByMachine() {

        Pageable pageable =
                PageRequest.of(0, 5);

        Page<Maintenance> page =
                new PageImpl<>(
                        List.of(maintenance),
                        pageable,
                        1
                );

        when(
                machineRepository.existsById(1L)
        ).thenReturn(true);

        when(
                maintenanceRepository.findByMachineId(
                        1L,
                        pageable
                )
        ).thenReturn(page);

        Page<Maintenance> result =
                maintenanceService.getByMachine(
                        1L,
                        pageable
                );

        assertNotNull(result);

        assertEquals(
                1,
                result.getTotalElements()
        );

        assertEquals(
                maintenance,
                result.getContent().get(0)
        );

        verify(
                machineRepository,
                times(1)
        ).existsById(1L);

        verify(
                maintenanceRepository,
                times(1)
        ).findByMachineId(
                1L,
                pageable
        );
    }

    @Test
    @DisplayName("Should throw exception when machine does not exist for paginated search")
    void shouldThrowExceptionWhenMachineDoesNotExistForPaginatedSearch() {

        Pageable pageable =
                PageRequest.of(0, 5);

        when(
                machineRepository.existsById(1L)
        ).thenReturn(false);

        assertThrows(
                ResourceNotFoundException.class,
                () -> maintenanceService.getByMachine(
                        1L,
                        pageable
                )
        );

        verify(
                machineRepository,
                times(1)
        ).existsById(1L);

        verify(
                maintenanceRepository,
                never()
        ).findByMachineId(
                1L,
                pageable
        );
    }

    // =========================
    // GET BY STATUS
    // =========================

    @Test
    @DisplayName("Should return maintenance records by status")
    void shouldReturnMaintenanceByStatus() {

        when(
                maintenanceRepository.findByStatus(
                        "SCHEDULED"
                )
        ).thenReturn(
                List.of(maintenance)
        );

        List<Maintenance> result =
                maintenanceService.getByStatus(
                        "SCHEDULED"
                );

        assertNotNull(result);

        assertEquals(
                1,
                result.size()
        );

        assertEquals(
                maintenance,
                result.get(0)
        );

        verify(
                maintenanceRepository,
                times(1)
        ).findByStatus("SCHEDULED");
    }

    // =========================
    // GET BY STATUS WITH PAGINATION
    // =========================

    @Test
    @DisplayName("Should return paginated maintenance records by status")
    void shouldReturnPaginatedMaintenanceByStatus() {

        Pageable pageable =
                PageRequest.of(0, 5);

        Page<Maintenance> page =
                new PageImpl<>(
                        List.of(maintenance),
                        pageable,
                        1
                );

        when(
                maintenanceRepository.findByStatus(
                        "SCHEDULED",
                        pageable
                )
        ).thenReturn(page);

        Page<Maintenance> result =
                maintenanceService.getByStatus(
                        "SCHEDULED",
                        pageable
                );

        assertNotNull(result);

        assertEquals(
                1,
                result.getTotalElements()
        );

        assertEquals(
                maintenance,
                result.getContent().get(0)
        );

        verify(
                maintenanceRepository,
                times(1)
        ).findByStatus(
                "SCHEDULED",
                pageable
        );
    }

    // =========================
    // GET BY STATUS ORDERED BY DATE
    // =========================

    @Test
    @DisplayName("Should return maintenance records ordered by scheduled date")
    void shouldReturnMaintenanceByStatusOrderedByDate() {

        when(
                maintenanceRepository
                        .findByStatusOrderByScheduledDateAsc(
                                "SCHEDULED"
                        )
        ).thenReturn(
                List.of(maintenance)
        );

        List<Maintenance> result =
                maintenanceService
                        .getByStatusOrderByDate(
                                "SCHEDULED"
                        );

        assertNotNull(result);

        assertEquals(
                1,
                result.size()
        );

        assertEquals(
                maintenance,
                result.get(0)
        );

        verify(
                maintenanceRepository,
                times(1)
        ).findByStatusOrderByScheduledDateAsc(
                "SCHEDULED"
        );
    }

    // =========================
    // GET BY STATUS ORDERED BY DATE WITH PAGINATION
    // =========================

    @Test
    @DisplayName("Should return paginated maintenance records ordered by scheduled date")
    void shouldReturnPaginatedMaintenanceByStatusOrderedByDate() {

        Pageable pageable =
                PageRequest.of(0, 5);

        Page<Maintenance> page =
                new PageImpl<>(
                        List.of(maintenance),
                        pageable,
                        1
                );

        when(
                maintenanceRepository
                        .findByStatusOrderByScheduledDateAsc(
                                "SCHEDULED",
                                pageable
                        )
        ).thenReturn(page);

        Page<Maintenance> result =
                maintenanceService
                        .getByStatusOrderByDate(
                                "SCHEDULED",
                                pageable
                        );

        assertNotNull(result);

        assertEquals(
                1,
                result.getTotalElements()
        );

        assertEquals(
                maintenance,
                result.getContent().get(0)
        );

        verify(
                maintenanceRepository,
                times(1)
        ).findByStatusOrderByScheduledDateAsc(
                "SCHEDULED",
                pageable
        );
    }

    // =========================
    // UPDATE
    // =========================

    @Test
    @DisplayName("Should update maintenance successfully")
    void shouldUpdateMaintenanceSuccessfully() {

        when(
                maintenanceRepository.findById(1L)
        ).thenReturn(
                Optional.of(maintenance)
        );

        when(
                machineRepository.findById(1L)
        ).thenReturn(
                Optional.of(machine)
        );

        request.setType("CORRECTIVE");
        request.setDescription(
                "Corrective maintenance completed"
        );
        request.setStatus("COMPLETED");
        request.setTechnician("David");

        when(
                maintenanceRepository.save(
                        any(Maintenance.class)
                )
        ).thenAnswer(
                invocation ->
                        invocation.getArgument(0)
        );

        Maintenance result =
                maintenanceService.update(
                        1L,
                        request
                );

        assertNotNull(result);

        assertEquals(
                machine,
                result.getMachine()
        );

        assertEquals(
                "CORRECTIVE",
                result.getType()
        );

        assertEquals(
                "Corrective maintenance completed",
                result.getDescription()
        );

        assertEquals(
                "COMPLETED",
                result.getStatus()
        );

        assertEquals(
                "David",
                result.getTechnician()
        );

        verify(
                maintenanceRepository,
                times(1)
        ).findById(1L);

        verify(
                machineRepository,
                times(1)
        ).findById(1L);

        verify(
                maintenanceRepository,
                times(1)
        ).save(any(Maintenance.class));
    }

    @Test
    @DisplayName("Should throw exception when maintenance does not exist during update")
    void shouldThrowExceptionWhenMaintenanceDoesNotExistDuringUpdate() {

        when(
                maintenanceRepository.findById(1L)
        ).thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> maintenanceService.update(
                        1L,
                        request
                )
        );

        verify(
                maintenanceRepository,
                times(1)
        ).findById(1L);

        verify(
                machineRepository,
                never()
        ).findById(any(Long.class));

        verify(
                maintenanceRepository,
                never()
        ).save(any(Maintenance.class));
    }

    @Test
    @DisplayName("Should throw exception when machine does not exist during update")
    void shouldThrowExceptionWhenMachineDoesNotExistDuringUpdate() {

        when(
                maintenanceRepository.findById(1L)
        ).thenReturn(
                Optional.of(maintenance)
        );

        when(
                machineRepository.findById(1L)
        ).thenReturn(
                Optional.empty()
        );

        assertThrows(
                ResourceNotFoundException.class,
                () -> maintenanceService.update(
                        1L,
                        request
                )
        );

        verify(
                maintenanceRepository,
                times(1)
        ).findById(1L);

        verify(
                machineRepository,
                times(1)
        ).findById(1L);

        verify(
                maintenanceRepository,
                never()
        ).save(any(Maintenance.class));
    }

    // =========================
    // DELETE
    // =========================

    @Test
    @DisplayName("Should delete maintenance successfully")
    void shouldDeleteMaintenanceSuccessfully() {

        when(
                maintenanceRepository.findById(1L)
        ).thenReturn(
                Optional.of(maintenance)
        );

        maintenanceService.delete(1L);

        verify(
                maintenanceRepository,
                times(1)
        ).findById(1L);

        verify(
                maintenanceRepository,
                times(1)
        ).delete(maintenance);
    }

    @Test
    @DisplayName("Should throw exception when maintenance does not exist during delete")
    void shouldThrowExceptionWhenMaintenanceDoesNotExistDuringDelete() {

        when(
                maintenanceRepository.findById(1L)
        ).thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> maintenanceService.delete(1L)
        );

        verify(
                maintenanceRepository,
                times(1)
        ).findById(1L);

        verify(
                maintenanceRepository,
                never()
        ).delete(any(Maintenance.class));
    }
}