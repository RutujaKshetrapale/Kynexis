package com.kynexis.dashboard.service;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import com.kynexis.dashboard.client.AlertClient;
import com.kynexis.dashboard.client.PlantMachineClient;
import com.kynexis.dashboard.client.ProductionEnergyClient;
import com.kynexis.dashboard.config.CacheConfig;
import com.kynexis.dashboard.dto.DashboardMachineStatusResponse;
import com.kynexis.dashboard.dto.DashboardSummaryResponse;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class DashboardService {

    private final PlantMachineClient plantMachineClient;
    private final AlertClient alertClient;
    private final ProductionEnergyClient productionEnergyClient;

    public DashboardService(
            PlantMachineClient plantMachineClient,
            AlertClient alertClient,
            ProductionEnergyClient productionEnergyClient) {
        this.plantMachineClient = plantMachineClient;
        this.alertClient = alertClient;
        this.productionEnergyClient = productionEnergyClient;
    }

    @Cacheable(value = CacheConfig.CACHE_DASHBOARD_SUMMARY, key = "'summary'")
    public DashboardSummaryResponse getSummary() {
        log.debug("Aggregating dashboard summary metrics across services");

        long totalPlants = plantMachineClient.getPlantCount();
        long totalMachines = plantMachineClient.getTotalMachineCount();
        long activeMachines = plantMachineClient.getMachineCountByStatus("ACTIVE");
        long totalSensors = plantMachineClient.getTotalSensorCount();
        long unresolvedAlerts = alertClient.getUnresolvedAlertCount();

        var prodMetrics = productionEnergyClient.getProductionMetrics();
        long totalProduction = prodMetrics.getTotalProduction() != null ? prodMetrics.getTotalProduction() : 0L;
        long rejectedProduction = prodMetrics.getRejectedProduction() != null ? prodMetrics.getRejectedProduction() : 0L;

        var energyMetrics = productionEnergyClient.getEnergyMetrics();
        double totalEnergyConsumption = energyMetrics.getTotalEnergyConsumption() != null
                ? energyMetrics.getTotalEnergyConsumption() : 0.0;

        return DashboardSummaryResponse.builder()
                .totalPlants(totalPlants)
                .totalMachines(totalMachines)
                .activeMachines(activeMachines)
                .totalSensors(totalSensors)
                .unresolvedAlerts(unresolvedAlerts)
                .totalProduction(totalProduction)
                .rejectedProduction(rejectedProduction)
                .totalEnergyConsumption(totalEnergyConsumption)
                .build();
    }

    @Cacheable(value = CacheConfig.CACHE_DASHBOARD_MACHINE_STATUS, key = "'machine-status'")
    public DashboardMachineStatusResponse getMachineStatus() {
        log.debug("Aggregating dashboard machine status counts across services");

        long active = plantMachineClient.getMachineCountByStatus("ACTIVE");
        long inactive = plantMachineClient.getMachineCountByStatus("INACTIVE");
        long maintenance = plantMachineClient.getMachineCountByStatus("MAINTENANCE");

        return DashboardMachineStatusResponse.builder()
                .active(active)
                .inactive(inactive)
                .maintenance(maintenance)
                .build();
    }

    @CacheEvict(value = CacheConfig.CACHE_DASHBOARD_SUMMARY, key = "'summary'")
    public void evictSummaryCache() {
        log.info("Evicted dashboard summary cache");
    }

    @CacheEvict(value = CacheConfig.CACHE_DASHBOARD_MACHINE_STATUS, key = "'machine-status'")
    public void evictMachineStatusCache() {
        log.info("Evicted dashboard machine status cache");
    }

    @CacheEvict(value = {CacheConfig.CACHE_DASHBOARD_SUMMARY, CacheConfig.CACHE_DASHBOARD_MACHINE_STATUS}, allEntries = true)
    public void evictAllDashboardCaches() {
        log.info("Evicted all dashboard caches");
    }
}
