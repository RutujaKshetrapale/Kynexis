package com.example.demo.service.alert;

public class EvaluationResult {

    private final boolean breached;
    private final String ruleType;
    private final String severity;
    private final String message;
    private final Double observedValue;
    private final Double thresholdValue;

    public EvaluationResult(
            boolean breached,
            String ruleType,
            String severity,
            String message,
            Double observedValue,
            Double thresholdValue) {
        this.breached = breached;
        this.ruleType = ruleType;
        this.severity = severity;
        this.message = message;
        this.observedValue = observedValue;
        this.thresholdValue = thresholdValue;
    }

    public static EvaluationResult normal(String ruleType) {
        return new EvaluationResult(false, ruleType, null, null, null, null);
    }

    public static EvaluationResult breached(
            String ruleType,
            String severity,
            String message,
            Double observedValue,
            Double thresholdValue) {
        return new EvaluationResult(true, ruleType, severity, message, observedValue, thresholdValue);
    }

    public boolean isBreached() {
        return breached;
    }

    public String getRuleType() {
        return ruleType;
    }

    public String getSeverity() {
        return severity;
    }

    public String getMessage() {
        return message;
    }

    public Double getObservedValue() {
        return observedValue;
    }

    public Double getThresholdValue() {
        return thresholdValue;
    }
}
