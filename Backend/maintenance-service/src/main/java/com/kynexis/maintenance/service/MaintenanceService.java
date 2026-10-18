package com.kynexis.maintenance.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.kynexis.maintenance.common.exception.ResourceNotFoundException;
import com.kynexis.maintenance.client.MachineServiceClient;
import com.kynexis.maintenance.dto.MaintenanceDTO;
import com.kynexis.maintenance.dto.MaintenanceRequest;
import com.kynexis.maintenance.entity.Maintenance;
import com.kynexis.maintenance.repository.MaintenanceRepository;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class MaintenanceService {

    private final MaintenanceRepository maintenanceRepository;
    private final MachineServiceClient machineServiceClient;
    private final DomainValidationService domainValidationService;

    public MaintenanceService(
            MaintenanceRepository maintenanceRepository,
            MachineServiceClient machineServiceClient,
            DomainValidationService domainValidationService) {
        this.maintenanceRepository = maintenanceRepository;
        this.machineServiceClient = machineServiceClient;
        this.domainValidationService = domainValidationService;
    }

    @Transactional
    public MaintenanceDTO create(MaintenanceRequest request) {
        log.info("Creating maintenance record machineId={} type={}", request.getMachineId(), request.getType());

        if (!machineServiceClient.machineExists(request.getMachineId())) {
            log.warn("Failed to create maintenance: machine not found machineId={}", request.getMachineId());
            throw new ResourceNotFoundException("MACHINE NOT FOUND: " + request.getMachineId());
        }

        domainValidationService.validateMaintenanceStatus(request.getStatus());
        domainValidationService.validateMaintenanceDates(request.getScheduledDate(), request.getCompletedDate());

        Maintenance maintenance = Maintenance.builder()
                .machineId(request.getMachineId())
                .type(request.getType().trim())
                .description(request.getDescription().trim())
                .scheduledDate(request.getScheduledDate())
                .completedDate(request.getCompletedDate())
                .status(request.getStatus().trim().toUpperCase())
                .technician(request.getTechnician().trim())
                .createdAt(LocalDateTime.now())
                .build();

        Maintenance saved = maintenanceRepository.save(maintenance);
        log.info("Maintenance record created successfully id={} machineId={}", saved.getId(), request.getMachineId());
        return mapToDTO(saved);
    }

    @Transactional(readOnly = true)
    public List<MaintenanceDTO> getAll() {
        return maintenanceRepository.findAll().stream().map(this::mapToDTO).toList();
    }

    @Transactional(readOnly = true)
    public Page<MaintenanceDTO> getAll(Pageable pageable) {
        return maintenanceRepository.findAll(pageable).map(this::mapToDTO);
    }

    @Transactional(readOnly = true)
    public MaintenanceDTO getById(Long id) {
        Maintenance maintenance = maintenanceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("MAINTENANCE NOT FOUND: " + id));
        return mapToDTO(maintenance);
    }

    @Transactional(readOnly = true)
    public List<MaintenanceDTO> getByMachine(Long machineId) {
        return maintenanceRepository.findByMachineId(machineId).stream().map(this::mapToDTO).toList();
    }

    @Transactional(readOnly = true)
    public Page<MaintenanceDTO> getByMachine(Long machineId, Pageable pageable) {
        return maintenanceRepository.findByMachineId(machineId, pageable).map(this::mapToDTO);
    }

    @Transactional(readOnly = true)
    public List<MaintenanceDTO> getByStatus(String status) {
        domainValidationService.validateMaintenanceStatus(status);
        return maintenanceRepository.findByStatus(status.trim().toUpperCase()).stream().map(this::mapToDTO).toList();
    }

    @Transactional(readOnly = true)
    public Page<MaintenanceDTO> getByStatus(String status, Pageable pageable) {
        domainValidationService.validateMaintenanceStatus(status);
        return maintenanceRepository.findByStatus(status.trim().toUpperCase(), pageable).map(this::mapToDTO);
    }

    @Transactional
    public MaintenanceDTO update(Long id, MaintenanceRequest request) {
        log.info("Updating maintenance record id={}", id);

        Maintenance maintenance = maintenanceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("MAINTENANCE NOT FOUND: " + id));

        if (!machineServiceClient.machineExists(request.getMachineId())) {
            throw new ResourceNotFoundException("MACHINE NOT FOUND: " + request.getMachineId());
        }

        domainValidationService.validateMaintenanceStatus(request.getStatus());
        domainValidationService.validateMaintenanceDates(request.getScheduledDate(), request.getCompletedDate());

        maintenance.setMachineId(request.getMachineId());
        maintenance.setType(request.getType().trim());
        maintenance.setDescription(request.getDescription().trim());
        maintenance.setScheduledDate(request.getScheduledDate());
        maintenance.setCompletedDate(request.getCompletedDate());
        maintenance.setStatus(request.getStatus().trim().toUpperCase());
        maintenance.setTechnician(request.getTechnician().trim());

        Maintenance updated = maintenanceRepository.save(maintenance);
        log.info("Maintenance record updated successfully id={}", id);
        return mapToDTO(updated);
    }

    @Transactional
    public void delete(Long id) {
        log.info("Deleting maintenance record id={}", id);
        Maintenance maintenance = maintenanceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("MAINTENANCE NOT FOUND: " + id));
        maintenanceRepository.delete(maintenance);
        log.info("Maintenance record deleted successfully id={}", id);
    }

    public MaintenanceDTO mapToDTO(Maintenance maintenance) {
        if (maintenance == null) return null;
        return MaintenanceDTO.builder()
                .id(maintenance.getId())
                .type(maintenance.getType())
                .description(maintenance.getDescription())
                .scheduledDate(maintenance.getScheduledDate())
                .completedDate(maintenance.getCompletedDate())
                .status(maintenance.getStatus())
                .technician(maintenance.getTechnician())
                .createdAt(maintenance.getCreatedAt())
                .machineId(maintenance.getMachineId())
                .build();
    }
}
