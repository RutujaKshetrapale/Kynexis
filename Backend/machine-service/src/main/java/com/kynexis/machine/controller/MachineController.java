package com.kynexis.machine.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.kynexis.machine.common.dto.MachineSummaryDTO;
import com.kynexis.machine.common.dto.PageResponse;
import com.kynexis.machine.common.exception.BusinessValidationException;
import com.kynexis.machine.dto.MachineDTO;
import com.kynexis.machine.dto.MachineRequest;
import com.kynexis.machine.service.MachineService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/machines")
public class MachineController {

    private final MachineService machineService;

    public MachineController(MachineService machineService) {
        this.machineService = machineService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER')")
    public ResponseEntity<MachineDTO> create(@Valid @RequestBody MachineRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(machineService.create(request));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER', 'OPERATOR', 'MANAGER')")
    public ResponseEntity<PageResponse<MachineDTO>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "asc") String direction) {

        Pageable pageable = createPageable(page, size, sortBy, direction);
        Page<MachineDTO> result = machineService.getAll(pageable);
        return ResponseEntity.ok(toPageResponse(result));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER', 'OPERATOR', 'MANAGER')")
    public ResponseEntity<MachineDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(machineService.getById(id));
    }

    @GetMapping("/plant/{plantId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER', 'OPERATOR', 'MANAGER')")
    public ResponseEntity<PageResponse<MachineDTO>> getByPlant(
            @PathVariable Long plantId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "asc") String direction) {

        Pageable pageable = createPageable(page, size, sortBy, direction);
        return ResponseEntity.ok(toPageResponse(machineService.getByPlant(plantId, pageable)));
    }

    @GetMapping("/status/{status}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER', 'OPERATOR', 'MANAGER')")
    public ResponseEntity<PageResponse<MachineDTO>> getByStatus(
            @PathVariable String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "asc") String direction) {

        Pageable pageable = createPageable(page, size, sortBy, direction);
        return ResponseEntity.ok(toPageResponse(machineService.getByStatus(status, pageable)));
    }

    @GetMapping("/plant/{plantId}/status/{status}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER', 'OPERATOR', 'MANAGER')")
    public ResponseEntity<PageResponse<MachineDTO>> getByPlantAndStatus(
            @PathVariable Long plantId,
            @PathVariable String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "asc") String direction) {

        Pageable pageable = createPageable(page, size, sortBy, direction);
        return ResponseEntity.ok(toPageResponse(machineService.getByPlantAndStatus(plantId, status, pageable)));
    }

    @GetMapping("/search/name")
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER', 'OPERATOR', 'MANAGER')")
    public ResponseEntity<PageResponse<MachineDTO>> searchByName(
            @RequestParam String name,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "name") String sortBy,
            @RequestParam(defaultValue = "asc") String direction) {

        Pageable pageable = createPageable(page, size, sortBy, direction);
        return ResponseEntity.ok(toPageResponse(machineService.searchByName(name, pageable)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER')")
    public ResponseEntity<MachineDTO> update(@PathVariable Long id, @Valid @RequestBody MachineRequest request) {
        return ResponseEntity.ok(machineService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        machineService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ==========================================================
    // Cross-Service Internal Contract Endpoints
    // ==========================================================

    @GetMapping("/{id}/exists")
    public ResponseEntity<Boolean> exists(@PathVariable Long id) {
        return ResponseEntity.ok(machineService.existsById(id));
    }

    @GetMapping("/{id}/summary")
    public ResponseEntity<MachineSummaryDTO> getSummary(@PathVariable Long id) {
        return machineService.findSummaryById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/count")
    public ResponseEntity<Long> count() {
        return ResponseEntity.ok(machineService.count());
    }

    @GetMapping("/count/status/{status}")
    public ResponseEntity<Long> countByStatus(@PathVariable String status) {
        return ResponseEntity.ok(machineService.countByStatus(status));
    }

    private Pageable createPageable(int page, int size, String sortBy, String direction) {
        validate(page, size);
        Sort.Direction sortDirection = direction.equalsIgnoreCase("desc") ? Sort.Direction.DESC : Sort.Direction.ASC;
        return PageRequest.of(page, size, Sort.by(sortDirection, sortBy));
    }

    private void validate(int page, int size) {
        if (page < 0) {
            throw new BusinessValidationException("Page cannot be negative");
        }
        if (size < 1 || size > 100) {
            throw new BusinessValidationException("Size must be between 1 and 100");
        }
    }

    private <T> PageResponse<T> toPageResponse(Page<T> page) {
        return PageResponse.<T>builder()
                .content(page.getContent())
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .last(page.isLast())
                .build();
    }
}
