package com.kynexis.dashboard.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "kynexis.cache")
public class KynexisCacheProperties {

    private boolean enabled = true;
    private String prefix = "kynexis";
    private String environment = "dev";
    private long defaultTtlSeconds = 15;
    private long dashboardSummaryTtlSeconds = 15;
    private long dashboardMachineStatusTtlSeconds = 15;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getPrefix() {
        return prefix;
    }

    public void setPrefix(String prefix) {
        this.prefix = prefix;
    }

    public String getEnvironment() {
        return environment;
    }

    public void setEnvironment(String environment) {
        this.environment = environment;
    }

    public long getDefaultTtlSeconds() {
        return defaultTtlSeconds;
    }

    public void setDefaultTtlSeconds(long defaultTtlSeconds) {
        this.defaultTtlSeconds = defaultTtlSeconds;
    }

    public long getDashboardSummaryTtlSeconds() {
        return dashboardSummaryTtlSeconds;
    }

    public void setDashboardSummaryTtlSeconds(long dashboardSummaryTtlSeconds) {
        this.dashboardSummaryTtlSeconds = dashboardSummaryTtlSeconds;
    }

    public long getDashboardMachineStatusTtlSeconds() {
        return dashboardMachineStatusTtlSeconds;
    }

    public void setDashboardMachineStatusTtlSeconds(long dashboardMachineStatusTtlSeconds) {
        this.dashboardMachineStatusTtlSeconds = dashboardMachineStatusTtlSeconds;
    }
}
