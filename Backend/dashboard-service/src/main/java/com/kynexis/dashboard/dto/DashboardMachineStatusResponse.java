package com.kynexis.dashboard.dto;

import java.io.Serializable;

import lombok.*;

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
