package com.kynexis.plant.controller;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.kynexis.plant.common.exception.GlobalExceptionHandler;
import com.kynexis.plant.dto.PlantDTO;
import com.kynexis.plant.service.PlantService;

class PlantControllerTest {

    private MockMvc mockMvc;
    private PlantService plantService;

    @BeforeEach
    void setUp() {
        plantService = mock(PlantService.class);
        PlantController controller = new PlantController(plantService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("GET /api/plants/{id} - Fetches plant successfully")
    void testGetPlantById() throws Exception {
        PlantDTO res = PlantDTO.builder().id(1L).name("Munich Plant").location("Munich, DE").active(true).build();
        when(plantService.getById(1L)).thenReturn(res);

        mockMvc.perform(get("/api/plants/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.name").value("Munich Plant"));
    }

    @Test
    @DisplayName("GET /api/plants/count - Returns count")
    void testCount() throws Exception {
        when(plantService.count()).thenReturn(5L);

        mockMvc.perform(get("/api/plants/count"))
                .andExpect(status().isOk())
                .andExpect(content().string("5"));
    }

    @Test
    @DisplayName("GET /api/plants/1/exists - Check plant existence")
    void testExistsById() throws Exception {
        when(plantService.existsById(1L)).thenReturn(true);

        mockMvc.perform(get("/api/plants/1/exists"))
                .andExpect(status().isOk())
                .andExpect(content().string("true"));
    }
}
