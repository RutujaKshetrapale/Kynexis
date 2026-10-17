package com.kynexis.alert.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import lombok.Data;

@Data
@Component
@ConfigurationProperties(prefix = "kynexis.alert-engine")
public class AlertEngineProperties {
    private boolean enabled = true;

    private boolean temperatureHighEnabled = true;
    private double temperatureHighThreshold = 85.0;
    private String temperatureHighSeverity = "HIGH";

    private boolean temperatureLowEnabled = false;
    private double temperatureLowThreshold = 0.0;
    private String temperatureLowSeverity = "MEDIUM";

    private boolean vibrationHighEnabled = false;
    private double vibrationHighThreshold = 5.0;
    private String vibrationHighSeverity = "MEDIUM";

    private boolean pressureHighEnabled = false;
    private double pressureHighThreshold = 100.0;
    private String pressureHighSeverity = "HIGH";

    private boolean pressureLowEnabled = false;
    private double pressureLowThreshold = 10.0;
    private String pressureLowSeverity = "MEDIUM";

    private boolean rpmHighEnabled = false;
    private double rpmHighThreshold = 3500.0;
    private String rpmHighSeverity = "HIGH";

    private boolean machineStatusEnabled = true;
}
