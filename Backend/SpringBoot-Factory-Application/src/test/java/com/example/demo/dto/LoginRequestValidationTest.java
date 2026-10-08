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

class LoginRequestValidationTest {

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

    private LoginRequest createValidRequest() {
        LoginRequest request = new LoginRequest();
        request.setUsername("operator1");
        request.setPassword("password123");
        return request;
    }

    @Test
    @DisplayName("Should accept valid login request")
    void shouldAcceptValidLoginRequest() {
        LoginRequest request = createValidRequest();
        Set<ConstraintViolation<LoginRequest>> violations = validator.validate(request);
        assertTrue(violations.isEmpty());
    }

    @Test
    @DisplayName("Should reject blank username")
    void shouldRejectBlankUsername() {
        LoginRequest request = createValidRequest();
        request.setUsername("");
        Set<ConstraintViolation<LoginRequest>> violations = validator.validate(request);
        assertFalse(violations.isEmpty());
    }

    @Test
    @DisplayName("Should reject username that is too short")
    void shouldRejectUsernameTooShort() {
        LoginRequest request = createValidRequest();
        request.setUsername("ab");
        Set<ConstraintViolation<LoginRequest>> violations = validator.validate(request);
        assertFalse(violations.isEmpty());
    }

    @Test
    @DisplayName("Should reject username that is too long")
    void shouldRejectUsernameTooLong() {
        LoginRequest request = createValidRequest();
        request.setUsername("a".repeat(51));
        Set<ConstraintViolation<LoginRequest>> violations = validator.validate(request);
        assertFalse(violations.isEmpty());
    }

    @Test
    @DisplayName("Should reject blank password")
    void shouldRejectBlankPassword() {
        LoginRequest request = createValidRequest();
        request.setPassword("");
        Set<ConstraintViolation<LoginRequest>> violations = validator.validate(request);
        assertFalse(violations.isEmpty());
    }

    @Test
    @DisplayName("Should reject password that is too short")
    void shouldRejectPasswordTooShort() {
        LoginRequest request = createValidRequest();
        request.setPassword("pass");
        Set<ConstraintViolation<LoginRequest>> violations = validator.validate(request);
        assertFalse(violations.isEmpty());
    }

    @Test
    @DisplayName("Should detect multiple validation errors")
    void shouldDetectMultipleValidationErrors() {
        LoginRequest request = new LoginRequest();
        request.setUsername("a");
        request.setPassword("b");

        Set<ConstraintViolation<LoginRequest>> violations = validator.validate(request);
        long distinctProperties = violations.stream()
                .map(v -> v.getPropertyPath().toString())
                .distinct()
                .count();

        assertEquals(2, distinctProperties);
    }
}
