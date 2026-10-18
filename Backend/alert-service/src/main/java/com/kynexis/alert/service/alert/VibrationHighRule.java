package com.kynexis.alert.service.alert;

import org.springframework.stereotype.Component;

import com.kynexis.alert.config.AlertEngineProperties;
import com.kynexis.alert.common.dto.event.MachineTelemetryRecorded;

@Component
public class VibrationHighRule implements AlertRule {

    public static final String RULE_TYPE = "VIBRATION_HIGH";

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
    public EvaluationResult evaluateTelemetry(MachineTelemetryRecorded reading, AlertEngineProperties properties) {
        if (reading == null || reading.getVibration() == null) {
            return EvaluationResult.ok();
        }

        double threshold = properties.getVibrationHighThreshold();
        if (reading.getVibration() > threshold) {
            String msg = String.format("Vibration of %.2f mm/s exceeded threshold of %.2f mm/s",
                    reading.getVibration(), threshold);
            return EvaluationResult.breached(properties.getVibrationHighSeverity(), msg);
        }

        return EvaluationResult.ok();
    }
}
