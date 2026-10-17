package com.kynexis.maintenance.client;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

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
public class TelemetryServiceClient {

    private final RestClient restClient;

    public TelemetryServiceClient(
            @Value("${kynexis.services.telemetry-service.url:http://localhost:8083}") String serviceUrl) {
        this.restClient = RestClient.builder().baseUrl(serviceUrl).build();
    }

    public Optional<TelemetrySnapshot> getLatestTelemetry(Long machineId) {
        if (machineId == null) return Optional.empty();
        try {
            TelemetrySnapshot snapshot = restClient.get()
                    .uri("/api/telemetry/machine/{id}/latest", machineId)
                    .retrieve()
                    .body(TelemetrySnapshot.class);
            return Optional.ofNullable(snapshot);
        } catch (Exception ex) {
            log.debug("No latest telemetry for machineId={}: {}", machineId, ex.getMessage());
            return Optional.empty();
        }
    }

    public List<TelemetrySnapshot> getRecentTelemetry(Long machineId, int limit) {
        if (machineId == null) return Collections.emptyList();
        try {
            return restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/api/telemetry/machine/{id}/recent")
                            .queryParam("limit", limit)
                            .build(machineId))
                    .retrieve()
                    .body(new ParameterizedTypeReference<List<TelemetrySnapshot>>() {});
        } catch (Exception ex) {
            log.debug("No recent telemetry for machineId={}: {}", machineId, ex.getMessage());
            return Collections.emptyList();
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TelemetrySnapshot {
        private Long id;
        private Long machineId;
        private Double temperature;
        private Double vibration;
        private Double pressure;
        private Double rpm;
        private LocalDateTime timestamp;
    }
}
