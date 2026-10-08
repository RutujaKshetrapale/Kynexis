package com.example.demo.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.lang.reflect.Field;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.example.demo.dto.LoginResponse;
import com.example.demo.entity.Role;
import com.example.demo.entity.User;
import com.example.demo.exception.GlobalExceptionHandler;
import com.example.demo.service.AuthService;

@ExtendWith(MockitoExtension.class)
class AuthControllerMockMvcTest {

    private MockMvc mockMvc;

    @Mock
    private AuthService authService;

    private AuthController authController;

    @BeforeEach
    void setUp() {
        authController = new AuthController(authService);
        mockMvc = MockMvcBuilders
                .standaloneSetup(authController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    private void setId(Object target, Long id) throws Exception {
        Field field = target.getClass().getDeclaredField("id");
        field.setAccessible(true);
        field.set(target, id);
    }

    @Test
    @DisplayName("Should register new user successfully")
    void shouldRegisterUser() throws Exception {
        User user = new User();
        setId(user, 1L);
        user.setUsername("newuser");
        user.setEmail("newuser@example.com");
        user.setRole(Role.OPERATOR);
        user.setActive(true);

        when(authService.register(any())).thenReturn(user);

        String json = """
                {
                    "username": "newuser",
                    "email": "newuser@example.com",
                    "password": "password123"
                }
                """;

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.username").value("newuser"))
                .andExpect(jsonPath("$.email").value("newuser@example.com"))
                .andExpect(jsonPath("$.role").value("OPERATOR"));
    }

    @Test
    @DisplayName("Should login user successfully")
    void shouldLoginUser() throws Exception {
        LoginResponse response = new LoginResponse("mock.jwt.token", "testuser", "OPERATOR");
        when(authService.login(any())).thenReturn(response);

        String json = """
                {
                    "username": "testuser",
                    "password": "password123"
                }
                """;

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("mock.jwt.token"))
                .andExpect(jsonPath("$.username").value("testuser"))
                .andExpect(jsonPath("$.role").value("OPERATOR"));
    }

    @Test
    @DisplayName("Should return 400 when registration request is invalid")
    void shouldReturn400OnInvalidRegister() throws Exception {
        String json = """
                {
                    "username": "",
                    "email": "invalid-email",
                    "password": "123"
                }
                """;

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("VALIDATION_FAILED"));
    }
}
