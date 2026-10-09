package com.example.demo.service;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.example.demo.dto.MachineRequest;
import com.example.demo.entity.Machine;
import com.example.demo.entity.Plant;
import com.example.demo.exception.BusinessValidationException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.repository.MachineRepository;
import com.example.demo.repository.PlantRepository;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class MachineService {

    private final MachineRepository machineRepository;
    private final PlantRepository plantRepository;
    private final DomainValidationService domainValidationService;
    private final WebSocketEventPublisherService webSocketEventPublisherService;

    public MachineService(
            MachineRepository machineRepository,
            PlantRepository plantRepository,
            DomainValidationService domainValidationService,
            WebSocketEventPublisherService webSocketEventPublisherService) {

        this.machineRepository = machineRepository;
        this.plantRepository = plantRepository;
        this.domainValidationService = domainValidationService;
        this.webSocketEventPublisherService = webSocketEventPublisherService;
    }

    public Machine create(MachineRequest request) {

        log.info("Creating machine name={} plantId={}", request.getName(), request.getPlantId());

        Plant plant = plantRepository
                .findById(request.getPlantId())
                .orElseThrow(() -> {
                    log.warn("Failed to create machine: plant not found plantId={}", request.getPlantId());
                    return new ResourceNotFoundException("PLANT NOT FOUND: " + request.getPlantId());
                });

        domainValidationService.validateMachineStatus(
                request.getStatus()
        );

        Machine machine = new Machine();

        machine.setName(request.getName().trim());
        machine.setType(request.getType().trim());
        machine.setStatus(
                request.getStatus().trim().toUpperCase()
        );
        machine.setPlant(plant);

        Machine savedMachine = machineRepository.save(machine);
        log.info("Machine created successfully id={} name={}", savedMachine.getId(), savedMachine.getName());
        webSocketEventPublisherService.publishMachineStatus(savedMachine);
        return savedMachine;
    }

    public List<Machine> getAll() {
        return machineRepository.findAll();
    }

    public Page<Machine> getAll(Pageable pageable) {
        return machineRepository.findAll(pageable);
    }

    public Machine getById(Long id) {

        return machineRepository
                .findById(id)
                .orElseThrow(() -> {
                    log.warn("Machine not found id={}", id);
                    return new ResourceNotFoundException("MACHINE NOT FOUND: " + id);
                });
    }

    public List<Machine> getByPlant(Long plantId) {

        if (!plantRepository.existsById(plantId)) {
            log.warn("Failed to fetch machines: plant not found plantId={}", plantId);
            throw new ResourceNotFoundException(
                    "PLANT NOT FOUND: " + plantId
            );
        }

        return machineRepository.findByPlantId(plantId);
    }

    public Page<Machine> getByPlant(
            Long plantId,
            Pageable pageable) {

        if (!plantRepository.existsById(plantId)) {
            log.warn("Failed to fetch machines: plant not found plantId={}", plantId);
            throw new ResourceNotFoundException(
                    "PLANT NOT FOUND: " + plantId
            );
        }

        return machineRepository.findByPlantId(
                plantId,
                pageable
        );
    }

    public List<Machine> getByStatus(String status) {

        domainValidationService.validateMachineStatus(status);

        return machineRepository
                .findByStatusIgnoreCase(status.trim());
    }

    public Page<Machine> getByStatus(
            String status,
            Pageable pageable) {

        domainValidationService.validateMachineStatus(status);

        return machineRepository.findByStatusIgnoreCase(
                status.trim(),
                pageable
        );
    }

    public List<Machine> getByPlantAndStatus(
            Long plantId,
            String status) {

        if (!plantRepository.existsById(plantId)) {
            log.warn("Failed to fetch machines: plant not found plantId={}", plantId);
            throw new ResourceNotFoundException(
                    "PLANT NOT FOUND: " + plantId
            );
        }

        domainValidationService.validateMachineStatus(status);

        return machineRepository
                .findByPlantIdAndStatusIgnoreCase(
                        plantId,
                        status.trim()
                );
    }

    public Page<Machine> getByPlantAndStatus(
            Long plantId,
            String status,
            Pageable pageable) {

        if (!plantRepository.existsById(plantId)) {
            log.warn("Failed to fetch machines: plant not found plantId={}", plantId);
            throw new ResourceNotFoundException(
                    "PLANT NOT FOUND: " + plantId
            );
        }

        domainValidationService.validateMachineStatus(status);

        return machineRepository
                .findByPlantIdAndStatusIgnoreCase(
                        plantId,
                        status.trim(),
                        pageable
                );
    }

    public List<Machine> searchByName(String name) {
        return machineRepository
                .findByNameContainingIgnoreCase(name);
    }

    public Page<Machine> searchByName(
            String name,
            Pageable pageable) {

        return machineRepository
                .findByNameContainingIgnoreCase(
                        name,
                        pageable
                );
    }

    public Machine update(
            Long id,
            MachineRequest request) {

        log.info("Updating machine id={} name={}", id, request.getName());

        Machine machine = getById(id);

        Plant plant = plantRepository
                .findById(request.getPlantId())
                .orElseThrow(() -> {
                    log.warn("Failed to update machine id={}: plant not found plantId={}", id, request.getPlantId());
                    return new ResourceNotFoundException("PLANT NOT FOUND: " + request.getPlantId());
                });

        domainValidationService.validateMachineStatus(
                request.getStatus()
        );

        machine.setName(request.getName().trim());
        machine.setType(request.getType().trim());
        machine.setStatus(
                request.getStatus().trim().toUpperCase()
        );
        machine.setPlant(plant);

        Machine updatedMachine = machineRepository.save(machine);
        log.info("Machine updated successfully id={}", id);
        webSocketEventPublisherService.publishMachineStatus(updatedMachine);
        return updatedMachine;
    }

    public void delete(Long id) {

        log.info("Deleting machine id={}", id);

        Machine machine = getById(id);

        machineRepository.delete(machine);
        log.info("Machine deleted successfully id={}", id);
    }
}