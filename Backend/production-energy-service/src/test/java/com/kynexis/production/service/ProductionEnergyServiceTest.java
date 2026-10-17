package com.kynexis.production.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import com.kynexis.common.exception.ResourceNotFoundException;
import com.kynexis.production.client.MachineServiceClient;
import com.kynexis.production.dto.*;
import com.kynexis.production.entity.Energy;
import com.kynexis.production.entity.Production;
import com.kynexis.production.repository.EnergyRepository;
import com.kynexis.production.repository.ProductionRepository;

@ExtendWith(MockitoExtension.class)
class ProductionEnergyServiceTest {

    @Mock
    private ProductionRepository productionRepository;

    @Mock
    private EnergyRepository energyRepository;

    @Mock
    private MachineServiceClient machineServiceClient;

    private ProductionService productionService;
    private EnergyService energyService;

    @BeforeEach
    void setUp() {
        productionService = new ProductionService(productionRepository, machineServiceClient);
        energyService = new EnergyService(energyRepository, machineServiceClient);
    }

    @Test
    @DisplayName("Create production record succeeds when machine exists")
    void testCreateProductionSuccess() {
        when(machineServiceClient.machineExists(1L)).thenReturn(true);

        ProductionRequest request = ProductionRequest.builder()
                .machineId(1L)
                .productName("Gear-X")
                .quantityProduced(500)
                .quantityRejected(10)
                .productionStart(LocalDateTime.now().minusHours(8))
                .productionEnd(LocalDateTime.now())
                .status("COMPLETED")
                .build();

        Production saved = Production.builder()
                .id(1L)
                .machineId(1L)
                .productName("Gear-X")
                .quantityProduced(500)
                .quantityRejected(10)
                .productionStart(request.getProductionStart())
                .productionEnd(request.getProductionEnd())
                .status("COMPLETED")
                .build();

        when(productionRepository.save(any(Production.class))).thenReturn(saved);

        ProductionDTO dto = productionService.create(request);

        assertThat(dto).isNotNull();
        assertThat(dto.getId()).isEqualTo(1L);
        assertThat(dto.getProductName()).isEqualTo("Gear-X");
        assertThat(dto.getQuantityProduced()).isEqualTo(500);
        verify(productionRepository).save(any(Production.class));
    }

    @Test
    @DisplayName("Create production fails when machine does not exist")
    void testCreateProductionMachineNotFound() {
        when(machineServiceClient.machineExists(999L)).thenReturn(false);

        ProductionRequest request = ProductionRequest.builder()
                .machineId(999L)
                .productName("Widget-Y")
                .quantityProduced(100)
                .quantityRejected(0)
                .productionStart(LocalDateTime.now())
                .status("IN_PROGRESS")
                .build();

        assertThatThrownBy(() -> productionService.create(request))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("MACHINE NOT FOUND");
    }

    @Test
    @DisplayName("Get all production paginated")
    void testGetAllProductionPaginated() {
        Production p1 = Production.builder().id(1L).machineId(1L).productName("A").quantityProduced(10).quantityRejected(0).build();
        Production p2 = Production.builder().id(2L).machineId(2L).productName("B").quantityProduced(20).quantityRejected(1).build();

        Page<Production> page = new PageImpl<>(List.of(p1, p2), PageRequest.of(0, 10), 2);
        when(productionRepository.findAll(any(PageRequest.class))).thenReturn(page);

        Page<ProductionDTO> result = productionService.getAll(PageRequest.of(0, 10));

        assertThat(result.getContent()).hasSize(2);
        assertThat(result.getContent().get(0).getProductName()).isEqualTo("A");
    }

    @Test
    @DisplayName("Production metrics summary aggregates totals correctly")
    void testProductionMetricsSummary() {
        when(productionRepository.getTotalQuantityProduced()).thenReturn(15000L);
        when(productionRepository.getTotalQuantityRejected()).thenReturn(350L);

        ProductionMetricsDTO metrics = productionService.getMetricsSummary();

        assertThat(metrics.getTotalProduction()).isEqualTo(15000L);
        assertThat(metrics.getRejectedProduction()).isEqualTo(350L);
    }

    @Test
    @DisplayName("Create energy record succeeds when machine exists")
    void testCreateEnergySuccess() {
        when(machineServiceClient.machineExists(1L)).thenReturn(true);

        EnergyRequest request = EnergyRequest.builder()
                .machineId(1L)
                .energyConsumption(45.5)
                .recordedAt(LocalDateTime.now())
                .build();

        Energy saved = Energy.builder()
                .id(1L)
                .machineId(1L)
                .energyConsumption(45.5)
                .recordedAt(request.getRecordedAt())
                .build();

        when(energyRepository.save(any(Energy.class))).thenReturn(saved);

        EnergyDTO dto = energyService.create(request);

        assertThat(dto).isNotNull();
        assertThat(dto.getId()).isEqualTo(1L);
        assertThat(dto.getEnergyConsumption()).isEqualTo(45.5);
        verify(energyRepository).save(any(Energy.class));
    }

    @Test
    @DisplayName("Energy metrics summary aggregates total consumption correctly")
    void testEnergyMetricsSummary() {
        when(energyRepository.getTotalEnergyConsumption()).thenReturn(12450.75);

        EnergyMetricsDTO metrics = energyService.getMetricsSummary();

        assertThat(metrics.getTotalEnergyConsumption()).isEqualTo(12450.75);
    }
}
