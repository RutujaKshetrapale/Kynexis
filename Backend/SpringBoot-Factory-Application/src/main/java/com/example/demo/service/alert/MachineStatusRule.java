package com.example.demo.service.alert;

import org.springframework.stereotype.Component;

import com.example.demo.config.AlertEngineProperties;
import com.example.demo.entity.Machine;
import com.example.demo.entity.Telemetry;

@Component
public class MachineStatusRule implements AlertRule {

    public static final String RULE_TYPE = "ABNORMAL_MACHINE_STATUS";

    @Override
    public String getRuleType() {
        return RULE_TYPE;
    }

    @Override
    public boolean isEnabled(AlertEngineProperties properties) {
        return properties.isMachineStatusEnabled();
    }

    @Override
    public EvaluationResult evaluate(Telemetry telemetry, Machine machine, AlertEngineProperties properties) {
        Machine targetMachine = machine;
        if (targetMachine == null && telemetry != null) {
            targetMachine = telemetry.getMachine();
        }

        if (targetMachine == null || targetMachine.getStatus() == null) {
            return EvaluationResult.normal(RULE_TYPE);
        }

        String status = targetMachine.getStatus().trim().toUpperCase();

        if ("OFFLINE".equals(status)) {
            String message = String.format(
                    "Machine '%s' (ID: %d) entered OFFLINE status",
                    targetMachine.getName(),
                    targetMachine.getId()
            );
            return EvaluationResult.breached(RULE_TYPE, "CRITICAL", message, null, null);
        }

        if ("STOPPED".equals(status)) {
            String message = String.format(
                    "Machine '%s' (ID: %d) entered STOPPED status",
                    targetMachine.getName(),
                    targetMachine.getId()
            );
            return EvaluationResult.breached(RULE_TYPE, "HIGH", message, null, null);
        }

        if ("MAINTENANCE".equals(status)) {
            String message = String.format(
                    "Machine '%s' (ID: %d) entered MAINTENANCE status",
                    targetMachine.getName(),
                    targetMachine.getId()
            );
            return EvaluationResult.breached(RULE_TYPE, "MEDIUM", message, null, null);
        }

        return EvaluationResult.normal(RULE_TYPE);
    }
}
