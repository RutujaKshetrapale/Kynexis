package com.kynexis.alert.service.alert;

import com.kynexis.alert.config.AlertEngineProperties;
import com.kynexis.common.dto.event.MachineTelemetryRecorded;

public interface AlertRule {

    String getRuleType();

    RuleCategory getCategory();

    boolean isEnabled(AlertEngineProperties properties);

    EvaluationResult evaluateTelemetry(MachineTelemetryRecorded reading, AlertEngineProperties properties);
}
