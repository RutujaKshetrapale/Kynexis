package com.kynexis.maintenance.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MaintenanceRequest {

    @NotNull(message = "Machine ID is required")
    private Long machineId;

    @NotBlank(message = "Maintenance type is required")
    @Size(min = 2, max = 50, message = "Maintenance type must be between 2 and 50 characters")
    private String type;

    @NotBlank(message = "Maintenance description is required")
    @Size(min = 5, max = 500, message = "Description must be between 5 and 500 characters")
    private String description;

    @NotNull(message = "Scheduled date is required")
    @FutureOrPresent(message = "Scheduled date cannot be in the past")
    private LocalDate scheduledDate;

    private LocalDate completedDate;

    @NotBlank(message = "Maintenance status is required")
    @Size(min = 2, max = 30, message = "Maintenance status cannot exceed 30 characters")
    private String status;

    @NotBlank(message = "Technician name is required")
    @Size(min = 2, max = 100, message = "Technician name must be between 2 and 100 characters")
    private String technician;
}
