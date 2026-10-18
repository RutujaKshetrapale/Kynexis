package com.kynexis.gateway.dto;

import java.io.Serializable;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardSummaryResponse implements Serializable {
    private static final long serialVersionUID = 1L;

    private long totalPlants;
    private long totalMachines;
    private long activeMachines;
    private long totalSensors;
    private long unresolvedAlerts;
    private long totalProduction;
    private long rejectedProduction;
    private double totalEnergyConsumption;
}
