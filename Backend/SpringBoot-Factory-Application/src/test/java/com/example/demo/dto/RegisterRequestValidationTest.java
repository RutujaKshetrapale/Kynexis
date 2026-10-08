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

class RegisterRequestValidationTest {

    private static ValidatorFactory validatorFactory;
    private static Validator validator;

    @BeforeAll
    static void setUp() {
        validatorFactory = Validation.buildDefaultValidatorFactory();
        validator = validatorFactory.getValidator();
    }

    @AfterAll
    static void tearDown() {
        validatorFactory.close();
    }

    private RegisterRequest createValidRequest() {
        RegisterRequest request = new RegisterRequest();
        request.setUsername("newuser");
        request.setEmail("user@example.com");
        request.setPassword("password123");
        return request;
    }

    @Test
    @DisplayName("Should accept valid register request")
    void shouldAcceptValidRegisterRequest() {
        RegisterRequest request = createValidRequest();
        Set<ConstraintViolation<RegisterRequest>> violations = validator.validate(request);
        assertTrue(violations.isEmpty());
    }

    @Test
    @DisplayName("Should reject blank username")
    void shouldRejectBlankUsername() {
        RegisterRequest request = createValidRequest();
        request.setUsername("");
        Set<ConstraintViolation<RegisterRequest>> violations = validator.validate(request);
        assertFalse(violations.isEmpty());
    }

    @Test
    @DisplayName("Should reject invalid email format")
    void shouldRejectInvalidEmailFormat() {
        RegisterRequest request = createValidRequest();
        request.setEmail("not-an-email");
        Set<ConstraintViolation<RegisterRequest>> violations = validator.validate(request);
        assertFalse(violations.isEmpty());
    }

    @Test
    @DisplayName("Should reject password too short")
    void shouldRejectPasswordTooShort() {
        RegisterRequest request = createValidRequest();
        request.setPassword("short");
        Set<ConstraintViolation<RegisterRequest>> violations = validator.validate(request);
        assertFalse(violations.isEmpty());
    }

    @Test
    @DisplayName("Should detect multiple validation errors")
    void shouldDetectMultipleValidationErrors() {
        RegisterRequest request = new RegisterRequest();
        request.setUsername("a");
        request.setEmail("bademail");
        request.setPassword("123");

        Set<ConstraintViolation<RegisterRequest>> violations = validator.validate(request);
        long distinctProperties = violations.stream()
                .map(v -> v.getPropertyPath().toString())
                .distinct()
                .count();

        assertEquals(3, distinctProperties);
    }
}
