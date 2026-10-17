package com.kynexis.production.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.kynexis.common.dto.PageResponse;
import com.kynexis.production.dto.EnergyDTO;
import com.kynexis.production.dto.EnergyMetricsDTO;
import com.kynexis.production.dto.EnergyRequest;
import com.kynexis.production.service.EnergyService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/energy")
public class EnergyController {

    private final EnergyService energyService;

    public EnergyController(EnergyService energyService) {
        this.energyService = energyService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER')")
    public ResponseEntity<EnergyDTO> create(@Valid @RequestBody EnergyRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(energyService.create(request));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER', 'OPERATOR', 'MANAGER')")
    public ResponseEntity<?> getAll(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "asc") String direction) {

        if (page == null && size == null) {
            return ResponseEntity.ok(energyService.getAll());
        }

        int currentPage = page == null ? 0 : page;
        int pageSize = size == null ? 10 : size;
        Sort sort = "desc".equalsIgnoreCase(direction) ? Sort.by(sortBy).descending() : Sort.by(sortBy).ascending();
        Pageable pageable = PageRequest.of(currentPage, pageSize, sort);

        return ResponseEntity.ok(toPageResponse(energyService.getAll(pageable)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER', 'OPERATOR', 'MANAGER')")
    public ResponseEntity<EnergyDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(energyService.getById(id));
    }

    @GetMapping("/machine/{machineId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER', 'OPERATOR', 'MANAGER')")
    public ResponseEntity<?> getByMachine(
            @PathVariable Long machineId,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "asc") String direction) {

        if (page == null && size == null) {
            return ResponseEntity.ok(energyService.getByMachine(machineId));
        }

        int currentPage = page == null ? 0 : page;
        int pageSize = size == null ? 10 : size;
        Sort sort = "desc".equalsIgnoreCase(direction) ? Sort.by(sortBy).descending() : Sort.by(sortBy).ascending();
        Pageable pageable = PageRequest.of(currentPage, pageSize, sort);

        return ResponseEntity.ok(toPageResponse(energyService.getByMachine(machineId, pageable)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER')")
    public ResponseEntity<EnergyDTO> update(@PathVariable Long id, @Valid @RequestBody EnergyRequest request) {
        return ResponseEntity.ok(energyService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        energyService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/metrics/summary")
    public ResponseEntity<EnergyMetricsDTO> getMetricsSummary() {
        return ResponseEntity.ok(energyService.getMetricsSummary());
    }

    private <T> PageResponse<T> toPageResponse(Page<T> page) {
        return PageResponse.<T>builder()
                .content(page.getContent())
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .first(page.isFirst())
                .last(page.isLast())
                .build();
    }
}
