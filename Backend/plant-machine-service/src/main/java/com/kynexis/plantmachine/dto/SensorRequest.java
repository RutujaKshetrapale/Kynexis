package com.kynexis.plantmachine.dto;

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
public class SensorRequest {

    @NotBlank(message = "Sensor name is required")
    @Size(min = 2, max = 100, message = "Sensor name must be between 2 and 100 characters")
    private String name;

    @NotBlank(message = "Sensor type is required")
    @Size(min = 2, max = 50, message = "Sensor type must be between 2 and 50 characters")
    private String type;

    @NotBlank(message = "Sensor unit is required")
    @Size(min = 1, max = 20, message = "Sensor unit must be between 1 and 20 characters")
    private String unit;

    @NotNull(message = "Machine ID is required")
    private Long machineId;

    private Boolean active;
}
