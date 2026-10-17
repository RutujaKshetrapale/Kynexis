package com.kynexis.gateway.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import lombok.Data;

@Data
@Component
@ConfigurationProperties(prefix = "kynexis.services")
public class GatewayProperties {
    private ServiceUrl identityService = new ServiceUrl("http://localhost:8081");
    private ServiceUrl plantMachineService = new ServiceUrl("http://localhost:8082");
    private ServiceUrl telemetryService = new ServiceUrl("http://localhost:8083");
    private ServiceUrl alertService = new ServiceUrl("http://localhost:8084");
    private ServiceUrl maintenanceService = new ServiceUrl("http://localhost:8085");
    private ServiceUrl productionEnergyService = new ServiceUrl("http://localhost:8086");
    private ServiceUrl dashboardService = new ServiceUrl("http://localhost:8087");

    @Data
    public static class ServiceUrl {
        private String url;

        public ServiceUrl() {}
        public ServiceUrl(String url) {
            this.url = url;
        }
    }
}
