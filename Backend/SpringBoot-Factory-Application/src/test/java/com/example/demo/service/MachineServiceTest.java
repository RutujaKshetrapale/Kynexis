package com.example.demo.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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

import com.example.demo.dto.MachineRequest;
import com.example.demo.entity.Machine;
import com.example.demo.entity.Plant;
import com.example.demo.exception.BusinessValidationException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.repository.MachineRepository;
import com.example.demo.repository.PlantRepository;

@ExtendWith(MockitoExtension.class)
class MachineServiceTest {

    @Mock
    private MachineRepository machineRepository;

    @Mock
    private PlantRepository plantRepository;

    @Mock
    private DomainValidationService domainValidationService;

    @Mock
    private WebSocketEventPublisherService webSocketEventPublisherService;

    @InjectMocks
    private MachineService machineService;

    private Machine machine;
    private Plant plant;
    private MachineRequest request;

    @BeforeEach
    void setUp() {

        plant = new Plant();

        plant.setName("Pune Manufacturing Plant");
        plant.setLocation("Pune, Maharashtra");
        plant.setActive(true);

        machine = new Machine();

        machine.setName("CNC Machine 01");
        machine.setType("CNC");
        machine.setStatus("RUNNING");
        machine.setPlant(plant);

        request = new MachineRequest();

        request.setName("CNC Machine 01");
        request.setType("CNC");
        request.setStatus("running");
        request.setPlantId(2L);
    }

    // =========================================================
    // CREATE
    // =========================================================

    @Test
    @DisplayName("Should create machine successfully")
    void shouldCreateMachineSuccessfully() {

        when(plantRepository.findById(2L))
                .thenReturn(Optional.of(plant));

        when(machineRepository.save(any(Machine.class)))
                .thenReturn(machine);

        Machine result = machineService.create(request);

        assertNotNull(result);
        assertEquals("CNC Machine 01", result.getName());
        assertEquals("CNC", result.getType());
        assertEquals("RUNNING", result.getStatus());
        assertEquals(plant, result.getPlant());

        verify(plantRepository, times(1))
                .findById(2L);

        verify(domainValidationService, times(1))
                .validateMachineStatus("running");

        verify(machineRepository, times(1))
                .save(any(Machine.class));
    }

