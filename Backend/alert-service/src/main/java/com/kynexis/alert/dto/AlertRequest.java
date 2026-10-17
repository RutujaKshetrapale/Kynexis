package com.kynexis.alert.dto;

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
public class AlertRequest {

    @NotNull(message = "Machine ID is required")
    private Long machineId;

    @NotBlank(message = "Alert type is required")
    @Size(min = 2, max = 50, message = "Alert type must be between 2 and 50 characters")
    private String type;

    @NotBlank(message = "Alert severity is required")
    @Size(min = 2, max = 30, message = "Alert severity must be between 2 and 30 characters")
    private String severity;

    @NotBlank(message = "Alert message is required")
    @Size(min = 2, max = 500, message = "Alert message must be between 2 and 500 characters")
    private String message;

    private boolean resolved;
    private Long telemetryId;
}
