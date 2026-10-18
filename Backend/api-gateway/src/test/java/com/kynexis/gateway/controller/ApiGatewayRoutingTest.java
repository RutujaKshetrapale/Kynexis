package com.kynexis.gateway.controller;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.kynexis.gateway.config.GatewayProperties;

class ApiGatewayRoutingTest {

    private GatewayProperties properties;
    private GatewayRoutingController controller;

    @BeforeEach
    void setUp() {
        properties = new GatewayProperties();
        properties.getAuthenticationService().setUrl("http://localhost:8081");
        properties.getPlantService().setUrl("http://localhost:8082");
        properties.getMachineService().setUrl("http://localhost:8088");
        properties.getSensorService().setUrl("http://localhost:8089");
        properties.getTelemetryService().setUrl("http://localhost:8083");
        properties.getAlertService().setUrl("http://localhost:8084");
        properties.getMaintenanceService().setUrl("http://localhost:8085");
        properties.getProductionService().setUrl("http://localhost:8086");
        properties.getEnergyService().setUrl("http://localhost:8087");

        controller = new GatewayRoutingController(properties);
    }

    @Test
    @DisplayName("Gateway resolves /api/auth paths to authentication-service (port 8081)")
    void testAuthRouting() {
        String url = controller.resolveTargetServiceUrl("/api/auth/login");
        assertThat(url).isEqualTo("http://localhost:8081");
    }

    @Test
    @DisplayName("Gateway resolves /api/plants to plant-service (port 8082)")
    void testPlantRouting() {
        assertThat(controller.resolveTargetServiceUrl("/api/plants")).isEqualTo("http://localhost:8082");
        assertThat(controller.resolveTargetServiceUrl("/api/plants/1")).isEqualTo("http://localhost:8082");
    }

    @Test
    @DisplayName("Gateway resolves /api/machines to machine-service (port 8088)")
    void testMachineRouting() {
        assertThat(controller.resolveTargetServiceUrl("/api/machines")).isEqualTo("http://localhost:8088");
        assertThat(controller.resolveTargetServiceUrl("/api/machines/status/ACTIVE")).isEqualTo("http://localhost:8088");
    }

    @Test
    @DisplayName("Gateway resolves /api/sensors to sensor-service (port 8089)")
    void testSensorRouting() {
        assertThat(controller.resolveTargetServiceUrl("/api/sensors")).isEqualTo("http://localhost:8089");
        assertThat(controller.resolveTargetServiceUrl("/api/sensors/active")).isEqualTo("http://localhost:8089");
    }

    @Test
    @DisplayName("Gateway routes machine health and maintenance assessments to maintenance-service (port 8085)")
    void testSpecialMachineHealthRouting() {
        assertThat(controller.resolveTargetServiceUrl("/api/machines/1/health")).isEqualTo("http://localhost:8085");
        assertThat(controller.resolveTargetServiceUrl("/api/machines/health")).isEqualTo("http://localhost:8085");
        assertThat(controller.resolveTargetServiceUrl("/api/machines/5/maintenance-assessment")).isEqualTo("http://localhost:8085");
        assertThat(controller.resolveTargetServiceUrl("/api/machines/maintenance-assessments")).isEqualTo("http://localhost:8085");
    }

    @Test
    @DisplayName("Gateway resolves /api/telemetry to telemetry-service (port 8083)")
    void testTelemetryRouting() {
        assertThat(controller.resolveTargetServiceUrl("/api/telemetry/machine/1")).isEqualTo("http://localhost:8083");
    }

    @Test
    @DisplayName("Gateway resolves /api/alerts to alert-service (port 8084)")
    void testAlertRouting() {
        assertThat(controller.resolveTargetServiceUrl("/api/alerts/unresolved")).isEqualTo("http://localhost:8084");
    }

    @Test
    @DisplayName("Gateway resolves /api/maintenance to maintenance-service (port 8085)")
    void testMaintenanceRouting() {
        assertThat(controller.resolveTargetServiceUrl("/api/maintenance")).isEqualTo("http://localhost:8085");
        assertThat(controller.resolveTargetServiceUrl("/api/machine-health/1")).isEqualTo("http://localhost:8085");
    }

    @Test
    @DisplayName("Gateway resolves /api/production to production-service (port 8086)")
    void testProductionRouting() {
        assertThat(controller.resolveTargetServiceUrl("/api/production")).isEqualTo("http://localhost:8086");
        assertThat(controller.resolveTargetServiceUrl("/api/production/targets")).isEqualTo("http://localhost:8086");
    }

    @Test
    @DisplayName("Gateway resolves /api/energy to energy-service (port 8087)")
    void testEnergyRouting() {
        assertThat(controller.resolveTargetServiceUrl("/api/energy")).isEqualTo("http://localhost:8087");
        assertThat(controller.resolveTargetServiceUrl("/api/energy/efficiency")).isEqualTo("http://localhost:8087");
    }

    @Test
    @DisplayName("Gateway returns null for dashboard routes because they are handled by DashboardAggregationController")
    void testDashboardRouting() {
        assertThat(controller.resolveTargetServiceUrl("/api/dashboard/summary")).isNull();
    }

    @Test
    @DisplayName("Gateway returns null for unknown routes")
    void testUnknownRouting() {
        assertThat(controller.resolveTargetServiceUrl("/unknown/path")).isNull();
    }
}