    @Test
    @DisplayName("Should trim and convert machine status to uppercase")
    void shouldNormalizeMachineStatus() {

        request.setName("  CNC Machine 01  ");
        request.setType("  CNC  ");
        request.setStatus("  running  ");

        when(plantRepository.findById(2L))
                .thenReturn(Optional.of(plant));

        when(machineRepository.save(any(Machine.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        Machine result = machineService.create(request);

        assertEquals("CNC Machine 01", result.getName());
        assertEquals("CNC", result.getType());
        assertEquals("RUNNING", result.getStatus());
    }

    @Test
    @DisplayName("Should throw exception when plant does not exist during create")
    void shouldThrowExceptionWhenPlantDoesNotExistDuringCreate() {

        when(plantRepository.findById(2L))
                .thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> machineService.create(request)
        );

        verify(machineRepository, never())
                .save(any(Machine.class));

        verify(domainValidationService, never())
                .validateMachineStatus(any());
    }

    // =========================================================
    // GET ALL
    // =========================================================

    @Test
    @DisplayName("Should get all machines")
    void shouldGetAllMachines() {

        List<Machine> machines = List.of(machine);

        when(machineRepository.findAll())
                .thenReturn(machines);

        List<Machine> result = machineService.getAll();

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("CNC Machine 01", result.get(0).getName());

        verify(machineRepository, times(1))
                .findAll();
    }

    @Test
    @DisplayName("Should get all machines with pagination")
    void shouldGetAllMachinesWithPagination() {

        Pageable pageable = PageRequest.of(0, 10);

        Page<Machine> page =
                new PageImpl<>(List.of(machine));

        when(machineRepository.findAll(pageable))
                .thenReturn(page);

        Page<Machine> result =
                machineService.getAll(pageable);

        assertNotNull(result);
        assertEquals(1, result.getContent().size());

        verify(machineRepository, times(1))
                .findAll(pageable);
    }

    // =========================================================
    // GET BY ID
    // =========================================================

    @Test
    @DisplayName("Should get machine by id")
    void shouldGetMachineById() {

        when(machineRepository.findById(1L))
                .thenReturn(Optional.of(machine));

        Machine result =
                machineService.getById(1L);

        assertNotNull(result);
        assertEquals("CNC Machine 01", result.getName());

        verify(machineRepository, times(1))
                .findById(1L);
    }

    @Test
    @DisplayName("Should throw exception when machine does not exist")
    void shouldThrowExceptionWhenMachineDoesNotExist() {

        when(machineRepository.findById(1L))
                .thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> machineService.getById(1L)
        );

        verify(machineRepository, times(1))
                .findById(1L);
    }

    // =========================================================
    // GET BY PLANT
    // =========================================================

    @Test
    @DisplayName("Should get machines by plant")
    void shouldGetMachinesByPlant() {

        when(plantRepository.existsById(2L))
                .thenReturn(true);

        when(machineRepository.findByPlantId(2L))
                .thenReturn(List.of(machine));

        List<Machine> result =
                machineService.getByPlant(2L);

        assertNotNull(result);
        assertEquals(1, result.size());

        verify(plantRepository, times(1))
                .existsById(2L);

        verify(machineRepository, times(1))
                .findByPlantId(2L);
    }

    @Test
    @DisplayName("Should get machines by plant with pagination")
    void shouldGetMachinesByPlantWithPagination() {

        Pageable pageable = PageRequest.of(0, 10);

        Page<Machine> page =
                new PageImpl<>(List.of(machine));

        when(plantRepository.existsById(2L))
                .thenReturn(true);

        when(machineRepository.findByPlantId(2L, pageable))
                .thenReturn(page);

        Page<Machine> result =
                machineService.getByPlant(2L, pageable);

        assertNotNull(result);
        assertEquals(1, result.getContent().size());

        verify(machineRepository, times(1))
                .findByPlantId(2L, pageable);
    }

    @Test
    @DisplayName("Should throw exception when plant does not exist")
    void shouldThrowExceptionWhenPlantDoesNotExist() {

        when(plantRepository.existsById(2L))
                .thenReturn(false);

        assertThrows(
                ResourceNotFoundException.class,
                () -> machineService.getByPlant(2L)
        );

        verify(machineRepository, never())
                .findByPlantId(2L);
    }

    // =========================================================
    // GET BY STATUS
    // =========================================================

    @Test
    @DisplayName("Should get machines by status")
    void shouldGetMachinesByStatus() {

        when(machineRepository.findByStatusIgnoreCase("RUNNING"))
                .thenReturn(List.of(machine));

        List<Machine> result =
                machineService.getByStatus("RUNNING");

        assertNotNull(result);
        assertEquals(1, result.size());

        verify(domainValidationService, times(1))
                .validateMachineStatus("RUNNING");

        verify(machineRepository, times(1))
                .findByStatusIgnoreCase("RUNNING");
    }

    @Test
    @DisplayName("Should get machines by status with pagination")
    void shouldGetMachinesByStatusWithPagination() {

        Pageable pageable = PageRequest.of(0, 10);

        Page<Machine> page =
                new PageImpl<>(List.of(machine));

        when(machineRepository.findByStatusIgnoreCase(
                "RUNNING",
                pageable))
                .thenReturn(page);

        Page<Machine> result =
                machineService.getByStatus(
                        "RUNNING",
                        pageable
                );

        assertNotNull(result);
        assertEquals(1, result.getContent().size());

        verify(domainValidationService, times(1))
                .validateMachineStatus("RUNNING");

        verify(machineRepository, times(1))
                .findByStatusIgnoreCase(
                        "RUNNING",
                        pageable
                );
    }

    // =========================================================
    // GET BY PLANT AND STATUS
    // =========================================================

    @Test
    @DisplayName("Should get machines by plant and status")
    void shouldGetMachinesByPlantAndStatus() {

        when(plantRepository.existsById(2L))
                .thenReturn(true);

        when(machineRepository.findByPlantIdAndStatusIgnoreCase(
                2L,
                "RUNNING"))
                .thenReturn(List.of(machine));

        List<Machine> result =
                machineService.getByPlantAndStatus(
                        2L,
                        "RUNNING"
                );

        assertNotNull(result);
        assertEquals(1, result.size());

        verify(domainValidationService, times(1))
                .validateMachineStatus("RUNNING");

        verify(machineRepository, times(1))
                .findByPlantIdAndStatusIgnoreCase(
                        2L,
                        "RUNNING"
                );
    }

    @Test
    @DisplayName("Should get machines by plant and status with pagination")
    void shouldGetMachinesByPlantAndStatusWithPagination() {

        Pageable pageable = PageRequest.of(0, 10);

        Page<Machine> page =
                new PageImpl<>(List.of(machine));

        when(plantRepository.existsById(2L))
                .thenReturn(true);

        when(machineRepository.findByPlantIdAndStatusIgnoreCase(
                2L,
                "RUNNING",
                pageable))
                .thenReturn(page);

        Page<Machine> result =
                machineService.getByPlantAndStatus(
                        2L,
                        "RUNNING",
                        pageable
                );

        assertNotNull(result);
        assertEquals(1, result.getContent().size());

        verify(machineRepository, times(1))
                .findByPlantIdAndStatusIgnoreCase(
                        2L,
                        "RUNNING",
                        pageable
                );
    }

    // =========================================================
    // SEARCH BY NAME
    // =========================================================

    @Test
    @DisplayName("Should search machines by name")
    void shouldSearchMachinesByName() {

        when(machineRepository
                .findByNameContainingIgnoreCase("CNC"))
                .thenReturn(List.of(machine));

        List<Machine> result =
                machineService.searchByName("CNC");

        assertNotNull(result);
        assertEquals(1, result.size());

        verify(machineRepository, times(1))
                .findByNameContainingIgnoreCase("CNC");
    }

    @Test
    @DisplayName("Should search machines by name with pagination")
    void shouldSearchMachinesByNameWithPagination() {

        Pageable pageable = PageRequest.of(0, 10);

        Page<Machine> page =
                new PageImpl<>(List.of(machine));

        when(machineRepository
                .findByNameContainingIgnoreCase(
                        "CNC",
                        pageable))
                .thenReturn(page);

        Page<Machine> result =
                machineService.searchByName(
                        "CNC",
                        pageable
                );

        assertNotNull(result);
        assertEquals(1, result.getContent().size());

        verify(machineRepository, times(1))
                .findByNameContainingIgnoreCase(
                        "CNC",
                        pageable
                );
    }

    // =========================================================
    // UPDATE
    // =========================================================

    @Test
    @DisplayName("Should update machine successfully")
    void shouldUpdateMachineSuccessfully() {

        when(machineRepository.findById(1L))
                .thenReturn(Optional.of(machine));

        when(plantRepository.findById(2L))
                .thenReturn(Optional.of(plant));

        when(machineRepository.save(any(Machine.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        request.setName("Updated CNC Machine");
        request.setType("Advanced CNC");
        request.setStatus("idle");

        Machine result =
                machineService.update(
                        1L,
                        request
                );

        assertNotNull(result);
        assertEquals(
                "Updated CNC Machine",
                result.getName()
        );
        assertEquals(
                "Advanced CNC",
                result.getType()
        );
        assertEquals(
                "IDLE",
                result.getStatus()
        );
        assertEquals(
                plant,
                result.getPlant()
        );

        verify(machineRepository, times(1))
                .findById(1L);

        verify(plantRepository, times(1))
                .findById(2L);

        verify(domainValidationService, times(1))
                .validateMachineStatus("idle");

        verify(machineRepository, times(1))
                .save(any(Machine.class));
    }

    @Test
    @DisplayName("Should throw exception when updating non-existing machine")
    void shouldThrowExceptionWhenUpdatingNonExistingMachine() {

        when(machineRepository.findById(1L))
                .thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> machineService.update(
                        1L,
                        request
                )
        );

        verify(machineRepository, never())
                .save(any(Machine.class));
    }

    @Test
    @DisplayName("Should throw exception when update plant does not exist")
    void shouldThrowExceptionWhenUpdatePlantDoesNotExist() {

        when(machineRepository.findById(1L))
                .thenReturn(Optional.of(machine));

        when(plantRepository.findById(2L))
                .thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> machineService.update(
                        1L,
                        request
                )
        );

        verify(machineRepository, never())
                .save(any(Machine.class));

        verify(domainValidationService, never())
                .validateMachineStatus(any());
    }

    // =========================================================
    // DELETE
    // =========================================================

    @Test
    @DisplayName("Should delete machine successfully")
    void shouldDeleteMachineSuccessfully() {

        when(machineRepository.findById(1L))
                .thenReturn(Optional.of(machine));

        machineService.delete(1L);

        verify(machineRepository, times(1))
                .findById(1L);

        verify(machineRepository, times(1))
                .delete(machine);
    }

    @Test
    @DisplayName("Should throw exception when deleting non-existing machine")
    void shouldThrowExceptionWhenDeletingNonExistingMachine() {

        when(machineRepository.findById(1L))
                .thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> machineService.delete(1L)
        );

        verify(machineRepository, never())
                .delete(any(Machine.class));
    }

    // =========================================================
    // INVALID STATUS
    // =========================================================

    @Test
    @DisplayName("Should throw business validation exception for invalid status")
    void shouldThrowBusinessValidationExceptionForInvalidStatus() {

        request.setStatus("INVALID");

        when(plantRepository.findById(2L))
                .thenReturn(Optional.of(plant));

        org.mockito.Mockito
                .doThrow(
                        new BusinessValidationException(
                                "Invalid machine status: INVALID"
                        )
                )
                .when(domainValidationService)
                .validateMachineStatus("INVALID");

        assertThrows(
                BusinessValidationException.class,
                () -> machineService.create(request)
        );

        verify(machineRepository, never())
                .save(any(Machine.class));
    }
}