package com.kynexis.alert.service.alert;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.kynexis.alert.config.AlertEngineProperties;
import com.kynexis.alert.dto.AlertDTO;
import com.kynexis.alert.dto.AlertRequest;
import com.kynexis.alert.entity.Alert;
import com.kynexis.alert.repository.AlertRepository;
import com.kynexis.alert.service.AlertService;
import com.kynexis.common.dto.event.MachineTelemetryRecorded;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class AlertEngineService {

    private final AlertEngineProperties properties;
    private final AlertRepository alertRepository;
    private final AlertService alertService;
    private final List<AlertRule> rules;

    public AlertEngineService(
            AlertEngineProperties properties,
            AlertRepository alertRepository,
            AlertService alertService,
            List<AlertRule> rules) {
        this.properties = properties;
        this.alertRepository = alertRepository;
        this.alertService = alertService;
        this.rules = rules;
    }

    @Transactional
    public List<AlertDTO> evaluateTelemetryReading(MachineTelemetryRecorded reading) {
        if (!properties.isEnabled() || reading == null || reading.getMachineId() == null) {
            return List.of();
        }

        Long machineId = reading.getMachineId();
        log.debug("Evaluating alert rules for machineId={} temp={} vib={} press={}",
                machineId, reading.getTemperature(), reading.getVibration(), reading.getPressure());

        List<AlertDTO> processedAlerts = new ArrayList<>();

        for (AlertRule rule : rules) {
            if (!rule.isEnabled(properties) || rule.getCategory() != RuleCategory.TELEMETRY) {
                continue;
            }

            try {
                EvaluationResult result = rule.evaluateTelemetry(reading, properties);
                Optional<Alert> existingActiveOpt = alertRepository
                        .findFirstByMachineIdAndTypeAndResolvedFalseOrderByCreatedAtDesc(machineId, rule.getRuleType());

                if (result.isBreached()) {
                    if (existingActiveOpt.isPresent()) {
                        Alert activeAlert = existingActiveOpt.get();
                        boolean severityChanged = !Objects.equals(activeAlert.getSeverity(), result.getSeverity());
                        boolean messageChanged = !Objects.equals(activeAlert.getMessage(), result.getMessage());

                        if (severityChanged || messageChanged) {
                            AlertRequest updateRequest = AlertRequest.builder()
                                    .machineId(machineId)
                                    .type(rule.getRuleType())
                                    .severity(result.getSeverity())
                                    .message(result.getMessage())
                                    .resolved(false)
                                    .telemetryId(reading.getTelemetryId())
                                    .build();

                            AlertDTO updated = alertService.update(activeAlert.getId(), updateRequest);
                            processedAlerts.add(updated);
                            log.info("Updated existing alert id={} machineId={} type={} newSeverity={}",
                                    activeAlert.getId(), machineId, rule.getRuleType(), result.getSeverity());
                        }
                    } else {
                        AlertRequest createRequest = AlertRequest.builder()
                                    .machineId(machineId)
                                    .type(rule.getRuleType())
                                    .severity(result.getSeverity())
                                    .message(result.getMessage())
                                    .resolved(false)
                                    .telemetryId(reading.getTelemetryId())
                                    .build();

                        AlertDTO created = alertService.create(createRequest);
                        processedAlerts.add(created);
                        log.warn("Created new alert id={} machineId={} type={} severity={}",
                                created.getId(), machineId, rule.getRuleType(), result.getSeverity());
                    }
                } else if (existingActiveOpt.isPresent()) {
                    Alert activeAlert = existingActiveOpt.get();
                    AlertDTO resolved = alertService.resolveAlert(activeAlert.getId());
                    processedAlerts.add(resolved);
                    log.info("Auto-resolved alert id={} machineId={} type={} reading back to normal",
                            activeAlert.getId(), machineId, rule.getRuleType());
                }
            } catch (Exception ex) {
                log.error("Error evaluating rule {} for machineId={}: {}", rule.getRuleType(), machineId, ex.getMessage(), ex);
            }
        }

        return processedAlerts;
    }
}
