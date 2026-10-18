package com.kynexis.dashboard.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import com.kynexis.common.client.RestClientHelper;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class AlertClient {

    private final RestClient restClient;

    public AlertClient(
            @Value("${kynexis.services.alert-service.url:http://localhost:8084}") String serviceUrl,
            @Value("${kynexis.security.internal-secret:KynexisInternalServiceCommunicationSecretKey2026}") String internalSecret) {
        this.restClient = RestClientHelper.createClient(serviceUrl, internalSecret);
    }

    public AlertClient(String serviceUrl) {
        this(serviceUrl, "KynexisInternalServiceCommunicationSecretKey2026");
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
