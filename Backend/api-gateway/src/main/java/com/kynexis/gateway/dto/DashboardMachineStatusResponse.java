package com.kynexis.gateway.dto;

import java.io.Serializable;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardMachineStatusResponse implements Serializable {
    private static final long serialVersionUID = 1L;

    private long active;
    private long inactive;
    private long maintenance;
}
