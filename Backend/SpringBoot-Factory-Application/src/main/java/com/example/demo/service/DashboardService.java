package com.example.demo.service;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import com.example.demo.config.CacheConfig;
import com.example.demo.dto.DashboardMachineStatusResponse;
import com.example.demo.dto.DashboardSummaryResponse;
import com.example.demo.repository.AlertRepository;
import com.example.demo.repository.EnergyRepository;
import com.example.demo.repository.MachineRepository;
import com.example.demo.repository.PlantRepository;
import com.example.demo.repository.ProductionRepository;
import com.example.demo.repository.SensorRepository;


@Service
public class DashboardService {

    private final PlantRepository plantRepository;
    private final MachineRepository machineRepository;
    private final SensorRepository sensorRepository;
    private final AlertRepository alertRepository;
    private final ProductionRepository productionRepository;
    private final EnergyRepository energyRepository;

    public DashboardService(
            PlantRepository plantRepository,
            MachineRepository machineRepository,
            SensorRepository sensorRepository,
            AlertRepository alertRepository,
            ProductionRepository productionRepository,
            EnergyRepository energyRepository) {

        this.plantRepository = plantRepository;
        this.machineRepository = machineRepository;
        this.sensorRepository = sensorRepository;
        this.alertRepository = alertRepository;
        this.productionRepository = productionRepository;
        this.energyRepository = energyRepository;
    }

    @Cacheable(value = CacheConfig.CACHE_DASHBOARD_SUMMARY, key = "'summary'")
    public DashboardSummaryResponse getSummary() {

        long totalPlants = plantRepository.count();

        long totalMachines = machineRepository.count();

        long activeMachines =
                machineRepository.countByStatusIgnoreCase("ACTIVE");

        long totalSensors = sensorRepository.count();

        long unresolvedAlerts = alertRepository.findAll()
                .stream()
                .filter(alert -> !alert.isResolved())
                .count();

        long totalProduction = productionRepository.findAll()
                .stream()
                .mapToLong(production ->
                        production.getQuantityProduced() != null
                                ? production.getQuantityProduced()
                                : 0L)
                .sum();

        long rejectedProduction = productionRepository.findAll()
                .stream()
                .mapToLong(production ->
                        production.getQuantityRejected() != null
                                ? production.getQuantityRejected()
                                : 0L)
                .sum();

        double totalEnergyConsumption = energyRepository.findAll()
                .stream()
                .mapToDouble(energy ->
                        energy.getEnergyConsumption() != null
                                ? energy.getEnergyConsumption()
                                : 0.0)
                .sum();

        return new DashboardSummaryResponse(
                totalPlants,
                totalMachines,
                activeMachines,
                totalSensors,
                unresolvedAlerts,
                totalProduction,
                rejectedProduction,
                totalEnergyConsumption
        );
    }

    @Cacheable(value = CacheConfig.CACHE_DASHBOARD_MACHINE_STATUS, key = "'machine-status'")
    public DashboardMachineStatusResponse getMachineStatus() {

        long active =
                machineRepository.countByStatusIgnoreCase("ACTIVE");

        long inactive =
                machineRepository.countByStatusIgnoreCase("INACTIVE");

        long maintenance =
                machineRepository.countByStatusIgnoreCase("MAINTENANCE");

        return new DashboardMachineStatusResponse(
                active,
                inactive,
                maintenance
        );
    }
}
