package com.example.demo.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.example.demo.entity.Plant;
import com.example.demo.exception.GlobalExceptionHandler;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.service.PlantService;

@ExtendWith(MockitoExtension.class)
class PlantControllerMockMvcTest {

    private MockMvc mockMvc;

    @Mock
    private PlantService plantService;

    private PlantController plantController;

    @BeforeEach
    void setUp() {
        plantController = new PlantController(plantService);
        mockMvc = MockMvcBuilders
                .standaloneSetup(plantController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("Should create plant successfully")
    void shouldCreatePlantSuccessfully() throws Exception {
        Plant plant = new Plant("Pune Manufacturing Plant", "Pune, Maharashtra", true);
        plant.setId(1L);

        when(plantService.create(any())).thenReturn(plant);

        String requestBody = """
                {
                    "name": "Pune Manufacturing Plant",
                    "location": "Pune, Maharashtra",
                    "active": true
                }
                """;

        mockMvc.perform(post("/api/plants")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isCreated())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.name").value("Pune Manufacturing Plant"))
                .andExpect(jsonPath("$.location").value("Pune, Maharashtra"))
                .andExpect(jsonPath("$.active").value(true));
    }

    @Test
    @DisplayName("Should return 400 when creating plant with invalid data")
    void shouldReturn400OnInvalidPlantCreate() throws Exception {
        String requestBody = """
                {
                    "name": "",
                    "location": ""
                }
                """;

        mockMvc.perform(post("/api/plants")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.errors.name").exists())
                .andExpect(jsonPath("$.errors.location").exists());
    }

    @Test
    @DisplayName("Should get plant by ID successfully")
    void shouldGetPlantByIdSuccessfully() throws Exception {
        Plant plant = new Plant("Pune Manufacturing Plant", "Pune, Maharashtra", true);
        plant.setId(1L);

        when(plantService.getById(eq(1L))).thenReturn(plant);

        mockMvc.perform(get("/api/plants/1"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.name").value("Pune Manufacturing Plant"));
    }

    @Test
    @DisplayName("Should return 404 when plant not found")
    void shouldReturn404WhenPlantNotFound() throws Exception {
        when(plantService.getById(99L)).thenThrow(new ResourceNotFoundException("Plant not found with ID: 99"));

        mockMvc.perform(get("/api/plants/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("NOT_FOUND"))
                .andExpect(jsonPath("$.message").value("Plant not found with ID: 99"));
    }
}