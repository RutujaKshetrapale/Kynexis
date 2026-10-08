package com.example.demo.dto;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Set;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class SensorRequestValidationTest {

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

    private SensorRequest createValidRequest() {

        SensorRequest request = new SensorRequest();

        request.setName("Temperature Sensor");
        request.setType("TEMPERATURE");
        request.setUnit("°C");
        request.setMachineId(1L);
        request.setActive(true);

        return request;
    }

    @Test
    @DisplayName("Should pass validation for valid sensor request")
    void shouldPassValidationForValidSensorRequest() {

        SensorRequest request = createValidRequest();

        Set<ConstraintViolation<SensorRequest>> violations =
                validator.validate(request);

        assertTrue(violations.isEmpty());
    }

    @Test
    @DisplayName("Should reject blank sensor name")
    void shouldRejectBlankSensorName() {

        SensorRequest request = createValidRequest();

        request.setName("");

        Set<ConstraintViolation<SensorRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());

        assertTrue(
                violations.stream().anyMatch(v -> "Sensor name is required".equals(v.getMessage()))
        );
    }

    @Test
    @DisplayName("Should reject sensor name shorter than 2 characters")
    void shouldRejectSensorNameTooShort() {

        SensorRequest request = createValidRequest();

        request.setName("A");

        Set<ConstraintViolation<SensorRequest>> violations =
                validator.validate(request);

        assertEquals(1, violations.size());

        assertEquals(
                "Sensor name must be between 2 and 100 characters",
                violations.iterator().next().getMessage()
        );
    }

    @Test
    @DisplayName("Should reject sensor name longer than 100 characters")
    void shouldRejectSensorNameTooLong() {

        SensorRequest request = createValidRequest();

        request.setName("A".repeat(101));

        Set<ConstraintViolation<SensorRequest>> violations =
                validator.validate(request);

        assertEquals(1, violations.size());

        assertEquals(
                "Sensor name must be between 2 and 100 characters",
                violations.iterator().next().getMessage()
        );
    }

    @Test
    @DisplayName("Should reject blank sensor type")
    void shouldRejectBlankSensorType() {

        SensorRequest request = createValidRequest();

        request.setType("");

        Set<ConstraintViolation<SensorRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());

        assertTrue(
                violations.stream()
                        .anyMatch(v ->
                                v.getMessage().equals(
                                        "Sensor type is required"
                                ))
        );
    }

    @Test
    @DisplayName("Should reject sensor type shorter than 2 characters")
    void shouldRejectSensorTypeTooShort() {

        SensorRequest request = createValidRequest();

        request.setType("A");

        Set<ConstraintViolation<SensorRequest>> violations =
                validator.validate(request);

        assertEquals(1, violations.size());

        assertEquals(
                "Sensor type must be between 2 and 50 characters",
                violations.iterator().next().getMessage()
        );
    }

    @Test
    @DisplayName("Should reject sensor type longer than 50 characters")
    void shouldRejectSensorTypeTooLong() {

        SensorRequest request = createValidRequest();

        request.setType("A".repeat(51));

        Set<ConstraintViolation<SensorRequest>> violations =
                validator.validate(request);

        assertEquals(1, violations.size());

        assertEquals(
                "Sensor type must be between 2 and 50 characters",
                violations.iterator().next().getMessage()
        );
    }

    @Test
    @DisplayName("Should reject blank sensor unit")
    void shouldRejectBlankSensorUnit() {

        SensorRequest request = createValidRequest();

        request.setUnit("");

        Set<ConstraintViolation<SensorRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());

        assertTrue(
                violations.stream()
                        .anyMatch(v ->
                                v.getMessage().equals(
                                        "Sensor unit is required"
                                ))
        );
    }

    @Test
    @DisplayName("Should reject sensor unit longer than 20 characters")
    void shouldRejectSensorUnitTooLong() {

        SensorRequest request = createValidRequest();

        request.setUnit("A".repeat(21));

        Set<ConstraintViolation<SensorRequest>> violations =
                validator.validate(request);

        assertEquals(1, violations.size());

        assertEquals(
                "Sensor unit must be between 1 and 20 characters",
                violations.iterator().next().getMessage()
        );
    }

    @Test
    @DisplayName("Should reject null machine ID")
    void shouldRejectNullMachineId() {

        SensorRequest request = createValidRequest();

        request.setMachineId(null);

        Set<ConstraintViolation<SensorRequest>> violations =
                validator.validate(request);

        assertEquals(1, violations.size());

        assertEquals(
                "Machine ID is required",
                violations.iterator().next().getMessage()
        );
    }

    @Test
    @DisplayName("Should allow null active value")
    void shouldAllowNullActiveValue() {

        SensorRequest request = createValidRequest();

        request.setActive(null);

        Set<ConstraintViolation<SensorRequest>> violations =
                validator.validate(request);

        assertTrue(violations.isEmpty());
    }

    @Test
    @DisplayName("Should detect multiple validation errors")
    void shouldDetectMultipleValidationErrors() {

        SensorRequest request = new SensorRequest();

        request.setName("");
        request.setType("");
        request.setUnit("");
        request.setMachineId(null);

        Set<ConstraintViolation<SensorRequest>> violations =
                validator.validate(request);

        long distinctProperties = violations.stream()
                .map(v -> v.getPropertyPath().toString())
                .distinct()
                .count();

        assertEquals(4, distinctProperties);
    }
}