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
public class MachineRequest {

    @NotBlank(message = "Machine name is required")
    @Size(min = 2, max = 100, message = "Machine name must be between 2 and 100 characters")
    private String name;

    @NotBlank(message = "Machine type is required")
    @Size(min = 2, max = 100, message = "Machine type must be between 2 and 100 characters")
    private String type;

    @NotBlank(message = "Machine status is required")
    @Size(min = 2, max = 30, message = "Machine status cannot exceed 30 characters")
    private String status;

    @NotNull(message = "Plant ID is required")
    private Long plantId;
}
