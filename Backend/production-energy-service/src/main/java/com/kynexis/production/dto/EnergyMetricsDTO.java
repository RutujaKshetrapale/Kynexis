package com.kynexis.production.dto;

import java.io.Serializable;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnergyMetricsDTO implements Serializable {
    private static final long serialVersionUID = 1L;

    private Double totalEnergyConsumption;
}
