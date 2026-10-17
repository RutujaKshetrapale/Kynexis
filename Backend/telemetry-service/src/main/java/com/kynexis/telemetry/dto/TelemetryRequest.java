package com.kynexis.telemetry.dto;

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
public class TelemetryRequest {

    @NotNull(message = "Temperature is required")
    @DecimalMin(value = "-100.0", message = "Temperature cannot be below -100°C")
    private Double temperature;

    @NotNull(message = "Vibration is required")
    @DecimalMin(value = "0.0", message = "Vibration cannot be negative")
    private Double vibration;

    @NotNull(message = "Pressure is required")
    @DecimalMin(value = "0.0", message = "Pressure cannot be negative")
    private Double pressure;

    @NotNull(message = "RPM is required")
    @DecimalMin(value = "0.0", message = "RPM cannot be negative")
    private Double rpm;

    @NotNull(message = "Timestamp is required")
    private LocalDateTime timestamp;

    @NotNull(message = "Machine ID is required")
    private Long machineId;
}
