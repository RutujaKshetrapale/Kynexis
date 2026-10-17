package com.kynexis.alert.service.alert;

import org.springframework.stereotype.Component;

import com.kynexis.alert.config.AlertEngineProperties;
import com.kynexis.common.dto.event.MachineTelemetryRecorded;

@Component
public class TemperatureHighRule implements AlertRule {

    public static final String RULE_TYPE = "TEMPERATURE_HIGH";

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
        return properties.isTemperatureHighEnabled();
    }

    @Override
    public EvaluationResult evaluateTelemetry(MachineTelemetryRecorded reading, AlertEngineProperties properties) {
        if (reading == null || reading.getTemperature() == null) {
            return EvaluationResult.ok();
        }

        double threshold = properties.getTemperatureHighThreshold();
        if (reading.getTemperature() > threshold) {
            String msg = String.format("Temperature of %.2f°C exceeded high threshold of %.2f°C",
                    reading.getTemperature(), threshold);
            return EvaluationResult.breached(properties.getTemperatureHighSeverity(), msg);
        }

        return EvaluationResult.ok();
    }
}
