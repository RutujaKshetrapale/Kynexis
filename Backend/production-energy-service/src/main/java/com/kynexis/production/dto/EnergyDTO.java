package com.kynexis.production.dto;

import java.io.Serializable;
import java.time.LocalDateTime;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnergyDTO implements Serializable {
    private static final long serialVersionUID = 1L;

    private Long id;
    private Long machineId;
    private Double energyConsumption;
    private LocalDateTime recordedAt;
}
