package com.example.demo.controller;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.dto.PageResponse;
import com.example.demo.dto.PredictiveMaintenanceResponse;
import com.example.demo.exception.BusinessValidationException;
import com.example.demo.service.PredictiveMaintenanceService;
import com.example.demo.util.PaginationUtil;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/machines")
@Tag(
        name = "Predictive Maintenance Engine",
        description = "APIs for explainable, evidence-based predictive maintenance risk assessments"
)
public class PredictiveMaintenanceController {

    private final PredictiveMaintenanceService predictiveMaintenanceService;

    public PredictiveMaintenanceController(PredictiveMaintenanceService predictiveMaintenanceService) {
        this.predictiveMaintenanceService = predictiveMaintenanceService;
    }

    @Operation(
            summary = "Get predictive maintenance assessment by machine ID",
            description = "Calculates an explainable maintenance risk assessment using historical telemetry trends, freshness, unresolved alerts, and machine status."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Predictive maintenance assessment generated successfully"
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Machine not found"
            )
    })
    @GetMapping("/{machineId}/maintenance-assessment")
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER', 'OPERATOR', 'MANAGER')")
    public ResponseEntity<PredictiveMaintenanceResponse> getMachineAssessment(
            @Parameter(
                    description = "ID of the machine to evaluate",
                    example = "1"
            )
            @PathVariable Long machineId) {

        return ResponseEntity.ok(predictiveMaintenanceService.getMachineAssessment(machineId));
    }

    @Operation(
            summary = "Get paginated predictive maintenance assessments",
            description = "Returns a paginated list of predictive maintenance risk assessments across all machines with optional risk category filtering."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Predictive maintenance assessments retrieved successfully"
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Invalid pagination or filter parameters"
            )
    })
    @GetMapping("/maintenance-assessments")
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER', 'OPERATOR', 'MANAGER')")
    public ResponseEntity<PageResponse<PredictiveMaintenanceResponse>> getBulkAssessments(
            @Parameter(
                    description = "Page number starting from 0",
                    example = "0"
            )
            @RequestParam(defaultValue = "0") int page,

            @Parameter(
                    description = "Number of records per page (1 to 100)",
                    example = "10"
            )
            @RequestParam(defaultValue = "10") int size,

            @Parameter(
                    description = "Field used for sorting machines",
                    example = "id"
            )
            @RequestParam(defaultValue = "id") String sortBy,

            @Parameter(
                    description = "Sorting direction: asc or desc",
                    example = "asc"
            )
            @RequestParam(defaultValue = "asc") String direction,

            @Parameter(
                    description = "Optional risk category filter: INSUFFICIENT_DATA, NORMAL, WATCH, MAINTENANCE_RECOMMENDED",
                    example = "WATCH"
            )
            @RequestParam(required = false) String riskCategory) {

        validate(page, size);

        Pageable pageable = createPageable(page, size, sortBy, direction);
        return ResponseEntity.ok(
                PaginationUtil.toResponse(
                        predictiveMaintenanceService.getBulkAssessments(pageable, riskCategory)
                )
        );
    }

    private Pageable createPageable(
            int page,
            int size,
            String sortBy,
            String direction) {

        Sort.Direction sortDirection =
                direction.equalsIgnoreCase("desc")
                        ? Sort.Direction.DESC
                        : Sort.Direction.ASC;

        return PageRequest.of(
                page,
                size,
                Sort.by(sortDirection, sortBy)
        );
    }

    private void validate(
            int page,
            int size) {

        if (page < 0) {
            throw new BusinessValidationException(
                    "Page cannot be negative"
            );
        }

        if (size < 1 || size > 100) {
            throw new BusinessValidationException(
                    "Size must be between 1 and 100"
            );
        }
    }
}
