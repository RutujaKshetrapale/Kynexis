package com.example.demo.service.alert;

import com.example.demo.config.AlertEngineProperties;
import com.example.demo.entity.Machine;
import com.example.demo.entity.Telemetry;

public interface AlertRule {

    String getRuleType();

    boolean isEnabled(AlertEngineProperties properties);

    EvaluationResult evaluate(Telemetry telemetry, Machine machine, AlertEngineProperties properties);
}
