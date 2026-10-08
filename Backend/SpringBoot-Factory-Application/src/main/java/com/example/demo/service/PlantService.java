package com.example.demo.service;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.example.demo.dto.PlantRequest;
import com.example.demo.entity.Plant;
import com.example.demo.exception.BusinessValidationException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.repository.PlantRepository;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class PlantService {

    private final PlantRepository plantRepository;

    public PlantService(PlantRepository plantRepository) {
        this.plantRepository = plantRepository;
    }

    public Plant create(PlantRequest request) {

        log.info("Creating plant name={} location={}", request.getName(), request.getLocation());

        if (plantRepository.existsByNameIgnoreCase(
                request.getName().trim())) {

            log.warn("Failed to create plant: name already exists name={}", request.getName());
            throw new BusinessValidationException(
                    "Plant with this name already exists"
            );
        }

        Plant plant = new Plant();

        plant.setName(request.getName().trim());
        plant.setLocation(request.getLocation().trim());
        plant.setActive(true);

        Plant savedPlant = plantRepository.save(plant);
        log.info("Plant created successfully id={} name={}", savedPlant.getId(), savedPlant.getName());
        return savedPlant;
    }

    public List<Plant> getAll() {
        return plantRepository.findAll();
    }

    public Page<Plant> getAll(Pageable pageable) {
        return plantRepository.findAll(pageable);
    }

    public Plant getById(Long id) {

        return plantRepository
                .findById(id)
                .orElseThrow(() -> {
                    log.warn("Plant not found id={}", id);
                    return new ResourceNotFoundException("PLANT NOT FOUND: " + id);
                });
    }

    public List<Plant> getActive() {
        return plantRepository.findByActiveTrue();
    }

    public Page<Plant> getActive(Pageable pageable) {
        return plantRepository.findByActiveTrue(pageable);
    }

    public List<Plant> getInactive() {
        return plantRepository.findByActiveFalse();
    }

    public Page<Plant> getInactive(Pageable pageable) {
        return plantRepository.findByActiveFalse(pageable);
    }

    public List<Plant> searchByName(String name) {
        return plantRepository
                .findByNameContainingIgnoreCase(name);
    }

    public Page<Plant> searchByName(
            String name,
            Pageable pageable) {

        return plantRepository
                .findByNameContainingIgnoreCase(
                        name,
                        pageable
                );
    }

    public List<Plant> searchByLocation(String location) {
        return plantRepository
                .findByLocationContainingIgnoreCase(location);
    }

    public Page<Plant> searchByLocation(
            String location,
            Pageable pageable) {

        return plantRepository
                .findByLocationContainingIgnoreCase(
                        location,
                        pageable
                );
    }

    public Plant update(
            Long id,
            PlantRequest request) {

        log.info("Updating plant id={} name={}", id, request.getName());

        Plant plant = getById(id);

        if (!plant.getName().equalsIgnoreCase(
                request.getName().trim())
                && plantRepository.existsByNameIgnoreCase(
                        request.getName().trim())) {

            log.warn("Failed to update plant id={}: name already exists name={}", id, request.getName());
            throw new BusinessValidationException(
                    "Plant with this name already exists"
            );
        }

        plant.setName(request.getName().trim());
        plant.setLocation(request.getLocation().trim());

        Plant updatedPlant = plantRepository.save(plant);
        log.info("Plant updated successfully id={}", id);
        return updatedPlant;
    }

    public void delete(Long id) {

        log.info("Deleting plant id={}", id);

        Plant plant = getById(id);

        plantRepository.delete(plant);
        log.info("Plant deleted successfully id={}", id);
    }
}