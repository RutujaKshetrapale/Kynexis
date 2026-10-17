package com.kynexis.alert.service.alert;

import org.springframework.stereotype.Component;

import com.kynexis.alert.config.AlertEngineProperties;
import com.kynexis.common.dto.event.MachineTelemetryRecorded;

@Component
public class RpmHighRule implements AlertRule {

    public static final String RULE_TYPE = "RPM_HIGH";

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
    public EvaluationResult evaluateTelemetry(MachineTelemetryRecorded reading, AlertEngineProperties properties) {
        if (reading == null || reading.getRpm() == null) {
            return EvaluationResult.ok();
        }

        double threshold = properties.getRpmHighThreshold();
        if (reading.getRpm() > threshold) {
            String msg = String.format("RPM of %.2f exceeded high threshold of %.2f RPM",
                    reading.getRpm(), threshold);
            return EvaluationResult.breached(properties.getRpmHighSeverity(), msg);
        }

        return EvaluationResult.ok();
    }
}
