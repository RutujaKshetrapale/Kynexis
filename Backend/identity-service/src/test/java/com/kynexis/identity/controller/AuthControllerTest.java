package com.kynexis.identity.controller;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import com.kynexis.common.dto.UserResponse;
import com.kynexis.identity.dto.LoginRequest;
import com.kynexis.identity.dto.LoginResponse;
import com.kynexis.identity.dto.RegisterRequest;
import com.kynexis.identity.service.AuthService;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private AuthService authService;

    @InjectMocks
    private AuthController authController;

    private RegisterRequest registerRequest;
    private LoginRequest loginRequest;
    private UserResponse userResponse;
    private LoginResponse loginResponse;

    @BeforeEach
    void setUp() {
        registerRequest = RegisterRequest.builder()
                .username("operator1")
                .email("op1@kynexis.com")
                .password("Password123")
                .build();

        loginRequest = LoginRequest.builder()
                .username("operator1")
                .password("Password123")
                .build();

        userResponse = UserResponse.builder()
                .id(1L)
                .username("operator1")
                .email("op1@kynexis.com")
                .role("OPERATOR")
                .active(true)
                .build();

        loginResponse = LoginResponse.builder()
                .token("test.jwt.token")
                .username("operator1")
                .role("OPERATOR")
                .build();
    }

    @Test
    @DisplayName("POST /api/auth/register returns 201 CREATED")
    void testRegister() {
        when(authService.register(any(RegisterRequest.class))).thenReturn(userResponse);

        ResponseEntity<UserResponse> response = authController.register(registerRequest);

        assertNotNull(response);
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("operator1", response.getBody().getUsername());
        verify(authService).register(any(RegisterRequest.class));
    }

    @Test
    @DisplayName("POST /api/auth/login returns 200 OK")
    void testLogin() {
        when(authService.login(any(LoginRequest.class))).thenReturn(loginResponse);

        ResponseEntity<LoginResponse> response = authController.login(loginRequest);

        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("test.jwt.token", response.getBody().getToken());
        verify(authService).login(any(LoginRequest.class));
    }
}
