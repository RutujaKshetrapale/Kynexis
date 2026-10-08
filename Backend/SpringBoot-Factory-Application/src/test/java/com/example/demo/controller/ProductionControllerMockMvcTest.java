package com.example.demo.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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

import com.example.demo.entity.Production;
import com.example.demo.exception.GlobalExceptionHandler;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.service.ProductionService;

@ExtendWith(MockitoExtension.class)
class ProductionControllerMockMvcTest {

    private MockMvc mockMvc;

    @Mock
    private ProductionService productionService;

    private ProductionController productionController;

    private Production production;

    @BeforeEach
    void setUp() {
        productionController = new ProductionController(productionService);
        mockMvc = MockMvcBuilders
                .standaloneSetup(productionController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        production = new Production();
        production.setId(1L);
        production.setProductName("Gearbox Assembly");
        production.setQuantityProduced(500);
        production.setQuantityRejected(5);
        production.setStatus("COMPLETED");
        production.setProductionStart(LocalDateTime.now().minusHours(4));
        production.setProductionEnd(LocalDateTime.now());
    }

    @Test
    @DisplayName("Should create production log successfully")
    void shouldCreateProduction() throws Exception {
        when(productionService.create(any())).thenReturn(production);

        String json = """
                {
                    "machineId": 1,
                    "productName": "Gearbox Assembly",
                    "quantityProduced": 500,
                    "quantityRejected": 5,
                    "status": "COMPLETED",
                    "productionStart": "2026-10-08T10:00:00"
                }
                """;

        mockMvc.perform(post("/api/production")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.productName").value("Gearbox Assembly"));
    }

    @Test
    @DisplayName("Should get production by ID")
    void shouldGetProductionById() throws Exception {
        when(productionService.getById(1L)).thenReturn(production);

        mockMvc.perform(get("/api/production/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.productName").value("Gearbox Assembly"));
    }

    @Test
    @DisplayName("Should return 404 when production not found")
    void shouldReturn404WhenNotFound() throws Exception {
        when(productionService.getById(99L)).thenThrow(new ResourceNotFoundException("Production log not found with ID: 99"));

        mockMvc.perform(get("/api/production/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("NOT_FOUND"));
    }

    @Test
    @DisplayName("Should update production log")
    void shouldUpdateProduction() throws Exception {
        when(productionService.update(eq(1L), any())).thenReturn(production);

        String json = """
                {
                    "machineId": 1,
                    "productName": "Gearbox Assembly",
                    "quantityProduced": 550,
                    "quantityRejected": 5,
                    "status": "COMPLETED",
                    "productionStart": "2026-10-08T10:00:00"
                }
                """;

        mockMvc.perform(put("/api/production/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1));
    }

    @Test
    @DisplayName("Should delete production log")
    void shouldDeleteProduction() throws Exception {
        doNothing().when(productionService).delete(1L);

        mockMvc.perform(delete("/api/production/1"))
                .andExpect(status().isNoContent());
    }
}
