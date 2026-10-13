package com.example.demo.service;

import java.util.List;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.example.demo.config.CacheConfig;

import com.example.demo.dto.ProductionRequest;
import com.example.demo.entity.Machine;
import com.example.demo.entity.Production;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.repository.MachineRepository;
import com.example.demo.repository.ProductionRepository;

@Service
public class ProductionService {

    private final ProductionRepository productionRepository;
    private final MachineRepository machineRepository;

    public ProductionService(
            ProductionRepository productionRepository,
            MachineRepository machineRepository) {

        this.productionRepository = productionRepository;
        this.machineRepository = machineRepository;
    }

    // =========================
    // CREATE PRODUCTION
    // =========================

    @CacheEvict(value = CacheConfig.CACHE_DASHBOARD_SUMMARY, allEntries = true)
    public Production create(
            ProductionRequest request) {

        Machine machine = machineRepository
                .findById(request.getMachineId())
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "MACHINE NOT FOUND: "
                                + request.getMachineId()
                        ));

        Production production = new Production();

        production.setMachine(machine);

        production.setProductName(
                request.getProductName()
        );

        production.setQuantityProduced(
                request.getQuantityProduced()
        );

        production.setQuantityRejected(
                request.getQuantityRejected()
        );

        production.setProductionStart(
                request.getProductionStart()
        );

        production.setProductionEnd(
                request.getProductionEnd()
        );

        production.setStatus(
                request.getStatus()
        );

        return productionRepository.save(production);
    }

    // =========================
    // GET ALL
    // =========================

    public List<Production> getAll() {

        return productionRepository.findAll();
    }

    // =========================
    // GET ALL - PAGINATED
    // =========================

    public Page<Production> getAll(
            Pageable pageable) {

        return productionRepository
                .findAll(pageable);
    }

    // =========================
    // GET BY ID
    // =========================

    public Production getById(Long id) {

        return productionRepository
                .findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "PRODUCTION NOT FOUND: "
                                + id
                        ));
    }

    // =========================
    // GET BY MACHINE
    // =========================

    public List<Production> getByMachine(
            Long machineId) {

        if (!machineRepository.existsById(machineId)) {

            throw new ResourceNotFoundException(
                    "MACHINE NOT FOUND: "
                    + machineId
            );
        }

        return productionRepository
                .findByMachineId(machineId);
    }

    // =========================
    // GET BY MACHINE - PAGINATED
    // =========================

    public Page<Production> getByMachine(
            Long machineId,
            Pageable pageable) {

        if (!machineRepository.existsById(machineId)) {

            throw new ResourceNotFoundException(
                    "MACHINE NOT FOUND: "
                    + machineId
            );
        }

        return productionRepository
                .findByMachineId(
                        machineId,
                        pageable
                );
    }

    // =========================
    // GET BY STATUS
    // =========================

    public List<Production> getByStatus(
            String status) {

        return productionRepository
                .findByStatus(status);
    }

    // =========================
    // GET BY STATUS - PAGINATED
    // =========================

    public Page<Production> getByStatus(
            String status,
            Pageable pageable) {

        return productionRepository
                .findByStatus(
                        status,
                        pageable
                );
    }

    // =========================
    // UPDATE
    // =========================

    @CacheEvict(value = CacheConfig.CACHE_DASHBOARD_SUMMARY, allEntries = true)
    public Production update(
            Long id,
            ProductionRequest request) {

        Production production =
                productionRepository
                        .findById(id)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "PRODUCTION NOT FOUND: "
                                        + id
                                ));

        Machine machine = machineRepository
                .findById(request.getMachineId())
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "MACHINE NOT FOUND: "
                                + request.getMachineId()
                        ));

        production.setMachine(machine);

        production.setProductName(
                request.getProductName()
        );

        production.setQuantityProduced(
                request.getQuantityProduced()
        );

        production.setQuantityRejected(
                request.getQuantityRejected()
        );

        production.setProductionStart(
                request.getProductionStart()
        );

        production.setProductionEnd(
                request.getProductionEnd()
        );

        production.setStatus(
                request.getStatus()
        );

        return productionRepository.save(production);
    }

    // =========================
    // DELETE
    // =========================

    @CacheEvict(value = CacheConfig.CACHE_DASHBOARD_SUMMARY, allEntries = true)
    public void delete(Long id) {

        Production production =
                productionRepository
                        .findById(id)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "PRODUCTION NOT FOUND: "
                                        + id
                                ));

        productionRepository.delete(production);
    }
}