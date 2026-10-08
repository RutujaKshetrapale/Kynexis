package com.example.demo.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.lang.reflect.Field;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.example.demo.dto.LoginRequest;
import com.example.demo.dto.LoginResponse;
import com.example.demo.dto.RegisterRequest;
import com.example.demo.entity.Role;
import com.example.demo.entity.User;
import com.example.demo.repository.UserRepository;
import com.example.demo.security.JwtService;

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
    void setUp() throws Exception {
        registerRequest = new RegisterRequest();
        registerRequest.setUsername("testuser");
        registerRequest.setEmail("test@example.com");
        registerRequest.setPassword("password123");

        loginRequest = new LoginRequest();
        loginRequest.setUsername("testuser");
        loginRequest.setPassword("password123");

        user = new User();
        setId(user, 1L);
        user.setUsername("testuser");
        user.setEmail("test@example.com");
        user.setPassword("encodedPassword");
        user.setRole(Role.OPERATOR);
        user.setActive(true);
    }

    private void setId(Object target, Long id) throws Exception {
        Field field = target.getClass().getDeclaredField("id");
        field.setAccessible(true);
        field.set(target, id);
    }

    @Test
    @DisplayName("Should register new user successfully")
    void shouldRegisterUserSuccessfully() {
        when(userRepository.existsByUsername("testuser")).thenReturn(false);
        when(userRepository.existsByEmail("test@example.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("encodedPassword");
        when(userRepository.save(any(User.class))).thenReturn(user);

        User saved = authService.register(registerRequest);

        assertNotNull(saved);
        assertEquals("testuser", saved.getUsername());
        assertEquals(Role.OPERATOR, saved.getRole());
        assertTrue(saved.isActive());
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    @DisplayName("Should fail registration when username exists")
    void shouldFailRegistrationWhenUsernameExists() {
        when(userRepository.existsByUsername("testuser")).thenReturn(true);

        RuntimeException ex = assertThrows(RuntimeException.class, () -> authService.register(registerRequest));
        assertTrue(ex.getMessage().contains("USERNAME ALREADY EXISTS"));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Should fail registration when email exists")
    void shouldFailRegistrationWhenEmailExists() {
        when(userRepository.existsByUsername("testuser")).thenReturn(false);
        when(userRepository.existsByEmail("test@example.com")).thenReturn(true);

        RuntimeException ex = assertThrows(RuntimeException.class, () -> authService.register(registerRequest));
        assertTrue(ex.getMessage().contains("EMAIL ALREADY EXISTS"));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Should login successfully and return token")
    void shouldLoginSuccessfully() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("password123", "encodedPassword")).thenReturn(true);
        when(jwtService.generateToken(user)).thenReturn("mocked.jwt.token");

        LoginResponse response = authService.login(loginRequest);

        assertNotNull(response);
        assertEquals("mocked.jwt.token", response.getToken());
        assertEquals("testuser", response.getUsername());
        assertEquals("OPERATOR", response.getRole());
    }

    @Test
    @DisplayName("Should fail login when user not found")
    void shouldFailLoginWhenUserNotFound() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class, () -> authService.login(loginRequest));
        assertTrue(ex.getMessage().contains("INVALID USERNAME OR PASSWORD"));
    }

    @Test
    @DisplayName("Should fail login when user is inactive")
    void shouldFailLoginWhenUserInactive() {
        user.setActive(false);
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> authService.login(loginRequest));
        assertTrue(ex.getMessage().contains("USER ACCOUNT IS INACTIVE"));
    }

    @Test
    @DisplayName("Should fail login when password incorrect")
    void shouldFailLoginWhenPasswordIncorrect() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("password123", "encodedPassword")).thenReturn(false);

        RuntimeException ex = assertThrows(RuntimeException.class, () -> authService.login(loginRequest));
        assertTrue(ex.getMessage().contains("INVALID USERNAME OR PASSWORD"));
    }
}
