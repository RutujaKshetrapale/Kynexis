package com.kynexis.alert.service.alert;

import org.springframework.stereotype.Component;

import com.kynexis.alert.config.AlertEngineProperties;
import com.kynexis.common.dto.event.MachineTelemetryRecorded;

@Component
public class PressureLowRule implements AlertRule {

    public static final String RULE_TYPE = "LOW_PRESSURE";

    @Override
    public String getRuleType() {
        return RULE_TYPE;
    }

    @Override
    public RuleCategory getCategory() {
        return RuleCategory.TELEMETRY;
    }

    @Override
    public boolean isEnabled(AlertEngineProperties properties) {
        return properties.isPressureLowEnabled();
    }

    @Override
    public EvaluationResult evaluateTelemetry(MachineTelemetryRecorded reading, AlertEngineProperties properties) {
        if (reading == null || reading.getPressure() == null) {
            return EvaluationResult.ok();
        }

        double threshold = properties.getPressureLowThreshold();
        double observed = reading.getPressure();

        if (observed < threshold) {
            String message = String.format(
                    "Hydraulic pressure reading of %.1f PSI is below minimum operational threshold of %.1f PSI",
                    observed,
                    threshold
            );
            return EvaluationResult.breached(properties.getPressureLowSeverity(), message);
        }

        return EvaluationResult.ok();
    }
}
