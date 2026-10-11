package com.example.demo.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.config.PredictiveMaintenanceProperties;
import com.example.demo.dto.PredictiveMaintenanceResponse;
import com.example.demo.entity.Alert;
import com.example.demo.entity.Machine;
import com.example.demo.entity.Maintenance;
import com.example.demo.entity.Telemetry;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.model.DataSufficiency;
import com.example.demo.model.MaintenanceRiskCategory;
import com.example.demo.repository.AlertRepository;
import com.example.demo.repository.MachineRepository;
import com.example.demo.repository.MaintenanceRepository;
import com.example.demo.repository.TelemetryRepository;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class PredictiveMaintenanceService {

    private static final String DEFAULT_ADVISORY_NOTICE =
            "Advisory baseline assessment based on heuristic telemetry trend rules and active system alerts. " +
            "Not a confirmed failure prediction; does not replace qualified industrial inspection.";

    private final MachineRepository machineRepository;
    private final TelemetryRepository telemetryRepository;
    private final AlertRepository alertRepository;
    private final MaintenanceRepository maintenanceRepository;
    private final PredictiveMaintenanceProperties properties;

    public PredictiveMaintenanceService(
            MachineRepository machineRepository,
            TelemetryRepository telemetryRepository,
            AlertRepository alertRepository,
            MaintenanceRepository maintenanceRepository,
            PredictiveMaintenanceProperties properties) {
        this.machineRepository = machineRepository;
        this.telemetryRepository = telemetryRepository;
        this.alertRepository = alertRepository;
        this.maintenanceRepository = maintenanceRepository;
        this.properties = properties;
    }

    @Transactional(readOnly = true)
    public PredictiveMaintenanceResponse getMachineAssessment(Long machineId) {
        log.debug("Generating predictive maintenance assessment for machineId={}", machineId);

        Machine machine = machineRepository.findById(machineId)
                .orElseThrow(() -> {
                    log.warn("Machine not found for maintenance assessment machineId={}", machineId);
                    return new ResourceNotFoundException("MACHINE NOT FOUND: " + machineId);
                });

        // Bounded recent telemetry query with deterministic timestamp/id sorting
        Page<Telemetry> telemetryPage = telemetryRepository.findByMachineId(
                machineId,
                PageRequest.of(0, properties.getTrendReadingsLimit(), Sort.by(Sort.Order.desc("timestamp"), Sort.Order.desc("id")))
        );
        List<Telemetry> recentTelemetries = telemetryPage.getContent();

        // Deterministic latest telemetry selection with timestamp & id tie-breaker
        Optional<Telemetry> latestTelemetryOpt = telemetryRepository.findFirstByMachineIdOrderByTimestampDescIdDesc(machineId);

        List<Alert> unresolvedAlerts = alertRepository.findByMachineIdAndResolvedFalse(machineId);
        List<Maintenance> maintenanceRecords = maintenanceRepository.findByMachineId(machineId);

        return buildAssessment(
                machine,
                recentTelemetries,
                latestTelemetryOpt.orElse(null),
                unresolvedAlerts,
                maintenanceRecords,
                LocalDateTime.now()
        );
    }

    @Transactional(readOnly = true)
    public Page<PredictiveMaintenanceResponse> getBulkAssessments(Pageable pageable, String riskCategoryFilter) {
        log.debug("Generating bulk predictive maintenance assessments page={} size={} filter={}",
                pageable.getPageNumber(), pageable.getPageSize(), riskCategoryFilter);

        Page<Machine> machinePage = machineRepository.findAll(pageable);
        List<Machine> machines = machinePage.getContent();

        if (machines.isEmpty()) {
            return new PageImpl<>(List.of(), pageable, machinePage.getTotalElements());
        }

        List<Long> machineIds = machines.stream().map(Machine::getId).toList();

        // Batch queries to prevent N+1 queries across page records
        List<Telemetry> latestTelemetries = telemetryRepository.findLatestTelemetryByMachineIds(machineIds);
        Map<Long, Telemetry> latestTelemetryMap = latestTelemetries.stream()
                .filter(t -> t.getMachine() != null)
                .collect(Collectors.toMap(t -> t.getMachine().getId(), t -> t, (t1, t2) -> t1));

        List<Alert> unresolvedAlerts = alertRepository.findByMachineIdInAndResolvedFalse(machineIds);
        Map<Long, List<Alert>> alertMap = unresolvedAlerts.stream()
                .filter(a -> a.getMachine() != null)
                .collect(Collectors.groupingBy(a -> a.getMachine().getId()));

        List<Maintenance> maintenanceRecords = maintenanceRepository.findByMachineIdIn(machineIds);
        Map<Long, List<Maintenance>> maintenanceMap = maintenanceRecords.stream()
                .filter(m -> m.getMachine() != null)
                .collect(Collectors.groupingBy(m -> m.getMachine().getId()));

        LocalDateTime since = properties.getTrendWindowDays() > 0
                ? LocalDateTime.now().minusDays(properties.getTrendWindowDays())
                : null;
        List<Telemetry> batchTelemetries = telemetryRepository.findRecentTelemetriesByMachineIds(machineIds, since);
        Map<Long, List<Telemetry>> telemetryHistoryMap = batchTelemetries.stream()
                .filter(t -> t.getMachine() != null)
                .collect(Collectors.groupingBy(
                        t -> t.getMachine().getId(),
                        Collectors.collectingAndThen(
                                Collectors.toList(),
                                list -> list.stream().limit(properties.getTrendReadingsLimit()).toList()
                        )
                ));

        LocalDateTime now = LocalDateTime.now();
        List<PredictiveMaintenanceResponse> assessments = machines.stream()
                .map(machine -> buildAssessment(
                        machine,
                        telemetryHistoryMap.getOrDefault(machine.getId(), List.of()),
                        latestTelemetryMap.get(machine.getId()),
                        alertMap.getOrDefault(machine.getId(), List.of()),
                        maintenanceMap.getOrDefault(machine.getId(), List.of()),
                        now
                ))
                .toList();

        if (riskCategoryFilter != null && !riskCategoryFilter.trim().isEmpty()) {
            String filterUpper = riskCategoryFilter.trim().toUpperCase();
            List<PredictiveMaintenanceResponse> filtered = assessments.stream()
                    .filter(a -> filterUpper.equals(a.getRiskCategory()))
                    .toList();
            return new PageImpl<>(filtered, pageable, filtered.size());
        }

        return new PageImpl<>(assessments, pageable, machinePage.getTotalElements());
    }

    public PredictiveMaintenanceResponse buildAssessment(
            Machine machine,
            List<Telemetry> recentTelemetries,
            Telemetry latestTelemetry,
            List<Alert> unresolvedAlerts,
            List<Maintenance> maintenanceRecords,
            LocalDateTime evaluationTime) {

        PredictiveMaintenanceResponse response = new PredictiveMaintenanceResponse();
        response.setMachineId(machine.getId());
        response.setMachineName(machine.getName());
        response.setMachineType(machine.getType());
        response.setMachineStatus(machine.getStatus());
        response.setAssessmentTimestamp(evaluationTime);
        response.setAdvisoryNotice(DEFAULT_ADVISORY_NOTICE);

        // Alert statistics
        List<Alert> safeAlerts = unresolvedAlerts != null ? unresolvedAlerts : List.of();
        long criticalCount = 0;
        long highCount = 0;
        long mediumCount = 0;
        long lowCount = 0;

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

        Map<String, Long> alertCounts = new HashMap<>();
        alertCounts.put("CRITICAL", criticalCount);
        alertCounts.put("HIGH", highCount);
        alertCounts.put("MEDIUM", mediumCount);
        alertCounts.put("LOW", lowCount);
        response.setAlertSeverityCounts(alertCounts);

        // Maintenance records
        List<Maintenance> safeMaintenance = maintenanceRecords != null ? maintenanceRecords : List.of();
        Optional<Maintenance> scheduledOpt = safeMaintenance.stream()
                .filter(m -> "SCHEDULED".equalsIgnoreCase(m.getStatus()))
                .findFirst();

        if (scheduledOpt.isPresent()) {
            Maintenance m = scheduledOpt.get();
            response.setMaintenanceScheduled(true);
            response.setExistingMaintenanceSummary(String.format("Scheduled %s maintenance on %s: %s (Technician: %s)",
                    m.getType(), m.getScheduledDate(), m.getDescription(), m.getTechnician()));
        } else {
            response.setMaintenanceScheduled(false);
            response.setExistingMaintenanceSummary(null);
        }

        // Determine effective latest telemetry
        Telemetry effectiveLatest = latestTelemetry;
        if (effectiveLatest == null && recentTelemetries != null && !recentTelemetries.isEmpty()) {
            effectiveLatest = recentTelemetries.stream()
                    .max(Comparator.comparing(Telemetry::getTimestamp).thenComparing(Telemetry::getId))
                    .orElse(null);
        }

        // Case 1: Missing telemetry
        if (effectiveLatest == null) {
            response.setDataSufficiency(DataSufficiency.NO_DATA.name());
            response.setRiskCategory(MaintenanceRiskCategory.INSUFFICIENT_DATA.name());
            response.setLatestTelemetryTimestamp(null);
            response.setTelemetryStale(false);
            response.setEvaluatedReadingsCount(0);
            response.setTrendFindings(List.of("No telemetry history available to analyze trends."));

            List<String> evidence = new ArrayList<>();
            evidence.add("No telemetry data has been recorded for this machine.");
            if (criticalCount > 0 || highCount > 0) {
                evidence.add(String.format("Active unresolved alerts present (%d alert(s)), but lack of telemetry prevents trend assessment.", safeAlerts.size()));
            }
            if (isAbnormalMachineStatus(machine.getStatus())) {
                evidence.add("Machine is in operational status: " + machine.getStatus());
            }
            appendMaintenanceEvidence(evidence, scheduledOpt, safeMaintenance);

            response.setEvidence(evidence);
            response.setExplanation("Predictive maintenance assessment cannot be performed without sensor telemetry.");
            response.setRecommendedAction("Verify telemetry transmission, sensor configuration, and data ingestion pipeline.");
            return response;
        }

        response.setLatestTelemetryTimestamp(effectiveLatest.getTimestamp());

        // Check telemetry freshness / staleness
        boolean isStale = effectiveLatest.getTimestamp() == null ||
                effectiveLatest.getTimestamp().isBefore(evaluationTime.minusHours(properties.getStaleThresholdHours()));
        response.setTelemetryStale(isStale);

        // Case 2: Stale telemetry
        if (isStale) {
            response.setDataSufficiency(DataSufficiency.STALE_DATA.name());
            response.setEvaluatedReadingsCount(recentTelemetries != null ? recentTelemetries.size() : 1);
            response.setTrendFindings(List.of(String.format(
                    "Latest telemetry reading is outdated (recorded at %s); trend reliability cannot be confirmed.",
                    effectiveLatest.getTimestamp())));

            List<String> evidence = new ArrayList<>();
            evidence.add(String.format(
                    "Telemetry data is stale: latest reading recorded at %s (exceeds freshness window of %d hours).",
                    effectiveLatest.getTimestamp(), properties.getStaleThresholdHours()));

            if (criticalCount > 0) {
                response.setRiskCategory(MaintenanceRiskCategory.MAINTENANCE_RECOMMENDED.name());
                evidence.add(String.format("Machine has %d active unresolved CRITICAL alert(s) requiring immediate attention despite stale telemetry.", criticalCount));
                appendMaintenanceEvidence(evidence, scheduledOpt, safeMaintenance);
                response.setEvidence(evidence);
                response.setExplanation("Urgent maintenance attention warranted due to active unresolved CRITICAL alert(s), though telemetry freshness must be restored.");
                response.setRecommendedAction("Investigate unresolved critical alerts immediately and verify sensor freshness/telemetry ingestion.");
            } else if (highCount > 0) {
                response.setRiskCategory(MaintenanceRiskCategory.WATCH.name());
                evidence.add(String.format("Machine has %d active unresolved HIGH alert(s) alongside stale telemetry.", highCount));
                appendMaintenanceEvidence(evidence, scheduledOpt, safeMaintenance);
                response.setEvidence(evidence);
                response.setExplanation("Active high alert(s) warrant monitoring, but sensor freshness must be verified.");
                response.setRecommendedAction("Review active high-severity alert(s) and verify sensor freshness or sensor operation.");
            } else {
                response.setRiskCategory(MaintenanceRiskCategory.INSUFFICIENT_DATA.name());
                if (isAbnormalMachineStatus(machine.getStatus())) {
                    evidence.add("Machine is in operational status: " + machine.getStatus());
                }
                appendMaintenanceEvidence(evidence, scheduledOpt, safeMaintenance);
                response.setEvidence(evidence);
                response.setExplanation("Telemetry data is stale; current operational conditions cannot be determined to assess maintenance risk.");
                response.setRecommendedAction("Verify sensor freshness or sensor operation; outdated telemetry cannot reliably support active maintenance risk forecasting.");
            }
            return response;
        }

        // Telemetry is fresh — check reading volume for trend sufficiency
        List<Telemetry> chronological = new ArrayList<>(recentTelemetries != null ? recentTelemetries : List.of());
        chronological.sort(Comparator.comparing(Telemetry::getTimestamp).thenComparing(Telemetry::getId));
        response.setEvaluatedReadingsCount(chronological.size());

        // Case 3: Insufficient telemetry readings (< minTelemetryReadings)
        if (chronological.size() < properties.getMinTelemetryReadings()) {
            response.setDataSufficiency(DataSufficiency.INSUFFICIENT_DATA.name());
            response.setTrendFindings(List.of(String.format(
                    "Insufficient data points (%d available, minimum %d required) to identify trends.",
                    chronological.size(), properties.getMinTelemetryReadings())));

            List<String> evidence = new ArrayList<>();
            evidence.add(String.format(
                    "Insufficient historical telemetry: %d reading(s) available; minimum %d readings required to compute reliable trend baseline.",
                    chronological.size(), properties.getMinTelemetryReadings()));

            if (criticalCount > 0) {
                response.setRiskCategory(MaintenanceRiskCategory.MAINTENANCE_RECOMMENDED.name());
                evidence.add(String.format("Machine has %d unresolved CRITICAL alert(s).", criticalCount));
                appendMaintenanceEvidence(evidence, scheduledOpt, safeMaintenance);
                response.setEvidence(evidence);
                response.setExplanation("Active critical alert warrants maintenance attention, but trend forecasting is constrained by limited historical data.");
                response.setRecommendedAction("Investigate active critical alert(s) and collect additional telemetry to establish baseline.");
            } else if (highCount > 0) {
                response.setRiskCategory(MaintenanceRiskCategory.WATCH.name());
                evidence.add(String.format("Machine has %d unresolved HIGH alert(s).", highCount));
                appendMaintenanceEvidence(evidence, scheduledOpt, safeMaintenance);
                response.setEvidence(evidence);
                response.setExplanation("Active high alert warrants monitoring, but trend forecasting requires additional telemetry readings.");
                response.setRecommendedAction("Review active high-severity alert(s) and collect additional telemetry to establish baseline.");
            } else {
                response.setRiskCategory(MaintenanceRiskCategory.INSUFFICIENT_DATA.name());
                evidence.add(String.format(
                        "Machine operational status is %s with no active critical alerts, but trend stability cannot be verified without sufficient data.",
                        machine.getStatus()));
                appendMaintenanceEvidence(evidence, scheduledOpt, safeMaintenance);
                response.setEvidence(evidence);
                response.setExplanation("Historical telemetry volume is insufficient to compute reliable rate-of-change or trend analysis without risk of false assumptions.");
                response.setRecommendedAction("Collect additional telemetry readings before attempting predictive assessment.");
            }
            return response;
        }

        // Case 4: Sufficient, fresh telemetry — evaluate empirical trends
        response.setDataSufficiency(DataSufficiency.SUFFICIENT.name());

        Telemetry first = chronological.get(0);
        Telemetry last = chronological.get(chronological.size() - 1);
        int count = chronological.size();

        double deltaT = last.getTemperature() - first.getTemperature();
        double deltaV = last.getVibration() - first.getVibration();
        double deltaP = last.getPressure() - first.getPressure();
        double deltaRpm = last.getRpm() - first.getRpm();

        int tempRisingSteps = 0;
        for (int i = 1; i < count; i++) {
            if (chronological.get(i).getTemperature() > chronological.get(i - 1).getTemperature()) {
                tempRisingSteps++;
            }
        }
        boolean tempSustainedSevere = tempRisingSteps >= 2 && deltaT >= properties.getTempRiseThreshold();
        boolean tempSustainedModerate = tempRisingSteps >= 1 && deltaT >= (properties.getTempRiseThreshold() / 2.0);

        int vibRisingSteps = 0;
        for (int i = 1; i < count; i++) {
            if (chronological.get(i).getVibration() > chronological.get(i - 1).getVibration()) {
                vibRisingSteps++;
            }
        }
        boolean vibSustainedSevere = vibRisingSteps >= 2 && deltaV >= properties.getVibrationRiseThreshold();
        boolean vibSustainedModerate = vibRisingSteps >= 1 && deltaV >= (properties.getVibrationRiseThreshold() / 2.0);

        boolean pressureDrift = Math.abs(deltaP) >= properties.getPressureDriftThreshold();
        boolean rpmDrift = Math.abs(deltaRpm) >= properties.getRpmDriftThreshold() && "RUNNING".equalsIgnoreCase(machine.getStatus());

        List<String> trendFindings = new ArrayList<>();
        if (tempSustainedSevere) {
            trendFindings.add(String.format("Sustained temperature increase detected: rose from %.1f°C to %.1f°C (+%.1f°C) across %d consecutive readings.",
                    first.getTemperature(), last.getTemperature(), deltaT, count));
        } else if (tempSustainedModerate) {
            trendFindings.add(String.format("Moderate temperature drift detected: rose from %.1f°C to %.1f°C (+%.1f°C).",
                    first.getTemperature(), last.getTemperature(), deltaT));
        }

        if (vibSustainedSevere) {
            trendFindings.add(String.format("Sustained vibration increase detected: rose from %.2f mm/s to %.2f mm/s (+%.2f mm/s) across %d consecutive readings.",
                    first.getVibration(), last.getVibration(), deltaV, count));
        } else if (vibSustainedModerate) {
            trendFindings.add(String.format("Moderate vibration drift detected: rose from %.2f mm/s to %.2f mm/s (+%.2f mm/s).",
                    first.getVibration(), last.getVibration(), deltaV));
        }

        if (pressureDrift) {
            trendFindings.add(String.format("Significant pressure variation: drifted by %.1f PSI (from %.1f to %.1f PSI).",
                    deltaP, first.getPressure(), last.getPressure()));
        }

        if (rpmDrift) {
            trendFindings.add(String.format("RPM instability detected: speed fluctuated by %.0f RPM while in RUNNING status.",
                    deltaRpm));
        }

        if (trendFindings.isEmpty()) {
            trendFindings.add(String.format("Telemetry readings remain stable across evaluated window (%d readings analyzed; no sustained abnormal drift detected).", count));
        }
        response.setTrendFindings(trendFindings);

        // Synthesis & Risk Category Assignment
        List<String> evidence = new ArrayList<>();
        evidence.addAll(trendFindings);

        if (safeAlerts.isEmpty()) {
            evidence.add("No unresolved alerts active for this machine.");
        } else {
            evidence.add(String.format("Machine has %d unresolved alert(s) (%d CRITICAL, %d HIGH, %d MEDIUM, %d LOW).",
                    safeAlerts.size(), criticalCount, highCount, mediumCount, lowCount));
            evidence.add("Note: Active alerts indicate current threshold events, whereas predictive maintenance evaluates sustained deterioration trends.");
        }

        boolean isAbnormalStatus = isAbnormalMachineStatus(machine.getStatus());
        if (isAbnormalStatus) {
            evidence.add("Machine is operating in abnormal status: " + machine.getStatus());
        } else {
            evidence.add("Machine status is normal: " + machine.getStatus());
        }

        appendMaintenanceEvidence(evidence, scheduledOpt, safeMaintenance);
        response.setEvidence(evidence);

        if (criticalCount > 0 || (tempSustainedSevere && vibSustainedSevere) || ((tempSustainedSevere || vibSustainedSevere) && highCount > 0) || highCount >= 2) {
            response.setRiskCategory(MaintenanceRiskCategory.MAINTENANCE_RECOMMENDED.name());
            response.setExplanation("Sustained deteriorating telemetry trend across key mechanical channels or active high-severity alerts indicate elevated maintenance risk.");

            if (scheduledOpt.isPresent()) {
                response.setRecommendedAction(String.format(
                        "Recommend expediting or aligning inspection with existing scheduled maintenance (scheduled for %s: %s). Check spindle bearings, lubrication, and cooling systems.",
                        scheduledOpt.get().getScheduledDate(), scheduledOpt.get().getDescription()));
            } else {
                response.setRecommendedAction("Recommend scheduling qualified mechanical inspection: review sustained telemetry trends and investigate unresolved high-severity alerts.");
            }
        } else if (tempSustainedSevere || vibSustainedSevere || tempSustainedModerate || vibSustainedModerate || pressureDrift || rpmDrift || highCount > 0 || mediumCount > 0 || isAbnormalStatus) {
            response.setRiskCategory(MaintenanceRiskCategory.WATCH.name());
            response.setExplanation("Emerging sensor drift, abnormal machine status, or unresolved medium/high alert detected; increased surveillance advised.");
            response.setRecommendedAction("Recommend increased monitoring frequency: review sustained trend in temperature/vibration on upcoming telemetry cycles and follow standard maintenance workflow.");
        } else {
            response.setRiskCategory(MaintenanceRiskCategory.NORMAL.name());
            response.setExplanation("Machine is operating within normal parameters with stable historical telemetry.");
            response.setRecommendedAction("No immediate maintenance action required. Continue routine operational monitoring and standard preventive maintenance schedule.");
        }

        return response;
    }

    private void appendMaintenanceEvidence(List<String> evidence, Optional<Maintenance> scheduledOpt, List<Maintenance> allMaintenance) {
        if (scheduledOpt.isPresent()) {
            Maintenance m = scheduledOpt.get();
            evidence.add(String.format("Scheduled maintenance on record for %s: '%s' (Technician: %s).",
                    m.getScheduledDate(), m.getDescription(), m.getTechnician()));
        }

        Optional<Maintenance> recentCompleted = allMaintenance.stream()
                .filter(m -> "COMPLETED".equalsIgnoreCase(m.getStatus()))
                .findFirst();
        recentCompleted.ifPresent(m -> evidence.add(String.format(
                "Recent completed maintenance on record: '%s' (completed: %s).",
                m.getDescription(), m.getCompletedDate() != null ? m.getCompletedDate() : "N/A")));
    }

    private boolean isAbnormalMachineStatus(String status) {
        if (status == null) return false;
        String normalized = status.trim().toUpperCase();
        return "OFFLINE".equals(normalized) || "STOPPED".equals(normalized) || "MAINTENANCE".equals(normalized);
    }
}
