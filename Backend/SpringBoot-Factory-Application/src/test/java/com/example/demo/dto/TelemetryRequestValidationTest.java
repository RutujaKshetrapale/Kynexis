package com.example.demo.dto;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDateTime;
import java.util.Set;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

class TelemetryRequestValidationTest {

    private static ValidatorFactory validatorFactory;

    private static Validator validator;

    @BeforeAll
    static void setUp() {

        validatorFactory =
                Validation.buildDefaultValidatorFactory();

        validator =
                validatorFactory.getValidator();
    }

    @AfterAll
    static void tearDown() {

        validatorFactory.close();
    }

    private TelemetryRequest createValidRequest() {

        TelemetryRequest request =
                new TelemetryRequest();

        request.setTemperature(25.5);
        request.setVibration(2.5);
        request.setPressure(10.0);
        request.setRpm(1500.0);

        request.setTimestamp(
                LocalDateTime.now()
        );

        request.setMachineId(1L);

        return request;
    }

    @Test
    void shouldAcceptValidTelemetryRequest() {

        TelemetryRequest request =
                createValidRequest();

        Set<ConstraintViolation<TelemetryRequest>> violations =
                validator.validate(request);

        assertTrue(violations.isEmpty());
    }

    @Test
    void shouldRejectNullTemperature() {

        TelemetryRequest request =
                createValidRequest();

        request.setTemperature(null);

        Set<ConstraintViolation<TelemetryRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());

        assertTrue(
                violations.stream()
                        .anyMatch(v ->
                                v.getPropertyPath()
                                        .toString()
                                        .equals("temperature"))
        );
    }

    @Test
    void shouldRejectTemperatureBelowMinimum() {

        TelemetryRequest request =
                createValidRequest();

        request.setTemperature(-101.0);

        Set<ConstraintViolation<TelemetryRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());

        assertTrue(
                violations.stream()
                        .anyMatch(v ->
                                v.getPropertyPath()
                                        .toString()
                                        .equals("temperature"))
        );
    }

    @Test
    void shouldAcceptTemperatureAtMinimum() {

        TelemetryRequest request =
                createValidRequest();

        request.setTemperature(-100.0);

        Set<ConstraintViolation<TelemetryRequest>> violations =
                validator.validate(request);

        assertTrue(violations.isEmpty());
    }

    @Test
    void shouldAcceptZeroTemperature() {

        TelemetryRequest request =
                createValidRequest();

        request.setTemperature(0.0);

        Set<ConstraintViolation<TelemetryRequest>> violations =
                validator.validate(request);

        assertTrue(violations.isEmpty());
    }

    @Test
    void shouldRejectNullVibration() {

        TelemetryRequest request =
                createValidRequest();

        request.setVibration(null);

        Set<ConstraintViolation<TelemetryRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldRejectNegativeVibration() {

        TelemetryRequest request =
                createValidRequest();

        request.setVibration(-1.0);

        Set<ConstraintViolation<TelemetryRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldAcceptZeroVibration() {

        TelemetryRequest request =
                createValidRequest();

        request.setVibration(0.0);

        Set<ConstraintViolation<TelemetryRequest>> violations =
                validator.validate(request);

        assertTrue(violations.isEmpty());
    }

    @Test
    void shouldRejectNullPressure() {

        TelemetryRequest request =
                createValidRequest();

        request.setPressure(null);

        Set<ConstraintViolation<TelemetryRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldRejectNegativePressure() {

        TelemetryRequest request =
                createValidRequest();

        request.setPressure(-1.0);

        Set<ConstraintViolation<TelemetryRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldAcceptZeroPressure() {

        TelemetryRequest request =
                createValidRequest();

        request.setPressure(0.0);

        Set<ConstraintViolation<TelemetryRequest>> violations =
                validator.validate(request);

        assertTrue(violations.isEmpty());
    }

    @Test
    void shouldRejectNullRpm() {

        TelemetryRequest request =
                createValidRequest();

        request.setRpm(null);

        Set<ConstraintViolation<TelemetryRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldRejectNegativeRpm() {

        TelemetryRequest request =
                createValidRequest();

        request.setRpm(-1.0);

        Set<ConstraintViolation<TelemetryRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldAcceptZeroRpm() {

        TelemetryRequest request =
                createValidRequest();

        request.setRpm(0.0);

        Set<ConstraintViolation<TelemetryRequest>> violations =
                validator.validate(request);

        assertTrue(violations.isEmpty());
    }

    @Test
    void shouldRejectNullTimestamp() {

        TelemetryRequest request =
                createValidRequest();

        request.setTimestamp(null);

        Set<ConstraintViolation<TelemetryRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldRejectNullMachineId() {

        TelemetryRequest request =
                createValidRequest();

        request.setMachineId(null);

        Set<ConstraintViolation<TelemetryRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldRejectMultipleInvalidFields() {

        TelemetryRequest request =
                new TelemetryRequest();

        request.setTemperature(null);
        request.setVibration(-1.0);
        request.setPressure(-1.0);
        request.setRpm(-1.0);
        request.setTimestamp(null);
        request.setMachineId(null);

        Set<ConstraintViolation<TelemetryRequest>> violations =
                validator.validate(request);

        assertTrue(violations.size() >= 6);
    }
}
