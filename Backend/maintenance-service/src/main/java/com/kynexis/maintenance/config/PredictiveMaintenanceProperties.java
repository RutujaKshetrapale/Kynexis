package com.kynexis.maintenance.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import lombok.Data;

@Data
@Component
@ConfigurationProperties(prefix = "kynexis.predictive-maintenance")
public class PredictiveMaintenanceProperties {
    private int minTelemetryReadings = 3;
    private int staleThresholdHours = 24;
    private int trendReadingsLimit = 10;
    private int trendWindowDays = 7;
    private double tempRiseThreshold = 5.0;
    private double vibrationRiseThreshold = 1.5;
    private double pressureDriftThreshold = 20.0;
    private double rpmDriftThreshold = 300.0;
}
