package com.kynexis.energy.dto;

import java.io.Serializable;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnergyMetricsDTO implements Serializable {
    private static final long serialVersionUID = 1L;

    private Double totalEnergyConsumption;
}
