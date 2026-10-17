package com.kynexis.plantmachine.service;

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

import com.kynexis.common.dto.MachineSummaryDTO;
import com.kynexis.common.exception.ResourceNotFoundException;
import com.kynexis.plantmachine.dto.MachineDTO;
import com.kynexis.plantmachine.dto.MachineRequest;
import com.kynexis.plantmachine.entity.Machine;
import com.kynexis.plantmachine.entity.Plant;
import com.kynexis.plantmachine.repository.MachineRepository;
import com.kynexis.plantmachine.repository.PlantRepository;

@ExtendWith(MockitoExtension.class)
class MachineServiceTest {

    @Mock
    private MachineRepository machineRepository;

    @Mock
    private PlantRepository plantRepository;

    @Mock
    private DomainValidationService domainValidationService;

    @InjectMocks
    private MachineService machineService;

    private Plant plant;
    private Machine machine;
    private MachineRequest machineRequest;

    @BeforeEach
    void setUp() {
        plant = Plant.builder()
                .id(1L)
                .name("Austin Plant 1")
                .location("Austin, TX")
                .active(true)
                .build();

        machine = Machine.builder()
                .id(10L)
                .name("CNC-01")
                .type("Milling")
                .status("RUNNING")
                .plant(plant)
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
        when(plantRepository.findById(1L)).thenReturn(Optional.of(plant));
        when(machineRepository.save(any(Machine.class))).thenReturn(machine);

        MachineDTO result = machineService.create(machineRequest);

        assertNotNull(result);
        assertEquals(10L, result.getId());
        assertEquals("CNC-01", result.getName());
        assertEquals("RUNNING", result.getStatus());
        assertNotNull(result.getPlant());
        assertEquals(1L, result.getPlant().getId());
        verify(domainValidationService).validateMachineStatus("RUNNING");
    }

    @Test
    @DisplayName("Create machine - Plant not found throws ResourceNotFoundException")
    void testCreateMachinePlantNotFound() {
        when(plantRepository.findById(1L)).thenReturn(Optional.empty());

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
