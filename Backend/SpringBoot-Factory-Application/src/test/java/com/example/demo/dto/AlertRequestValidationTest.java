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

class AlertRequestValidationTest {

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

    private AlertRequest createValidRequest() {

        AlertRequest request =
                new AlertRequest();

        request.setMachineId(1L);
        request.setType("TEMPERATURE");
        request.setSeverity("HIGH");
        request.setMessage(
                "Temperature exceeded threshold"
        );
        request.setResolved(false);

        return request;
    }

    @Test
    void shouldAcceptValidAlertRequest() {

        AlertRequest request =
                createValidRequest();

        Set<ConstraintViolation<AlertRequest>> violations =
                validator.validate(request);

        assertTrue(violations.isEmpty());
    }

    @Test
    void shouldRejectNullMachineId() {

        AlertRequest request =
                createValidRequest();

        request.setMachineId(null);

        Set<ConstraintViolation<AlertRequest>> violations =
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
    void shouldRejectBlankType() {

        AlertRequest request =
                createValidRequest();

        request.setType("");

        Set<ConstraintViolation<AlertRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldRejectTypeThatIsTooShort() {

        AlertRequest request =
                createValidRequest();

        request.setType("A");

        Set<ConstraintViolation<AlertRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldAcceptTypeWithMinimumLength() {

        AlertRequest request =
                createValidRequest();

        request.setType("AB");

        Set<ConstraintViolation<AlertRequest>> violations =
                validator.validate(request);

        assertTrue(violations.isEmpty());
    }

    @Test
    void shouldRejectTypeThatIsTooLong() {

        AlertRequest request =
                createValidRequest();

        request.setType("A".repeat(51));

        Set<ConstraintViolation<AlertRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldAcceptTypeWithMaximumLength() {

        AlertRequest request =
                createValidRequest();

        request.setType("A".repeat(50));

        Set<ConstraintViolation<AlertRequest>> violations =
                validator.validate(request);

        assertTrue(violations.isEmpty());
    }

    @Test
    void shouldRejectBlankSeverity() {

        AlertRequest request =
                createValidRequest();

        request.setSeverity("");

        Set<ConstraintViolation<AlertRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldRejectSeverityThatIsTooShort() {

        AlertRequest request =
                createValidRequest();

        request.setSeverity("A");

        Set<ConstraintViolation<AlertRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldAcceptSeverityWithMinimumLength() {

        AlertRequest request =
                createValidRequest();

        request.setSeverity("AB");

        Set<ConstraintViolation<AlertRequest>> violations =
                validator.validate(request);

        assertTrue(violations.isEmpty());
    }

    @Test
    void shouldRejectSeverityThatIsTooLong() {

        AlertRequest request =
                createValidRequest();

        request.setSeverity("A".repeat(31));

        Set<ConstraintViolation<AlertRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldAcceptSeverityWithMaximumLength() {

        AlertRequest request =
                createValidRequest();

        request.setSeverity("A".repeat(30));

        Set<ConstraintViolation<AlertRequest>> violations =
                validator.validate(request);

        assertTrue(violations.isEmpty());
    }

    @Test
    void shouldRejectBlankMessage() {

        AlertRequest request =
                createValidRequest();

        request.setMessage("");

        Set<ConstraintViolation<AlertRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldRejectMessageThatIsTooShort() {

        AlertRequest request =
                createValidRequest();

        request.setMessage("A");

        Set<ConstraintViolation<AlertRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldAcceptMessageWithMinimumLength() {

        AlertRequest request =
                createValidRequest();

        request.setMessage("AB");

        Set<ConstraintViolation<AlertRequest>> violations =
                validator.validate(request);

        assertTrue(violations.isEmpty());
    }

    @Test
    void shouldRejectMessageThatIsTooLong() {

        AlertRequest request =
                createValidRequest();

        request.setMessage("A".repeat(501));

        Set<ConstraintViolation<AlertRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldAcceptMessageWithMaximumLength() {

        AlertRequest request =
                createValidRequest();

        request.setMessage("A".repeat(500));

        Set<ConstraintViolation<AlertRequest>> violations =
                validator.validate(request);

        assertTrue(violations.isEmpty());
    }

    @Test
    void shouldAcceptResolvedTrue() {

        AlertRequest request =
                createValidRequest();

        request.setResolved(true);

        Set<ConstraintViolation<AlertRequest>> violations =
                validator.validate(request);

        assertTrue(violations.isEmpty());
    }

    @Test
    void shouldAcceptResolvedFalse() {

        AlertRequest request =
                createValidRequest();

        request.setResolved(false);

        Set<ConstraintViolation<AlertRequest>> violations =
                validator.validate(request);

        assertTrue(violations.isEmpty());
    }

    @Test
    void shouldRejectMultipleInvalidFields() {

        AlertRequest request =
                new AlertRequest();

        request.setMachineId(null);
        request.setType("A");
        request.setSeverity("A");
        request.setMessage("A");

        Set<ConstraintViolation<AlertRequest>> violations =
                validator.validate(request);

        assertTrue(violations.size() >= 4);
    }
}
