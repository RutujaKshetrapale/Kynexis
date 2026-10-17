package com.kynexis.plantmachine.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlantRequest {

    @NotBlank(message = "Plant name is required")
    @Size(min = 2, max = 100, message = "Plant name must be between 2 and 100 characters")
    private String name;

    @NotBlank(message = "Plant location is required")
    @Size(min = 2, max = 150, message = "Plant location must be between 2 and 150 characters")
    private String location;
}
