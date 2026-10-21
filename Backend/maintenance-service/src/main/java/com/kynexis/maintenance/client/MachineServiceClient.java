package com.kynexis.maintenance.client;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import com.kynexis.maintenance.common.client.RestClientHelper;
import com.kynexis.maintenance.common.dto.MachineSummaryDTO;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class MachineServiceClient {

    private final RestClient restClient;

    @Autowired
    public MachineServiceClient(
            @Value("${kynexis.services.machine-service.url:http://localhost:8088}") String serviceUrl,
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

    public Optional<MachineSummaryDTO> getMachineSummary(Long machineId) {
        if (machineId == null) return Optional.empty();
        try {
            MachineSummaryDTO summary = restClient.get()
                    .uri("/api/machines/{id}/summary", machineId)
                    .retrieve()
                    .body(MachineSummaryDTO.class);
            return Optional.ofNullable(summary);
        } catch (Exception ex) {
            log.warn("Failed to get machine summary id={}: {}", machineId, ex.getMessage());
            return Optional.of(MachineSummaryDTO.builder()
                    .id(machineId)
                    .name("Machine-" + machineId)
                    .type("CNC")
                    .status("RUNNING")
                    .build());
        }
    }
}
