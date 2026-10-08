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
class MaintenanceIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    @Test
    @DisplayName("Maintenance Flow: Create Maintenance -> Retrieve -> Update Status")
    void testMaintenanceLifecycle() throws Exception {
        String plantJson = """
                {
                    "name": "Maintenance Plant",
                    "location": "Hyderabad",
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
                    "name": "Machine Maintenance Test",
                    "type": "STAMPING",
                    "status": "RUNNING"
                }
                """, plantId);

        MvcResult machineResult = mockMvc.perform(post("/api/machines")
                .contentType(MediaType.APPLICATION_JSON)
                .content(machineJson))
                .andExpect(status().isCreated())
                .andReturn();
        long machineId = objectMapper.readTree(machineResult.getResponse().getContentAsString()).get("id").asLong();

        String maintenanceJson = String.format("""
                {
                    "machineId": %d,
                    "type": "PREVENTIVE",
                    "description": "Fluid change and seal inspection",
                    "status": "SCHEDULED",
                    "scheduledDate": "2026-10-20",
                    "technician": "Tech John"
                }
                """, machineId);

        MvcResult maintenanceResult = mockMvc.perform(post("/api/maintenance")
                .contentType(MediaType.APPLICATION_JSON)
                .content(maintenanceJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.status").value("SCHEDULED"))
                .andReturn();

        long maintenanceId = objectMapper.readTree(maintenanceResult.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(get("/api/maintenance/" + maintenanceId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.type").value("PREVENTIVE"));

        String updateJson = String.format("""
                {
                    "machineId": %d,
                    "type": "PREVENTIVE",
                    "description": "Fluid change and seal inspection",
                    "status": "IN_PROGRESS",
                    "scheduledDate": "2026-10-20",
                    "technician": "Tech John"
                }
                """, machineId);

        mockMvc.perform(put("/api/maintenance/" + maintenanceId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(updateJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"));
    }
}
