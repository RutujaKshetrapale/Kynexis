package com.example.demo.exception;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;

class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler exceptionHandler;
    private HttpServletRequest request;

    @BeforeEach
    void setUp() {
        exceptionHandler = new GlobalExceptionHandler();
        request = mock(HttpServletRequest.class);
        when(request.getRequestURI()).thenReturn("/api/test");
    }

    @Test
    @DisplayName("Should handle ResourceNotFoundException")
    void shouldHandleResourceNotFoundException() {
        ResourceNotFoundException ex = new ResourceNotFoundException("Resource not found with ID: 1");

        ResponseEntity<ErrorResponse> response = exceptionHandler.handleResourceNotFound(ex, request);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        ErrorResponse body = response.getBody();
        assertNotNull(body);
        assertEquals(404, body.getStatus());
        assertEquals("NOT_FOUND", body.getError());
        assertEquals("Resource not found with ID: 1", body.getMessage());
        assertEquals("/api/test", body.getPath());
        assertNotNull(body.getTimestamp());
    }

    @Test
    @DisplayName("Should handle BusinessValidationException")
    void shouldHandleBusinessValidationException() {
        BusinessValidationException ex = new BusinessValidationException("Quantity produced cannot be negative");

        ResponseEntity<ErrorResponse> response = exceptionHandler.handleBusinessValidation(ex, request);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        ErrorResponse body = response.getBody();
        assertNotNull(body);
        assertEquals(400, body.getStatus());
        assertEquals("BUSINESS_VALIDATION_FAILED", body.getError());
        assertEquals("Quantity produced cannot be negative", body.getMessage());
        assertEquals("/api/test", body.getPath());
        assertNotNull(body.getTimestamp());
    }

    @Test
    @DisplayName("Should handle AccessDeniedException")
    void shouldHandleAccessDeniedException() {
        AccessDeniedException ex = new AccessDeniedException("Access is denied");

        ResponseEntity<ErrorResponse> response = exceptionHandler.handleAccessDenied(ex, request);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        ErrorResponse body = response.getBody();
        assertNotNull(body);
        assertEquals(403, body.getStatus());
        assertEquals("FORBIDDEN", body.getError());
        assertEquals("You do not have permission to access this resource", body.getMessage());
        assertEquals("/api/test", body.getPath());
        assertNotNull(body.getTimestamp());
    }

    @Test
    @DisplayName("Should handle MethodArgumentNotValidException")
    void shouldHandleMethodArgumentNotValidException() throws Exception {
        Object target = new Object();
        BindingResult bindingResult = new BeanPropertyBindingResult(target, "target");
        bindingResult.addError(new FieldError("target", "name", "Plant name is required"));

        MethodParameter methodParameter = new MethodParameter(
                this.getClass().getDeclaredMethod("dummyMethod", String.class), 0);

        MethodArgumentNotValidException ex = new MethodArgumentNotValidException(methodParameter, bindingResult);

        ResponseEntity<Map<String, Object>> response = exceptionHandler.handleValidationException(ex, request);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        Map<String, Object> body = response.getBody();
        assertNotNull(body);
        assertEquals(400, body.get("status"));
        assertEquals("VALIDATION_FAILED", body.get("error"));
        assertEquals("Request validation failed", body.get("message"));
        assertEquals("/api/test", body.get("path"));
        assertNotNull(body.get("timestamp"));
        assertNotNull(body.get("errors"));

        @SuppressWarnings("unchecked")
        Map<String, String> errorsMap = (Map<String, String>) body.get("errors");
        assertEquals("Plant name is required", errorsMap.get("name"));
    }

    @Test
    @DisplayName("Should handle generic Exception")
    void shouldHandleGenericException() {
        Exception ex = new NullPointerException("Null reference");

        ResponseEntity<ErrorResponse> response = exceptionHandler.handleGeneralException(ex, request);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        ErrorResponse body = response.getBody();
        assertNotNull(body);
        assertEquals(500, body.getStatus());
        assertEquals("INTERNAL_SERVER_ERROR", body.getError());
        assertEquals("An unexpected error occurred", body.getMessage());
        assertEquals("/api/test", body.getPath());
        assertNotNull(body.getTimestamp());
    }

    @SuppressWarnings("unused")
    private void dummyMethod(String param) {
    }
}
