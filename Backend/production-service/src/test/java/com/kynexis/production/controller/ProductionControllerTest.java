package com.kynexis.production.controller;

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

import com.kynexis.production.common.exception.GlobalExceptionHandler;
import com.kynexis.production.dto.ProductionDTO;
import com.kynexis.production.dto.ProductionMetricsDTO;
import com.kynexis.production.dto.ProductionRequest;
import com.kynexis.production.service.ProductionService;

@ExtendWith(MockitoExtension.class)
class ProductionControllerTest {

    private MockMvc mockMvc;

    @Mock
    private ProductionService productionService;

    @BeforeEach
    void setUp() {
        ProductionController controller = new ProductionController(productionService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void create_Success() throws Exception {
        String jsonPayload = """
                {
                    "machineId": 1,
                    "productName": "Widget X",
                    "quantityProduced": 50,
                    "quantityRejected": 0,
                    "productionStart": "2026-10-18T10:00:00",
                    "status": "COMPLETED"
                }
                """;

        ProductionDTO response = ProductionDTO.builder()
                .id(1L)
                .machineId(1L)
                .productName("Widget X")
                .quantityProduced(50)
                .quantityRejected(0)
                .status("COMPLETED")
                .build();

        when(productionService.create(any(ProductionRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/production")
                .contentType(MediaType.APPLICATION_JSON)
                .content(jsonPayload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.productName").value("Widget X"));
    }

    @Test
    void getAll_Success() throws Exception {
        ProductionDTO dto = ProductionDTO.builder()
                .id(1L)
                .machineId(1L)
                .productName("Widget X")
                .build();

        when(productionService.getAll()).thenReturn(List.of(dto));

        mockMvc.perform(get("/api/production"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].productName").value("Widget X"));
    }

    @Test
    void getById_Success() throws Exception {
        ProductionDTO dto = ProductionDTO.builder()
                .id(1L)
                .machineId(1L)
                .productName("Widget X")
                .build();

        when(productionService.getById(1L)).thenReturn(dto);

        mockMvc.perform(get("/api/production/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.productName").value("Widget X"));
    }

    @Test
    void getMetricsSummary_Success() throws Exception {
        ProductionMetricsDTO summary = ProductionMetricsDTO.builder()
                .totalProduction(1000L)
                .rejectedProduction(20L)
                .build();

        when(productionService.getMetricsSummary()).thenReturn(summary);

        mockMvc.perform(get("/api/production/metrics/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalProduction").value(1000L))
                .andExpect(jsonPath("$.rejectedProduction").value(20L));
    }

    @Test
    void delete_Success() throws Exception {
        mockMvc.perform(delete("/api/production/1"))
                .andExpect(status().isNoContent());
    }
}
