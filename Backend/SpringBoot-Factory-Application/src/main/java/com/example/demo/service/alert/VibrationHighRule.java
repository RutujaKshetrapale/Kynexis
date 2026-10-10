package com.example.demo.service.alert;

import org.springframework.stereotype.Component;

import com.example.demo.config.AlertEngineProperties;
import com.example.demo.entity.Machine;
import com.example.demo.entity.Telemetry;

@Component
public class VibrationHighRule implements AlertRule {

    public static final String RULE_TYPE = "HIGH_VIBRATION";

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
        return properties.isVibrationHighEnabled();
    }

    @Override
    public EvaluationResult evaluate(Telemetry telemetry, Machine machine, AlertEngineProperties properties) {
        if (telemetry == null || telemetry.getVibration() == null) {
            return EvaluationResult.normal(RULE_TYPE);
        }

        double threshold = properties.getVibrationHighThreshold();
        double observed = telemetry.getVibration();

        if (observed > threshold) {
            String message = String.format(
                    "Axis-Z / machine vibration of %.1f mm/s exceeded warning limit of %.1f mm/s",
                    observed,
                    threshold
            );
            return EvaluationResult.breached(
                    RULE_TYPE,
                    properties.getVibrationHighSeverity(),
                    message,
                    observed,
                    threshold
            );
        }

        return EvaluationResult.normal(RULE_TYPE);
    }
}
