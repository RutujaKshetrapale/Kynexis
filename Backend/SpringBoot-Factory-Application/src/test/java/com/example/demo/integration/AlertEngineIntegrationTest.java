package com.example.demo.integration;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.entity.Alert;
import com.example.demo.repository.AlertRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@WithMockUser(roles = {"ADMIN", "ENGINEER", "OPERATOR", "MANAGER"})
@ActiveProfiles("test")
@Transactional
class AlertEngineIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AlertRepository alertRepository;

    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    @Test
    @DisplayName("Integration Test: High Temp Telemetry -> Alert Created -> Machine Status Update Does NOT Resolve Overheating Alert -> Normal Temp Resolves Overheating Alert")
    void testAlertLifecycleAndMachineStatusIndependence() throws Exception {
        // 1. Create Plant
        String plantJson = """
                {
                    "name": "Integration Hub Plant",
                    "location": "Pune",
                    "active": true
                }
                """;

        MvcResult plantResult = mockMvc.perform(post("/api/plants")
                .contentType(MediaType.APPLICATION_JSON)
                .content(plantJson))
                .andExpect(status().isCreated())
                .andReturn();
        long plantId = objectMapper.readTree(plantResult.getResponse().getContentAsString()).get("id").asLong();

        // 2. Create Machine (Initial status: OFFLINE)
        String machineJson = String.format("""
                {
                    "plantId": %d,
                    "name": "Milling Station Integration Test",
                    "type": "CNC",
                    "status": "OFFLINE"
                }
                """, plantId);

        MvcResult machineResult = mockMvc.perform(post("/api/machines")
                .contentType(MediaType.APPLICATION_JSON)
                .content(machineJson))
                .andExpect(status().isCreated())
                .andReturn();
        long machineId = objectMapper.readTree(machineResult.getResponse().getContentAsString()).get("id").asLong();

        // Verify machine status created ABNORMAL_MACHINE_STATUS alert
        List<Alert> machineAlerts = alertRepository.findByMachineIdAndResolvedFalse(machineId);
        assertTrue(machineAlerts.stream().anyMatch(a -> "ABNORMAL_MACHINE_STATUS".equals(a.getType())),
                "OFFLINE status must trigger ABNORMAL_MACHINE_STATUS alert");

        // 3. Post Telemetry breaching OVERHEATING threshold (95.0°C > 85.0°C)
        String highTempTelemetryJson = String.format("""
                {
                    "machineId": %d,
                    "temperature": 95.0,
                    "vibration": 1.2,
                    "pressure": 45.0,
                    "rpm": 2500.0,
                    "timestamp": "2026-10-10T12:00:00"
                }
                """, machineId);

        mockMvc.perform(post("/api/telemetry")
                .contentType(MediaType.APPLICATION_JSON)
                .content(highTempTelemetryJson))
                .andExpect(status().isCreated());

        // Verify OVERHEATING alert was created
        List<Alert> activeAlerts = alertRepository.findByMachineIdAndResolvedFalse(machineId);
        Alert overheatingAlert = activeAlerts.stream()
                .filter(a -> "OVERHEATING".equals(a.getType()))
                .findFirst()
                .orElse(null);

        assertNotNull(overheatingAlert, "OVERHEATING alert must be active");

        // 4. Update Machine Status to RUNNING (Normal status)
        String updateMachineJson = String.format("""
                {
                    "plantId": %d,
                    "name": "Milling Station Integration Test",
                    "type": "CNC",
                    "status": "RUNNING"
                }
                """, plantId);

        mockMvc.perform(put("/api/machines/" + machineId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(updateMachineJson))
                .andExpect(status().isOk());

        // REGRESSION CHECK: Update to RUNNING resolves ABNORMAL_MACHINE_STATUS alert, BUT DOES NOT RESOLVE OVERHEATING ALERT!
        List<Alert> activeAlertsAfterMachineUpdate = alertRepository.findByMachineIdAndResolvedFalse(machineId);
        boolean hasActiveOverheating = activeAlertsAfterMachineUpdate.stream()
                .anyMatch(a -> "OVERHEATING".equals(a.getType()));
        boolean hasActiveMachineStatusAlert = activeAlertsAfterMachineUpdate.stream()
                .anyMatch(a -> "ABNORMAL_MACHINE_STATUS".equals(a.getType()));

        assertTrue(hasActiveOverheating, "Updating machine status to RUNNING MUST NOT resolve active OVERHEATING alert");
        assertFalse(hasActiveMachineStatusAlert, "Updating machine status to RUNNING MUST resolve ABNORMAL_MACHINE_STATUS alert");

        // 5. Post normal telemetry (72.0°C <= 85.0°C)
        String normalTelemetryJson = String.format("""
                {
                    "machineId": %d,
                    "temperature": 72.0,
                    "vibration": 1.2,
                    "pressure": 45.0,
                    "rpm": 2500.0,
                    "timestamp": "2026-10-10T12:10:00"
                }
                """, machineId);

        mockMvc.perform(post("/api/telemetry")
                .contentType(MediaType.APPLICATION_JSON)
                .content(normalTelemetryJson))
                .andExpect(status().isCreated());

        // Verify OVERHEATING alert is now resolved by the normal temperature telemetry reading
        List<Alert> finalActiveAlerts = alertRepository.findByMachineIdAndResolvedFalse(machineId);
        assertTrue(finalActiveAlerts.isEmpty(), "All alerts must be resolved after normal reading and normal status");
    }
}
