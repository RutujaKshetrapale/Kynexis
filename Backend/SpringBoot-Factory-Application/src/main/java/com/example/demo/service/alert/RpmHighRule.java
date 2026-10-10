package com.example.demo.service.alert;

import org.springframework.stereotype.Component;

import com.example.demo.config.AlertEngineProperties;
import com.example.demo.entity.Machine;
import com.example.demo.entity.Telemetry;

@Component
public class RpmHighRule implements AlertRule {

    public static final String RULE_TYPE = "HIGH_RPM";

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
        return properties.isRpmHighEnabled();
    }

    @Override
    public EvaluationResult evaluate(Telemetry telemetry, Machine machine, AlertEngineProperties properties) {
        if (telemetry == null || telemetry.getRpm() == null) {
            return EvaluationResult.normal(RULE_TYPE);
        }

        double threshold = properties.getRpmHighThreshold();
        double observed = telemetry.getRpm();

        if (observed > threshold) {
            String message = String.format(
                    "Motor RPM reading of %.1f RPM exceeded maximum safety limit of %.1f RPM",
                    observed,
                    threshold
            );
            return EvaluationResult.breached(
                    RULE_TYPE,
                    properties.getRpmHighSeverity(),
                    message,
                    observed,
                    threshold
            );
        }

        return EvaluationResult.normal(RULE_TYPE);
    }
}
