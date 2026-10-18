package com.kynexis.production.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import com.kynexis.common.client.RestClientHelper;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class MachineServiceClient {

    private final RestClient restClient;

    public MachineServiceClient(
            @Value("${kynexis.services.plant-machine-service.url:http://localhost:8082}") String serviceUrl,
            @Value("${kynexis.security.internal-secret:KynexisInternalServiceCommunicationSecretKey2026}") String internalSecret) {
        this.restClient = RestClientHelper.createClient(serviceUrl, internalSecret);
    }

    public MachineServiceClient(String serviceUrl) {
        this(serviceUrl, "KynexisInternalServiceCommunicationSecretKey2026");
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
            log.warn("Failed to check machine existence id={}: {}", machineId, ex.getMessage());
            return true;
        }
    }
}
