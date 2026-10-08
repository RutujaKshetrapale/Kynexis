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
class MachineIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    @Test
    @DisplayName("Machine Flow: Create Plant -> Create Machine -> Retrieve -> Filter")
    void testMachineLifecycle() throws Exception {
        String plantJson = """
                {
                    "name": "Factory Alpha",
                    "location": "Mumbai",
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
                    "name": "Lathe Machine 01",
                    "type": "LATHE",
                    "status": "RUNNING"
                }
                """, plantId);

        MvcResult machineResult = mockMvc.perform(post("/api/machines")
                .contentType(MediaType.APPLICATION_JSON)
                .content(machineJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.name").value("Lathe Machine 01"))
                .andReturn();

        long machineId = objectMapper.readTree(machineResult.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(get("/api/machines/" + machineId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Lathe Machine 01"));

        mockMvc.perform(get("/api/machines/plant/" + plantId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(machineId));
    }
}
