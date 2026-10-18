package com.kynexis.gateway.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import lombok.Data;

@Data
@Component
@ConfigurationProperties(prefix = "kynexis.services")
public class GatewayProperties {

    private ServiceUrl authenticationService = new ServiceUrl("http://localhost:8081");
    private ServiceUrl plantService = new ServiceUrl("http://localhost:8082");
    private ServiceUrl machineService = new ServiceUrl("http://localhost:8088");
    private ServiceUrl sensorService = new ServiceUrl("http://localhost:8089");
    private ServiceUrl telemetryService = new ServiceUrl("http://localhost:8083");
    private ServiceUrl alertService = new ServiceUrl("http://localhost:8084");
    private ServiceUrl maintenanceService = new ServiceUrl("http://localhost:8085");
    private ServiceUrl productionService = new ServiceUrl("http://localhost:8086");
    private ServiceUrl energyService = new ServiceUrl("http://localhost:8087");

    // Aliases for backward compatibility in existing configs/tests
    public ServiceUrl getIdentityService() {
        return authenticationService;
    }

    public void setIdentityService(ServiceUrl identityService) {
        this.authenticationService = identityService;
    }

    public ServiceUrl getPlantMachineService() {
        return plantService;
    }

    public void setPlantMachineService(ServiceUrl plantMachineService) {
        this.plantService = plantMachineService;
    }

    public ServiceUrl getProductionEnergyService() {
        return productionService;
    }

    public void setProductionEnergyService(ServiceUrl productionEnergyService) {
        this.productionService = productionEnergyService;
    }

    @Data
    public static class ServiceUrl {
        private String url;

        public ServiceUrl() {}
        public ServiceUrl(String url) {
            this.url = url;
        }
    }
}
