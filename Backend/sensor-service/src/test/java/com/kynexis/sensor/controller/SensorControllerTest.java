package com.kynexis.sensor.controller;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.kynexis.sensor.common.exception.GlobalExceptionHandler;
import com.kynexis.sensor.dto.SensorDTO;
import com.kynexis.sensor.service.SensorService;

class SensorControllerTest {

    private MockMvc mockMvc;
    private SensorService sensorService;

    @BeforeEach
    void setUp() {
        sensorService = mock(SensorService.class);
        SensorController controller = new SensorController(sensorService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("GET /api/sensors/{id} - Fetches sensor successfully")
    void testGetSensorById() throws Exception {
        SensorDTO res = SensorDTO.builder().id(100L).name("Temp Sensor").type("TEMPERATURE").unit("C").active(true).machineId(10L).build();
        when(sensorService.getById(100L)).thenReturn(res);

        mockMvc.perform(get("/api/sensors/100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(100))
                .andExpect(jsonPath("$.name").value("Temp Sensor"));
    }

    @Test
    @DisplayName("GET /api/sensors/count - Returns count")
    void testCount() throws Exception {
        when(sensorService.count()).thenReturn(25L);

        mockMvc.perform(get("/api/sensors/count"))
                .andExpect(status().isOk())
                .andExpect(content().string("25"));
    }
}
