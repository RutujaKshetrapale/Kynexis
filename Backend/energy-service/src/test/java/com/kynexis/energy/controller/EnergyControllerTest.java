package com.kynexis.energy.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.kynexis.energy.common.exception.GlobalExceptionHandler;
import com.kynexis.energy.dto.EnergyDTO;
import com.kynexis.energy.dto.EnergyMetricsDTO;
import com.kynexis.energy.dto.EnergyRequest;
import com.kynexis.energy.service.EnergyService;

@ExtendWith(MockitoExtension.class)
class EnergyControllerTest {

    private MockMvc mockMvc;

    @Mock
    private EnergyService energyService;

    @BeforeEach
    void setUp() {
        EnergyController controller = new EnergyController(energyService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void create_Success() throws Exception {
        String jsonPayload = """
                {
                    "machineId": 1,
                    "energyConsumption": 45.5,
                    "recordedAt": "2026-10-18T10:00:00"
                }
                """;

        EnergyDTO response = EnergyDTO.builder()
                .id(1L)
                .machineId(1L)
                .energyConsumption(45.5)
                .recordedAt(LocalDateTime.parse("2026-10-18T10:00:00"))
                .build();

        when(energyService.create(any(EnergyRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/energy")
                .contentType(MediaType.APPLICATION_JSON)
                .content(jsonPayload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.energyConsumption").value(45.5));
    }

    @Test
    void getAll_Success() throws Exception {
        EnergyDTO dto = EnergyDTO.builder()
                .id(1L)
                .machineId(1L)
                .energyConsumption(45.5)
                .build();

        when(energyService.getAll()).thenReturn(List.of(dto));

        mockMvc.perform(get("/api/energy"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].energyConsumption").value(45.5));
    }

    @Test
    void getById_Success() throws Exception {
        EnergyDTO dto = EnergyDTO.builder()
                .id(1L)
                .machineId(1L)
                .energyConsumption(45.5)
                .build();

        when(energyService.getById(1L)).thenReturn(dto);

        mockMvc.perform(get("/api/energy/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.energyConsumption").value(45.5));
    }

    @Test
    void getMetricsSummary_Success() throws Exception {
        EnergyMetricsDTO summary = EnergyMetricsDTO.builder()
                .totalEnergyConsumption(500.0)
                .build();

        when(energyService.getMetricsSummary()).thenReturn(summary);

        mockMvc.perform(get("/api/energy/metrics/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalEnergyConsumption").value(500.0));
    }

    @Test
    void delete_Success() throws Exception {
        mockMvc.perform(delete("/api/energy/1"))
                .andExpect(status().isNoContent());
    }
}
