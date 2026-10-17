package com.kynexis.production.dto;

import java.io.Serializable;
import java.time.LocalDateTime;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductionDTO implements Serializable {
    private static final long serialVersionUID = 1L;

    private Long id;
    private Long machineId;
    private String productName;
    private Integer quantityProduced;
    private Integer quantityRejected;
    private LocalDateTime productionStart;
    private LocalDateTime productionEnd;
    private String status;
}
