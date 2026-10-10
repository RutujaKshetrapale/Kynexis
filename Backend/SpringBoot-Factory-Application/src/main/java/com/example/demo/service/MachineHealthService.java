package com.example.demo.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.config.MachineHealthProperties;
import com.example.demo.dto.MachineHealthResponse;
import com.example.demo.entity.Alert;
import com.example.demo.entity.Machine;
import com.example.demo.entity.Telemetry;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.model.HealthState;
import com.example.demo.repository.AlertRepository;
import com.example.demo.repository.MachineRepository;
import com.example.demo.repository.TelemetryRepository;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class MachineHealthService {

    private final MachineRepository machineRepository;
    private final TelemetryRepository telemetryRepository;
    private final AlertRepository alertRepository;
    private final MachineHealthProperties healthProperties;

    public MachineHealthService(
            MachineRepository machineRepository,
            TelemetryRepository telemetryRepository,
            AlertRepository alertRepository,
            MachineHealthProperties healthProperties) {
        this.machineRepository = machineRepository;
        this.telemetryRepository = telemetryRepository;
        this.alertRepository = alertRepository;
        this.healthProperties = healthProperties;
    }

    @Transactional(readOnly = true)
    public MachineHealthResponse getMachineHealth(Long machineId) {
        log.debug("Calculating machine health for machineId={}", machineId);

        Machine machine = machineRepository.findById(machineId)
                .orElseThrow(() -> {
                    log.warn("Failed to calculate health: machine not found machineId={}", machineId);
                    return new ResourceNotFoundException("MACHINE NOT FOUND: " + machineId);
                });

        Optional<Telemetry> latestTelemetryOpt = telemetryRepository.findTopByMachineIdOrderByTimestampDesc(machineId);
        List<Alert> unresolvedAlerts = alertRepository.findByMachineIdAndResolvedFalse(machineId);

        return buildHealthResponse(machine, latestTelemetryOpt.orElse(null), unresolvedAlerts);
    }

    @Transactional(readOnly = true)
    public Page<MachineHealthResponse> getBulkMachineHealth(Pageable pageable) {
        log.debug("Calculating bulk machine health page={} size={}", pageable.getPageNumber(), pageable.getPageSize());

        Page<Machine> machinePage = machineRepository.findAll(pageable);
        List<Machine> machines = machinePage.getContent();

        if (machines.isEmpty()) {
            return new PageImpl<>(List.of(), pageable, machinePage.getTotalElements());
        }

        List<Long> machineIds = machines.stream().map(Machine::getId).toList();

        // Batch fetch latest telemetry & unresolved alerts to eliminate N+1 queries
        List<Telemetry> latestTelemetries = telemetryRepository.findLatestTelemetryByMachineIds(machineIds);
        Map<Long, Telemetry> telemetryMap = latestTelemetries.stream()
                .filter(t -> t.getMachine() != null)
                .collect(Collectors.toMap(t -> t.getMachine().getId(), t -> t, (t1, t2) -> t1));

        List<Alert> unresolvedAlerts = alertRepository.findByMachineIdInAndResolvedFalse(machineIds);
        Map<Long, List<Alert>> alertMap = unresolvedAlerts.stream()
                .filter(a -> a.getMachine() != null)
                .collect(Collectors.groupingBy(a -> a.getMachine().getId()));

        List<MachineHealthResponse> healthResponses = machines.stream()
                .map(machine -> buildHealthResponse(
                        machine,
                        telemetryMap.get(machine.getId()),
                        alertMap.getOrDefault(machine.getId(), List.of())
                ))
                .toList();

        return new PageImpl<>(healthResponses, pageable, machinePage.getTotalElements());
    }

    public MachineHealthResponse buildHealthResponse(Machine machine, Telemetry telemetry, List<Alert> unresolvedAlerts) {
        MachineHealthResponse response = new MachineHealthResponse();
        response.setMachineId(machine.getId());
        response.setMachineName(machine.getName());
        response.setMachineType(machine.getType());
        response.setMachineStatus(machine.getStatus());
        response.setGeneratedAt(LocalDateTime.now());

        if (telemetry != null) {
            response.setLatestTelemetryTimestamp(telemetry.getTimestamp());
            response.setTemperature(telemetry.getTemperature());
            response.setVibration(telemetry.getVibration());
            response.setPressure(telemetry.getPressure());
            response.setRpm(telemetry.getRpm());
        }

        // Calculate severity counts
        long criticalCount = 0;
        long highCount = 0;
        long mediumCount = 0;
        long lowCount = 0;

        List<Alert> safeAlerts = unresolvedAlerts != null ? unresolvedAlerts : List.of();

        for (Alert alert : safeAlerts) {
            String severity = alert.getSeverity() != null ? alert.getSeverity().trim().toUpperCase() : "UNKNOWN";
            switch (severity) {
                case "CRITICAL" -> criticalCount++;
                case "HIGH" -> highCount++;
                case "MEDIUM" -> mediumCount++;
                case "LOW" -> lowCount++;
                default -> {}
            }
        }

        response.setTotalUnresolvedAlertCount(safeAlerts.size());
        response.setCriticalAlertCount(criticalCount);
        response.setHighAlertCount(highCount);
        response.setMediumAlertCount(mediumCount);
        response.setLowAlertCount(lowCount);

        Map<String, Long> severityCounts = new HashMap<>();
        severityCounts.put("CRITICAL", criticalCount);
        severityCounts.put("HIGH", highCount);
        severityCounts.put("MEDIUM", mediumCount);
        severityCounts.put("LOW", lowCount);
        response.setSeverityCounts(severityCounts);

        // Determine Health State & Contributing Reasons
        List<String> reasons = new ArrayList<>();
        HealthState calculatedState;

        boolean isAbnormalStatus = isAbnormalMachineStatus(machine.getStatus());

        if (criticalCount > 0) {
            calculatedState = HealthState.CRITICAL;
            for (Alert a : safeAlerts) {
                if ("CRITICAL".equalsIgnoreCase(a.getSeverity())) {
                    reasons.add("Unresolved CRITICAL alert: " + a.getMessage());
                }
            }
        } else if (highCount > 0 || mediumCount > 0 || isAbnormalStatus || (lowCount > 0 && healthProperties.isLowAlertCausesDegraded())) {
            calculatedState = HealthState.DEGRADED;

            if (highCount > 0 || mediumCount > 0) {
                for (Alert a : safeAlerts) {
                    String sev = a.getSeverity() != null ? a.getSeverity().toUpperCase() : "";
                    if ("HIGH".equals(sev) || "MEDIUM".equals(sev)) {
                        reasons.add("Unresolved " + sev + " alert: " + a.getMessage());
                    }
                }
            }

            if (isAbnormalStatus) {
                reasons.add("Machine is in abnormal operational status: " + machine.getStatus());
            }

            if (lowCount > 0 && healthProperties.isLowAlertCausesDegraded()) {
                reasons.add("Unresolved LOW severity alert causing degraded state per policy");
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

        response.setHealthState(calculatedState.name());
        response.setContributingReasons(reasons);

        return response;
    }

    private boolean isAbnormalMachineStatus(String status) {
        if (status == null) return false;
        String normalized = status.trim().toUpperCase();
        return "OFFLINE".equals(normalized) || "STOPPED".equals(normalized) || "MAINTENANCE".equals(normalized);
    }
}
