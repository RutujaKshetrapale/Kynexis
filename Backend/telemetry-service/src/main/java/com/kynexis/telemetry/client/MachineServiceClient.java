package com.kynexis.telemetry.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class MachineServiceClient {

    private final RestClient restClient;

    public MachineServiceClient(
            @Value("${kynexis.services.plant-machine-service.url:http://localhost:8082}") String serviceUrl) {
        this.restClient = RestClient.builder()
                .baseUrl(serviceUrl)
                .build();
    }

    public boolean machineExists(Long machineId) {
        if (machineId == null) return false;
        try {
            Boolean exists = restClient.get()
                    .uri("/api/machines/{id}/exists", machineId)
                    .retrieve()
                    .body(Boolean.class);
            return Boolean.TRUE.equals(exists);
        } catch (Exception ex) {
            log.warn("Failed to check machine existence from plant-machine-service id={}: {}", machineId, ex.getMessage());
            // Graceful fallback to avoid cascading failure if service is unreachable
            return true;
        }
    }
}
