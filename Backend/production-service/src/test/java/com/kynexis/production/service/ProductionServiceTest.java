package com.kynexis.production.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.kynexis.production.client.MachineServiceClient;
import com.kynexis.production.common.exception.ResourceNotFoundException;
import com.kynexis.production.dto.ProductionDTO;
import com.kynexis.production.dto.ProductionMetricsDTO;
import com.kynexis.production.dto.ProductionRequest;
import com.kynexis.production.entity.Production;
import com.kynexis.production.repository.ProductionRepository;

@ExtendWith(MockitoExtension.class)
class ProductionServiceTest {

    @Mock
    private ProductionRepository productionRepository;

    @Mock
    private MachineServiceClient machineServiceClient;

    private ProductionService productionService;

    @BeforeEach
    void setUp() {
        productionService = new ProductionService(productionRepository, machineServiceClient);
    }

    @Test
    void create_Success() {
        ProductionRequest request = ProductionRequest.builder()
                .machineId(1L)
                .productName("Gear A")
                .quantityProduced(100)
                .quantityRejected(2)
                .productionStart(LocalDateTime.now().minusHours(2))
                .status("COMPLETED")
                .build();

        when(machineServiceClient.machineExists(1L)).thenReturn(true);

        Production saved = Production.builder()
                .id(10L)
                .machineId(1L)
                .productName("Gear A")
                .quantityProduced(100)
                .quantityRejected(2)
                .productionStart(request.getProductionStart())
                .status("COMPLETED")
                .build();

        when(productionRepository.save(any(Production.class))).thenReturn(saved);

        ProductionDTO result = productionService.create(request);

        assertThat(result.getId()).isEqualTo(10L);
        assertThat(result.getProductName()).isEqualTo("Gear A");
        assertThat(result.getQuantityProduced()).isEqualTo(100);
    }

    @Test
    void create_ThrowsWhenMachineNotFound() {
        ProductionRequest request = ProductionRequest.builder()
                .machineId(999L)
                .productName("Gear A")
                .quantityProduced(100)
                .quantityRejected(2)
                .productionStart(LocalDateTime.now())
                .status("RUNNING")
                .build();

        when(machineServiceClient.machineExists(999L)).thenReturn(false);

        assertThatThrownBy(() -> productionService.create(request))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("MACHINE NOT FOUND");
    }

    @Test
    void getById_Success() {
        Production p = Production.builder()
                .id(1L)
                .machineId(2L)
                .productName("Shaft B")
                .quantityProduced(50)
                .quantityRejected(1)
                .productionStart(LocalDateTime.now())
                .status("COMPLETED")
                .build();

        when(productionRepository.findById(1L)).thenReturn(Optional.of(p));

        ProductionDTO result = productionService.getById(1L);

        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getProductName()).isEqualTo("Shaft B");
    }

    @Test
    void getById_NotFound() {
        when(productionRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> productionService.getById(999L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("PRODUCTION NOT FOUND");
    }

    @Test
    void getMetricsSummary_Success() {
        when(productionRepository.getTotalQuantityProduced()).thenReturn(5000L);
        when(productionRepository.getTotalQuantityRejected()).thenReturn(150L);

        ProductionMetricsDTO metrics = productionService.getMetricsSummary();

        assertThat(metrics.getTotalProduction()).isEqualTo(5000L);
        assertThat(metrics.getRejectedProduction()).isEqualTo(150L);
    }

    @Test
    void delete_Success() {
        Production p = Production.builder().id(1L).build();
        when(productionRepository.findById(1L)).thenReturn(Optional.of(p));

        productionService.delete(1L);

        verify(productionRepository).delete(p);
    }
}
