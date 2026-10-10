package com.example.demo.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "kynexis.alert-engine")
public class AlertEngineProperties {

    private boolean enabled = true;

    // Temperature High Threshold (°C)
    // Rationale: Seed data V2 specifies 85.0°C spindle safety limit for OVERHEATING
    private boolean temperatureHighEnabled = true;
    private double temperatureHighThreshold = 85.0;
    private String temperatureHighSeverity = "HIGH";

    // Temperature Low Threshold (°C)
    // Rationale: Sub-zero freeze limit (0.0°C) for coolant lines and industrial operations
    private boolean temperatureLowEnabled = true;
    private double temperatureLowThreshold = 0.0;
    private String temperatureLowSeverity = "MEDIUM";

    // Vibration High Threshold (mm/s)
    // Rationale: Seed data V2 specifies vibration warning limit around 5.0 mm/s
    private boolean vibrationHighEnabled = true;
    private double vibrationHighThreshold = 5.0;
    private String vibrationHighSeverity = "MEDIUM";

    // Pressure High Threshold (PSI)
    // Rationale: Hydraulic stamping press / injection molder maximum safety operating limit (100.0 PSI)
    private boolean pressureHighEnabled = true;
    private double pressureHighThreshold = 100.0;
    private String pressureHighSeverity = "HIGH";

    // Pressure Low Threshold (PSI)
    // Rationale: Hydraulic system pressure loss / line leak threshold (10.0 PSI)
    private boolean pressureLowEnabled = true;
    private double pressureLowThreshold = 10.0;
    private String pressureLowSeverity = "MEDIUM";

    // RPM High Threshold (RPM)
    // Rationale: Motor overspeed safety limit (3500.0 RPM)
    private boolean rpmHighEnabled = true;
    private double rpmHighThreshold = 3500.0;
    private String rpmHighSeverity = "HIGH";

    // Machine Status Abnormal Rule
    // Rationale: Detects physical assets transitioning into abnormal operational states (STOPPED, OFFLINE, MAINTENANCE)
    private boolean machineStatusEnabled = true;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public boolean isTemperatureHighEnabled() {
        return temperatureHighEnabled;
    }

    public void setTemperatureHighEnabled(boolean temperatureHighEnabled) {
        this.temperatureHighEnabled = temperatureHighEnabled;
    }

    public double getTemperatureHighThreshold() {
        return temperatureHighThreshold;
    }

    public void setTemperatureHighThreshold(double temperatureHighThreshold) {
        this.temperatureHighThreshold = temperatureHighThreshold;
    }

    public String getTemperatureHighSeverity() {
        return temperatureHighSeverity;
    }

    public void setTemperatureHighSeverity(String temperatureHighSeverity) {
        this.temperatureHighSeverity = temperatureHighSeverity;
    }

    public boolean isTemperatureLowEnabled() {
        return temperatureLowEnabled;
    }

    public void setTemperatureLowEnabled(boolean temperatureLowEnabled) {
        this.temperatureLowEnabled = temperatureLowEnabled;
    }

    public double getTemperatureLowThreshold() {
        return temperatureLowThreshold;
    }

    public void setTemperatureLowThreshold(double temperatureLowThreshold) {
        this.temperatureLowThreshold = temperatureLowThreshold;
    }

    public String getTemperatureLowSeverity() {
        return temperatureLowSeverity;
    }

    public void setTemperatureLowSeverity(String temperatureLowSeverity) {
        this.temperatureLowSeverity = temperatureLowSeverity;
    }

    public boolean isVibrationHighEnabled() {
        return vibrationHighEnabled;
    }

    public void setVibrationHighEnabled(boolean vibrationHighEnabled) {
        this.vibrationHighEnabled = vibrationHighEnabled;
    }

    public double getVibrationHighThreshold() {
        return vibrationHighThreshold;
    }

    public void setVibrationHighThreshold(double vibrationHighThreshold) {
        this.vibrationHighThreshold = vibrationHighThreshold;
    }

    public String getVibrationHighSeverity() {
        return vibrationHighSeverity;
    }

    public void setVibrationHighSeverity(String vibrationHighSeverity) {
        this.vibrationHighSeverity = vibrationHighSeverity;
    }

    public boolean isPressureHighEnabled() {
        return pressureHighEnabled;
    }

    public void setPressureHighEnabled(boolean pressureHighEnabled) {
        this.pressureHighEnabled = pressureHighEnabled;
    }

    public double getPressureHighThreshold() {
        return pressureHighThreshold;
    }

    public void setPressureHighThreshold(double pressureHighThreshold) {
        this.pressureHighThreshold = pressureHighThreshold;
    }

    public String getPressureHighSeverity() {
        return pressureHighSeverity;
    }

    public void setPressureHighSeverity(String pressureHighSeverity) {
        this.pressureHighSeverity = pressureHighSeverity;
    }

    public boolean isPressureLowEnabled() {
        return pressureLowEnabled;
    }

    public void setPressureLowEnabled(boolean pressureLowEnabled) {
        this.pressureLowEnabled = pressureLowEnabled;
    }

    public double getPressureLowThreshold() {
        return pressureLowThreshold;
    }

    public void setPressureLowThreshold(double pressureLowThreshold) {
        this.pressureLowThreshold = pressureLowThreshold;
    }

    public String getPressureLowSeverity() {
        return pressureLowSeverity;
    }

    public void setPressureLowSeverity(String pressureLowSeverity) {
        this.pressureLowSeverity = pressureLowSeverity;
    }

    public boolean isRpmHighEnabled() {
        return rpmHighEnabled;
    }

    public void setRpmHighEnabled(boolean rpmHighEnabled) {
        this.rpmHighEnabled = rpmHighEnabled;
    }

    public double getRpmHighThreshold() {
        return rpmHighThreshold;
    }

    public void setRpmHighThreshold(double rpmHighThreshold) {
        this.rpmHighThreshold = rpmHighThreshold;
    }

    public String getRpmHighSeverity() {
        return rpmHighSeverity;
    }

    public void setRpmHighSeverity(String rpmHighSeverity) {
        this.rpmHighSeverity = rpmHighSeverity;
    }

    public boolean isMachineStatusEnabled() {
        return machineStatusEnabled;
    }

    public void setMachineStatusEnabled(boolean machineStatusEnabled) {
        this.machineStatusEnabled = machineStatusEnabled;
    }
}
