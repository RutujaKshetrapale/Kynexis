package com.example.demo.architecture;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.example.demo.architecture.contract.MachineQueryContract;
import com.example.demo.architecture.contract.dto.MachineSummaryDTO;
import com.example.demo.entity.Machine;
import com.example.demo.entity.Plant;
import com.example.demo.repository.MachineRepository;
import com.example.demo.repository.PlantRepository;
import com.example.demo.service.DomainValidationService;
import com.example.demo.service.MachineService;
import com.example.demo.service.WebSocketEventPublisherService;
import com.example.demo.service.alert.AlertEngineService;

@ExtendWith(MockitoExtension.class)
class MachineQueryContractTest {

    @Mock
    private MachineRepository machineRepository;

    @Mock
    private PlantRepository plantRepository;

    @Mock
    private DomainValidationService domainValidationService;

    @Mock
    private WebSocketEventPublisherService webSocketEventPublisherService;

    @Mock
    private AlertEngineService alertEngineService;

    private MachineQueryContract machineQueryContract;

    @BeforeEach
    void setUp() {
        MachineService machineService = new MachineService(
                machineRepository,
                plantRepository,
                domainValidationService,
                webSocketEventPublisherService,
                alertEngineService
        );
        this.machineQueryContract = machineService;
    }

    @Test
    @DisplayName("Should verify machine exists by ID via contract")
    void shouldVerifyMachineExists() {
        when(machineRepository.existsById(10L)).thenReturn(true);
        when(machineRepository.existsById(99L)).thenReturn(false);

        assertTrue(machineQueryContract.existsById(10L));
        assertFalse(machineQueryContract.existsById(99L));

        verify(machineRepository).existsById(10L);
        verify(machineRepository).existsById(99L);
    }

    @Test
    @DisplayName("Should return false for null ID without hitting repository")
    void shouldReturnFalseForNullId() {
        boolean exists = machineQueryContract.existsById(null);
        assertFalse(exists);
        verifyNoInteractions(machineRepository);
    }

    @Test
    @DisplayName("Should retrieve MachineSummaryDTO for existing machine via contract")
    void shouldFindSummaryById() {
        Plant plant = new Plant();
        plant.setId(2L);
        plant.setName("Stuttgart Plant");

        Machine machine = new Machine();
        setField(machine, "id", 10L);
        machine.setName("CNC Milling Station 01");
        machine.setType("CNC");
        machine.setStatus("ACTIVE");
        machine.setPlant(plant);

        when(machineRepository.findById(10L)).thenReturn(Optional.of(machine));

        Optional<MachineSummaryDTO> summaryOpt = machineQueryContract.findSummaryById(10L);

        assertTrue(summaryOpt.isPresent());
        MachineSummaryDTO summary = summaryOpt.get();
        assertEquals(10L, summary.getId());
        assertEquals("CNC Milling Station 01", summary.getName());
        assertEquals("CNC", summary.getType());
        assertEquals("ACTIVE", summary.getStatus());
        assertEquals(2L, summary.getPlantId());
    }

    private void setField(Object target, String fieldName, Object value) {
        try {
            java.lang.reflect.Field field = target.getClass().getDeclaredField(fieldName);
            field.setAccessible(true);
            field.set(target, value);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    @DisplayName("Should return empty Optional when machine does not exist")
    void shouldReturnEmptyForNonExistentMachine() {
        when(machineRepository.findById(99L)).thenReturn(Optional.empty());

        Optional<MachineSummaryDTO> summaryOpt = machineQueryContract.findSummaryById(99L);

        assertTrue(summaryOpt.isEmpty());
        verify(machineRepository).findById(99L);
    }

    @Test
    @DisplayName("Should return empty Optional for null ID without hitting repository")
    void shouldReturnEmptyForNullId() {
        Optional<MachineSummaryDTO> summaryOpt = machineQueryContract.findSummaryById(null);

        assertTrue(summaryOpt.isEmpty());
        verifyNoInteractions(machineRepository);
    }
}
