package com.kynexis.production.dto;

import java.time.LocalDateTime;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductionRequest {

    @NotBlank(message = "Product name is required")
    @Size(min = 2, max = 100, message = "Product name must be between 2 and 100 characters")
    private String productName;

    @NotNull(message = "Quantity produced is required")
    @Min(value = 0, message = "Quantity produced cannot be negative")
    private Integer quantityProduced;

    @NotNull(message = "Quantity rejected is required")
    @Min(value = 0, message = "Quantity rejected cannot be negative")
    private Integer quantityRejected;

    @NotNull(message = "Production start time is required")
    private LocalDateTime productionStart;

    private LocalDateTime productionEnd;

    @NotBlank(message = "Production status is required")
    @Size(min = 2, max = 30, message = "Production status cannot exceed 30 characters")
    private String status;

    @NotNull(message = "Machine ID is required")
    private Long machineId;
}
