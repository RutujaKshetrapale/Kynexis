package com.kynexis.sensor.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.kynexis.sensor.client.MachineServiceClient;
import com.kynexis.sensor.common.exception.ResourceNotFoundException;
import com.kynexis.sensor.dto.SensorDTO;
import com.kynexis.sensor.dto.SensorRequest;
import com.kynexis.sensor.entity.Sensor;
import com.kynexis.sensor.repository.SensorRepository;

@ExtendWith(MockitoExtension.class)
class SensorServiceTest {

    @Mock
    private SensorRepository sensorRepository;

    @Mock
    private MachineServiceClient machineServiceClient;

    @InjectMocks
    private SensorService sensorService;

    private Sensor sensor;
    private SensorRequest sensorRequest;

    @BeforeEach
    void setUp() {
        sensor = Sensor.builder()
                .id(100L)
                .name("Temp Sensor")
                .type("TEMPERATURE")
                .unit("C")
                .active(true)
                .machineId(10L)
                .build();

        sensorRequest = SensorRequest.builder()
                .name("Temp Sensor")
                .type("TEMPERATURE")
                .unit("C")
                .machineId(10L)
                .active(true)
                .build();
    }

    @Test
    @DisplayName("Create sensor - Success")
    void testCreateSensorSuccess() {
        when(machineServiceClient.machineExists(10L)).thenReturn(true);
        when(sensorRepository.save(any(Sensor.class))).thenReturn(sensor);

        SensorDTO result = sensorService.create(sensorRequest);

        assertNotNull(result);
        assertEquals(100L, result.getId());
        assertEquals("Temp Sensor", result.getName());
        assertEquals(10L, result.getMachineId());
    }

    @Test
    @DisplayName("Create sensor - Machine not found throws ResourceNotFoundException")
    void testCreateSensorMachineNotFound() {
        when(machineServiceClient.machineExists(10L)).thenReturn(false);

        assertThrows(ResourceNotFoundException.class, () -> sensorService.create(sensorRequest));
        verify(sensorRepository, never()).save(any());
    }

    @Test
    @DisplayName("Get sensor by ID - Success")
    void testGetByIdSuccess() {
        when(sensorRepository.findById(100L)).thenReturn(Optional.of(sensor));

        SensorDTO result = sensorService.getById(100L);

        assertNotNull(result);
        assertEquals(100L, result.getId());
    }
}
