package com.kynexis.maintenance.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.kynexis.maintenance.dto.PredictiveMaintenanceResponse;
import com.kynexis.maintenance.service.PredictiveMaintenanceService;

@RestController
public class PredictiveMaintenanceController {

    private final PredictiveMaintenanceService predictiveMaintenanceService;

    public PredictiveMaintenanceController(PredictiveMaintenanceService predictiveMaintenanceService) {
        this.predictiveMaintenanceService = predictiveMaintenanceService;
    }

    @GetMapping({"/api/machines/{machineId}/maintenance-assessment", "/api/predictive-maintenance/{machineId}"})
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER', 'OPERATOR', 'MANAGER')")
    public ResponseEntity<PredictiveMaintenanceResponse> getMachineAssessment(@PathVariable Long machineId) {
        return ResponseEntity.ok(predictiveMaintenanceService.getMachineAssessment(machineId));
    }
}
