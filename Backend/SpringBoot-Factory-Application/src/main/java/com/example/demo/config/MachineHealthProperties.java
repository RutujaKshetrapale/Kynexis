package com.example.demo.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "kynexis.health-engine")
public class MachineHealthProperties {

    /**
     * Controls whether LOW severity unresolved alerts cause health classification to be DEGRADED.
     * Defaults to false (LOW alerts are preserved in alert statistics and reasons, but do not degrade health by default).
     */
    private boolean lowAlertCausesDegraded = false;

    public boolean isLowAlertCausesDegraded() {
        return lowAlertCausesDegraded;
    }

    public void setLowAlertCausesDegraded(boolean lowAlertCausesDegraded) {
        this.lowAlertCausesDegraded = lowAlertCausesDegraded;
    }
}
