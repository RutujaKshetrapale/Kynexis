package com.kynexis.maintenance.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.kynexis.common.dto.PageResponse;
import com.kynexis.maintenance.dto.MaintenanceDTO;
import com.kynexis.maintenance.dto.MaintenanceRequest;
import com.kynexis.maintenance.service.MaintenanceService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/maintenance")
public class MaintenanceController {

    private final MaintenanceService maintenanceService;

    public MaintenanceController(MaintenanceService maintenanceService) {
        this.maintenanceService = maintenanceService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER')")
    public ResponseEntity<MaintenanceDTO> create(@Valid @RequestBody MaintenanceRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(maintenanceService.create(request));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER', 'OPERATOR', 'MANAGER')")
    public ResponseEntity<?> getAll(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "asc") String direction) {

        if (page == null && size == null) {
            return ResponseEntity.ok(maintenanceService.getAll());
        }

        int currentPage = page == null ? 0 : page;
        int pageSize = size == null ? 10 : size;
        Sort sort = "desc".equalsIgnoreCase(direction) ? Sort.by(sortBy).descending() : Sort.by(sortBy).ascending();
        Pageable pageable = PageRequest.of(currentPage, pageSize, sort);

        return ResponseEntity.ok(toPageResponse(maintenanceService.getAll(pageable)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER', 'OPERATOR', 'MANAGER')")
    public ResponseEntity<MaintenanceDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(maintenanceService.getById(id));
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
            return ResponseEntity.ok(maintenanceService.getByMachine(machineId));
        }

        int currentPage = page == null ? 0 : page;
        int pageSize = size == null ? 10 : size;
        Sort sort = "desc".equalsIgnoreCase(direction) ? Sort.by(sortBy).descending() : Sort.by(sortBy).ascending();
        Pageable pageable = PageRequest.of(currentPage, pageSize, sort);

        return ResponseEntity.ok(toPageResponse(maintenanceService.getByMachine(machineId, pageable)));
    }

    @GetMapping("/status/{status}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER', 'OPERATOR', 'MANAGER')")
    public ResponseEntity<?> getByStatus(
            @PathVariable String status,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "asc") String direction) {

        if (page == null && size == null) {
            return ResponseEntity.ok(maintenanceService.getByStatus(status));
        }

        int currentPage = page == null ? 0 : page;
        int pageSize = size == null ? 10 : size;
        Sort sort = "desc".equalsIgnoreCase(direction) ? Sort.by(sortBy).descending() : Sort.by(sortBy).ascending();
        Pageable pageable = PageRequest.of(currentPage, pageSize, sort);

        return ResponseEntity.ok(toPageResponse(maintenanceService.getByStatus(status, pageable)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER')")
    public ResponseEntity<MaintenanceDTO> update(@PathVariable Long id, @Valid @RequestBody MaintenanceRequest request) {
        return ResponseEntity.ok(maintenanceService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        maintenanceService.delete(id);
        return ResponseEntity.noContent().build();
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
