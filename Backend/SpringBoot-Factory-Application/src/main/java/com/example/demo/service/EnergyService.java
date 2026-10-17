package com.example.demo.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.example.demo.architecture.BoundedContext;
import com.example.demo.architecture.DomainBoundary;
import com.example.demo.config.CacheConfig;

import com.example.demo.dto.EnergyRequest;
import com.example.demo.entity.Energy;
import com.example.demo.entity.Machine;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.repository.EnergyRepository;
import com.example.demo.repository.MachineRepository;

@Service
@DomainBoundary(BoundedContext.PRODUCTION_AND_ENERGY)
public class EnergyService {

    private final EnergyRepository energyRepository;
    private final MachineRepository machineRepository;

    public EnergyService(
            EnergyRepository energyRepository,
            MachineRepository machineRepository) {

        this.energyRepository = energyRepository;
        this.machineRepository = machineRepository;
    }

    // =========================
    // CREATE ENERGY RECORD
    // =========================

    @CacheEvict(value = CacheConfig.CACHE_DASHBOARD_SUMMARY, allEntries = true)
    public Energy create(
            EnergyRequest request) {

        Machine machine = machineRepository
                .findById(request.getMachineId())
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "MACHINE NOT FOUND: "
                                + request.getMachineId()
                        ));

        Energy energy = new Energy();

        energy.setMachine(machine);

        energy.setEnergyConsumption(
                request.getEnergyConsumption()
        );

        energy.setRecordedAt(
                LocalDateTime.now()
        );

        return energyRepository.save(energy);
    }

    // =========================
    // GET ALL
    // =========================

    public List<Energy> getAll() {

        return energyRepository.findAll();
    }

    // =========================
    // GET ALL - PAGINATED
    // =========================

    public Page<Energy> getAll(
            Pageable pageable) {

        return energyRepository
                .findAll(pageable);
    }

    // =========================
    // GET BY ID
    // =========================

    public Energy getById(Long id) {

        return energyRepository
                .findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "ENERGY RECORD NOT FOUND: "
                                + id
                        ));
    }

    // =========================
    // GET BY MACHINE
    // =========================

    public List<Energy> getByMachine(
            Long machineId) {

        if (!machineRepository.existsById(machineId)) {

            throw new ResourceNotFoundException(
                    "MACHINE NOT FOUND: "
                    + machineId
            );
        }

        return energyRepository
                .findByMachineId(machineId);
    }

    // =========================
    // GET BY MACHINE - PAGINATED
    // =========================

    public Page<Energy> getByMachine(
            Long machineId,
            Pageable pageable) {

        if (!machineRepository.existsById(machineId)) {

            throw new ResourceNotFoundException(
                    "MACHINE NOT FOUND: "
                    + machineId
            );
        }

        return energyRepository
                .findByMachineId(
                        machineId,
                        pageable
                );
    }

    // =========================
    // UPDATE
    // =========================

    @CacheEvict(value = CacheConfig.CACHE_DASHBOARD_SUMMARY, allEntries = true)
    public Energy update(
            Long id,
            EnergyRequest request) {

        Energy energy =
                energyRepository
                        .findById(id)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "ENERGY RECORD NOT FOUND: "
                                        + id
                                ));

        Machine machine = machineRepository
                .findById(request.getMachineId())
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "MACHINE NOT FOUND: "
                                + request.getMachineId()
                        ));

        energy.setMachine(machine);

        energy.setEnergyConsumption(
                request.getEnergyConsumption()
        );

        return energyRepository.save(energy);
    }

    // =========================
    // DELETE
    // =========================

    @CacheEvict(value = CacheConfig.CACHE_DASHBOARD_SUMMARY, allEntries = true)
    public void delete(Long id) {

        Energy energy =
                energyRepository
                        .findById(id)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "ENERGY RECORD NOT FOUND: "
                                        + id
                                ));

        energyRepository.delete(energy);
    }
}