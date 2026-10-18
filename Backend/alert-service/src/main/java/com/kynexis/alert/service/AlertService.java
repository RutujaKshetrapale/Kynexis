package com.kynexis.alert.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.kynexis.alert.dto.AlertDTO;
import com.kynexis.alert.dto.AlertRequest;
import com.kynexis.alert.entity.Alert;
import com.kynexis.alert.repository.AlertRepository;
import com.kynexis.alert.common.exception.ResourceNotFoundException;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class AlertService {

    private final AlertRepository alertRepository;
    private final KafkaEventPublisherService kafkaEventPublisherService;

    public AlertService(
            AlertRepository alertRepository,
            KafkaEventPublisherService kafkaEventPublisherService) {
        this.alertRepository = alertRepository;
        this.kafkaEventPublisherService = kafkaEventPublisherService;
    }

    @Transactional
    public AlertDTO create(AlertRequest request) {
        log.info("Creating alert machineId={} severity={} type={}", request.getMachineId(), request.getSeverity(), request.getType());

        Alert alert = Alert.builder()
                .machineId(request.getMachineId())
                .type(request.getType())
                .severity(request.getSeverity())
                .message(request.getMessage())
                .resolved(request.isResolved())
                .createdAt(LocalDateTime.now())
                .telemetryId(request.getTelemetryId())
                .build();

        Alert saved = alertRepository.save(alert);
        log.info("Alert created successfully id={} machineId={}", saved.getId(), request.getMachineId());

        if (kafkaEventPublisherService != null) {
            kafkaEventPublisherService.publishAlertCreated(saved);
        }

        return mapToDTO(saved);
    }

    @Transactional(readOnly = true)
    public List<AlertDTO> getAll() {
        return alertRepository.findAll().stream().map(this::mapToDTO).toList();
    }

    @Transactional(readOnly = true)
    public Page<AlertDTO> getAll(Pageable pageable) {
        return alertRepository.findAll(pageable).map(this::mapToDTO);
    }

    @Transactional(readOnly = true)
    public AlertDTO getById(Long id) {
        Alert alert = alertRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ALERT NOT FOUND: " + id));
        return mapToDTO(alert);
    }

    @Transactional(readOnly = true)
    public Alert getEntityById(Long id) {
        return alertRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ALERT NOT FOUND: " + id));
    }

    @Transactional(readOnly = true)
    public List<AlertDTO> getUnresolved() {
        return alertRepository.findByResolvedFalse().stream().map(this::mapToDTO).toList();
    }

    @Transactional(readOnly = true)
    public Page<AlertDTO> getUnresolved(Pageable pageable) {
        return alertRepository.findByResolvedFalse(pageable).map(this::mapToDTO);
    }

    @Transactional(readOnly = true)
    public List<AlertDTO> getByMachine(Long machineId) {
        return alertRepository.findByMachineId(machineId).stream().map(this::mapToDTO).toList();
    }

    @Transactional(readOnly = true)
    public Page<AlertDTO> getByMachine(Long machineId, Pageable pageable) {
        return alertRepository.findByMachineId(machineId, pageable).map(this::mapToDTO);
    }

    @Transactional(readOnly = true)
    public List<AlertDTO> getBySeverity(String severity) {
        return alertRepository.findBySeverity(severity).stream().map(this::mapToDTO).toList();
    }

    @Transactional(readOnly = true)
    public Page<AlertDTO> getBySeverity(String severity, Pageable pageable) {
        return alertRepository.findBySeverity(severity, pageable).map(this::mapToDTO);
    }

    @Transactional
    public AlertDTO update(Long id, AlertRequest request) {
        log.info("Updating alert id={} severity={}", id, request.getSeverity());

        Alert alert = getEntityById(id);
        alert.setType(request.getType());
        alert.setSeverity(request.getSeverity());
        alert.setMessage(request.getMessage());
        alert.setResolved(request.isResolved());
        if (request.getTelemetryId() != null) {
            alert.setTelemetryId(request.getTelemetryId());
        }

        Alert updated = alertRepository.save(alert);
        log.info("Alert updated successfully id={}", id);

        if (kafkaEventPublisherService != null) {
            kafkaEventPublisherService.publishAlertUpdated(updated);
        }

        return mapToDTO(updated);
    }

    @Transactional
    public AlertDTO resolveAlert(Long id) {
        log.info("Resolving alert id={}", id);

        Alert alert = getEntityById(id);
        alert.setResolved(true);

        Alert saved = alertRepository.save(alert);
        log.info("Alert resolved successfully id={}", id);

        if (kafkaEventPublisherService != null) {
            kafkaEventPublisherService.publishAlertResolved(saved);
        }

        return mapToDTO(saved);
    }

    @Transactional
    public void delete(Long id) {
        log.info("Deleting alert id={}", id);
        Alert alert = getEntityById(id);
        alertRepository.delete(alert);
        log.info("Alert deleted successfully id={}", id);
    }

    // Cross-Service Internal Contracts
    @Transactional(readOnly = true)
    public List<AlertDTO> getUnresolvedByMachine(Long machineId) {
        return alertRepository.findByMachineIdAndResolvedFalse(machineId).stream().map(this::mapToDTO).toList();
    }

    @Transactional(readOnly = true)
    public long countUnresolved() {
        return alertRepository.countByResolvedFalse();
    }

    @Transactional(readOnly = true)
    public long countUnresolvedByMachine(Long machineId) {
        return alertRepository.countByMachineIdAndResolvedFalse(machineId);
    }

    public AlertDTO mapToDTO(Alert alert) {
        if (alert == null) return null;
        return AlertDTO.builder()
                .id(alert.getId())
                .type(alert.getType())
                .severity(alert.getSeverity())
                .message(alert.getMessage())
                .resolved(alert.isResolved())
                .createdAt(alert.getCreatedAt())
                .machineId(alert.getMachineId())
                .telemetryId(alert.getTelemetryId())
                .build();
    }
}
