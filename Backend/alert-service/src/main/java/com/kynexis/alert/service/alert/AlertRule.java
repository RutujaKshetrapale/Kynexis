package com.kynexis.alert.service.alert;

import com.kynexis.alert.config.AlertEngineProperties;
import com.kynexis.common.dto.event.MachineTelemetryRecorded;

public interface AlertRule {

    String getRuleType();

    RuleCategory getCategory();

    boolean isEnabled(AlertEngineProperties properties);

    default EvaluationResult evaluateTelemetry(MachineTelemetryRecorded reading, AlertEngineProperties properties) {
        return EvaluationResult.ok();
    }

    default EvaluationResult evaluateMachineStatus(Long machineId, String machineName, String status, AlertEngineProperties properties) {
        return EvaluationResult.ok();
    }
}
