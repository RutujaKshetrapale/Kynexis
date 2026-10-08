package com.example.demo.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.example.demo.dto.DashboardMachineStatusResponse;
import com.example.demo.dto.DashboardSummaryResponse;
import com.example.demo.exception.GlobalExceptionHandler;
import com.example.demo.service.DashboardService;

@ExtendWith(MockitoExtension.class)
class DashboardControllerMockMvcTest {

    private MockMvc mockMvc;

    @Mock
    private DashboardService dashboardService;

    private DashboardController dashboardController;

    @BeforeEach
    void setUp() {
        dashboardController = new DashboardController(dashboardService);
        mockMvc = MockMvcBuilders
                .standaloneSetup(dashboardController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("Should get dashboard summary successfully")
    void shouldGetDashboardSummary() throws Exception {
        DashboardSummaryResponse summary = new DashboardSummaryResponse(5L, 20L, 15L, 30L, 2L, 1000L, 10L, 500.0);
        when(dashboardService.getSummary()).thenReturn(summary);

        mockMvc.perform(get("/api/dashboard/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalPlants").value(5))
                .andExpect(jsonPath("$.totalMachines").value(20))
                .andExpect(jsonPath("$.activeMachines").value(15))
                .andExpect(jsonPath("$.unresolvedAlerts").value(2));
    }

    @Test
    @DisplayName("Should get dashboard machine status")
    void shouldGetMachineStatus() throws Exception {
        DashboardMachineStatusResponse machineStatus = new DashboardMachineStatusResponse(15L, 3L, 2L);
        when(dashboardService.getMachineStatus()).thenReturn(machineStatus);

        mockMvc.perform(get("/api/dashboard/machine-status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(15))
                .andExpect(jsonPath("$.inactive").value(3))
                .andExpect(jsonPath("$.maintenance").value(2));
    }
}
