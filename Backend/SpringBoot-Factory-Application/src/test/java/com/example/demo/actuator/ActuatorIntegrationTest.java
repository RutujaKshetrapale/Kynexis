package com.example.demo.actuator;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.entity.Role;
import com.example.demo.entity.User;
import com.example.demo.security.JwtService;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ActuatorIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    private String validJwtToken;

    @BeforeEach
    void setUp() {
        User adminUser = new User();
        adminUser.setUsername("admin_actuator");
        adminUser.setEmail("admin_actuator@example.com");
        adminUser.setRole(Role.ADMIN);
        adminUser.setActive(true);

        validJwtToken = jwtService.generateToken(adminUser);
    }

    @Test
    @DisplayName("GET /actuator/health returns 200 OK and status UP")
    void testHealthEndpointPublicAccess() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    @DisplayName("GET /actuator/info returns 200 OK and application metadata")
    void testInfoEndpointPublicAccess() throws Exception {
        mockMvc.perform(get("/actuator/info"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.app.name").value("KYNEXIS"))
                .andExpect(jsonPath("$.app.description").value("Connected Industrial Intelligence"));
    }

    @Test
    @DisplayName("GET /actuator/metrics without authentication returns 401 Unauthorized")
    void testMetricsEndpointUnauthenticatedReturns401() throws Exception {
        mockMvc.perform(get("/actuator/metrics"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /actuator/metrics with valid JWT returns 200 OK and metric names")
    void testMetricsEndpointAuthenticatedReturns200() throws Exception {
        mockMvc.perform(get("/actuator/metrics")
                        .header("Authorization", "Bearer " + validJwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.names").exists());
    }

    @Test
    @DisplayName("GET /actuator/metrics/jvm.memory.used with valid JWT returns 200 OK")
    void testSpecificMetricAuthenticatedReturns200() throws Exception {
        mockMvc.perform(get("/actuator/metrics/jvm.memory.used")
                        .header("Authorization", "Bearer " + validJwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("jvm.memory.used"));
    }

    @Test
    @DisplayName("GET /actuator/env is unexposed and returns 401 when unauthenticated")
    void testUnexposedEndpointReturnsUnauthorized() throws Exception {
        mockMvc.perform(get("/actuator/env"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Security regression check: Secured business endpoint returns 401 unauthenticated")
    void testSecuredBusinessEndpointReturns401() throws Exception {
        mockMvc.perform(get("/api/machines"))
                .andExpect(status().isUnauthorized());
    }
}
