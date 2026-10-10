package com.example.demo.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.example.demo.dto.TelemetryRequest;
import com.example.demo.entity.Machine;
import com.example.demo.entity.Telemetry;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.repository.MachineRepository;
import com.example.demo.repository.TelemetryRepository;
import com.example.demo.service.alert.AlertEngineService;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class TelemetryService {

    private final TelemetryRepository telemetryRepository;
    private final MachineRepository machineRepository;
    private final DomainValidationService domainValidationService;
    private final WebSocketEventPublisherService webSocketEventPublisherService;
    private final AlertEngineService alertEngineService;

    public TelemetryService(
            TelemetryRepository telemetryRepository,
            MachineRepository machineRepository,
            DomainValidationService domainValidationService,
            WebSocketEventPublisherService webSocketEventPublisherService,
            AlertEngineService alertEngineService) {

        this.telemetryRepository = telemetryRepository;
        this.machineRepository = machineRepository;
        this.domainValidationService = domainValidationService;
        this.webSocketEventPublisherService = webSocketEventPublisherService;
        this.alertEngineService = alertEngineService;
    }

    public Telemetry create(TelemetryRequest request) {

        log.info("Receiving telemetry machineId={}", request.getMachineId());

        Machine machine = machineRepository
                .findById(request.getMachineId())
                .orElseThrow(() -> {
                    log.warn("Failed to save telemetry: machine not found machineId={}", request.getMachineId());
                    return new ResourceNotFoundException("MACHINE NOT FOUND: " + request.getMachineId());
                });

        domainValidationService.validateTelemetry(
                request.getTemperature(),
                request.getVibration(),
                request.getPressure(),
                request.getRpm()
        );

        Telemetry telemetry = new Telemetry();

        telemetry.setMachine(machine);
        telemetry.setTemperature(request.getTemperature());
        telemetry.setVibration(request.getVibration());
        telemetry.setPressure(request.getPressure());
        telemetry.setRpm(request.getRpm());
        telemetry.setTimestamp(request.getTimestamp());

        Telemetry savedTelemetry = telemetryRepository.save(telemetry);
        log.info("Telemetry saved successfully id={} machineId={}", savedTelemetry.getId(), request.getMachineId());
        webSocketEventPublisherService.publishTelemetry(savedTelemetry);

        if (alertEngineService != null) {
            try {
                alertEngineService.evaluateTelemetry(savedTelemetry);
            } catch (Exception e) {
                log.error("Error evaluating alert rules for telemetry id={}", savedTelemetry.getId(), e);
            }
        }

        return savedTelemetry;
    }


    public List<Telemetry> getAll() {
        return telemetryRepository.findAll();
    }

    public Page<Telemetry> getAll(Pageable pageable) {
        return telemetryRepository.findAll(pageable);
    }

    public Telemetry getById(Long id) {

        return telemetryRepository
                .findById(id)
                .orElseThrow(() -> {
                    log.warn("Telemetry not found id={}", id);
                    return new ResourceNotFoundException("TELEMETRY NOT FOUND: " + id);
                });
    }

    public List<Telemetry> getByMachine(Long machineId) {

        validateMachine(machineId);

        return telemetryRepository.findByMachineId(machineId);
    }

    public Page<Telemetry> getByMachine(
            Long machineId,
            Pageable pageable) {

        validateMachine(machineId);

        return telemetryRepository.findByMachineId(
                machineId,
                pageable
        );
    }

    public List<Telemetry> getByMachineAndDateRange(
            Long machineId,
            LocalDateTime start,
            LocalDateTime end) {

        validateMachine(machineId);

        return telemetryRepository
                .findByMachineIdAndTimestampBetween(
                        machineId,
                        start,
                        end
                );
    }

    public Page<Telemetry> getByMachineAndDateRange(
            Long machineId,
            LocalDateTime start,
            LocalDateTime end,
            Pageable pageable) {

        validateMachine(machineId);

        return telemetryRepository
                .findByMachineIdAndTimestampBetween(
                        machineId,
                        start,
                        end,
                        pageable
                );
    }

    public List<Telemetry> getByDateRange(
            LocalDateTime start,
            LocalDateTime end) {

        return telemetryRepository
                .findByTimestampBetween(start, end);
    }

    public Page<Telemetry> getByDateRange(
            LocalDateTime start,
            LocalDateTime end,
            Pageable pageable) {

        return telemetryRepository
                .findByTimestampBetween(
                        start,
                        end,
                        pageable
                );
    }

    public List<Telemetry> getLatestByMachine(
            Long machineId) {

        validateMachine(machineId);

        return telemetryRepository
                .findTop10ByMachineIdOrderByTimestampDesc(
                        machineId
                );
    }

    private void validateMachine(Long machineId) {

        if (!machineRepository.existsById(machineId)) {
            log.warn("Machine not found machineId={}", machineId);
            throw new ResourceNotFoundException(
                    "MACHINE NOT FOUND: " + machineId
            );
        }
    }
}