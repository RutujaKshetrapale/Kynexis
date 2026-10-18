package com.kynexis.alert.service.alert;

import org.springframework.stereotype.Component;

import com.kynexis.alert.config.AlertEngineProperties;

@Component
public class MachineStatusRule implements AlertRule {

    public static final String RULE_TYPE = "ABNORMAL_MACHINE_STATUS";

    @Override
    public String getRuleType() {
        return RULE_TYPE;
    }

    @Override
    public RuleCategory getCategory() {
        return RuleCategory.MACHINE;
    }

    @Override
    public boolean isEnabled(AlertEngineProperties properties) {
        return properties.isMachineStatusEnabled();
    }

    @Override
    public EvaluationResult evaluateMachineStatus(Long machineId, String machineName, String status, AlertEngineProperties properties) {
        if (status == null || machineId == null) {
            return EvaluationResult.ok();
        }

        String normalizedStatus = status.trim().toUpperCase();
        String name = (machineName != null && !machineName.isBlank()) ? machineName : "Machine-" + machineId;

        if ("OFFLINE".equals(normalizedStatus)) {
            String message = String.format("Machine '%s' (ID: %d) entered OFFLINE status", name, machineId);
            return EvaluationResult.breached("CRITICAL", message);
        }

        if ("STOPPED".equals(normalizedStatus)) {
            String message = String.format("Machine '%s' (ID: %d) entered STOPPED status", name, machineId);
            return EvaluationResult.breached("HIGH", message);
        }

        if ("MAINTENANCE".equals(normalizedStatus)) {
            String message = String.format("Machine '%s' (ID: %d) entered MAINTENANCE status", name, machineId);
            return EvaluationResult.breached("MEDIUM", message);
        }

        return EvaluationResult.ok();
    }
}
