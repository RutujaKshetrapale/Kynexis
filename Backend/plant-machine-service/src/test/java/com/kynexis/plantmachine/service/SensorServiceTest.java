package com.kynexis.plantmachine.service;

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

import com.kynexis.common.exception.ResourceNotFoundException;
import com.kynexis.plantmachine.dto.SensorDTO;
import com.kynexis.plantmachine.dto.SensorRequest;
import com.kynexis.plantmachine.entity.Machine;
import com.kynexis.plantmachine.entity.Sensor;
import com.kynexis.plantmachine.repository.MachineRepository;
import com.kynexis.plantmachine.repository.SensorRepository;

@ExtendWith(MockitoExtension.class)
class SensorServiceTest {

    @Mock
    private SensorRepository sensorRepository;

    @Mock
    private MachineRepository machineRepository;

    @InjectMocks
    private SensorService sensorService;

    private Machine machine;
    private Sensor sensor;
    private SensorRequest sensorRequest;

    @BeforeEach
    void setUp() {
        machine = Machine.builder()
                .id(10L)
                .name("CNC-01")
                .type("Milling")
                .status("RUNNING")
                .build();

        sensor = Sensor.builder()
                .id(100L)
                .name("Temp Sensor")
                .type("TEMPERATURE")
                .unit("C")
                .active(true)
                .machine(machine)
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
        when(machineRepository.findById(10L)).thenReturn(Optional.of(machine));
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
        when(machineRepository.findById(10L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> sensorService.create(sensorRequest));
        verify(sensorRepository, never()).save(any());
    }
}
