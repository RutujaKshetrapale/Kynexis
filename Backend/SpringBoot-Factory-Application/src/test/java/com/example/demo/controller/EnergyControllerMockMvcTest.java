package com.example.demo.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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

import com.example.demo.entity.Energy;
import com.example.demo.exception.GlobalExceptionHandler;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.service.EnergyService;

@ExtendWith(MockitoExtension.class)
class EnergyControllerMockMvcTest {

    private MockMvc mockMvc;

    @Mock
    private EnergyService energyService;

    private EnergyController energyController;

    private Energy energy;

    @BeforeEach
    void setUp() {
        energyController = new EnergyController(energyService);
        mockMvc = MockMvcBuilders
                .standaloneSetup(energyController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        energy = new Energy();
        energy.setId(1L);
        energy.setEnergyConsumption(250.75);
        energy.setRecordedAt(LocalDateTime.now());
    }

    @Test
    @DisplayName("Should record energy consumption successfully")
    void shouldCreateEnergy() throws Exception {
        when(energyService.create(any())).thenReturn(energy);

        String json = """
                {
                    "machineId": 1,
                    "energyConsumption": 250.75,
                    "recordedAt": "2026-10-08T10:00:00"
                }
                """;

        mockMvc.perform(post("/api/energy")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.energyConsumption").value(250.75));
    }

    @Test
    @DisplayName("Should return 400 on invalid energy data")
    void shouldReturn400OnInvalidEnergy() throws Exception {
        String json = """
                {
                    "machineId": null,
                    "energyConsumption": -10.0
                }
                """;

        mockMvc.perform(post("/api/energy")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("VALIDATION_FAILED"));
    }

    @Test
    @DisplayName("Should get energy by ID")
    void shouldGetEnergyById() throws Exception {
        when(energyService.getById(1L)).thenReturn(energy);

        mockMvc.perform(get("/api/energy/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.energyConsumption").value(250.75));
    }

    @Test
    @DisplayName("Should return 404 when energy record not found")
    void shouldReturn404WhenNotFound() throws Exception {
        when(energyService.getById(99L)).thenThrow(new ResourceNotFoundException("Energy record not found with ID: 99"));

        mockMvc.perform(get("/api/energy/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("NOT_FOUND"));
    }

    @Test
    @DisplayName("Should delete energy record")
    void shouldDeleteEnergy() throws Exception {
        doNothing().when(energyService).delete(1L);

        mockMvc.perform(delete("/api/energy/1"))
                .andExpect(status().isNoContent());
    }
}
