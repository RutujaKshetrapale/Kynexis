package com.kynexis.production.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.kynexis.common.exception.ResourceNotFoundException;
import com.kynexis.production.client.MachineServiceClient;
import com.kynexis.production.dto.EnergyDTO;
import com.kynexis.production.dto.EnergyMetricsDTO;
import com.kynexis.production.dto.EnergyRequest;
import com.kynexis.production.entity.Energy;
import com.kynexis.production.repository.EnergyRepository;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class EnergyService {

    private final EnergyRepository energyRepository;
    private final MachineServiceClient machineServiceClient;

    public EnergyService(
            EnergyRepository energyRepository,
            MachineServiceClient machineServiceClient) {
        this.energyRepository = energyRepository;
        this.machineServiceClient = machineServiceClient;
    }

    @Transactional
    public EnergyDTO create(EnergyRequest request) {
        log.info("Creating energy record for machineId={}", request.getMachineId());

        if (!machineServiceClient.machineExists(request.getMachineId())) {
            throw new ResourceNotFoundException("MACHINE NOT FOUND: " + request.getMachineId());
        }

        Energy energy = Energy.builder()
                .machineId(request.getMachineId())
                .energyConsumption(request.getEnergyConsumption())
                .recordedAt(request.getRecordedAt() != null ? request.getRecordedAt() : LocalDateTime.now())
                .build();

        Energy saved = energyRepository.save(energy);
        log.info("Energy record created successfully id={}", saved.getId());
        return mapToDTO(saved);
    }

    @Transactional(readOnly = true)
    public List<EnergyDTO> getAll() {
        return energyRepository.findAll().stream().map(this::mapToDTO).toList();
    }

    @Transactional(readOnly = true)
    public Page<EnergyDTO> getAll(Pageable pageable) {
        return energyRepository.findAll(pageable).map(this::mapToDTO);
    }

    @Transactional(readOnly = true)
    public EnergyDTO getById(Long id) {
        Energy energy = energyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ENERGY RECORD NOT FOUND: " + id));
        return mapToDTO(energy);
    }

    @Transactional(readOnly = true)
    public List<EnergyDTO> getByMachine(Long machineId) {
        if (!machineServiceClient.machineExists(machineId)) {
            throw new ResourceNotFoundException("MACHINE NOT FOUND: " + machineId);
        }
        return energyRepository.findByMachineId(machineId).stream().map(this::mapToDTO).toList();
    }

    @Transactional(readOnly = true)
    public Page<EnergyDTO> getByMachine(Long machineId, Pageable pageable) {
        if (!machineServiceClient.machineExists(machineId)) {
            throw new ResourceNotFoundException("MACHINE NOT FOUND: " + machineId);
        }
        return energyRepository.findByMachineId(machineId, pageable).map(this::mapToDTO);
    }

    @Transactional
    public EnergyDTO update(Long id, EnergyRequest request) {
        log.info("Updating energy record id={}", id);

        Energy energy = energyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ENERGY RECORD NOT FOUND: " + id));

        if (!machineServiceClient.machineExists(request.getMachineId())) {
            throw new ResourceNotFoundException("MACHINE NOT FOUND: " + request.getMachineId());
        }

        energy.setMachineId(request.getMachineId());
        energy.setEnergyConsumption(request.getEnergyConsumption());
        if (request.getRecordedAt() != null) {
            energy.setRecordedAt(request.getRecordedAt());
        }

        Energy updated = energyRepository.save(energy);
        return mapToDTO(updated);
    }

    @Transactional
    public void delete(Long id) {
        log.info("Deleting energy record id={}", id);
        Energy energy = energyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ENERGY RECORD NOT FOUND: " + id));
        energyRepository.delete(energy);
    }

    @Transactional(readOnly = true)
    public EnergyMetricsDTO getMetricsSummary() {
        Double totalEnergy = energyRepository.getTotalEnergyConsumption();
        return EnergyMetricsDTO.builder()
                .totalEnergyConsumption(totalEnergy != null ? totalEnergy : 0.0)
                .build();
    }

    public EnergyDTO mapToDTO(Energy e) {
        if (e == null) return null;
        return EnergyDTO.builder()
                .id(e.getId())
                .machineId(e.getMachineId())
                .energyConsumption(e.getEnergyConsumption())
                .recordedAt(e.getRecordedAt())
                .build();
    }
}
