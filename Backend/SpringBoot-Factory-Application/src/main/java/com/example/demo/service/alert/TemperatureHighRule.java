package com.example.demo.service.alert;

import org.springframework.stereotype.Component;

import com.example.demo.config.AlertEngineProperties;
import com.example.demo.entity.Machine;
import com.example.demo.entity.Telemetry;

@Component
public class TemperatureHighRule implements AlertRule {

    public static final String RULE_TYPE = "OVERHEATING";

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
    public EvaluationResult evaluate(Telemetry telemetry, Machine machine, AlertEngineProperties properties) {
        if (telemetry == null || telemetry.getTemperature() == null) {
            return EvaluationResult.normal(RULE_TYPE);
        }

        double threshold = properties.getTemperatureHighThreshold();
        double observed = telemetry.getTemperature();

        if (observed > threshold) {
            String message = String.format(
                    "Spindle/machine temperature of %.1f°C exceeded safety threshold of %.1f°C",
                    observed,
                    threshold
            );
            return EvaluationResult.breached(
                    RULE_TYPE,
                    properties.getTemperatureHighSeverity(),
                    message,
                    observed,
                    threshold
            );
        }

        return EvaluationResult.normal(RULE_TYPE);
    }
}
