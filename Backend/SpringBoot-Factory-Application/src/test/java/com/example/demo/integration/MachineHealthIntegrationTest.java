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

import com.example.demo.entity.Role;
import com.example.demo.entity.User;
import com.example.demo.security.JwtService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class MachineHealthIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    @Test
    @DisplayName("Security & Health Flow: Authorized user can access single and bulk health endpoints")
    @WithMockUser(roles = {"ENGINEER"})
    void testMachineHealthEndpoints_asAuthorizedUser() throws Exception {
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

    @Test
    @DisplayName("Security Test: Unauthenticated requests are rejected with 401 Unauthorized")
    void testMachineHealthEndpoints_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/api/machines/1/health"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.error").value("UNAUTHORIZED"));

        mockMvc.perform(get("/api/machines/health"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.error").value("UNAUTHORIZED"));
    }

    @Test
    @DisplayName("Security Test: Authenticated user without required role is rejected with 403 Forbidden")
    @WithMockUser(roles = {"UNAUTHORIZED_USER"})
    void testMachineHealthEndpoints_unauthorizedRole_returns403() throws Exception {
        mockMvc.perform(get("/api/machines/1/health"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.error").value("FORBIDDEN"));

        mockMvc.perform(get("/api/machines/health"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.error").value("FORBIDDEN"));
    }

    @Test
    @DisplayName("Security Test: Valid JWT token header grants access to health endpoints")
    void testMachineHealthEndpoints_withJwtBearerToken() throws Exception {
        User user = new User();
        user.setUsername("jwt_engineer_user");
        user.setRole(Role.ENGINEER);

        String token = jwtService.generateToken(user);

        mockMvc.perform(get("/api/machines/health")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Telemetry Test: Out-of-order telemetry timestamps select the genuinely latest timestamp")
    @WithMockUser(roles = {"ENGINEER"})
    void testMachineHealth_selectsGenuinelyLatestTelemetry_whenInsertedOutOfOrder() throws Exception {
        // Create Plant & Machine
        String plantJson = "{\"name\":\"Timestamp Plant\",\"location\":\"Berlin\",\"active\":true}";
        MvcResult plantResult = mockMvc.perform(post("/api/plants").contentType(MediaType.APPLICATION_JSON).content(plantJson))
                .andExpect(status().isCreated()).andReturn();
        long plantId = objectMapper.readTree(plantResult.getResponse().getContentAsString()).get("id").asLong();

        String machineJson = String.format("{\"plantId\":%d,\"name\":\"Timestamp Machine\",\"type\":\"DRILL\",\"status\":\"RUNNING\"}", plantId);
        MvcResult machineResult = mockMvc.perform(post("/api/machines").contentType(MediaType.APPLICATION_JSON).content(machineJson))
                .andExpect(status().isCreated()).andReturn();
        long machineId = objectMapper.readTree(machineResult.getResponse().getContentAsString()).get("id").asLong();

        // Telemetry 1: timestamp 10:00 (temp 50.0) inserted FIRST
        mockMvc.perform(post("/api/telemetry").contentType(MediaType.APPLICATION_JSON)
                .content(String.format("{\"machineId\":%d,\"temperature\":50.0,\"vibration\":1.0,\"pressure\":10.0,\"rpm\":1000.0,\"timestamp\":\"2026-10-10T10:00:00\"}", machineId)))
                .andExpect(status().isCreated());

        // Telemetry 2: timestamp 16:00 (temp 99.0) inserted SECOND (latest timestamp!)
        mockMvc.perform(post("/api/telemetry").contentType(MediaType.APPLICATION_JSON)
                .content(String.format("{\"machineId\":%d,\"temperature\":99.0,\"vibration\":1.0,\"pressure\":10.0,\"rpm\":1000.0,\"timestamp\":\"2026-10-10T16:00:00\"}", machineId)))
                .andExpect(status().isCreated());

        // Telemetry 3: timestamp 12:00 (temp 70.0) inserted THIRD (higher ID than Telemetry 2, but earlier timestamp than 16:00!)
        mockMvc.perform(post("/api/telemetry").contentType(MediaType.APPLICATION_JSON)
                .content(String.format("{\"machineId\":%d,\"temperature\":70.0,\"vibration\":1.0,\"pressure\":10.0,\"rpm\":1000.0,\"timestamp\":\"2026-10-10T12:00:00\"}", machineId)))
                .andExpect(status().isCreated());

        // 1. Single machine health check must return latest timestamp 16:00 and temp 99.0
        mockMvc.perform(get("/api/machines/" + machineId + "/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.latestTelemetryTimestamp").value("2026-10-10T16:00:00"))
                .andExpect(jsonPath("$.temperature").value(99.0));

        // 2. Bulk health check must also return latest timestamp 16:00 and temp 99.0 for this machine
        mockMvc.perform(get("/api/machines/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[?(@.machineId == " + machineId + ")].temperature").value(99.0));
    }
}
