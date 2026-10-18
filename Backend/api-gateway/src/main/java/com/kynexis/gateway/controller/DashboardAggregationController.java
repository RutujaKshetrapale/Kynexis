package com.kynexis.gateway.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;

import com.kynexis.gateway.common.client.RestClientHelper;
import com.kynexis.gateway.config.GatewayProperties;
import com.kynexis.gateway.dto.DashboardMachineStatusResponse;
import com.kynexis.gateway.dto.DashboardSummaryResponse;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/api/dashboard")
public class DashboardAggregationController {

    private final GatewayProperties gatewayProperties;
    private final RestClient restClient;

    public DashboardAggregationController(
            GatewayProperties gatewayProperties,
            @Value("${kynexis.security.internal-secret:KynexisInternalServiceCommunicationSecretKey2026}") String internalSecret) {
        this.gatewayProperties = gatewayProperties;
        this.restClient = RestClientHelper.createClient(null, internalSecret);
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER', 'OPERATOR', 'MANAGER')")
    public ResponseEntity<DashboardSummaryResponse> getSummary() {
        log.debug("Aggregating dashboard summary metrics across 10 microservices");

        long totalPlants = fetchLong(gatewayProperties.getPlantService().getUrl() + "/api/plants/count");
        long totalMachines = fetchLong(gatewayProperties.getMachineService().getUrl() + "/api/machines/count");
        long activeMachines = fetchLong(gatewayProperties.getMachineService().getUrl() + "/api/machines/count/status/ACTIVE");
        long totalSensors = fetchLong(gatewayProperties.getSensorService().getUrl() + "/api/sensors/count");
        long unresolvedAlerts = fetchLong(gatewayProperties.getAlertService().getUrl() + "/api/alerts/count/unresolved");

        ProductionMetrics prodMetrics = fetchProductionMetrics(gatewayProperties.getProductionService().getUrl() + "/api/production/metrics/summary");
        EnergyMetrics energyMetrics = fetchEnergyMetrics(gatewayProperties.getEnergyService().getUrl() + "/api/energy/metrics/summary");

        DashboardSummaryResponse response = DashboardSummaryResponse.builder()
                .totalPlants(totalPlants)
                .totalMachines(totalMachines)
                .activeMachines(activeMachines)
                .totalSensors(totalSensors)
                .unresolvedAlerts(unresolvedAlerts)
                .totalProduction(prodMetrics.totalProduction())
                .rejectedProduction(prodMetrics.rejectedProduction())
                .totalEnergyConsumption(energyMetrics.totalEnergyConsumption())
                .build();

        return ResponseEntity.ok(response);
    }

    @GetMapping("/machine-status")
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER', 'OPERATOR', 'MANAGER')")
    public ResponseEntity<DashboardMachineStatusResponse> getMachineStatus() {
        log.debug("Aggregating dashboard machine status counts across machine-service");

        long active = fetchLong(gatewayProperties.getMachineService().getUrl() + "/api/machines/count/status/ACTIVE");
        long inactive = fetchLong(gatewayProperties.getMachineService().getUrl() + "/api/machines/count/status/INACTIVE");
        long maintenance = fetchLong(gatewayProperties.getMachineService().getUrl() + "/api/machines/count/status/MAINTENANCE");

        DashboardMachineStatusResponse response = DashboardMachineStatusResponse.builder()
                .active(active)
                .inactive(inactive)
                .maintenance(maintenance)
                .build();

        return ResponseEntity.ok(response);
    }

    private long fetchLong(String url) {
        try {
            Long val = restClient.get().uri(url).retrieve().body(Long.class);
            return val != null ? val : 0L;
        } catch (Exception ex) {
            log.warn("Failed to fetch count from url={}: {}", url, ex.getMessage());
            return 0L;
        }
    }

    private ProductionMetrics fetchProductionMetrics(String url) {
        try {
            var res = restClient.get().uri(url).retrieve().body(ProductionMetricsRecord.class);
            if (res != null) {
                return new ProductionMetrics(
                        res.totalProduction() != null ? res.totalProduction() : 0L,
                        res.rejectedProduction() != null ? res.rejectedProduction() : 0L
                );
            }
        } catch (Exception ex) {
            log.warn("Failed to fetch production metrics from url={}: {}", url, ex.getMessage());
        }
        return new ProductionMetrics(0L, 0L);
    }

    private EnergyMetrics fetchEnergyMetrics(String url) {
        try {
            var res = restClient.get().uri(url).retrieve().body(EnergyMetricsRecord.class);
            if (res != null && res.totalEnergyConsumption() != null) {
                return new EnergyMetrics(res.totalEnergyConsumption());
            }
        } catch (Exception ex) {
            log.warn("Failed to fetch energy metrics from url={}: {}", url, ex.getMessage());
        }
        return new EnergyMetrics(0.0);
    }

    public record ProductionMetrics(long totalProduction, long rejectedProduction) {}
    public record EnergyMetrics(double totalEnergyConsumption) {}
    public record ProductionMetricsRecord(Long totalProduction, Long rejectedProduction) {}
    public record EnergyMetricsRecord(Double totalEnergyConsumption) {}
}
