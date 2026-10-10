package com.example.demo.service.alert;

import org.springframework.stereotype.Component;

import com.example.demo.config.AlertEngineProperties;
import com.example.demo.entity.Machine;
import com.example.demo.entity.Telemetry;

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
    public EvaluationResult evaluate(Telemetry telemetry, Machine machine, AlertEngineProperties properties) {
        if (telemetry == null || telemetry.getPressure() == null) {
            return EvaluationResult.normal(RULE_TYPE);
        }

        double threshold = properties.getPressureLowThreshold();
        double observed = telemetry.getPressure();

        if (observed < threshold) {
            String message = String.format(
                    "Hydraulic pressure reading of %.1f PSI is below minimum operational threshold of %.1f PSI",
                    observed,
                    threshold
            );
            return EvaluationResult.breached(
                    RULE_TYPE,
                    properties.getPressureLowSeverity(),
                    message,
                    observed,
                    threshold
            );
        }

        return EvaluationResult.normal(RULE_TYPE);
    }
}
