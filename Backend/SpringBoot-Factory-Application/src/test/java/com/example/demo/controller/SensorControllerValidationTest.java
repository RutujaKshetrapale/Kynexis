package com.example.demo.controller;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.example.demo.SpringBootFactoryApplication;
import com.example.demo.dto.SensorRequest;
import com.example.demo.service.SensorService;
import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest(classes = SpringBootFactoryApplication.class)
@AutoConfigureMockMvc(addFilters = false)
class SensorControllerValidationTest {

    @Autowired
    private MockMvc mockMvc;

    private ObjectMapper objectMapper;

    @MockitoBean
    private SensorService sensorService;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
    }

    @Test
    void createSensor_shouldReturn400_whenNameIsBlank() throws Exception {

        SensorRequest request = new SensorRequest();

        request.setName("");
        request.setType("TEMPERATURE");
        request.setUnit("C");
        request.setMachineId(1L);
        request.setActive(true);

        mockMvc.perform(
                post("/api/sensors")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
        )
        .andExpect(status().isBadRequest());

        verify(sensorService, never()).create(request);
    }

    @Test
    void createSensor_shouldReturn400_whenNameIsTooShort() throws Exception {

        SensorRequest request = new SensorRequest();

        request.setName("A");
        request.setType("TEMPERATURE");
        request.setUnit("C");
        request.setMachineId(1L);
        request.setActive(true);

        mockMvc.perform(
                post("/api/sensors")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
        )
        .andExpect(status().isBadRequest());

        verify(sensorService, never()).create(request);
    }

    @Test
    void createSensor_shouldReturn400_whenTypeIsBlank() throws Exception {

        SensorRequest request = new SensorRequest();

        request.setName("Temperature Sensor");
        request.setType("");
        request.setUnit("C");
        request.setMachineId(1L);
        request.setActive(true);

        mockMvc.perform(
                post("/api/sensors")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
        )
        .andExpect(status().isBadRequest());

        verify(sensorService, never()).create(request);
    }

    @Test
    void createSensor_shouldReturn400_whenUnitIsBlank() throws Exception {

        SensorRequest request = new SensorRequest();

        request.setName("Temperature Sensor");
        request.setType("TEMPERATURE");
        request.setUnit("");
        request.setMachineId(1L);
        request.setActive(true);

        mockMvc.perform(
                post("/api/sensors")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
        )
        .andExpect(status().isBadRequest());

        verify(sensorService, never()).create(request);
    }

    @Test
    void createSensor_shouldReturn400_whenMachineIdIsNull() throws Exception {

        SensorRequest request = new SensorRequest();

        request.setName("Temperature Sensor");
        request.setType("TEMPERATURE");
        request.setUnit("C");
        request.setMachineId(null);
        request.setActive(true);

        mockMvc.perform(
                post("/api/sensors")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
        )
        .andExpect(status().isBadRequest());

        verify(sensorService, never()).create(request);
    }

    @Test
    void createSensor_shouldReturn400_whenMultipleFieldsAreInvalid() throws Exception {

        SensorRequest request = new SensorRequest();

        request.setName("");
        request.setType("");
        request.setUnit("");
        request.setMachineId(null);
        request.setActive(true);

        mockMvc.perform(
                post("/api/sensors")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
        )
        .andExpect(status().isBadRequest());

        verify(sensorService, never()).create(request);
    }
}
