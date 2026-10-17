package com.kynexis.maintenance.client;

import java.util.Collections;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class AlertServiceClient {

    private final RestClient restClient;

    public AlertServiceClient(
            @Value("${kynexis.services.alert-service.url:http://localhost:8084}") String serviceUrl) {
        this.restClient = RestClient.builder().baseUrl(serviceUrl).build();
    }

    public List<AlertSnapshot> getUnresolvedAlerts(Long machineId) {
        if (machineId == null) return Collections.emptyList();
        try {
            return restClient.get()
                    .uri("/api/alerts/machine/{id}/unresolved", machineId)
                    .retrieve()
                    .body(new ParameterizedTypeReference<List<AlertSnapshot>>() {});
        } catch (Exception ex) {
            log.debug("No unresolved alerts for machineId={}: {}", machineId, ex.getMessage());
            return Collections.emptyList();
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AlertSnapshot {
        private Long id;
        private Long machineId;
        private String type;
        private String severity;
        private String message;
        private boolean resolved;
    }
}
