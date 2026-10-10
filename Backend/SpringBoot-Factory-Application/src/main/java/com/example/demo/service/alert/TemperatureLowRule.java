package com.example.demo.service.alert;

import org.springframework.stereotype.Component;

import com.example.demo.config.AlertEngineProperties;
import com.example.demo.entity.Machine;
import com.example.demo.entity.Telemetry;

@Component
public class TemperatureLowRule implements AlertRule {

    public static final String RULE_TYPE = "LOW_TEMPERATURE";

    @Override
    public String getRuleType() {
        return RULE_TYPE;
    }

    @Override
    public boolean isEnabled(AlertEngineProperties properties) {
        return properties.isTemperatureLowEnabled();
    }

    @Override
    public EvaluationResult evaluate(Telemetry telemetry, Machine machine, AlertEngineProperties properties) {
        if (telemetry == null || telemetry.getTemperature() == null) {
            return EvaluationResult.normal(RULE_TYPE);
        }

        double threshold = properties.getTemperatureLowThreshold();
        double observed = telemetry.getTemperature();

        if (observed < threshold) {
            String message = String.format(
                    "Temperature reading of %.1f°C is below minimum threshold of %.1f°C",
                    observed,
                    threshold
            );
            return EvaluationResult.breached(
                    RULE_TYPE,
                    properties.getTemperatureLowSeverity(),
                    message,
                    observed,
                    threshold
            );
        }

        return EvaluationResult.normal(RULE_TYPE);
    }
}
