package com.kynexis.telemetry.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.kynexis.common.exception.ResourceNotFoundException;
import com.kynexis.telemetry.client.MachineServiceClient;
import com.kynexis.telemetry.dto.TelemetryDTO;
import com.kynexis.telemetry.dto.TelemetryRequest;
import com.kynexis.telemetry.entity.Telemetry;
import com.kynexis.telemetry.repository.TelemetryRepository;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class TelemetryService {

    private final TelemetryRepository telemetryRepository;
    private final MachineServiceClient machineServiceClient;
    private final DomainValidationService domainValidationService;
    private final KafkaEventPublisherService kafkaEventPublisherService;

    public TelemetryService(
            TelemetryRepository telemetryRepository,
            MachineServiceClient machineServiceClient,
            DomainValidationService domainValidationService,
            KafkaEventPublisherService kafkaEventPublisherService) {
        this.telemetryRepository = telemetryRepository;
        this.machineServiceClient = machineServiceClient;
        this.domainValidationService = domainValidationService;
        this.kafkaEventPublisherService = kafkaEventPublisherService;
    }

    @Transactional
    public TelemetryDTO create(TelemetryRequest request) {
        log.info("Receiving telemetry machineId={}", request.getMachineId());

        if (!machineServiceClient.machineExists(request.getMachineId())) {
            log.warn("Failed to save telemetry: machine not found machineId={}", request.getMachineId());
            throw new ResourceNotFoundException("MACHINE NOT FOUND: " + request.getMachineId());
        }

        domainValidationService.validateTelemetry(
                request.getTemperature(),
                request.getVibration(),
                request.getPressure(),
                request.getRpm());

        Telemetry telemetry = Telemetry.builder()
                .machineId(request.getMachineId())
                .temperature(request.getTemperature())
                .vibration(request.getVibration())
                .pressure(request.getPressure())
                .rpm(request.getRpm())
                .timestamp(request.getTimestamp() != null ? request.getTimestamp() : LocalDateTime.now())
                .build();

        Telemetry saved = telemetryRepository.save(telemetry);
        log.info("Telemetry saved successfully id={} machineId={}", saved.getId(), saved.getMachineId());

        if (kafkaEventPublisherService != null) {
            kafkaEventPublisherService.publishTelemetryRecorded(saved);
        }

        return mapToDTO(saved);
    }

    @Transactional(readOnly = true)
    public List<TelemetryDTO> getAll() {
        return telemetryRepository.findAll().stream().map(this::mapToDTO).toList();
    }

    @Transactional(readOnly = true)
    public Page<TelemetryDTO> getAll(Pageable pageable) {
        return telemetryRepository.findAll(pageable).map(this::mapToDTO);
    }

    @Transactional(readOnly = true)
    public TelemetryDTO getById(Long id) {
        Telemetry telemetry = telemetryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("TELEMETRY NOT FOUND: " + id));
        return mapToDTO(telemetry);
    }

    @Transactional(readOnly = true)
    public Page<TelemetryDTO> getByMachine(Long machineId, Pageable pageable) {
        return telemetryRepository.findByMachineId(machineId, pageable).map(this::mapToDTO);
    }

    @Transactional(readOnly = true)
    public Optional<TelemetryDTO> getLatestByMachine(Long machineId) {
        return telemetryRepository.findTopByMachineIdOrderByTimestampDesc(machineId).map(this::mapToDTO);
    }

    @Transactional(readOnly = true)
    public List<TelemetryDTO> getRecentByMachine(Long machineId, int limit) {
        int cappedLimit = Math.max(1, Math.min(limit, 100));
        Pageable pageable = PageRequest.of(0, cappedLimit, Sort.by(Sort.Direction.DESC, "timestamp"));
        return telemetryRepository.findByMachineId(machineId, pageable).getContent().stream().map(this::mapToDTO).toList();
    }

    public TelemetryDTO mapToDTO(Telemetry telemetry) {
        if (telemetry == null) return null;
        return TelemetryDTO.builder()
                .id(telemetry.getId())
                .temperature(telemetry.getTemperature())
                .vibration(telemetry.getVibration())
                .pressure(telemetry.getPressure())
                .rpm(telemetry.getRpm())
                .timestamp(telemetry.getTimestamp())
                .machineId(telemetry.getMachineId())
                .build();
    }
}
