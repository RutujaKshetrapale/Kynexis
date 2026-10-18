package com.kynexis.gateway.controller;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import com.kynexis.gateway.config.GatewayProperties;
import com.kynexis.gateway.dto.DashboardMachineStatusResponse;
import com.kynexis.gateway.dto.DashboardSummaryResponse;

class DashboardAggregationControllerTest {

    private GatewayProperties properties;
    private DashboardAggregationController controller;

    @BeforeEach
    void setUp() {
        properties = new GatewayProperties();
        properties.getPlantService().setUrl("http://localhost:8082");
        properties.getMachineService().setUrl("http://localhost:8088");
        properties.getSensorService().setUrl("http://localhost:8089");
        properties.getAlertService().setUrl("http://localhost:8084");
        properties.getProductionService().setUrl("http://localhost:8086");
        properties.getEnergyService().setUrl("http://localhost:8087");

        controller = new DashboardAggregationController(properties, "test-secret");
    }

    @Test
    @DisplayName("Dashboard summary handles unreachable downstream services gracefully with default zero values")
    void testGetSummaryGracefulFallback() {
        ResponseEntity<DashboardSummaryResponse> response = controller.getSummary();

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        DashboardSummaryResponse body = response.getBody();
        assertThat(body.getTotalPlants()).isZero();
        assertThat(body.getTotalMachines()).isZero();
        assertThat(body.getActiveMachines()).isZero();
        assertThat(body.getTotalSensors()).isZero();
        assertThat(body.getUnresolvedAlerts()).isZero();
        assertThat(body.getTotalProduction()).isZero();
        assertThat(body.getRejectedProduction()).isZero();
        assertThat(body.getTotalEnergyConsumption()).isEqualTo(0.0);
    }

    @Test
    @DisplayName("Dashboard machine status handles unreachable machine-service gracefully with default zero counts")
    void testGetMachineStatusGracefulFallback() {
        ResponseEntity<DashboardMachineStatusResponse> response = controller.getMachineStatus();

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        DashboardMachineStatusResponse body = response.getBody();
        assertThat(body.getActive()).isZero();
        assertThat(body.getInactive()).isZero();
        assertThat(body.getMaintenance()).isZero();
    }
}
