package com.kynexis.telemetry.controller;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.kynexis.common.dto.PageResponse;
import com.kynexis.common.exception.BusinessValidationException;
import com.kynexis.telemetry.dto.TelemetryDTO;
import com.kynexis.telemetry.dto.TelemetryRequest;
import com.kynexis.telemetry.service.TelemetryService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/telemetry")
public class TelemetryController {

    private final TelemetryService telemetryService;

    public TelemetryController(TelemetryService telemetryService) {
        this.telemetryService = telemetryService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER', 'OPERATOR')")
    public ResponseEntity<TelemetryDTO> create(@Valid @RequestBody TelemetryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(telemetryService.create(request));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER', 'OPERATOR', 'MANAGER')")
    public ResponseEntity<PageResponse<TelemetryDTO>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {

        Pageable pageable = createPageable(page, size, sortBy, direction);
        return ResponseEntity.ok(toPageResponse(telemetryService.getAll(pageable)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER', 'OPERATOR', 'MANAGER')")
    public ResponseEntity<TelemetryDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(telemetryService.getById(id));
    }

    @GetMapping("/machine/{machineId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER', 'OPERATOR', 'MANAGER')")
    public ResponseEntity<PageResponse<TelemetryDTO>> getByMachine(
            @PathVariable Long machineId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "timestamp") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {

        Pageable pageable = createPageable(page, size, sortBy, direction);
        return ResponseEntity.ok(toPageResponse(telemetryService.getByMachine(machineId, pageable)));
    }

    // ==========================================================
    // Cross-Service Internal Contract Endpoints
    // ==========================================================

    @GetMapping("/machine/{machineId}/latest")
    public ResponseEntity<TelemetryDTO> getLatestByMachine(@PathVariable Long machineId) {
        return telemetryService.getLatestByMachine(machineId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/machine/{machineId}/recent")
    public ResponseEntity<List<TelemetryDTO>> getRecentByMachine(
            @PathVariable Long machineId,
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(telemetryService.getRecentByMachine(machineId, limit));
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
                .first(page.isFirst())
                .last(page.isLast())
                .build();
    }
}
