package com.kynexis.alert.service.alert;

import org.springframework.stereotype.Component;

import com.kynexis.alert.config.AlertEngineProperties;
import com.kynexis.common.dto.event.MachineTelemetryRecorded;

@Component
public class PressureHighRule implements AlertRule {

    public static final String RULE_TYPE = "PRESSURE_HIGH";

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
        return properties.isPressureHighEnabled();
    }

    @Override
    public EvaluationResult evaluateTelemetry(MachineTelemetryRecorded reading, AlertEngineProperties properties) {
        if (reading == null || reading.getPressure() == null) {
            return EvaluationResult.ok();
        }

        double threshold = properties.getPressureHighThreshold();
        if (reading.getPressure() > threshold) {
            String msg = String.format("Pressure of %.2f PSI exceeded high threshold of %.2f PSI",
                    reading.getPressure(), threshold);
            return EvaluationResult.breached(properties.getPressureHighSeverity(), msg);
        }

        return EvaluationResult.ok();
    }
}
