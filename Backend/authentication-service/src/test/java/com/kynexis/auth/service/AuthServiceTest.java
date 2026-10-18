package com.kynexis.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.kynexis.auth.common.exception.BusinessValidationException;
import com.kynexis.auth.dto.LoginRequest;
import com.kynexis.auth.dto.LoginResponse;
import com.kynexis.auth.dto.RegisterRequest;
import com.kynexis.auth.dto.UserResponse;
import com.kynexis.auth.entity.Role;
import com.kynexis.auth.entity.User;
import com.kynexis.auth.repository.UserRepository;
import com.kynexis.auth.security.JwtService;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(userRepository, passwordEncoder, jwtService);
    }

    @Test
    void register_Success() {
        RegisterRequest request = RegisterRequest.builder()
                .username("testuser")
                .email("test@example.com")
                .password("secret123")
                .build();

        when(userRepository.existsByUsername("testuser")).thenReturn(false);
        when(userRepository.existsByEmail("test@example.com")).thenReturn(false);
        when(passwordEncoder.encode("secret123")).thenReturn("encoded-secret");

        User savedUser = User.builder()
                .id(1L)
                .username("testuser")
                .email("test@example.com")
                .password("encoded-secret")
                .role(Role.OPERATOR)
                .active(true)
                .build();
        when(userRepository.save(any(User.class))).thenReturn(savedUser);

        UserResponse response = authService.register(request);

        assertThat(response.getId()).isEqualTo(1L);
        assertThat(response.getUsername()).isEqualTo("testuser");
        assertThat(response.getEmail()).isEqualTo("test@example.com");
        assertThat(response.getRole()).isEqualTo("OPERATOR");
        assertThat(response.isActive()).isTrue();
    }

    @Test
    void register_ThrowsWhenUsernameExists() {
        RegisterRequest request = RegisterRequest.builder()
                .username("existing")
                .email("test@example.com")
                .password("secret123")
                .build();

        when(userRepository.existsByUsername("existing")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("USERNAME ALREADY EXISTS");
    }

    @Test
    void register_ThrowsWhenEmailExists() {
        RegisterRequest request = RegisterRequest.builder()
                .username("newuser")
                .email("existing@example.com")
                .password("secret123")
                .build();

        when(userRepository.existsByUsername("newuser")).thenReturn(false);
        when(userRepository.existsByEmail("existing@example.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("EMAIL ALREADY EXISTS");
    }

    @Test
    void login_Success() {
        LoginRequest request = LoginRequest.builder()
                .username("testuser")
                .password("secret123")
                .build();

        User user = User.builder()
                .id(1L)
                .username("testuser")
                .email("test@example.com")
                .password("encoded-secret")
                .role(Role.ADMIN)
                .active(true)
                .build();

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("secret123", "encoded-secret")).thenReturn(true);
        when(jwtService.generateToken("testuser", "ADMIN")).thenReturn("mock-jwt-token");

        LoginResponse response = authService.login(request);

        assertThat(response.getToken()).isEqualTo("mock-jwt-token");
        assertThat(response.getUsername()).isEqualTo("testuser");
        assertThat(response.getRole()).isEqualTo("ADMIN");
    }

    @Test
    void login_ThrowsWhenUserNotFound() {
        LoginRequest request = LoginRequest.builder()
                .username("nonexistent")
                .password("secret123")
                .build();

        when(userRepository.findByUsername("nonexistent")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("INVALID USERNAME OR PASSWORD");
    }

    @Test
    void login_ThrowsWhenPasswordMismatch() {
        LoginRequest request = LoginRequest.builder()
                .username("testuser")
                .password("wrongpassword")
                .build();

        User user = User.builder()
                .id(1L)
                .username("testuser")
                .password("encoded-secret")
                .role(Role.OPERATOR)
                .active(true)
                .build();

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrongpassword", "encoded-secret")).thenReturn(false);

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("INVALID USERNAME OR PASSWORD");
    }

    @Test
    void login_ThrowsWhenUserInactive() {
        LoginRequest request = LoginRequest.builder()
                .username("inactiveuser")
                .password("secret123")
                .build();

        User user = User.builder()
                .id(2L)
                .username("inactiveuser")
                .password("encoded-secret")
                .role(Role.OPERATOR)
                .active(false)
                .build();

        when(userRepository.findByUsername("inactiveuser")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("USER ACCOUNT IS INACTIVE");
    }
}
