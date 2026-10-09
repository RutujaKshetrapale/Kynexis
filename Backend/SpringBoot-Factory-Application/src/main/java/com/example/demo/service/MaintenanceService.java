package com.example.demo.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.example.demo.dto.MaintenanceRequest;
import com.example.demo.entity.Machine;
import com.example.demo.entity.Maintenance;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.repository.MachineRepository;
import com.example.demo.repository.MaintenanceRepository;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class MaintenanceService {

    private final MaintenanceRepository maintenanceRepository;
    private final MachineRepository machineRepository;
    private final WebSocketEventPublisherService webSocketEventPublisherService;

    public MaintenanceService(
            MaintenanceRepository maintenanceRepository,
            MachineRepository machineRepository,
            WebSocketEventPublisherService webSocketEventPublisherService) {

        this.maintenanceRepository = maintenanceRepository;
        this.machineRepository = machineRepository;
        this.webSocketEventPublisherService = webSocketEventPublisherService;
    }

    // =========================
    // CREATE MAINTENANCE
    // =========================

    public Maintenance create(MaintenanceRequest request) {

        log.info("Scheduling maintenance machineId={} type={} technician={}", request.getMachineId(), request.getType(), request.getTechnician());

        Machine machine = machineRepository
                .findById(request.getMachineId())
                .orElseThrow(() -> {
                    log.warn("Failed to schedule maintenance: machine not found machineId={}", request.getMachineId());
                    return new ResourceNotFoundException("MACHINE NOT FOUND: " + request.getMachineId());
                });

        Maintenance maintenance = new Maintenance();

        maintenance.setMachine(machine);
        maintenance.setType(request.getType());
        maintenance.setDescription(request.getDescription());
        maintenance.setScheduledDate(
                request.getScheduledDate()
        );
        maintenance.setCompletedDate(
                request.getCompletedDate()
        );
        maintenance.setStatus(request.getStatus());
        maintenance.setTechnician(request.getTechnician());
        maintenance.setCreatedAt(LocalDateTime.now());

        Maintenance savedMaintenance = maintenanceRepository.save(maintenance);
        log.info("Maintenance scheduled successfully id={} machineId={}", savedMaintenance.getId(), request.getMachineId());
        webSocketEventPublisherService.publishMaintenance(savedMaintenance);
        return savedMaintenance;
    }

    // =========================
    // GET ALL
    // =========================

    public List<Maintenance> getAll() {

        return maintenanceRepository.findAll();
    }

    // =========================
    // GET ALL - PAGINATED
    // =========================

    public Page<Maintenance> getAll(Pageable pageable) {

        return maintenanceRepository.findAll(pageable);
    }

    // =========================
    // GET BY ID
    // =========================

    public Maintenance getById(Long id) {

        return maintenanceRepository
                .findById(id)
                .orElseThrow(() -> {
                    log.warn("Maintenance not found id={}", id);
                    return new ResourceNotFoundException("MAINTENANCE NOT FOUND: " + id);
                });
    }

    // =========================
    // GET BY MACHINE
    // =========================

    public List<Maintenance> getByMachine(
            Long machineId) {

        if (!machineRepository.existsById(machineId)) {
            log.warn("Failed to fetch maintenance: machine not found machineId={}", machineId);
            throw new ResourceNotFoundException(
                    "MACHINE NOT FOUND: " + machineId
            );
        }

        return maintenanceRepository
                .findByMachineId(machineId);
    }

    // =========================
    // GET BY MACHINE - PAGINATED
    // =========================

    public Page<Maintenance> getByMachine(
            Long machineId,
            Pageable pageable) {

        if (!machineRepository.existsById(machineId)) {
            log.warn("Failed to fetch maintenance: machine not found machineId={}", machineId);
            throw new ResourceNotFoundException(
                    "MACHINE NOT FOUND: " + machineId
            );
        }

        return maintenanceRepository
                .findByMachineId(
                        machineId,
                        pageable
                );
    }

    // =========================
    // GET BY STATUS
    // =========================

    public List<Maintenance> getByStatus(
            String status) {

        return maintenanceRepository
                .findByStatus(status);
    }

    // =========================
    // GET BY STATUS - PAGINATED
    // =========================

    public Page<Maintenance> getByStatus(
            String status,
            Pageable pageable) {

        return maintenanceRepository
                .findByStatus(
                        status,
                        pageable
                );
    }

    // =========================
    // GET BY STATUS
    // ORDERED BY DATE
    // =========================

    public List<Maintenance> getByStatusOrderByDate(
            String status) {

        return maintenanceRepository
                .findByStatusOrderByScheduledDateAsc(
                        status
                );
    }

    // =========================
    // GET BY STATUS
    // ORDERED BY DATE
    // PAGINATED
    // =========================

    public Page<Maintenance> getByStatusOrderByDate(
            String status,
            Pageable pageable) {

        return maintenanceRepository
                .findByStatusOrderByScheduledDateAsc(
                        status,
                        pageable
                );
    }

    // =========================
    // UPDATE
    // =========================

    public Maintenance update(
            Long id,
            MaintenanceRequest request) {

        log.info("Updating maintenance id={} status={}", id, request.getStatus());

        Maintenance maintenance =
                maintenanceRepository
                        .findById(id)
                        .orElseThrow(() -> {
                            log.warn("Failed to update maintenance: record not found id={}", id);
                            return new ResourceNotFoundException("MAINTENANCE NOT FOUND: " + id);
                        });

        Machine machine = machineRepository
                .findById(request.getMachineId())
                .orElseThrow(() -> {
                    log.warn("Failed to update maintenance id={}: machine not found machineId={}", id, request.getMachineId());
                    return new ResourceNotFoundException("MACHINE NOT FOUND: " + request.getMachineId());
                });

        maintenance.setMachine(machine);
        maintenance.setType(request.getType());
        maintenance.setDescription(
                request.getDescription()
        );
        maintenance.setScheduledDate(
                request.getScheduledDate()
        );
        maintenance.setCompletedDate(
                request.getCompletedDate()
        );
        maintenance.setStatus(request.getStatus());
        maintenance.setTechnician(
                request.getTechnician()
        );

        Maintenance updatedMaintenance = maintenanceRepository.save(maintenance);
        log.info("Maintenance updated successfully id={}", id);
        webSocketEventPublisherService.publishMaintenance(updatedMaintenance);
        return updatedMaintenance;
    }

    // =========================
    // DELETE
    // =========================

    public void delete(Long id) {

        log.info("Deleting maintenance id={}", id);

        Maintenance maintenance =
                maintenanceRepository
                        .findById(id)
                        .orElseThrow(() -> {
                            log.warn("Failed to delete maintenance: record not found id={}", id);
                            return new ResourceNotFoundException("MAINTENANCE NOT FOUND: " + id);
                        });

        maintenanceRepository.delete(maintenance);
        log.info("Maintenance deleted successfully id={}", id);
    }
}