package com.example.demo.integration;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
    @DisplayName("Integration: Post High Temp Telemetry -> Automated Alert Generated -> Retrieve Unresolved Alert")
    void testAutomatedAlertGenerationOnTelemetryIngestion() throws Exception {
        // 1. Create Plant
        String plantJson = """
                {
                    "name": "Alert Hub Plant",
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

        // 2. Create Machine
        String machineJson = String.format("""
                {
                    "plantId": %d,
                    "name": "Milling Station High Temp Test",
                    "type": "CNC",
                    "status": "RUNNING"
                }
                """, plantId);

        MvcResult machineResult = mockMvc.perform(post("/api/machines")
                .contentType(MediaType.APPLICATION_JSON)
                .content(machineJson))
                .andExpect(status().isCreated())
                .andReturn();
        long machineId = objectMapper.readTree(machineResult.getResponse().getContentAsString()).get("id").asLong();

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

        // 4. Verify Alert was automatically created in DB
        List<Alert> unresolvedAlerts = alertRepository.findByMachineIdAndResolvedFalse(machineId);
        assertFalse(unresolvedAlerts.isEmpty());
        Alert overheatingAlert = unresolvedAlerts.stream()
                .filter(a -> "OVERHEATING".equals(a.getType()))
                .findFirst()
                .orElse(null);

        assertNotNull(overheatingAlert);
        assertEquals("HIGH", overheatingAlert.getSeverity());
        assertFalse(overheatingAlert.isResolved());
        assertTrue(overheatingAlert.getMessage().contains("95.0"));

        // 5. Retrieve via REST API /api/alerts/unresolved
        mockMvc.perform(get("/api/alerts/unresolved"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.type == 'OVERHEATING')]").exists());

        // 6. Deduplication Check: Post another telemetry reading breaching temperature threshold again
        String highTempTelemetry2 = String.format("""
                {
                    "machineId": %d,
                    "temperature": 97.5,
                    "vibration": 1.3,
                    "pressure": 46.0,
                    "rpm": 2550.0,
                    "timestamp": "2026-10-10T12:05:00"
                }
                """, machineId);

        mockMvc.perform(post("/api/telemetry")
                .contentType(MediaType.APPLICATION_JSON)
                .content(highTempTelemetry2))
                .andExpect(status().isCreated());

        // Verify NO duplicate active alert was created
        List<Alert> unresolvedAlertsAfterSecond = alertRepository.findByMachineIdAndResolvedFalse(machineId);
        long overheatingCount = unresolvedAlertsAfterSecond.stream()
                .filter(a -> "OVERHEATING".equals(a.getType()))
                .count();

        assertEquals(1, overheatingCount, "Repeated breach must not create duplicate active alerts");

        // 7. Auto-resolution Check: Post normal telemetry (72.0°C <= 85.0°C)
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

        // Verify alert was automatically resolved
        List<Alert> unresolvedAfterNormal = alertRepository.findByMachineIdAndResolvedFalse(machineId);
        long activeOverheatingAfterNormal = unresolvedAfterNormal.stream()
                .filter(a -> "OVERHEATING".equals(a.getType()))
                .count();

        assertEquals(0, activeOverheatingAfterNormal, "Alert must be auto-resolved when condition clears");
    }
}
