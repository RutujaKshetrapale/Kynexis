package com.example.demo.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Configuration properties for Phase 18 Predictive Maintenance Engine.
 * Note: Default numerical thresholds for trends are conservative heuristics and provisional,
 * designed as an explainable baseline prior to Phase 19 AI/ML model integration.
 */
@Component
@ConfigurationProperties(prefix = "kynexis.predictive-maintenance")
public class PredictiveMaintenanceProperties {

    /**
     * Minimum number of historical telemetry records required to calculate a reliable trend.
     * Default: 3.
     */
    private int minTelemetryReadings = 3;

    /**
     * Threshold in hours after which the latest telemetry is considered stale.
     * Default: 24 hours.
     */
    private int staleThresholdHours = 24;

    /**
     * Number of recent telemetry records fetched for trend analysis.
     * Default: 10 records.
     */
    private int trendReadingsLimit = 10;

    /**
     * Look-back window in days for telemetry query bounding.
     * Default: 7 days.
     */
    private int trendWindowDays = 7;

    /**
     * Provisional temperature rise threshold in °C between oldest and newest reading in the trend window
     * that indicates an abnormal thermal rise when sustained.
     * Default: 5.0 °C.
     */
    private double tempRiseThreshold = 5.0;

    /**
     * Provisional vibration rise threshold in mm/s between oldest and newest reading in the trend window
     * that indicates an abnormal vibration drift when sustained.
     * Default: 1.5 mm/s.
     */
    private double vibrationRiseThreshold = 1.5;

    /**
     * Provisional pressure drift threshold in PSI indicating abnormal hydraulic/pneumatic instability.
     * Default: 20.0 PSI.
     */
    private double pressureDriftThreshold = 20.0;

    /**
     * Provisional RPM drift threshold indicating motor speed instability while running.
     * Default: 300.0 RPM.
     */
    private double rpmDriftThreshold = 300.0;

    public int getMinTelemetryReadings() {
        return minTelemetryReadings;
    }

    public void setMinTelemetryReadings(int minTelemetryReadings) {
        this.minTelemetryReadings = minTelemetryReadings;
    }

    public int getStaleThresholdHours() {
        return staleThresholdHours;
    }

    public void setStaleThresholdHours(int staleThresholdHours) {
        this.staleThresholdHours = staleThresholdHours;
    }

    public int getTrendReadingsLimit() {
        return trendReadingsLimit;
    }

    public void setTrendReadingsLimit(int trendReadingsLimit) {
        this.trendReadingsLimit = trendReadingsLimit;
    }

    public int getTrendWindowDays() {
        return trendWindowDays;
    }

    public void setTrendWindowDays(int trendWindowDays) {
        this.trendWindowDays = trendWindowDays;
    }

    public double getTempRiseThreshold() {
        return tempRiseThreshold;
    }

    public void setTempRiseThreshold(double tempRiseThreshold) {
        this.tempRiseThreshold = tempRiseThreshold;
    }

    public double getVibrationRiseThreshold() {
        return vibrationRiseThreshold;
    }

    public void setVibrationRiseThreshold(double vibrationRiseThreshold) {
        this.vibrationRiseThreshold = vibrationRiseThreshold;
    }

    public double getPressureDriftThreshold() {
        return pressureDriftThreshold;
    }

    public void setPressureDriftThreshold(double pressureDriftThreshold) {
        this.pressureDriftThreshold = pressureDriftThreshold;
    }

    public double getRpmDriftThreshold() {
        return rpmDriftThreshold;
    }

    public void setRpmDriftThreshold(double rpmDriftThreshold) {
        this.rpmDriftThreshold = rpmDriftThreshold;
    }
}
