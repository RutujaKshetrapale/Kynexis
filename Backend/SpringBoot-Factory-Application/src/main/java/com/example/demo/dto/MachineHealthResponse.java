package com.example.demo.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public class MachineHealthResponse {

    private Long machineId;
    private String machineName;
    private String machineType;
    private String machineStatus;
    private String healthState;

    private LocalDateTime latestTelemetryTimestamp;
    private Double temperature;
    private Double vibration;
    private Double pressure;
    private Double rpm;

    private long totalUnresolvedAlertCount;
    private long criticalAlertCount;
    private long highAlertCount;
    private long mediumAlertCount;
    private long lowAlertCount;
    private Map<String, Long> severityCounts;

    private List<String> contributingReasons;
    private LocalDateTime generatedAt;

    public MachineHealthResponse() {
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

    public String getHealthState() {
        return healthState;
    }

    public void setHealthState(String healthState) {
        this.healthState = healthState;
    }

    public LocalDateTime getLatestTelemetryTimestamp() {
        return latestTelemetryTimestamp;
    }

    public void setLatestTelemetryTimestamp(LocalDateTime latestTelemetryTimestamp) {
        this.latestTelemetryTimestamp = latestTelemetryTimestamp;
    }

    public Double getTemperature() {
        return temperature;
    }

    public void setTemperature(Double temperature) {
        this.temperature = temperature;
    }

    public Double getVibration() {
        return vibration;
    }

    public void setVibration(Double vibration) {
        this.vibration = vibration;
    }

    public Double getPressure() {
        return pressure;
    }

    public void setPressure(Double pressure) {
        this.pressure = pressure;
    }

    public Double getRpm() {
        return rpm;
    }

    public void setRpm(Double rpm) {
        this.rpm = rpm;
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

    public Map<String, Long> getSeverityCounts() {
        return severityCounts;
    }

    public void setSeverityCounts(Map<String, Long> severityCounts) {
        this.severityCounts = severityCounts;
    }

    public List<String> getContributingReasons() {
        return contributingReasons;
    }

    public void setContributingReasons(List<String> contributingReasons) {
        this.contributingReasons = contributingReasons;
    }

    public LocalDateTime getGeneratedAt() {
        return generatedAt;
    }

    public void setGeneratedAt(LocalDateTime generatedAt) {
        this.generatedAt = generatedAt;
    }
}
