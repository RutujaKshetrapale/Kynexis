package com.example.demo.integration;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@WithMockUser(roles = {"ADMIN", "ENGINEER", "OPERATOR", "MANAGER"})
@ActiveProfiles("test")
@Transactional
class MachineHealthIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    @Test
    @DisplayName("Integration Test: GET /api/machines/{machineId}/health and GET /api/machines/health")
    void testMachineHealthEndpoints() throws Exception {
        // 1. Create Plant
        String plantJson = """
                {
                    "name": "Health Test Plant",
                    "location": "Munich",
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
                    "name": "Robotic Arm Health Test",
                    "type": "WELDER",
                    "status": "RUNNING"
                }
                """, plantId);

        MvcResult machineResult = mockMvc.perform(post("/api/machines")
                .contentType(MediaType.APPLICATION_JSON)
                .content(machineJson))
                .andExpect(status().isCreated())
                .andReturn();
        long machineId = objectMapper.readTree(machineResult.getResponse().getContentAsString()).get("id").asLong();

        // 3. Post Telemetry for Machine
        String telemetryJson = String.format("""
                {
                    "machineId": %d,
                    "temperature": 75.0,
                    "vibration": 1.2,
                    "pressure": 45.0,
                    "rpm": 2200.0,
                    "timestamp": "2026-10-10T14:00:00"
                }
                """, machineId);

        mockMvc.perform(post("/api/telemetry")
                .contentType(MediaType.APPLICATION_JSON)
                .content(telemetryJson))
                .andExpect(status().isCreated());

        // 4. Test Single Machine Health Endpoint GET /api/machines/{machineId}/health
        mockMvc.perform(get("/api/machines/" + machineId + "/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.machineId").value(machineId))
                .andExpect(jsonPath("$.machineName").value("Robotic Arm Health Test"))
                .andExpect(jsonPath("$.healthState").value("HEALTHY"))
                .andExpect(jsonPath("$.temperature").value(75.0))
                .andExpect(jsonPath("$.totalUnresolvedAlertCount").value(0));

        // 5. Test Bulk Machine Health Endpoint GET /api/machines/health
        mockMvc.perform(get("/api/machines/health?page=0&size=10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content[?(@.machineId == " + machineId + ")].healthState").value("HEALTHY"));

        // 6. Test Nonexistent Machine Health 404
        mockMvc.perform(get("/api/machines/999999/health"))
                .andExpect(status().isNotFound());
    }
}
