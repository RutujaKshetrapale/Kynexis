package com.kynexis.dashboard.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import com.kynexis.common.client.RestClientHelper;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class ProductionEnergyClient {

    private final RestClient restClient;

    public ProductionEnergyClient(
            @Value("${kynexis.services.production-energy-service.url:http://localhost:8086}") String serviceUrl,
            @Value("${kynexis.security.internal-secret:KynexisInternalServiceCommunicationSecretKey2026}") String internalSecret) {
        this.restClient = RestClientHelper.createClient(serviceUrl, internalSecret);
    }

    public ProductionEnergyClient(String serviceUrl) {
        this(serviceUrl, "KynexisInternalServiceCommunicationSecretKey2026");
    }

    public ProductionMetrics getProductionMetrics() {
        try {
            ProductionMetrics metrics = restClient.get()
                    .uri("/api/production/metrics/summary")
                    .retrieve()
                    .body(ProductionMetrics.class);
            return metrics != null ? metrics : new ProductionMetrics(0L, 0L);
        } catch (Exception ex) {
            log.warn("Failed to get production metrics: {}", ex.getMessage());
            return new ProductionMetrics(0L, 0L);
        }
    }

    public EnergyMetrics getEnergyMetrics() {
        try {
            EnergyMetrics metrics = restClient.get()
                    .uri("/api/energy/metrics/summary")
                    .retrieve()
                    .body(EnergyMetrics.class);
            return metrics != null ? metrics : new EnergyMetrics(0.0);
        } catch (Exception ex) {
            log.warn("Failed to get energy metrics: {}", ex.getMessage());
            return new EnergyMetrics(0.0);
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProductionMetrics {
        private Long totalProduction;
        private Long rejectedProduction;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EnergyMetrics {
        private Double totalEnergyConsumption;
    }
}
