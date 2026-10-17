package com.kynexis.plantmachine.controller;

import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.kynexis.common.dto.PageResponse;
import com.kynexis.plantmachine.dto.PlantDTO;
import com.kynexis.plantmachine.dto.PlantRequest;
import com.kynexis.plantmachine.service.PlantService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/plants")
public class PlantController {

    private final PlantService plantService;

    public PlantController(PlantService plantService) {
        this.plantService = plantService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER')")
    public ResponseEntity<PlantDTO> create(@Valid @RequestBody PlantRequest request) {
        PlantDTO plant = plantService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(plant);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER', 'OPERATOR', 'MANAGER')")
    public ResponseEntity<?> getAll(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "asc") String direction) {

        if (page == null && size == null) {
            return ResponseEntity.ok(plantService.getAll());
        }

        int pageNum = page != null ? page : 0;
        int pageSize = size != null ? size : 10;
        Sort sort = direction.equalsIgnoreCase("desc") ? Sort.by(sortBy).descending() : Sort.by(sortBy).ascending();
        var pageResult = plantService.getAll(PageRequest.of(pageNum, pageSize, sort));

        PageResponse<PlantDTO> response = PageResponse.<PlantDTO>builder()
                .content(pageResult.getContent())
                .page(pageResult.getNumber())
                .size(pageResult.getSize())
                .totalElements(pageResult.getTotalElements())
                .totalPages(pageResult.getTotalPages())
                .last(pageResult.isLast())
                .build();

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER', 'OPERATOR', 'MANAGER')")
    public ResponseEntity<PlantDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(plantService.getById(id));
    }

    @GetMapping("/active")
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER', 'OPERATOR', 'MANAGER')")
    public ResponseEntity<List<PlantDTO>> getActive() {
        return ResponseEntity.ok(plantService.getActive());
    }

    @GetMapping("/location/{location}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER', 'OPERATOR', 'MANAGER')")
    public ResponseEntity<List<PlantDTO>> searchByLocation(@PathVariable String location) {
        return ResponseEntity.ok(plantService.searchByLocation(location));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER')")
    public ResponseEntity<PlantDTO> update(@PathVariable Long id, @Valid @RequestBody PlantRequest request) {
        return ResponseEntity.ok(plantService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        plantService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/count")
    public ResponseEntity<Long> count() {
        return ResponseEntity.ok(plantService.count());
    }
}
