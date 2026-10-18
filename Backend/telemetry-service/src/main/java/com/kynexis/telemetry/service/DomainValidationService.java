package com.kynexis.telemetry.service;

import org.springframework.stereotype.Service;

import com.kynexis.telemetry.common.exception.BusinessValidationException;

@Service
public class DomainValidationService {

    public void validateTelemetry(
            Double temperature,
            Double vibration,
            Double pressure,
            Double rpm) {

        if (temperature == null
                || vibration == null
                || pressure == null
                || rpm == null) {
            throw new BusinessValidationException("All telemetry values are required");
        }

        if (vibration < 0) {
            throw new BusinessValidationException("Vibration cannot be negative");
        }

        if (pressure < 0) {
            throw new BusinessValidationException("Pressure cannot be negative");
        }

        if (rpm < 0) {
            throw new BusinessValidationException("RPM cannot be negative");
        }

        if (temperature < -100 || temperature > 200) {
            throw new BusinessValidationException("Temperature must be between -100°C and 200°C");
        }
    }
}
