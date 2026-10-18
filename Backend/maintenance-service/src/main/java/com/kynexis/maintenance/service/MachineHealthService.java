package com.kynexis.maintenance.service;

import java.time.LocalDateTime;
import java.util.*;

import org.springframework.stereotype.Service;

import com.kynexis.maintenance.common.dto.MachineSummaryDTO;
import com.kynexis.maintenance.common.exception.ResourceNotFoundException;
import com.kynexis.maintenance.common.model.HealthState;
import com.kynexis.maintenance.client.AlertServiceClient;
import com.kynexis.maintenance.client.AlertServiceClient.AlertSnapshot;
import com.kynexis.maintenance.client.MachineServiceClient;
import com.kynexis.maintenance.client.TelemetryServiceClient;
import com.kynexis.maintenance.client.TelemetryServiceClient.TelemetrySnapshot;
import com.kynexis.maintenance.dto.MachineHealthResponse;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class MachineHealthService {

    private final MachineServiceClient machineServiceClient;
    private final TelemetryServiceClient telemetryServiceClient;
    private final AlertServiceClient alertServiceClient;

    public MachineHealthService(
            MachineServiceClient machineServiceClient,
            TelemetryServiceClient telemetryServiceClient,
            AlertServiceClient alertServiceClient) {
        this.machineServiceClient = machineServiceClient;
        this.telemetryServiceClient = telemetryServiceClient;
        this.alertServiceClient = alertServiceClient;
    }

    public MachineHealthResponse getMachineHealth(Long machineId) {
        log.debug("Calculating machine health for machineId={}", machineId);

        MachineSummaryDTO machine = machineServiceClient.getMachineSummary(machineId)
                .orElseThrow(() -> new ResourceNotFoundException("MACHINE NOT FOUND: " + machineId));

        Optional<TelemetrySnapshot> latestTelemetryOpt = telemetryServiceClient.getLatestTelemetry(machineId);
        List<AlertSnapshot> unresolvedAlerts = alertServiceClient.getUnresolvedAlerts(machineId);

        return buildHealthResponse(machine, latestTelemetryOpt.orElse(null), unresolvedAlerts);
    }

    public MachineHealthResponse buildHealthResponse(
            MachineSummaryDTO machine,
            TelemetrySnapshot telemetry,
            List<AlertSnapshot> unresolvedAlerts) {

        long criticalCount = 0;
        long highCount = 0;
        long mediumCount = 0;
        long lowCount = 0;

        List<AlertSnapshot> safeAlerts = unresolvedAlerts != null ? unresolvedAlerts : List.of();

        for (AlertSnapshot alert : safeAlerts) {
            String severity = alert.getSeverity() != null ? alert.getSeverity().trim().toUpperCase() : "UNKNOWN";
            switch (severity) {
                case "CRITICAL" -> criticalCount++;
                case "HIGH" -> highCount++;
                case "MEDIUM" -> mediumCount++;
                case "LOW" -> lowCount++;
                default -> {}
            }
        }

        Map<String, Long> severityCounts = new HashMap<>();
        severityCounts.put("CRITICAL", criticalCount);
        severityCounts.put("HIGH", highCount);
        severityCounts.put("MEDIUM", mediumCount);
        severityCounts.put("LOW", lowCount);

        List<String> reasons = new ArrayList<>();
        HealthState calculatedState;
        boolean isAbnormalStatus = isAbnormalMachineStatus(machine.getStatus());

        if (criticalCount > 0) {
            calculatedState = HealthState.CRITICAL;
            for (AlertSnapshot a : safeAlerts) {
                if ("CRITICAL".equalsIgnoreCase(a.getSeverity())) {
                    reasons.add("Unresolved CRITICAL alert: " + a.getMessage());
                }
            }
        } else if (highCount > 0 || mediumCount > 0 || isAbnormalStatus) {
            calculatedState = HealthState.DEGRADED;
            if (highCount > 0 || mediumCount > 0) {
                for (AlertSnapshot a : safeAlerts) {
                    String sev = a.getSeverity() != null ? a.getSeverity().toUpperCase() : "";
                    if ("HIGH".equals(sev) || "MEDIUM".equals(sev)) {
                        reasons.add("Unresolved " + sev + " alert: " + a.getMessage());
                    }
                }
            }
            if (isAbnormalStatus) {
                reasons.add("Machine is in abnormal operational status: " + machine.getStatus());
            }
        } else if (telemetry == null) {
            calculatedState = HealthState.UNKNOWN;
            reasons.add("No usable telemetry available for machine");
        } else {
            calculatedState = HealthState.HEALTHY;
            reasons.add("Machine is operating normally with valid telemetry and no active critical/degraded alerts");
        }

        if (lowCount > 0 && calculatedState != HealthState.DEGRADED && calculatedState != HealthState.CRITICAL) {
            reasons.add("Note: Machine has " + lowCount + " active LOW severity alert(s)");
        }

        MachineHealthResponse.MachineHealthResponseBuilder builder = MachineHealthResponse.builder()
                .machineId(machine.getId())
                .machineName(machine.getName())
                .machineType(machine.getType())
                .machineStatus(machine.getStatus())
                .healthState(calculatedState.name())
                .totalUnresolvedAlertCount(safeAlerts.size())
                .criticalAlertCount(criticalCount)
                .highAlertCount(highCount)
                .mediumAlertCount(mediumCount)
                .lowAlertCount(lowCount)
                .severityCounts(severityCounts)
                .contributingReasons(reasons)
                .generatedAt(LocalDateTime.now());

        if (telemetry != null) {
            builder.latestTelemetryTimestamp(telemetry.getTimestamp())
                    .temperature(telemetry.getTemperature())
                    .vibration(telemetry.getVibration())
                    .pressure(telemetry.getPressure())
                    .rpm(telemetry.getRpm());
        }

        return builder.build();
    }

    private boolean isAbnormalMachineStatus(String status) {
        if (status == null) return false;
        String normalized = status.trim().toUpperCase();
        return "OFFLINE".equals(normalized) || "STOPPED".equals(normalized) || "MAINTENANCE".equals(normalized);
    }
}
