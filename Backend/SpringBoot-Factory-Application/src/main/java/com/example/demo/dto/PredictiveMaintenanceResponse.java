package com.example.demo.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Data Transfer Object representing an explainable, evidence-based predictive maintenance risk assessment.
 */
public class PredictiveMaintenanceResponse {

    private Long machineId;
    private String machineName;
    private String machineType;
    private String machineStatus;

    /**
     * Qualitative maintenance risk category: INSUFFICIENT_DATA, NORMAL, WATCH, or MAINTENANCE_RECOMMENDED.
     */
    private String riskCategory;

    /**
     * Assessment of data availability and freshness: SUFFICIENT, INSUFFICIENT_DATA, STALE_DATA, or NO_DATA.
     */
    private String dataSufficiency;

    private LocalDateTime assessmentTimestamp;
    private LocalDateTime latestTelemetryTimestamp;
    private boolean telemetryStale;
    private int evaluatedReadingsCount;

    /**
     * Empirical findings from historical readings over the evaluated window.
     */
    private List<String> trendFindings;

    /**
     * Explicit supporting evidence synthesizing telemetry patterns, unresolved alerts, status, and maintenance records.
     */
    private List<String> evidence;

    /**
     * Non-prescriptive suggested inspection or maintenance recommendation.
     */
    private String recommendedAction;

    /**
     * Human-readable explanation of the assessment rationale or insufficient data condition.
     */
    private String explanation;

    // Active alert summary
    private long totalUnresolvedAlertCount;
    private long criticalAlertCount;
    private long highAlertCount;
    private long mediumAlertCount;
    private long lowAlertCount;
    private Map<String, Long> alertSeverityCounts;

    // Existing maintenance record reference
    private boolean maintenanceScheduled;
    private String existingMaintenanceSummary;

    /**
     * Notice clarifying that assessment is heuristic and not a substitute for qualified inspection.
     */
    private String advisoryNotice;

    public PredictiveMaintenanceResponse() {
    }

    public Long getMachineId() {
        return machineId;
    }

    public void setMachineId(Long machineId) {
        this.machineId = machineId;
    }

    public String getMachineName() {
        return machineName;
    }

    public void setMachineName(String machineName) {
        this.machineName = machineName;
    }

    public String getMachineType() {
        return machineType;
    }

    public void setMachineType(String machineType) {
        this.machineType = machineType;
    }

    public String getMachineStatus() {
        return machineStatus;
    }

    public void setMachineStatus(String machineStatus) {
        this.machineStatus = machineStatus;
    }

    public String getRiskCategory() {
        return riskCategory;
    }

    public void setRiskCategory(String riskCategory) {
        this.riskCategory = riskCategory;
    }

    public String getDataSufficiency() {
        return dataSufficiency;
    }

    public void setDataSufficiency(String dataSufficiency) {
        this.dataSufficiency = dataSufficiency;
    }

    public LocalDateTime getAssessmentTimestamp() {
        return assessmentTimestamp;
    }

    public void setAssessmentTimestamp(LocalDateTime assessmentTimestamp) {
        this.assessmentTimestamp = assessmentTimestamp;
    }

    public LocalDateTime getLatestTelemetryTimestamp() {
        return latestTelemetryTimestamp;
    }

    public void setLatestTelemetryTimestamp(LocalDateTime latestTelemetryTimestamp) {
        this.latestTelemetryTimestamp = latestTelemetryTimestamp;
    }

    public boolean isTelemetryStale() {
        return telemetryStale;
    }

    public void setTelemetryStale(boolean telemetryStale) {
        this.telemetryStale = telemetryStale;
    }

    public int getEvaluatedReadingsCount() {
        return evaluatedReadingsCount;
    }

    public void setEvaluatedReadingsCount(int evaluatedReadingsCount) {
        this.evaluatedReadingsCount = evaluatedReadingsCount;
    }

    public List<String> getTrendFindings() {
        return trendFindings;
    }

    public void setTrendFindings(List<String> trendFindings) {
        this.trendFindings = trendFindings;
    }

    public List<String> getEvidence() {
        return evidence;
    }

    public void setEvidence(List<String> evidence) {
        this.evidence = evidence;
    }

    public String getRecommendedAction() {
        return recommendedAction;
    }

    public void setRecommendedAction(String recommendedAction) {
        this.recommendedAction = recommendedAction;
    }

    public String getExplanation() {
        return explanation;
    }

    public void setExplanation(String explanation) {
        this.explanation = explanation;
    }

    public long getTotalUnresolvedAlertCount() {
        return totalUnresolvedAlertCount;
    }

    public void setTotalUnresolvedAlertCount(long totalUnresolvedAlertCount) {
        this.totalUnresolvedAlertCount = totalUnresolvedAlertCount;
    }

    public long getCriticalAlertCount() {
        return criticalAlertCount;
    }

    public void setCriticalAlertCount(long criticalAlertCount) {
        this.criticalAlertCount = criticalAlertCount;
    }

    public long getHighAlertCount() {
        return highAlertCount;
    }

    public void setHighAlertCount(long highAlertCount) {
        this.highAlertCount = highAlertCount;
    }

    public long getMediumAlertCount() {
        return mediumAlertCount;
    }

    public void setMediumAlertCount(long mediumAlertCount) {
        this.mediumAlertCount = mediumAlertCount;
    }

    public long getLowAlertCount() {
        return lowAlertCount;
    }

    public void setLowAlertCount(long lowAlertCount) {
        this.lowAlertCount = lowAlertCount;
    }

    public Map<String, Long> getAlertSeverityCounts() {
        return alertSeverityCounts;
    }

    public void setAlertSeverityCounts(Map<String, Long> alertSeverityCounts) {
        this.alertSeverityCounts = alertSeverityCounts;
    }

    public boolean isMaintenanceScheduled() {
        return maintenanceScheduled;
    }

    public void setMaintenanceScheduled(boolean maintenanceScheduled) {
        this.maintenanceScheduled = maintenanceScheduled;
    }

    public String getExistingMaintenanceSummary() {
        return existingMaintenanceSummary;
    }

    public void setExistingMaintenanceSummary(String existingMaintenanceSummary) {
        this.existingMaintenanceSummary = existingMaintenanceSummary;
    }

    public String getAdvisoryNotice() {
        return advisoryNotice;
    }

    public void setAdvisoryNotice(String advisoryNotice) {
        this.advisoryNotice = advisoryNotice;
    }
}
