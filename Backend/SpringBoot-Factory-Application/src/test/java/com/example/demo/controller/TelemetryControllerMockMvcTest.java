package com.example.demo.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.lang.reflect.Field;
import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.example.demo.entity.Machine;
import com.example.demo.entity.Telemetry;
import com.example.demo.exception.GlobalExceptionHandler;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.service.TelemetryService;

@ExtendWith(MockitoExtension.class)
class TelemetryControllerMockMvcTest {

    private MockMvc mockMvc;

    @Mock
    private TelemetryService telemetryService;

    private TelemetryController telemetryController;

    private Telemetry telemetry;

    @BeforeEach
    void setUp() throws Exception {
        telemetryController = new TelemetryController(telemetryService);
        mockMvc = MockMvcBuilders
                .standaloneSetup(telemetryController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        Machine machine = new Machine();
        machine.setName("CNC Machine");

        telemetry = new Telemetry();
        setId(telemetry, 1L);
        telemetry.setTemperature(75.5);
        telemetry.setVibration(0.4);
        telemetry.setPressure(2.1);
        telemetry.setRpm(1500.0);
        telemetry.setTimestamp(LocalDateTime.now());
        telemetry.setMachine(machine);
    }

    private void setId(Object target, Long id) throws Exception {
        Field field = target.getClass().getDeclaredField("id");
        field.setAccessible(true);
        field.set(target, id);
    }

    @Test
    @DisplayName("Should create telemetry successfully via MockMvc")
    void shouldCreateTelemetry() throws Exception {
        when(telemetryService.create(any())).thenReturn(telemetry);

        String json = """
                {
                    "machineId": 1,
                    "temperature": 75.5,
                    "vibration": 0.4,
                    "pressure": 2.1,
                    "rpm": 1500.0,
                    "timestamp": "2026-10-08T10:00:00"
                }
                """;

        mockMvc.perform(post("/api/telemetry")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.temperature").value(75.5));
    }

    @Test
    @DisplayName("Should return 400 when telemetry request is invalid")
    void shouldReturn400OnInvalidTelemetry() throws Exception {
        String json = """
                {
                    "machineId": null,
                    "temperature": null
                }
                """;

        mockMvc.perform(post("/api/telemetry")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("VALIDATION_FAILED"));
    }

    @Test
    @DisplayName("Should get paginated telemetry records")
    void shouldGetAllTelemetry() throws Exception {
        when(telemetryService.getAll(any())).thenReturn(new PageImpl<>(List.of(telemetry), PageRequest.of(0, 10), 1));

        mockMvc.perform(get("/api/telemetry?page=0&size=10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(1))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    @DisplayName("Should return 400 on negative page index")
    void shouldReturn400OnNegativePage() throws Exception {
        mockMvc.perform(get("/api/telemetry?page=-1&size=10"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("BUSINESS_VALIDATION_FAILED"));
    }

    @Test
    @DisplayName("Should get telemetry by ID")
    void shouldGetTelemetryById() throws Exception {
        when(telemetryService.getById(1L)).thenReturn(telemetry);

        mockMvc.perform(get("/api/telemetry/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1));
    }

    @Test
    @DisplayName("Should return 404 when telemetry not found")
    void shouldReturn404WhenTelemetryNotFound() throws Exception {
        when(telemetryService.getById(99L)).thenThrow(new ResourceNotFoundException("Telemetry reading not found with ID: 99"));

        mockMvc.perform(get("/api/telemetry/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("NOT_FOUND"));
    }

    @Test
    @DisplayName("Should get latest telemetry by machine ID")
    void shouldGetLatestTelemetryByMachine() throws Exception {
        when(telemetryService.getLatestByMachine(1L)).thenReturn(List.of(telemetry));

        mockMvc.perform(get("/api/telemetry/machine/1/latest"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1));
    }
}
