package com.kynexis.machine.controller;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.kynexis.machine.common.dto.MachineSummaryDTO;
import com.kynexis.machine.common.exception.GlobalExceptionHandler;
import com.kynexis.machine.dto.MachineDTO;
import com.kynexis.machine.service.MachineService;

class MachineControllerTest {

    private MockMvc mockMvc;
    private MachineService machineService;

    @BeforeEach
    void setUp() {
        machineService = mock(MachineService.class);
        MachineController controller = new MachineController(machineService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("GET /api/machines/{id} - Fetches machine successfully")
    void testGetMachineById() throws Exception {
        MachineDTO res = MachineDTO.builder().id(10L).name("CNC-01").type("Milling").status("RUNNING").plantId(1L).build();
        when(machineService.getById(10L)).thenReturn(res);

        mockMvc.perform(get("/api/machines/10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(10))
                .andExpect(jsonPath("$.name").value("CNC-01"));
    }

    @Test
    @DisplayName("GET /api/machines/10/exists - Check machine existence")
    void testExists() throws Exception {
        when(machineService.existsById(10L)).thenReturn(true);

        mockMvc.perform(get("/api/machines/10/exists"))
                .andExpect(status().isOk())
                .andExpect(content().string("true"));
    }

    @Test
    @DisplayName("GET /api/machines/10/summary - Returns summary")
    void testGetSummary() throws Exception {
        MachineSummaryDTO summary = MachineSummaryDTO.builder().id(10L).name("CNC-01").type("Milling").status("RUNNING").plantId(1L).build();
        when(machineService.findSummaryById(10L)).thenReturn(Optional.of(summary));

        mockMvc.perform(get("/api/machines/10/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(10))
                .andExpect(jsonPath("$.name").value("CNC-01"));
    }

    @Test
    @DisplayName("GET /api/machines/count - Returns count")
    void testCount() throws Exception {
        when(machineService.count()).thenReturn(15L);

        mockMvc.perform(get("/api/machines/count"))
                .andExpect(status().isOk())
                .andExpect(content().string("15"));
    }
}
