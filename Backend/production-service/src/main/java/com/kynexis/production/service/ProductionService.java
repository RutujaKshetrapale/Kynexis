package com.kynexis.production.service;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.kynexis.production.client.MachineServiceClient;
import com.kynexis.production.common.exception.ResourceNotFoundException;
import com.kynexis.production.dto.ProductionDTO;
import com.kynexis.production.dto.ProductionMetricsDTO;
import com.kynexis.production.dto.ProductionRequest;
import com.kynexis.production.entity.Production;
import com.kynexis.production.repository.ProductionRepository;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class ProductionService {

    private final ProductionRepository productionRepository;
    private final MachineServiceClient machineServiceClient;

    public ProductionService(
            ProductionRepository productionRepository,
            MachineServiceClient machineServiceClient) {
        this.productionRepository = productionRepository;
        this.machineServiceClient = machineServiceClient;
    }

    @Transactional
    public ProductionDTO create(ProductionRequest request) {
        log.info("Creating production record for machineId={}", request.getMachineId());

        if (!machineServiceClient.machineExists(request.getMachineId())) {
            throw new ResourceNotFoundException("MACHINE NOT FOUND: " + request.getMachineId());
        }

        Production production = Production.builder()
                .machineId(request.getMachineId())
                .productName(request.getProductName().trim())
                .quantityProduced(request.getQuantityProduced())
                .quantityRejected(request.getQuantityRejected())
                .productionStart(request.getProductionStart())
                .productionEnd(request.getProductionEnd())
                .status(request.getStatus().trim())
                .build();

        Production saved = productionRepository.save(production);
        log.info("Production record created successfully id={}", saved.getId());
        return mapToDTO(saved);
    }

    @Transactional(readOnly = true)
    public List<ProductionDTO> getAll() {
        return productionRepository.findAll().stream().map(this::mapToDTO).toList();
    }

    @Transactional(readOnly = true)
    public Page<ProductionDTO> getAll(Pageable pageable) {
        return productionRepository.findAll(pageable).map(this::mapToDTO);
    }

    @Transactional(readOnly = true)
    public ProductionDTO getById(Long id) {
        Production production = productionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PRODUCTION NOT FOUND: " + id));
        return mapToDTO(production);
    }

    @Transactional(readOnly = true)
    public List<ProductionDTO> getByMachine(Long machineId) {
        if (!machineServiceClient.machineExists(machineId)) {
            throw new ResourceNotFoundException("MACHINE NOT FOUND: " + machineId);
        }
        return productionRepository.findByMachineId(machineId).stream().map(this::mapToDTO).toList();
    }

    @Transactional(readOnly = true)
    public Page<ProductionDTO> getByMachine(Long machineId, Pageable pageable) {
        if (!machineServiceClient.machineExists(machineId)) {
            throw new ResourceNotFoundException("MACHINE NOT FOUND: " + machineId);
        }
        return productionRepository.findByMachineId(machineId, pageable).map(this::mapToDTO);
    }

    @Transactional(readOnly = true)
    public List<ProductionDTO> getByStatus(String status) {
        return productionRepository.findByStatus(status).stream().map(this::mapToDTO).toList();
    }

    @Transactional(readOnly = true)
    public Page<ProductionDTO> getByStatus(String status, Pageable pageable) {
        return productionRepository.findByStatus(status, pageable).map(this::mapToDTO);
    }

    @Transactional
    public ProductionDTO update(Long id, ProductionRequest request) {
        log.info("Updating production record id={}", id);

        Production production = productionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PRODUCTION NOT FOUND: " + id));

        if (!machineServiceClient.machineExists(request.getMachineId())) {
            throw new ResourceNotFoundException("MACHINE NOT FOUND: " + request.getMachineId());
        }

        production.setMachineId(request.getMachineId());
        production.setProductName(request.getProductName().trim());
        production.setQuantityProduced(request.getQuantityProduced());
        production.setQuantityRejected(request.getQuantityRejected());
        production.setProductionStart(request.getProductionStart());
        production.setProductionEnd(request.getProductionEnd());
        production.setStatus(request.getStatus().trim());

        Production updated = productionRepository.save(production);
        return mapToDTO(updated);
    }

    @Transactional
    public void delete(Long id) {
        log.info("Deleting production record id={}", id);
        Production production = productionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PRODUCTION NOT FOUND: " + id));
        productionRepository.delete(production);
    }

    @Transactional(readOnly = true)
    public ProductionMetricsDTO getMetricsSummary() {
        Long totalProduced = productionRepository.getTotalQuantityProduced();
        Long totalRejected = productionRepository.getTotalQuantityRejected();
        return ProductionMetricsDTO.builder()
                .totalProduction(totalProduced != null ? totalProduced : 0L)
                .rejectedProduction(totalRejected != null ? totalRejected : 0L)
                .build();
    }

    public ProductionDTO mapToDTO(Production p) {
        if (p == null) return null;
        return ProductionDTO.builder()
                .id(p.getId())
                .machineId(p.getMachineId())
                .productName(p.getProductName())
                .quantityProduced(p.getQuantityProduced())
                .quantityRejected(p.getQuantityRejected())
                .productionStart(p.getProductionStart())
                .productionEnd(p.getProductionEnd())
                .status(p.getStatus())
                .build();
    }
}
