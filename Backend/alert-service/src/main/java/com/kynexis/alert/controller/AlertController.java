package com.kynexis.alert.controller;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.kynexis.alert.dto.AlertDTO;
import com.kynexis.alert.dto.AlertRequest;
import com.kynexis.alert.service.AlertService;
import com.kynexis.common.dto.PageResponse;
import com.kynexis.common.exception.BusinessValidationException;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/alerts")
public class AlertController {

    private final AlertService alertService;
    private final com.kynexis.alert.service.alert.AlertEngineService alertEngineService;

    public AlertController(
            AlertService alertService,
            com.kynexis.alert.service.alert.AlertEngineService alertEngineService) {
        this.alertService = alertService;
        this.alertEngineService = alertEngineService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER')")
    public ResponseEntity<AlertDTO> create(@Valid @RequestBody AlertRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(alertService.create(request));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER', 'OPERATOR', 'MANAGER')")
    public ResponseEntity<?> getAll(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "asc") String direction) {

        if (page == null && size == null) {
            return ResponseEntity.ok(alertService.getAll());
        }

        int pageNum = page != null ? page : 0;
        int pageSize = size != null ? size : 10;
        Pageable pageable = createPageable(pageNum, pageSize, sortBy, direction);
        return ResponseEntity.ok(toPageResponse(alertService.getAll(pageable)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER', 'OPERATOR', 'MANAGER')")
    public ResponseEntity<AlertDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(alertService.getById(id));
    }

    @GetMapping("/unresolved")
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER', 'OPERATOR', 'MANAGER')")
    public ResponseEntity<?> getUnresolved(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "asc") String direction) {

        if (page == null && size == null) {
            return ResponseEntity.ok(alertService.getUnresolved());
        }

        int pageNum = page != null ? page : 0;
        int pageSize = size != null ? size : 10;
        Pageable pageable = createPageable(pageNum, pageSize, sortBy, direction);
        return ResponseEntity.ok(toPageResponse(alertService.getUnresolved(pageable)));
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
            return ResponseEntity.ok(alertService.getByMachine(machineId));
        }

        int pageNum = page != null ? page : 0;
        int pageSize = size != null ? size : 10;
        Pageable pageable = createPageable(pageNum, pageSize, sortBy, direction);
        return ResponseEntity.ok(toPageResponse(alertService.getByMachine(machineId, pageable)));
    }

    @GetMapping("/severity/{severity}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER', 'OPERATOR', 'MANAGER')")
    public ResponseEntity<?> getBySeverity(
            @PathVariable String severity,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "asc") String direction) {

        if (page == null && size == null) {
            return ResponseEntity.ok(alertService.getBySeverity(severity));
        }

        int pageNum = page != null ? page : 0;
        int pageSize = size != null ? size : 10;
        Pageable pageable = createPageable(pageNum, pageSize, sortBy, direction);
        return ResponseEntity.ok(toPageResponse(alertService.getBySeverity(severity, pageable)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER')")
    public ResponseEntity<AlertDTO> update(@PathVariable Long id, @Valid @RequestBody AlertRequest request) {
        return ResponseEntity.ok(alertService.update(id, request));
    }

    @PutMapping("/{id}/resolve")
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER')")
    public ResponseEntity<AlertDTO> resolve(@PathVariable Long id) {
        return ResponseEntity.ok(alertService.resolveAlert(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        alertService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ==========================================================
    // Cross-Service Internal Contract Endpoints
    // ==========================================================

    @GetMapping("/machine/{machineId}/unresolved")
    public ResponseEntity<List<AlertDTO>> getUnresolvedByMachine(@PathVariable Long machineId) {
        return ResponseEntity.ok(alertService.getUnresolvedByMachine(machineId));
    }

    @GetMapping("/count/unresolved")
    public ResponseEntity<Long> countUnresolved() {
        return ResponseEntity.ok(alertService.countUnresolved());
    }

    @GetMapping("/count/unresolved/machine/{machineId}")
    public ResponseEntity<Long> countUnresolvedByMachine(@PathVariable Long machineId) {
        return ResponseEntity.ok(alertService.countUnresolvedByMachine(machineId));
    }

    @PostMapping("/evaluate/machine")
    public ResponseEntity<List<AlertDTO>> evaluateMachineStatus(@RequestBody MachineStatusEvaluationRequest request) {
        return ResponseEntity.ok(alertEngineService.evaluateMachineStatus(
                request.machineId(), request.machineName(), request.status()));
    }

    public record MachineStatusEvaluationRequest(Long machineId, String machineName, String status) {}

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
