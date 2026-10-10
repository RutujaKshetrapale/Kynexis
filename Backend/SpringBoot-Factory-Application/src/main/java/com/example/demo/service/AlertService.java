package com.example.demo.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.example.demo.dto.AlertRequest;
import com.example.demo.entity.Alert;
import com.example.demo.entity.Machine;
import com.example.demo.entity.Telemetry;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.repository.AlertRepository;
import com.example.demo.repository.MachineRepository;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class AlertService {

    private final AlertRepository alertRepository;
    private final MachineRepository machineRepository;
    private final WebSocketEventPublisherService webSocketEventPublisherService;

    public AlertService(
            AlertRepository alertRepository,
            MachineRepository machineRepository,
            WebSocketEventPublisherService webSocketEventPublisherService) {

        this.alertRepository = alertRepository;
        this.machineRepository = machineRepository;
        this.webSocketEventPublisherService = webSocketEventPublisherService;
    }

    // =========================
    // CREATE ALERT
    // =========================

    public Alert create(AlertRequest request) {
        return create(request, null);
    }

    public Alert create(AlertRequest request, Telemetry telemetry) {

        log.info("Creating alert machineId={} severity={} type={}", request.getMachineId(), request.getSeverity(), request.getType());

        Machine machine = machineRepository
                .findById(request.getMachineId())
                .orElseThrow(() -> {
                    log.warn("Failed to create alert: machine not found machineId={}", request.getMachineId());
                    return new ResourceNotFoundException("MACHINE NOT FOUND: " + request.getMachineId());
                });

        Alert alert = new Alert();

        alert.setMachine(machine);
        alert.setType(request.getType());
        alert.setMessage(request.getMessage());
        alert.setSeverity(request.getSeverity());
        alert.setResolved(request.isResolved());
        alert.setCreatedAt(LocalDateTime.now());
        alert.setTelemetry(telemetry);

        Alert savedAlert = alertRepository.save(alert);
        log.info("Alert created successfully id={} machineId={}", savedAlert.getId(), request.getMachineId());
        webSocketEventPublisherService.publishAlert(savedAlert);
        return savedAlert;
    }


    // =========================
    // GET ALL ALERTS
    // =========================

    public List<Alert> getAll() {

        return alertRepository.findAll();
    }

    // =========================
    // GET ALL ALERTS - PAGINATED
    // =========================

    public Page<Alert> getAll(Pageable pageable) {

        return alertRepository.findAll(pageable);
    }

    // =========================
    // GET ALERT BY ID
    // =========================

    public Alert getById(Long id) {

        return alertRepository
                .findById(id)
                .orElseThrow(() -> {
                    log.warn("Alert not found id={}", id);
                    return new ResourceNotFoundException("ALERT NOT FOUND: " + id);
                });
    }

    // =========================
    // GET ALERTS BY MACHINE
    // =========================

    public List<Alert> getByMachine(Long machineId) {

        if (!machineRepository.existsById(machineId)) {
            log.warn("Failed to fetch alerts: machine not found machineId={}", machineId);
            throw new ResourceNotFoundException(
                    "MACHINE NOT FOUND: " + machineId
            );
        }

        return alertRepository.findByMachineId(machineId);
    }

    // =========================
    // GET ALERTS BY MACHINE
    // PAGINATED
    // =========================

    public Page<Alert> getByMachine(
            Long machineId,
            Pageable pageable) {

        if (!machineRepository.existsById(machineId)) {
            log.warn("Failed to fetch alerts: machine not found machineId={}", machineId);
            throw new ResourceNotFoundException(
                    "MACHINE NOT FOUND: " + machineId
            );
        }

        return alertRepository.findByMachineId(
                machineId,
                pageable
        );
    }

    // =========================
    // GET UNRESOLVED ALERTS
    // =========================

    public List<Alert> getUnresolved() {

        return alertRepository.findByResolvedFalse();
    }

    // =========================
    // GET UNRESOLVED ALERTS
    // PAGINATED
    // =========================

    public Page<Alert> getUnresolved(Pageable pageable) {

        return alertRepository.findByResolvedFalse(pageable);
    }

    // =========================
    // GET ALERTS BY SEVERITY
    // =========================

    public List<Alert> getBySeverity(String severity) {

        return alertRepository.findBySeverity(severity);
    }

    // =========================
    // GET ALERTS BY SEVERITY
    // PAGINATED
    // =========================

    public Page<Alert> getBySeverity(
            String severity,
            Pageable pageable) {

        return alertRepository.findBySeverity(
                severity,
                pageable
        );
    }

    // =========================
    // UPDATE ALERT
    // =========================

    public Alert update(
            Long id,
            AlertRequest request) {
        return update(id, request, null);
    }

    public Alert update(
            Long id,
            AlertRequest request,
            Telemetry telemetry) {

        log.info("Updating alert id={} resolved={}", id, request.isResolved());

        Alert alert = alertRepository
                .findById(id)
                .orElseThrow(() -> {
                    log.warn("Failed to update alert: alert not found id={}", id);
                    return new ResourceNotFoundException("ALERT NOT FOUND: " + id);
                });

        Machine machine = machineRepository
                .findById(request.getMachineId())
                .orElseThrow(() -> {
                    log.warn("Failed to update alert id={}: machine not found machineId={}", id, request.getMachineId());
                    return new ResourceNotFoundException("MACHINE NOT FOUND: " + request.getMachineId());
                });

        alert.setMachine(machine);
        alert.setType(request.getType());
        alert.setMessage(request.getMessage());
        alert.setSeverity(request.getSeverity());
        alert.setResolved(request.isResolved());
        if (telemetry != null) {
            alert.setTelemetry(telemetry);
        }

        Alert updatedAlert = alertRepository.save(alert);
        log.info("Alert updated successfully id={}", id);
        webSocketEventPublisherService.publishAlert(updatedAlert);
        return updatedAlert;
    }


    // =========================
    // DELETE ALERT
    // =========================

    public void delete(Long id) {

        log.info("Deleting alert id={}", id);

        Alert alert = alertRepository
                .findById(id)
                .orElseThrow(() -> {
                    log.warn("Failed to delete alert: alert not found id={}", id);
                    return new ResourceNotFoundException("ALERT NOT FOUND: " + id);
                });

        alertRepository.delete(alert);
        log.info("Alert deleted successfully id={}", id);
    }
}