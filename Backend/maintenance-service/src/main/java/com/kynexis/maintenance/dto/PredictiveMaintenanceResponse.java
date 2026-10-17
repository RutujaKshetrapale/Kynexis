package com.kynexis.maintenance.dto;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PredictiveMaintenanceResponse implements Serializable {
    private static final long serialVersionUID = 1L;

    private Long machineId;
    private String machineName;
    private String machineType;
    private String machineStatus;
    private String riskCategory;
    private String dataSufficiency;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime assessmentTimestamp;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime latestTelemetryTimestamp;

    private boolean telemetryStale;
    private int evaluatedReadingsCount;

    private List<String> trendFindings;
    private List<String> evidence;
    private String recommendedAction;
    private String explanation;

    private long totalUnresolvedAlertCount;
    private long criticalAlertCount;
    private long highAlertCount;
    private long mediumAlertCount;
    private long lowAlertCount;
    private Map<String, Long> alertSeverityCounts;

    private boolean maintenanceScheduled;
    private String existingMaintenanceSummary;
    private String advisoryNotice;
}
