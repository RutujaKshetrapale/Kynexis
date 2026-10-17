package com.kynexis.dashboard.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class PlantMachineClient {

    private final RestClient restClient;

    public PlantMachineClient(
            @Value("${kynexis.services.plant-machine-service.url:http://localhost:8082}") String serviceUrl) {
        this.restClient = RestClient.builder().baseUrl(serviceUrl).build();
    }

    public long getPlantCount() {
        try {
            Long count = restClient.get().uri("/api/plants/count").retrieve().body(Long.class);
            return count != null ? count : 0L;
        } catch (Exception ex) {
            log.warn("Failed to get plant count: {}", ex.getMessage());
            return 0L;
        }
    }

    public long getTotalMachineCount() {
        try {
            Long count = restClient.get().uri("/api/machines/count").retrieve().body(Long.class);
            return count != null ? count : 0L;
        } catch (Exception ex) {
            log.warn("Failed to get total machine count: {}", ex.getMessage());
            return 0L;
        }
    }

    public long getMachineCountByStatus(String status) {
        try {
            Long count = restClient.get().uri("/api/machines/count/status/{status}", status).retrieve().body(Long.class);
            return count != null ? count : 0L;
        } catch (Exception ex) {
            log.warn("Failed to get machine count for status {}: {}", status, ex.getMessage());
            return 0L;
        }
    }

    public long getTotalSensorCount() {
        try {
            Long count = restClient.get().uri("/api/sensors/count").retrieve().body(Long.class);
            return count != null ? count : 0L;
        } catch (Exception ex) {
            log.warn("Failed to get sensor count: {}", ex.getMessage());
            return 0L;
        }
    }
}
