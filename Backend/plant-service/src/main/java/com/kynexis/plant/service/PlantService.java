package com.kynexis.plant.service;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.kynexis.plant.common.exception.BusinessValidationException;
import com.kynexis.plant.common.exception.ResourceNotFoundException;
import com.kynexis.plant.dto.PlantDTO;
import com.kynexis.plant.dto.PlantRequest;
import com.kynexis.plant.entity.Plant;
import com.kynexis.plant.repository.PlantRepository;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class PlantService {

    private final PlantRepository plantRepository;

    public PlantService(PlantRepository plantRepository) {
        this.plantRepository = plantRepository;
    }

    @Transactional
    public PlantDTO create(PlantRequest request) {
        log.info("Creating plant name={} location={}", request.getName(), request.getLocation());

        if (plantRepository.existsByNameIgnoreCase(request.getName().trim())) {
            log.warn("Failed to create plant: name already exists name={}", request.getName());
            throw new BusinessValidationException("Plant with this name already exists");
        }

        Plant plant = Plant.builder()
                .name(request.getName().trim())
                .location(request.getLocation().trim())
                .active(true)
                .build();

        Plant saved = plantRepository.save(plant);
        log.info("Plant created successfully id={} name={}", saved.getId(), saved.getName());
        return mapToDTO(saved);
    }

    @Transactional(readOnly = true)
    public List<PlantDTO> getAll() {
        return plantRepository.findAll().stream().map(this::mapToDTO).toList();
    }

    @Transactional(readOnly = true)
    public Page<PlantDTO> getAll(Pageable pageable) {
        return plantRepository.findAll(pageable).map(this::mapToDTO);
    }

    @Transactional(readOnly = true)
    public PlantDTO getById(Long id) {
        Plant plant = plantRepository.findById(id)
                .orElseThrow(() -> {
                    log.warn("Plant not found id={}", id);
                    return new ResourceNotFoundException("PLANT NOT FOUND: " + id);
                });
        return mapToDTO(plant);
    }

    @Transactional(readOnly = true)
    public Plant getEntityById(Long id) {
        return plantRepository.findById(id)
                .orElseThrow(() -> {
                    log.warn("Plant not found id={}", id);
                    return new ResourceNotFoundException("PLANT NOT FOUND: " + id);
                });
    }

    @Transactional(readOnly = true)
    public boolean existsById(Long id) {
        if (id == null) return false;
        return plantRepository.existsById(id);
    }

    @Transactional(readOnly = true)
    public List<PlantDTO> getActive() {
        return plantRepository.findByActiveTrue().stream().map(this::mapToDTO).toList();
    }

    @Transactional(readOnly = true)
    public Page<PlantDTO> getActive(Pageable pageable) {
        return plantRepository.findByActiveTrue(pageable).map(this::mapToDTO);
    }

    @Transactional(readOnly = true)
    public List<PlantDTO> getInactive() {
        return plantRepository.findByActiveFalse().stream().map(this::mapToDTO).toList();
    }

    @Transactional(readOnly = true)
    public Page<PlantDTO> getInactive(Pageable pageable) {
        return plantRepository.findByActiveFalse(pageable).map(this::mapToDTO);
    }

    @Transactional(readOnly = true)
    public List<PlantDTO> searchByName(String name) {
        return plantRepository.findByNameContainingIgnoreCase(name).stream().map(this::mapToDTO).toList();
    }

    @Transactional(readOnly = true)
    public Page<PlantDTO> searchByName(String name, Pageable pageable) {
        return plantRepository.findByNameContainingIgnoreCase(name, pageable).map(this::mapToDTO);
    }

    @Transactional(readOnly = true)
    public List<PlantDTO> searchByLocation(String location) {
        return plantRepository.findByLocationContainingIgnoreCase(location).stream().map(this::mapToDTO).toList();
    }

    @Transactional(readOnly = true)
    public Page<PlantDTO> searchByLocation(String location, Pageable pageable) {
        return plantRepository.findByLocationContainingIgnoreCase(location, pageable).map(this::mapToDTO);
    }

    @Transactional
    public PlantDTO update(Long id, PlantRequest request) {
        log.info("Updating plant id={} name={}", id, request.getName());

        Plant plant = getEntityById(id);

        if (!plant.getName().equalsIgnoreCase(request.getName().trim())
                && plantRepository.existsByNameIgnoreCase(request.getName().trim())) {
            log.warn("Failed to update plant id={}: name already exists name={}", id, request.getName());
            throw new BusinessValidationException("Plant with this name already exists");
        }

        plant.setName(request.getName().trim());
        plant.setLocation(request.getLocation().trim());

        Plant updated = plantRepository.save(plant);
        log.info("Plant updated successfully id={}", id);
        return mapToDTO(updated);
    }

    @Transactional
    public void delete(Long id) {
        log.info("Deleting plant id={}", id);
        Plant plant = getEntityById(id);
        plantRepository.delete(plant);
        log.info("Plant deleted successfully id={}", id);
    }

    @Transactional(readOnly = true)
    public long count() {
        return plantRepository.count();
    }

    public PlantDTO mapToDTO(Plant plant) {
        if (plant == null) return null;
        return PlantDTO.builder()
                .id(plant.getId())
                .name(plant.getName())
                .location(plant.getLocation())
                .active(plant.isActive())
                .build();
    }
}
