package com.kynexis.maintenance.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.kynexis.maintenance.dto.MachineHealthResponse;
import com.kynexis.maintenance.service.MachineHealthService;

@RestController
public class MachineHealthController {

    private final MachineHealthService machineHealthService;

    public MachineHealthController(MachineHealthService machineHealthService) {
        this.machineHealthService = machineHealthService;
    }

    @GetMapping({"/api/machines/{machineId}/health", "/api/machine-health/{machineId}"})
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER', 'OPERATOR', 'MANAGER')")
    public ResponseEntity<MachineHealthResponse> getMachineHealth(@PathVariable Long machineId) {
        return ResponseEntity.ok(machineHealthService.getMachineHealth(machineId));
    }
}
