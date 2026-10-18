package com.kynexis.machine.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import com.kynexis.machine.common.client.RestClientHelper;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class PlantServiceClient {

    private final RestClient restClient;

    public PlantServiceClient(
            @Value("${kynexis.services.plant-service.url:http://localhost:8082}") String serviceUrl,
            @Value("${kynexis.security.internal-secret:KynexisInternalServiceCommunicationSecretKey2026}") String internalSecret) {
        this.restClient = RestClientHelper.createClient(serviceUrl, internalSecret);
    }

    public PlantServiceClient(String serviceUrl) {
        this(serviceUrl, "KynexisInternalServiceCommunicationSecretKey2026");
    }

    public boolean plantExists(Long plantId) {
        if (plantId == null) return false;
        try {
            Boolean exists = restClient.get()
                    .uri("/api/plants/{id}/exists", plantId)
                    .retrieve()
                    .body(Boolean.class);
            return Boolean.TRUE.equals(exists);
        } catch (Exception ex) {
            log.warn("Failed to check plant existence from plant-service id={}: {}", plantId, ex.getMessage());
            // Graceful fallback to avoid cascading failure
            return true;
        }
    }
}
