package com.kynexis.dashboard.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class AlertClient {

    private final RestClient restClient;

    public AlertClient(
            @Value("${kynexis.services.alert-service.url:http://localhost:8084}") String serviceUrl) {
        this.restClient = RestClient.builder().baseUrl(serviceUrl).build();
    }

    public long getUnresolvedAlertCount() {
        try {
            Long count = restClient.get().uri("/api/alerts/count/unresolved").retrieve().body(Long.class);
            return count != null ? count : 0L;
        } catch (Exception ex) {
            log.warn("Failed to get unresolved alert count: {}", ex.getMessage());
            return 0L;
        }
    }
}
