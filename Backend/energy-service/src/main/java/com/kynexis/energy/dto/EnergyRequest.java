package com.kynexis.energy.dto;

import java.time.LocalDateTime;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnergyRequest {

    @NotNull(message = "Machine ID is required")
    private Long machineId;

    @NotNull(message = "Energy consumption is required")
    @DecimalMin(value = "0.0", message = "Energy consumption cannot be negative")
    private Double energyConsumption;

    private LocalDateTime recordedAt;
}
