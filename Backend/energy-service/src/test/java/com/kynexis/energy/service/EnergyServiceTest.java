package com.kynexis.energy.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.kynexis.energy.client.MachineServiceClient;
import com.kynexis.energy.common.exception.ResourceNotFoundException;
import com.kynexis.energy.dto.EnergyDTO;
import com.kynexis.energy.dto.EnergyMetricsDTO;
import com.kynexis.energy.dto.EnergyRequest;
import com.kynexis.energy.entity.Energy;
import com.kynexis.energy.repository.EnergyRepository;

@ExtendWith(MockitoExtension.class)
class EnergyServiceTest {

    @Mock
    private EnergyRepository energyRepository;

    @Mock
    private MachineServiceClient machineServiceClient;

    private EnergyService energyService;

    @BeforeEach
    void setUp() {
        energyService = new EnergyService(energyRepository, machineServiceClient);
    }

    @Test
    void create_Success() {
        EnergyRequest request = EnergyRequest.builder()
                .machineId(1L)
                .energyConsumption(45.5)
                .recordedAt(LocalDateTime.now())
                .build();

        when(machineServiceClient.machineExists(1L)).thenReturn(true);

        Energy saved = Energy.builder()
                .id(100L)
                .machineId(1L)
                .energyConsumption(45.5)
                .recordedAt(request.getRecordedAt())
                .build();

        when(energyRepository.save(any(Energy.class))).thenReturn(saved);

        EnergyDTO result = energyService.create(request);

        assertThat(result.getId()).isEqualTo(100L);
        assertThat(result.getEnergyConsumption()).isEqualTo(45.5);
    }

    @Test
    void create_ThrowsWhenMachineNotFound() {
        EnergyRequest request = EnergyRequest.builder()
                .machineId(999L)
                .energyConsumption(45.5)
                .build();

        when(machineServiceClient.machineExists(999L)).thenReturn(false);

        assertThatThrownBy(() -> energyService.create(request))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("MACHINE NOT FOUND");
    }

    @Test
    void getById_Success() {
        Energy energy = Energy.builder()
                .id(1L)
                .machineId(2L)
                .energyConsumption(88.0)
                .recordedAt(LocalDateTime.now())
                .build();

        when(energyRepository.findById(1L)).thenReturn(Optional.of(energy));

        EnergyDTO result = energyService.getById(1L);

        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getEnergyConsumption()).isEqualTo(88.0);
    }

    @Test
    void getById_NotFound() {
        when(energyRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> energyService.getById(999L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("ENERGY RECORD NOT FOUND");
    }

    @Test
    void getMetricsSummary_Success() {
        when(energyRepository.getTotalEnergyConsumption()).thenReturn(1250.5);

        EnergyMetricsDTO metrics = energyService.getMetricsSummary();

        assertThat(metrics.getTotalEnergyConsumption()).isEqualTo(1250.5);
    }

    @Test
    void delete_Success() {
        Energy energy = Energy.builder().id(1L).build();
        when(energyRepository.findById(1L)).thenReturn(Optional.of(energy));

        energyService.delete(1L);

        verify(energyRepository).delete(energy);
    }
}
