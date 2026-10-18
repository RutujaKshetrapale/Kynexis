package com.kynexis.machine.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.kynexis.machine.client.PlantServiceClient;
import com.kynexis.machine.common.dto.MachineSummaryDTO;
import com.kynexis.machine.common.exception.ResourceNotFoundException;
import com.kynexis.machine.dto.MachineDTO;
import com.kynexis.machine.dto.MachineRequest;
import com.kynexis.machine.entity.Machine;
import com.kynexis.machine.repository.MachineRepository;

@ExtendWith(MockitoExtension.class)
class MachineServiceTest {

    @Mock
    private MachineRepository machineRepository;

    @Mock
    private PlantServiceClient plantServiceClient;

    @Mock
    private DomainValidationService domainValidationService;

    @InjectMocks
    private MachineService machineService;

    private Machine machine;
    private MachineRequest machineRequest;

    @BeforeEach
    void setUp() {
        machine = Machine.builder()
                .id(10L)
                .name("CNC-01")
                .type("Milling")
                .status("RUNNING")
                .plantId(1L)
                .build();

        machineRequest = MachineRequest.builder()
                .name("CNC-01")
                .type("Milling")
                .status("RUNNING")
                .plantId(1L)
                .build();
    }

    @Test
    @DisplayName("Create machine - Success")
    void testCreateMachineSuccess() {
        when(plantServiceClient.plantExists(1L)).thenReturn(true);
        when(machineRepository.save(any(Machine.class))).thenReturn(machine);

        MachineDTO result = machineService.create(machineRequest);

        assertNotNull(result);
        assertEquals(10L, result.getId());
        assertEquals("CNC-01", result.getName());
        assertEquals("RUNNING", result.getStatus());
        assertEquals(1L, result.getPlantId());
        assertNotNull(result.getPlant());
        assertEquals(1L, result.getPlant().getId());
        verify(domainValidationService).validateMachineStatus("RUNNING");
    }

    @Test
    @DisplayName("Create machine - Plant not found throws ResourceNotFoundException")
    void testCreateMachinePlantNotFound() {
        when(plantServiceClient.plantExists(1L)).thenReturn(false);

        assertThrows(ResourceNotFoundException.class, () -> machineService.create(machineRequest));
        verify(machineRepository, never()).save(any());
    }

    @Test
    @DisplayName("Get summary by ID - Returns populated MachineSummaryDTO")
    void testFindSummaryById() {
        when(machineRepository.findById(10L)).thenReturn(Optional.of(machine));

        Optional<MachineSummaryDTO> summary = machineService.findSummaryById(10L);

        assertTrue(summary.isPresent());
        assertEquals(10L, summary.get().getId());
        assertEquals("CNC-01", summary.get().getName());
        assertEquals(1L, summary.get().getPlantId());
    }

    @Test
    @DisplayName("Exists by ID - Returns true when exists")
    void testExistsById() {
        when(machineRepository.existsById(10L)).thenReturn(true);
        assertTrue(machineService.existsById(10L));
    }
}
