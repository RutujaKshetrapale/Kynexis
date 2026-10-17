package com.kynexis.plantmachine.service;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.kynexis.common.dto.MachineSummaryDTO;
import com.kynexis.common.exception.ResourceNotFoundException;
import com.kynexis.plantmachine.dto.MachineDTO;
import com.kynexis.plantmachine.dto.MachineRequest;
import com.kynexis.plantmachine.dto.PlantDTO;
import com.kynexis.plantmachine.entity.Machine;
import com.kynexis.plantmachine.entity.Plant;
import com.kynexis.plantmachine.repository.MachineRepository;
import com.kynexis.plantmachine.repository.PlantRepository;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class MachineService {

    private final MachineRepository machineRepository;
    private final PlantRepository plantRepository;
    private final DomainValidationService domainValidationService;

    public MachineService(
            MachineRepository machineRepository,
            PlantRepository plantRepository,
            DomainValidationService domainValidationService) {
        this.machineRepository = machineRepository;
        this.plantRepository = plantRepository;
        this.domainValidationService = domainValidationService;
    }

    @Transactional
    public MachineDTO create(MachineRequest request) {
        log.info("Creating machine name={} plantId={}", request.getName(), request.getPlantId());

        Plant plant = plantRepository.findById(request.getPlantId())
                .orElseThrow(() -> {
                    log.warn("Failed to create machine: plant not found plantId={}", request.getPlantId());
                    return new ResourceNotFoundException("PLANT NOT FOUND: " + request.getPlantId());
                });

        domainValidationService.validateMachineStatus(request.getStatus());

        Machine machine = Machine.builder()
                .name(request.getName().trim())
                .type(request.getType().trim())
                .status(request.getStatus().trim().toUpperCase())
                .plant(plant)
                .build();

        Machine savedMachine = machineRepository.save(machine);
        log.info("Machine created successfully id={} name={}", savedMachine.getId(), savedMachine.getName());
        return mapToDTO(savedMachine);
    }

    @Transactional(readOnly = true)
    public List<MachineDTO> getAll() {
        return machineRepository.findAll().stream().map(this::mapToDTO).toList();
    }

    @Transactional(readOnly = true)
    public Page<MachineDTO> getAll(Pageable pageable) {
        return machineRepository.findAll(pageable).map(this::mapToDTO);
    }

    @Transactional(readOnly = true)
    public MachineDTO getById(Long id) {
        Machine machine = machineRepository.findById(id)
                .orElseThrow(() -> {
                    log.warn("Machine not found id={}", id);
                    return new ResourceNotFoundException("MACHINE NOT FOUND: " + id);
                });
        return mapToDTO(machine);
    }

    @Transactional(readOnly = true)
    public Machine getEntityById(Long id) {
        return machineRepository.findById(id)
                .orElseThrow(() -> {
                    log.warn("Machine not found id={}", id);
                    return new ResourceNotFoundException("MACHINE NOT FOUND: " + id);
                });
    }

    @Transactional(readOnly = true)
    public List<MachineDTO> getByPlant(Long plantId) {
        if (!plantRepository.existsById(plantId)) {
            log.warn("Failed to fetch machines: plant not found plantId={}", plantId);
            throw new ResourceNotFoundException("PLANT NOT FOUND: " + plantId);
        }
        return machineRepository.findByPlantId(plantId).stream().map(this::mapToDTO).toList();
    }

    @Transactional(readOnly = true)
    public Page<MachineDTO> getByPlant(Long plantId, Pageable pageable) {
        if (!plantRepository.existsById(plantId)) {
            log.warn("Failed to fetch machines: plant not found plantId={}", plantId);
            throw new ResourceNotFoundException("PLANT NOT FOUND: " + plantId);
        }
        return machineRepository.findByPlantId(plantId, pageable).map(this::mapToDTO);
    }

    @Transactional(readOnly = true)
    public List<MachineDTO> getByStatus(String status) {
        domainValidationService.validateMachineStatus(status);
        return machineRepository.findByStatusIgnoreCase(status.trim()).stream().map(this::mapToDTO).toList();
    }

    @Transactional(readOnly = true)
    public Page<MachineDTO> getByStatus(String status, Pageable pageable) {
        domainValidationService.validateMachineStatus(status);
        return machineRepository.findByStatusIgnoreCase(status.trim(), pageable).map(this::mapToDTO);
    }

    @Transactional(readOnly = true)
    public List<MachineDTO> getByPlantAndStatus(Long plantId, String status) {
        if (!plantRepository.existsById(plantId)) {
            log.warn("Failed to fetch machines: plant not found plantId={}", plantId);
            throw new ResourceNotFoundException("PLANT NOT FOUND: " + plantId);
        }
        domainValidationService.validateMachineStatus(status);
        return machineRepository.findByPlantIdAndStatusIgnoreCase(plantId, status.trim())
                .stream().map(this::mapToDTO).toList();
    }

    @Transactional(readOnly = true)
    public Page<MachineDTO> getByPlantAndStatus(Long plantId, String status, Pageable pageable) {
        if (!plantRepository.existsById(plantId)) {
            log.warn("Failed to fetch machines: plant not found plantId={}", plantId);
            throw new ResourceNotFoundException("PLANT NOT FOUND: " + plantId);
        }
        domainValidationService.validateMachineStatus(status);
        return machineRepository.findByPlantIdAndStatusIgnoreCase(plantId, status.trim(), pageable)
                .map(this::mapToDTO);
    }

    @Transactional(readOnly = true)
    public List<MachineDTO> searchByName(String name) {
        return machineRepository.findByNameContainingIgnoreCase(name).stream().map(this::mapToDTO).toList();
    }

    @Transactional(readOnly = true)
    public Page<MachineDTO> searchByName(String name, Pageable pageable) {
        return machineRepository.findByNameContainingIgnoreCase(name, pageable).map(this::mapToDTO);
    }

    @Transactional
    public MachineDTO update(Long id, MachineRequest request) {
        log.info("Updating machine id={} name={}", id, request.getName());

        Machine machine = getEntityById(id);

        Plant plant = plantRepository.findById(request.getPlantId())
                .orElseThrow(() -> {
                    log.warn("Failed to update machine id={}: plant not found plantId={}", id, request.getPlantId());
                    return new ResourceNotFoundException("PLANT NOT FOUND: " + request.getPlantId());
                });

        domainValidationService.validateMachineStatus(request.getStatus());

        machine.setName(request.getName().trim());
        machine.setType(request.getType().trim());
        machine.setStatus(request.getStatus().trim().toUpperCase());
        machine.setPlant(plant);

        Machine updatedMachine = machineRepository.save(machine);
        log.info("Machine updated successfully id={}", id);
        return mapToDTO(updatedMachine);
    }

    @Transactional
    public void delete(Long id) {
        log.info("Deleting machine id={}", id);
        Machine machine = getEntityById(id);
        machineRepository.delete(machine);
        log.info("Machine deleted successfully id={}", id);
    }

    // Cross-Service Internal Contracts
    @Transactional(readOnly = true)
    public boolean existsById(Long id) {
        if (id == null) return false;
        return machineRepository.existsById(id);
    }

    @Transactional(readOnly = true)
    public Optional<MachineSummaryDTO> findSummaryById(Long id) {
        if (id == null) return Optional.empty();
        return machineRepository.findById(id).map(m -> MachineSummaryDTO.builder()
                .id(m.getId())
                .name(m.getName())
                .type(m.getType())
                .status(m.getStatus())
                .plantId(m.getPlant() != null ? m.getPlant().getId() : null)
                .build());
    }

    @Transactional(readOnly = true)
    public long count() {
        return machineRepository.count();
    }

    @Transactional(readOnly = true)
    public long countByStatus(String status) {
        return machineRepository.countByStatusIgnoreCase(status);
    }

    public MachineDTO mapToDTO(Machine machine) {
        if (machine == null) return null;
        PlantDTO plantDTO = null;
        if (machine.getPlant() != null) {
            plantDTO = PlantDTO.builder()
                    .id(machine.getPlant().getId())
                    .name(machine.getPlant().getName())
                    .location(machine.getPlant().getLocation())
                    .active(machine.getPlant().isActive())
                    .build();
        }

        return MachineDTO.builder()
                .id(machine.getId())
                .name(machine.getName())
                .type(machine.getType())
                .status(machine.getStatus())
                .plant(plantDTO)
                .build();
    }
}
