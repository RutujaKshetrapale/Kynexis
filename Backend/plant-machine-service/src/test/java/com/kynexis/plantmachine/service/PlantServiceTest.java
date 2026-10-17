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

import com.kynexis.common.exception.BusinessValidationException;
import com.kynexis.common.exception.ResourceNotFoundException;
import com.kynexis.plantmachine.dto.PlantDTO;
import com.kynexis.plantmachine.dto.PlantRequest;
import com.kynexis.plantmachine.entity.Plant;
import com.kynexis.plantmachine.repository.PlantRepository;

@ExtendWith(MockitoExtension.class)
class PlantServiceTest {

    @Mock
    private PlantRepository plantRepository;

    @InjectMocks
    private PlantService plantService;

    private PlantRequest plantRequest;
    private Plant plant;

    @BeforeEach
    void setUp() {
        plantRequest = PlantRequest.builder()
                .name("Austin Plant 1")
                .location("Austin, TX")
                .build();

        plant = Plant.builder()
                .id(1L)
                .name("Austin Plant 1")
                .location("Austin, TX")
                .active(true)
                .build();
    }

    @Test
    @DisplayName("Create plant - Success")
    void testCreatePlantSuccess() {
        when(plantRepository.existsByNameIgnoreCase("Austin Plant 1")).thenReturn(false);
        when(plantRepository.save(any(Plant.class))).thenReturn(plant);

        PlantDTO result = plantService.create(plantRequest);

        assertNotNull(result);
        assertEquals(1L, result.getId());
        assertEquals("Austin Plant 1", result.getName());
        assertEquals("Austin, TX", result.getLocation());
        assertTrue(result.isActive());
    }

    @Test
    @DisplayName("Create plant - Duplicate name throws BusinessValidationException")
    void testCreatePlantDuplicate() {
        when(plantRepository.existsByNameIgnoreCase("Austin Plant 1")).thenReturn(true);

        assertThrows(BusinessValidationException.class, () -> plantService.create(plantRequest));
        verify(plantRepository, never()).save(any());
    }

    @Test
    @DisplayName("Get plant by ID - Success")
    void testGetByIdSuccess() {
        when(plantRepository.findById(1L)).thenReturn(Optional.of(plant));

        PlantDTO result = plantService.getById(1L);

        assertNotNull(result);
        assertEquals(1L, result.getId());
    }

    @Test
    @DisplayName("Get plant by ID - Not Found throws ResourceNotFoundException")
    void testGetByIdNotFound() {
        when(plantRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> plantService.getById(99L));
    }
}
