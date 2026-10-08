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
class TelemetryIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    @Test
    @DisplayName("Telemetry Flow: Create Machine -> Create Telemetry -> Retrieve -> Retrieve Latest")
    void testTelemetryLifecycle() throws Exception {
        String plantJson = """
                {
                    "name": "Telemetry Plant",
                    "location": "Chennai",
                    "active": true
                }
                """;

        MvcResult plantResult = mockMvc.perform(post("/api/plants")
                .contentType(MediaType.APPLICATION_JSON)
                .content(plantJson))
                .andExpect(status().isCreated())
                .andReturn();
        long plantId = objectMapper.readTree(plantResult.getResponse().getContentAsString()).get("id").asLong();

        String machineJson = String.format("""
                {
                    "plantId": %d,
                    "name": "Machine Telemetry Test",
                    "type": "DRILL",
                    "status": "RUNNING"
                }
                """, plantId);

        MvcResult machineResult = mockMvc.perform(post("/api/machines")
                .contentType(MediaType.APPLICATION_JSON)
                .content(machineJson))
                .andExpect(status().isCreated())
                .andReturn();
        long machineId = objectMapper.readTree(machineResult.getResponse().getContentAsString()).get("id").asLong();

        String telemetryJson = String.format("""
                {
                    "machineId": %d,
                    "temperature": 82.3,
                    "vibration": 0.6,
                    "pressure": 3.2,
                    "rpm": 1800.0,
                    "timestamp": "2026-10-08T10:00:00"
                }
                """, machineId);

        MvcResult telemetryResult = mockMvc.perform(post("/api/telemetry")
                .contentType(MediaType.APPLICATION_JSON)
                .content(telemetryJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andReturn();

        long telemetryId = objectMapper.readTree(telemetryResult.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(get("/api/telemetry/" + telemetryId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.temperature").value(82.3));

        mockMvc.perform(get("/api/telemetry/machine/" + machineId + "/latest"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(telemetryId));
    }
}
