package com.example.demo.dto;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.util.Set;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

class MaintenanceRequestValidationTest {

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

    private MaintenanceRequest createValidRequest() {

        MaintenanceRequest request =
                new MaintenanceRequest();

        request.setMachineId(1L);

        request.setType(
                "Preventive"
        );

        request.setDescription(
                "Regular preventive maintenance"
        );

        request.setScheduledDate(
                LocalDate.now().plusDays(7)
        );

        request.setCompletedDate(null);

        request.setStatus(
                "SCHEDULED"
        );

        request.setTechnician(
                "John Smith"
        );

        return request;
    }

    @Test
    void shouldAcceptValidMaintenanceRequest() {

        MaintenanceRequest request =
                createValidRequest();

        Set<ConstraintViolation<MaintenanceRequest>> violations =
                validator.validate(request);

        assertTrue(violations.isEmpty());
    }

    @Test
    void shouldRejectNullMachineId() {

        MaintenanceRequest request =
                createValidRequest();

        request.setMachineId(null);

        Set<ConstraintViolation<MaintenanceRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldRejectBlankType() {

        MaintenanceRequest request =
                createValidRequest();

        request.setType("");

        Set<ConstraintViolation<MaintenanceRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldRejectTypeTooShort() {

        MaintenanceRequest request =
                createValidRequest();

        request.setType("A");

        Set<ConstraintViolation<MaintenanceRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldRejectTypeTooLong() {

        MaintenanceRequest request =
                createValidRequest();

        request.setType("A".repeat(51));

        Set<ConstraintViolation<MaintenanceRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldRejectBlankDescription() {

        MaintenanceRequest request =
                createValidRequest();

        request.setDescription("");

        Set<ConstraintViolation<MaintenanceRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldRejectDescriptionTooShort() {

        MaintenanceRequest request =
                createValidRequest();

        request.setDescription("ABCD");

        Set<ConstraintViolation<MaintenanceRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldRejectDescriptionTooLong() {

        MaintenanceRequest request =
                createValidRequest();

        request.setDescription("A".repeat(501));

        Set<ConstraintViolation<MaintenanceRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldRejectNullScheduledDate() {

        MaintenanceRequest request =
                createValidRequest();

        request.setScheduledDate(null);

        Set<ConstraintViolation<MaintenanceRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldRejectPastScheduledDate() {

        MaintenanceRequest request =
                createValidRequest();

        request.setScheduledDate(
                LocalDate.now().minusDays(1)
        );

        Set<ConstraintViolation<MaintenanceRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldAcceptTodayScheduledDate() {

        MaintenanceRequest request =
                createValidRequest();

        request.setScheduledDate(
                LocalDate.now()
        );

        Set<ConstraintViolation<MaintenanceRequest>> violations =
                validator.validate(request);

        assertTrue(violations.isEmpty());
    }

    @Test
    void shouldAcceptNullCompletedDate() {

        MaintenanceRequest request =
                createValidRequest();

        request.setCompletedDate(null);

        Set<ConstraintViolation<MaintenanceRequest>> violations =
                validator.validate(request);

        assertTrue(violations.isEmpty());
    }

    @Test
    void shouldRejectBlankStatus() {

        MaintenanceRequest request =
                createValidRequest();

        request.setStatus("");

        Set<ConstraintViolation<MaintenanceRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldRejectStatusTooShort() {

        MaintenanceRequest request =
                createValidRequest();

        request.setStatus("A");

        Set<ConstraintViolation<MaintenanceRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldRejectStatusTooLong() {

        MaintenanceRequest request =
                createValidRequest();

        request.setStatus("A".repeat(31));

        Set<ConstraintViolation<MaintenanceRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldRejectBlankTechnician() {

        MaintenanceRequest request =
                createValidRequest();

        request.setTechnician("");

        Set<ConstraintViolation<MaintenanceRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldRejectTechnicianTooShort() {

        MaintenanceRequest request =
                createValidRequest();

        request.setTechnician("A");

        Set<ConstraintViolation<MaintenanceRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldRejectTechnicianTooLong() {

        MaintenanceRequest request =
                createValidRequest();

        request.setTechnician("A".repeat(101));

        Set<ConstraintViolation<MaintenanceRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldDetectMultipleValidationErrors() {

        MaintenanceRequest request =
                new MaintenanceRequest();

        request.setMachineId(null);
        request.setType("A");
        request.setDescription("ABCD");
        request.setScheduledDate(
                LocalDate.now().minusDays(1)
        );
        request.setStatus("A");
        request.setTechnician("A");

        Set<ConstraintViolation<MaintenanceRequest>> violations =
                validator.validate(request);

        assertTrue(violations.size() >= 6);
    }
}
