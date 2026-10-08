package com.example.demo.dto;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Set;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

class MachineRequestValidationTest {

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

    private MachineRequest createValidRequest() {

        MachineRequest request =
                new MachineRequest();

        request.setName(
                "CNC Machine"
        );

        request.setType(
                "CNC"
        );

        request.setStatus(
                "RUNNING"
        );

        request.setPlantId(
                1L
        );

        return request;
    }

    @Test
    void shouldAcceptValidMachineRequest() {

        MachineRequest request =
                createValidRequest();

        Set<ConstraintViolation<MachineRequest>> violations =
                validator.validate(request);

        assertTrue(violations.isEmpty());
    }

    @Test
    void shouldRejectBlankName() {

        MachineRequest request =
                createValidRequest();

        request.setName("");

        Set<ConstraintViolation<MachineRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldRejectNameTooShort() {

        MachineRequest request =
                createValidRequest();

        request.setName("A");

        Set<ConstraintViolation<MachineRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldRejectNameTooLong() {

        MachineRequest request =
                createValidRequest();

        request.setName("A".repeat(101));

        Set<ConstraintViolation<MachineRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldRejectBlankType() {

        MachineRequest request =
                createValidRequest();

        request.setType("");

        Set<ConstraintViolation<MachineRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldRejectTypeTooShort() {

        MachineRequest request =
                createValidRequest();

        request.setType("A");

        Set<ConstraintViolation<MachineRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldRejectTypeTooLong() {

        MachineRequest request =
                createValidRequest();

        request.setType("A".repeat(101));

        Set<ConstraintViolation<MachineRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldRejectBlankStatus() {

        MachineRequest request =
                createValidRequest();

        request.setStatus("");

        Set<ConstraintViolation<MachineRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldRejectStatusTooShort() {

        MachineRequest request =
                createValidRequest();

        request.setStatus("A");

        Set<ConstraintViolation<MachineRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldRejectStatusTooLong() {

        MachineRequest request =
                createValidRequest();

        request.setStatus("A".repeat(31));

        Set<ConstraintViolation<MachineRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldRejectNullPlantId() {

        MachineRequest request =
                createValidRequest();

        request.setPlantId(null);

        Set<ConstraintViolation<MachineRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldDetectMultipleValidationErrors() {

        MachineRequest request =
                new MachineRequest();

        request.setName("");
        request.setType("");
        request.setStatus("");
        request.setPlantId(null);

        Set<ConstraintViolation<MachineRequest>> violations =
                validator.validate(request);

        assertTrue(violations.size() >= 4);
    }
}
