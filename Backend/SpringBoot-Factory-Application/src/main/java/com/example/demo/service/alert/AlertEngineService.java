package com.example.demo.service.alert;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.config.AlertEngineProperties;
import com.example.demo.dto.AlertRequest;
import com.example.demo.entity.Alert;
import com.example.demo.entity.Machine;
import com.example.demo.entity.Telemetry;
import com.example.demo.repository.AlertRepository;
import com.example.demo.service.AlertService;

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
    public List<Alert> evaluateTelemetry(Telemetry telemetry) {
        if (!properties.isEnabled() || telemetry == null || telemetry.getMachine() == null) {
            return List.of();
        }

        Machine machine = telemetry.getMachine();
        log.debug("Evaluating alert rules for telemetry id={} machineId={}", telemetry.getId(), machine.getId());

        List<Alert> processedAlerts = new ArrayList<>();

        for (AlertRule rule : rules) {
            if (!rule.isEnabled(properties)) {
                continue;
            }

            try {
                EvaluationResult result = rule.evaluate(telemetry, machine, properties);
                Optional<Alert> existingActiveOpt = alertRepository
                        .findFirstByMachineIdAndTypeAndResolvedFalseOrderByCreatedAtDesc(machine.getId(), rule.getRuleType());

                if (result.isBreached()) {
                    if (existingActiveOpt.isPresent()) {
                        Alert activeAlert = existingActiveOpt.get();
                        boolean needsSave = false;

                        if (activeAlert.getTelemetry() == null || !activeAlert.getTelemetry().getId().equals(telemetry.getId())) {
                            activeAlert.setTelemetry(telemetry);
                            needsSave = true;
                        }

                        if (!activeAlert.getMessage().equals(result.getMessage())) {
                            activeAlert.setMessage(result.getMessage());
                            needsSave = true;
                        }

                        if (needsSave) {
                            Alert updated = alertRepository.save(activeAlert);
                            processedAlerts.add(updated);
                            log.info("Updated existing active alert id={} machineId={} type={}", updated.getId(), machine.getId(), rule.getRuleType());
                        } else {
                            processedAlerts.add(activeAlert);
                        }
                    } else {
                        AlertRequest request = new AlertRequest();
                        request.setMachineId(machine.getId());
                        request.setType(rule.getRuleType());
                        request.setSeverity(result.getSeverity());
                        request.setMessage(result.getMessage());
                        request.setResolved(false);

                        Alert created = alertService.create(request, telemetry);
                        processedAlerts.add(created);
                        log.info("Created new alert id={} machineId={} type={}", created.getId(), machine.getId(), rule.getRuleType());
                    }
                } else {
                    if (existingActiveOpt.isPresent()) {
                        Alert activeAlert = existingActiveOpt.get();
                        AlertRequest updateRequest = new AlertRequest();
                        updateRequest.setMachineId(machine.getId());
                        updateRequest.setType(activeAlert.getType());
                        updateRequest.setSeverity(activeAlert.getSeverity());
                        updateRequest.setMessage(activeAlert.getMessage() + " (Auto-resolved: condition cleared)");
                        updateRequest.setResolved(true);

                        Alert resolved = alertService.update(activeAlert.getId(), updateRequest);
                        processedAlerts.add(resolved);
                        log.info("Auto-resolved alert id={} machineId={} type={}", resolved.getId(), machine.getId(), rule.getRuleType());
                    }
                }
            } catch (Exception e) {
                log.error("Error evaluating rule {} for machineId={}", rule.getRuleType(), machine.getId(), e);
            }
        }

        return processedAlerts;
    }

    @Transactional
    public List<Alert> evaluateMachine(Machine machine) {
        if (!properties.isEnabled() || machine == null) {
            return List.of();
        }

        List<Alert> processedAlerts = new ArrayList<>();

        for (AlertRule rule : rules) {
            if (!rule.isEnabled(properties)) {
                continue;
            }

            try {
                EvaluationResult result = rule.evaluate(null, machine, properties);

                Optional<Alert> existingActiveOpt = alertRepository
                        .findFirstByMachineIdAndTypeAndResolvedFalseOrderByCreatedAtDesc(machine.getId(), rule.getRuleType());

                if (result.isBreached()) {
                    if (existingActiveOpt.isEmpty()) {
                        AlertRequest request = new AlertRequest();
                        request.setMachineId(machine.getId());
                        request.setType(rule.getRuleType());
                        request.setSeverity(result.getSeverity());
                        request.setMessage(result.getMessage());
                        request.setResolved(false);

                        Alert created = alertService.create(request, null);
                        processedAlerts.add(created);
                        log.info("Created machine status alert id={} machineId={}", created.getId(), machine.getId());
                    }
                } else if (existingActiveOpt.isPresent()) {
                    Alert activeAlert = existingActiveOpt.get();
                    AlertRequest updateRequest = new AlertRequest();
                    updateRequest.setMachineId(machine.getId());
                    updateRequest.setType(activeAlert.getType());
                    updateRequest.setSeverity(activeAlert.getSeverity());
                    updateRequest.setMessage(activeAlert.getMessage() + " (Auto-resolved: machine status normal)");
                    updateRequest.setResolved(true);

                    Alert resolved = alertService.update(activeAlert.getId(), updateRequest);
                    processedAlerts.add(resolved);
                    log.info("Auto-resolved machine status alert id={} machineId={}", resolved.getId(), machine.getId());
                }
            } catch (Exception e) {
                log.error("Error evaluating rule {} for machineId={}", rule.getRuleType(), machine.getId(), e);
            }
        }

        return processedAlerts;
    }
}
