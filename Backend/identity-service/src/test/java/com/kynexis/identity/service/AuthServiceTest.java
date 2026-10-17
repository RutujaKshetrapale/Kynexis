package com.kynexis.identity.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.kynexis.common.dto.UserResponse;
import com.kynexis.common.exception.BusinessValidationException;
import com.kynexis.common.security.JwtService;
import com.kynexis.identity.dto.LoginRequest;
import com.kynexis.identity.dto.LoginResponse;
import com.kynexis.identity.dto.RegisterRequest;
import com.kynexis.identity.entity.Role;
import com.kynexis.identity.entity.User;
import com.kynexis.identity.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @InjectMocks
    private AuthService authService;

    private RegisterRequest registerRequest;
    private LoginRequest loginRequest;
    private User user;

    @BeforeEach
    void setUp() {
        registerRequest = RegisterRequest.builder()
                .username("testuser")
                .email("test@example.com")
                .password("password123")
                .build();

        loginRequest = LoginRequest.builder()
                .username("testuser")
                .password("password123")
                .build();

        user = User.builder()
                .id(1L)
                .username("testuser")
                .email("test@example.com")
                .password("encoded_password")
                .role(Role.OPERATOR)
                .active(true)
                .build();
    }

    @Test
    @DisplayName("Register - Success with default OPERATOR role")
    void testRegisterSuccess() {
        when(userRepository.existsByUsername("testuser")).thenReturn(false);
        when(userRepository.existsByEmail("test@example.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("encoded_password");
        when(userRepository.save(any(User.class))).thenReturn(user);

        UserResponse response = authService.register(registerRequest);

        assertNotNull(response);
        assertEquals(1L, response.getId());
        assertEquals("testuser", response.getUsername());
        assertEquals("test@example.com", response.getEmail());
        assertEquals("OPERATOR", response.getRole());
        assertTrue(response.isActive());
        verify(userRepository).save(any(User.class));
    }

    @Test
    @DisplayName("Register - Duplicate username throws BusinessValidationException")
    void testRegisterDuplicateUsername() {
        when(userRepository.existsByUsername("testuser")).thenReturn(true);

        assertThrows(BusinessValidationException.class, () -> authService.register(registerRequest));
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Register - Duplicate email throws BusinessValidationException")
    void testRegisterDuplicateEmail() {
        when(userRepository.existsByUsername("testuser")).thenReturn(false);
        when(userRepository.existsByEmail("test@example.com")).thenReturn(true);

        assertThrows(BusinessValidationException.class, () -> authService.register(registerRequest));
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Login - Success returns token and user details")
    void testLoginSuccess() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("password123", "encoded_password")).thenReturn(true);
        when(jwtService.generateToken("testuser", "OPERATOR")).thenReturn("dummy_jwt_token");

        LoginResponse response = authService.login(loginRequest);

        assertNotNull(response);
        assertEquals("dummy_jwt_token", response.getToken());
        assertEquals("testuser", response.getUsername());
        assertEquals("OPERATOR", response.getRole());
    }

    @Test
    @DisplayName("Login - Invalid password throws BusinessValidationException")
    void testLoginInvalidPassword() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("password123", "encoded_password")).thenReturn(false);

        assertThrows(BusinessValidationException.class, () -> authService.login(loginRequest));
    }

    @Test
    @DisplayName("Login - Inactive user throws BusinessValidationException")
    void testLoginInactiveUser() {
        user.setActive(false);
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));

        assertThrows(BusinessValidationException.class, () -> authService.login(loginRequest));
    }
}
