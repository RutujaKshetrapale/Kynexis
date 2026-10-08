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

class EnergyRequestValidationTest {

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

    private EnergyRequest createValidRequest() {

        EnergyRequest request =
                new EnergyRequest();

        request.setEnergyConsumption(125.5);

        request.setRecordedAt(
                LocalDateTime.now()
        );

        request.setMachineId(1L);

        return request;
    }

    @Test
    void shouldAcceptValidEnergyRequest() {

        EnergyRequest request =
                createValidRequest();

        Set<ConstraintViolation<EnergyRequest>> violations =
                validator.validate(request);

        assertTrue(violations.isEmpty());
    }

    @Test
    void shouldRejectNullEnergyConsumption() {

        EnergyRequest request =
                createValidRequest();

        request.setEnergyConsumption(null);

        Set<ConstraintViolation<EnergyRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());

        assertTrue(
                violations.stream()
                        .anyMatch(v ->
                                v.getPropertyPath()
                                        .toString()
                                        .equals("energyConsumption"))
        );
    }

    @Test
    void shouldRejectNegativeEnergyConsumption() {

        EnergyRequest request =
                createValidRequest();

        request.setEnergyConsumption(-0.01);

        Set<ConstraintViolation<EnergyRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());

        assertTrue(
                violations.stream()
                        .anyMatch(v ->
                                v.getPropertyPath()
                                        .toString()
                                        .equals("energyConsumption"))
        );
    }

    @Test
    void shouldAcceptZeroEnergyConsumption() {

        EnergyRequest request =
                createValidRequest();

        request.setEnergyConsumption(0.0);

        Set<ConstraintViolation<EnergyRequest>> violations =
                validator.validate(request);

        assertTrue(violations.isEmpty());
    }

    @Test
    void shouldAcceptPositiveEnergyConsumption() {

        EnergyRequest request =
                createValidRequest();

        request.setEnergyConsumption(100.5);

        Set<ConstraintViolation<EnergyRequest>> violations =
                validator.validate(request);

        assertTrue(violations.isEmpty());
    }

    @Test
    void shouldRejectNullRecordedAt() {

        EnergyRequest request =
                createValidRequest();

        request.setRecordedAt(null);

        Set<ConstraintViolation<EnergyRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());

        assertTrue(
                violations.stream()
                        .anyMatch(v ->
                                v.getPropertyPath()
                                        .toString()
                                        .equals("recordedAt"))
        );
    }

    @Test
    void shouldRejectNullMachineId() {

        EnergyRequest request =
                createValidRequest();

        request.setMachineId(null);

        Set<ConstraintViolation<EnergyRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());

        assertTrue(
                violations.stream()
                        .anyMatch(v ->
                                v.getPropertyPath()
                                        .toString()
                                        .equals("machineId"))
        );
    }

    @Test
    void shouldDetectMultipleValidationErrors() {

        EnergyRequest request =
                new EnergyRequest();

        request.setEnergyConsumption(null);
        request.setRecordedAt(null);
        request.setMachineId(null);

        Set<ConstraintViolation<EnergyRequest>> violations =
                validator.validate(request);

        assertTrue(violations.size() >= 3);
    }
}
