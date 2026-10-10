package com.example.demo.controller;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.example.demo.dto.MachineHealthResponse;
import com.example.demo.dto.PageResponse;
import com.example.demo.exception.BusinessValidationException;
import com.example.demo.service.MachineHealthService;
import com.example.demo.util.PaginationUtil;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/machines")
@Tag(
        name = "Machine Health Monitoring",
        description = "APIs for calculating and retrieving qualitative machine health states"
)
public class MachineHealthController {

    private final MachineHealthService machineHealthService;

    public MachineHealthController(MachineHealthService machineHealthService) {
        this.machineHealthService = machineHealthService;
    }

    @Operation(
            summary = "Get machine health by ID",
            description = "Calculates and returns the qualitative health state, latest telemetry, unresolved alerts, and contributing reasons for a single machine."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Machine health retrieved successfully"
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Machine not found"
            )
    })
    @GetMapping("/{machineId}/health")
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER', 'OPERATOR', 'MANAGER')")
    public ResponseEntity<MachineHealthResponse> getMachineHealth(
            @Parameter(
                    description = "ID of the machine",
                    example = "1"
            )
            @PathVariable Long machineId) {

        return ResponseEntity.ok(machineHealthService.getMachineHealth(machineId));
    }

    @Operation(
            summary = "Get bulk machine health list",
            description = "Returns a paginated and sorted list of machine health summaries for all machines on the dashboard."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Bulk machine health retrieved successfully"
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Invalid pagination parameters"
            )
    })
    @GetMapping("/health")
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER', 'OPERATOR', 'MANAGER')")
    public ResponseEntity<PageResponse<MachineHealthResponse>> getBulkMachineHealth(
            @Parameter(
                    description = "Page number starting from 0",
                    example = "0"
            )
            @RequestParam(defaultValue = "0") int page,

            @Parameter(
                    description = "Number of records per page",
                    example = "10"
            )
            @RequestParam(defaultValue = "10") int size,

            @Parameter(
                    description = "Field used for sorting",
                    example = "name"
            )
            @RequestParam(defaultValue = "id") String sortBy,

            @Parameter(
                    description = "Sorting direction: asc or desc",
                    example = "asc"
            )
            @RequestParam(defaultValue = "asc") String direction) {

        validate(page, size);

        Pageable pageable = createPageable(page, size, sortBy, direction);
        return ResponseEntity.ok(
                PaginationUtil.toResponse(
                        machineHealthService.getBulkMachineHealth(pageable)
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
