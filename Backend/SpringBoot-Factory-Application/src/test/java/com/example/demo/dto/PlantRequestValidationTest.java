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
import org.junit.jupiter.api.Test;

class PlantRequestValidationTest {

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

    private PlantRequest createValidRequest() {

        PlantRequest request = new PlantRequest();

        request.setName("Pune Factory");
        request.setLocation("Pune, Maharashtra");

        return request;
    }

    @Test
    void shouldAcceptValidPlantRequest() {

        PlantRequest request =
                createValidRequest();

        Set<ConstraintViolation<PlantRequest>> violations =
                validator.validate(request);

        assertTrue(violations.isEmpty());
    }

    @Test
    void shouldRejectBlankPlantName() {

        PlantRequest request =
                createValidRequest();

        request.setName("");

        Set<ConstraintViolation<PlantRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());

        assertTrue(
                violations.stream()
                        .anyMatch(v ->
                                v.getPropertyPath()
                                        .toString()
                                        .equals("name"))
        );
    }

    @Test
    void shouldRejectPlantNameThatIsTooShort() {

        PlantRequest request =
                createValidRequest();

        request.setName("A");

        Set<ConstraintViolation<PlantRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldRejectPlantNameThatIsTooLong() {

        PlantRequest request =
                createValidRequest();

        request.setName("A".repeat(101));

        Set<ConstraintViolation<PlantRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldRejectBlankPlantLocation() {

        PlantRequest request =
                createValidRequest();

        request.setLocation("");

        Set<ConstraintViolation<PlantRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());

        assertTrue(
                violations.stream()
                        .anyMatch(v ->
                                v.getPropertyPath()
                                        .toString()
                                        .equals("location"))
        );
    }

    @Test
    void shouldRejectPlantLocationThatIsTooShort() {

        PlantRequest request =
                createValidRequest();

        request.setLocation("A");

        Set<ConstraintViolation<PlantRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldRejectPlantLocationThatIsTooLong() {

        PlantRequest request =
                createValidRequest();

        request.setLocation("A".repeat(151));

        Set<ConstraintViolation<PlantRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldDetectMultipleValidationErrors() {

        PlantRequest request =
                new PlantRequest();

        request.setName("A");
        request.setLocation("A");

        Set<ConstraintViolation<PlantRequest>> violations =
                validator.validate(request);

        assertEquals(2, violations.size());
    }
}
