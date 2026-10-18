package com.kynexis.alert.service.alert;

import org.springframework.stereotype.Component;

import com.kynexis.alert.config.AlertEngineProperties;
import com.kynexis.common.dto.event.MachineTelemetryRecorded;

@Component
public class TemperatureLowRule implements AlertRule {

    public static final String RULE_TYPE = "LOW_TEMPERATURE";

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
        return properties.isTemperatureLowEnabled();
    }

    @Override
    public EvaluationResult evaluateTelemetry(MachineTelemetryRecorded reading, AlertEngineProperties properties) {
        if (reading == null || reading.getTemperature() == null) {
            return EvaluationResult.ok();
        }

        double threshold = properties.getTemperatureLowThreshold();
        double observed = reading.getTemperature();

        if (observed < threshold) {
            String message = String.format(
                    "Temperature reading of %.1f°C is below minimum threshold of %.1f°C",
                    observed,
                    threshold
            );
            return EvaluationResult.breached(properties.getTemperatureLowSeverity(), message);
        }

        return EvaluationResult.ok();
    }
}
