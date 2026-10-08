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

class ProductionRequestValidationTest {

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

    private ProductionRequest createValidRequest() {

        ProductionRequest request =
                new ProductionRequest();

        request.setProductName("Product A");
        request.setQuantityProduced(100);
        request.setQuantityRejected(5);

        request.setProductionStart(
                LocalDateTime.now().minusHours(2)
        );

        request.setProductionEnd(
                LocalDateTime.now()
        );

        request.setStatus("COMPLETED");
        request.setMachineId(1L);

        return request;
    }

    @Test
    void shouldAcceptValidProductionRequest() {

        ProductionRequest request =
                createValidRequest();

        Set<ConstraintViolation<ProductionRequest>> violations =
                validator.validate(request);

        assertTrue(violations.isEmpty());
    }

    @Test
    void shouldRejectBlankProductName() {

        ProductionRequest request =
                createValidRequest();

        request.setProductName("");

        Set<ConstraintViolation<ProductionRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldRejectNullQuantityProduced() {

        ProductionRequest request =
                createValidRequest();

        request.setQuantityProduced(null);

        Set<ConstraintViolation<ProductionRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldRejectNegativeQuantityProduced() {

        ProductionRequest request =
                createValidRequest();

        request.setQuantityProduced(-1);

        Set<ConstraintViolation<ProductionRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldRejectNullQuantityRejected() {

        ProductionRequest request =
                createValidRequest();

        request.setQuantityRejected(null);

        Set<ConstraintViolation<ProductionRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldRejectNegativeQuantityRejected() {

        ProductionRequest request =
                createValidRequest();

        request.setQuantityRejected(-1);

        Set<ConstraintViolation<ProductionRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldRejectNullProductionStart() {

        ProductionRequest request =
                createValidRequest();

        request.setProductionStart(null);

        Set<ConstraintViolation<ProductionRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldAcceptNullProductionEnd() {

        ProductionRequest request =
                createValidRequest();

        request.setProductionEnd(null);

        Set<ConstraintViolation<ProductionRequest>> violations =
                validator.validate(request);

        assertTrue(violations.isEmpty());
    }

    @Test
    void shouldRejectBlankStatus() {

        ProductionRequest request =
                createValidRequest();

        request.setStatus("");

        Set<ConstraintViolation<ProductionRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldRejectNullMachineId() {

        ProductionRequest request =
                createValidRequest();

        request.setMachineId(null);

        Set<ConstraintViolation<ProductionRequest>> violations =
                validator.validate(request);

        assertFalse(violations.isEmpty());
    }

    @Test
    void shouldAcceptZeroQuantities() {

        ProductionRequest request =
                createValidRequest();

        request.setQuantityProduced(0);
        request.setQuantityRejected(0);

        Set<ConstraintViolation<ProductionRequest>> violations =
                validator.validate(request);

        assertTrue(violations.isEmpty());
    }
}
