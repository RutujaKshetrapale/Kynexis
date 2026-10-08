package com.example.demo.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.lang.reflect.Field;
import java.time.LocalDateTime;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.example.demo.entity.Alert;
import com.example.demo.exception.GlobalExceptionHandler;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.service.AlertService;

@ExtendWith(MockitoExtension.class)
class AlertControllerMockMvcTest {

    private MockMvc mockMvc;

    @Mock
    private AlertService alertService;

    private AlertController alertController;

    private Alert alert;

    @BeforeEach
    void setUp() throws Exception {
        alertController = new AlertController(alertService);
        mockMvc = MockMvcBuilders
                .standaloneSetup(alertController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        alert = new Alert();
        setId(alert, 1L);
        alert.setType("OVERHEAT");
        alert.setSeverity("HIGH");
        alert.setMessage("Machine temperature exceeded critical limit");
        alert.setResolved(false);
        alert.setCreatedAt(LocalDateTime.now());
    }

    private void setId(Object target, Long id) throws Exception {
        Field field = target.getClass().getDeclaredField("id");
        field.setAccessible(true);
        field.set(target, id);
    }

    @Test
    @DisplayName("Should create alert successfully via MockMvc")
    void shouldCreateAlert() throws Exception {
        when(alertService.create(any())).thenReturn(alert);

        String json = """
                {
                    "machineId": 1,
                    "type": "OVERHEAT",
                    "severity": "HIGH",
                    "message": "Machine temperature exceeded critical limit",
                    "resolved": false
                }
                """;

        mockMvc.perform(post("/api/alerts")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.type").value("OVERHEAT"))
                .andExpect(jsonPath("$.severity").value("HIGH"));
    }

    @Test
    @DisplayName("Should return 400 on invalid alert data")
    void shouldReturn400OnInvalidAlert() throws Exception {
        String json = """
                {
                    "machineId": null,
                    "type": ""
                }
                """;

        mockMvc.perform(post("/api/alerts")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("VALIDATION_FAILED"));
    }

    @Test
    @DisplayName("Should get alert by ID")
    void shouldGetAlertById() throws Exception {
        when(alertService.getById(1L)).thenReturn(alert);

        mockMvc.perform(get("/api/alerts/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.type").value("OVERHEAT"));
    }

    @Test
    @DisplayName("Should return 404 when alert not found")
    void shouldReturn404WhenAlertNotFound() throws Exception {
        when(alertService.getById(99L)).thenThrow(new ResourceNotFoundException("Alert not found with ID: 99"));

        mockMvc.perform(get("/api/alerts/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("NOT_FOUND"));
    }

    @Test
    @DisplayName("Should update alert")
    void shouldUpdateAlert() throws Exception {
        alert.setResolved(true);
        when(alertService.update(eq(1L), any())).thenReturn(alert);

        String json = """
                {
                    "machineId": 1,
                    "type": "OVERHEAT",
                    "severity": "HIGH",
                    "message": "Machine temperature exceeded critical limit",
                    "resolved": true
                }
                """;

        mockMvc.perform(put("/api/alerts/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.resolved").value(true));
    }
}
