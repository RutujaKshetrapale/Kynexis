package com.example.demo.integration;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
class AlertIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    @Test
    @DisplayName("Alert Flow: Create Alert -> Retrieve Alert -> Resolve Alert")
    void testAlertLifecycle() throws Exception {
        String plantJson = """
                {
                    "name": "Alert Plant",
                    "location": "Bengaluru",
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
                    "name": "Machine Alert Test",
                    "type": "ROBOT",
                    "status": "RUNNING"
                }
                """, plantId);

        MvcResult machineResult = mockMvc.perform(post("/api/machines")
                .contentType(MediaType.APPLICATION_JSON)
                .content(machineJson))
                .andExpect(status().isCreated())
                .andReturn();
        long machineId = objectMapper.readTree(machineResult.getResponse().getContentAsString()).get("id").asLong();

        String alertJson = String.format("""
                {
                    "machineId": %d,
                    "type": "OVERHEAT",
                    "severity": "CRITICAL",
                    "message": "Critical temperature reached",
                    "resolved": false
                }
                """, machineId);

        MvcResult alertResult = mockMvc.perform(post("/api/alerts")
                .contentType(MediaType.APPLICATION_JSON)
                .content(alertJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.resolved").value(false))
                .andReturn();

        long alertId = objectMapper.readTree(alertResult.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(get("/api/alerts/" + alertId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.severity").value("CRITICAL"));

        String resolveJson = String.format("""
                {
                    "machineId": %d,
                    "type": "OVERHEAT",
                    "severity": "CRITICAL",
                    "message": "Critical temperature reached",
                    "resolved": true
                }
                """, machineId);

        mockMvc.perform(put("/api/alerts/" + alertId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(resolveJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resolved").value(true));
    }
}
