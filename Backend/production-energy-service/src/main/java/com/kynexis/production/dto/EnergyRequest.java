package com.kynexis.production.dto;

import java.time.LocalDateTime;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnergyRequest {

    @NotNull(message = "Energy consumption is required")
    @Min(value = 0, message = "Energy consumption cannot be negative")
    private Double energyConsumption;

    @NotNull(message = "Recorded at timestamp is required")
    private LocalDateTime recordedAt;

    @NotNull(message = "Machine ID is required")
    private Long machineId;
}
