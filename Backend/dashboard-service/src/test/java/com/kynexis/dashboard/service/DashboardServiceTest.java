package com.kynexis.dashboard.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.kynexis.dashboard.client.AlertClient;
import com.kynexis.dashboard.client.PlantMachineClient;
import com.kynexis.dashboard.client.ProductionEnergyClient;
import com.kynexis.dashboard.client.ProductionEnergyClient.EnergyMetrics;
import com.kynexis.dashboard.client.ProductionEnergyClient.ProductionMetrics;
import com.kynexis.dashboard.dto.DashboardMachineStatusResponse;
import com.kynexis.dashboard.dto.DashboardSummaryResponse;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock
    private PlantMachineClient plantMachineClient;

    @Mock
    private AlertClient alertClient;

    @Mock
    private ProductionEnergyClient productionEnergyClient;

    private DashboardService dashboardService;

    @BeforeEach
    void setUp() {
        dashboardService = new DashboardService(plantMachineClient, alertClient, productionEnergyClient);
    }

    @Test
    @DisplayName("Dashboard summary correctly aggregates metrics from peer microservices")
    void testGetSummaryAggregation() {
        when(plantMachineClient.getPlantCount()).thenReturn(3L);
        when(plantMachineClient.getTotalMachineCount()).thenReturn(25L);
        when(plantMachineClient.getMachineCountByStatus("ACTIVE")).thenReturn(18L);
        when(plantMachineClient.getTotalSensorCount()).thenReturn(100L);
        when(alertClient.getUnresolvedAlertCount()).thenReturn(4L);
        when(productionEnergyClient.getProductionMetrics()).thenReturn(new ProductionMetrics(50000L, 1200L));
        when(productionEnergyClient.getEnergyMetrics()).thenReturn(new EnergyMetrics(9825.4));

        DashboardSummaryResponse summary = dashboardService.getSummary();

        assertThat(summary).isNotNull();
        assertThat(summary.getTotalPlants()).isEqualTo(3L);
        assertThat(summary.getTotalMachines()).isEqualTo(25L);
        assertThat(summary.getActiveMachines()).isEqualTo(18L);
        assertThat(summary.getTotalSensors()).isEqualTo(100L);
        assertThat(summary.getUnresolvedAlerts()).isEqualTo(4L);
        assertThat(summary.getTotalProduction()).isEqualTo(50000L);
        assertThat(summary.getRejectedProduction()).isEqualTo(1200L);
        assertThat(summary.getTotalEnergyConsumption()).isEqualTo(9825.4);
    }

    @Test
    @DisplayName("Dashboard machine status aggregates status counts correctly")
    void testGetMachineStatus() {
        when(plantMachineClient.getMachineCountByStatus("ACTIVE")).thenReturn(20L);
        when(plantMachineClient.getMachineCountByStatus("INACTIVE")).thenReturn(3L);
        when(plantMachineClient.getMachineCountByStatus("MAINTENANCE")).thenReturn(2L);

        DashboardMachineStatusResponse response = dashboardService.getMachineStatus();

        assertThat(response).isNotNull();
        assertThat(response.getActive()).isEqualTo(20L);
        assertThat(response.getInactive()).isEqualTo(3L);
        assertThat(response.getMaintenance()).isEqualTo(2L);
    }
}
