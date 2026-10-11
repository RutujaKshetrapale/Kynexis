package com.example.demo.integration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.entity.Alert;
import com.example.demo.entity.Machine;
import com.example.demo.entity.Role;
import com.example.demo.entity.User;
import com.example.demo.repository.AlertRepository;
import com.example.demo.repository.MachineRepository;
import com.example.demo.repository.MaintenanceRepository;
import com.example.demo.repository.TelemetryRepository;
import com.example.demo.security.JwtService;
import com.example.demo.service.WebSocketEventPublisherService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class PredictiveMaintenanceIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private MachineRepository machineRepository;

    @Autowired
    private TelemetryRepository telemetryRepository;

    @Autowired
    private AlertRepository alertRepository;

    @Autowired
    private MaintenanceRepository maintenanceRepository;

    @MockitoSpyBean
    private WebSocketEventPublisherService webSocketEventPublisherService;

    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    private long createPlantAndMachine(String plantName, String machineName) throws Exception {
        String plantJson = String.format("""
                {
                    "name": "%s",
                    "location": "Pune",
                    "active": true
                }
                """, plantName);

        MvcResult plantResult = mockMvc.perform(post("/api/plants")
                .contentType(MediaType.APPLICATION_JSON)
                .content(plantJson))
                .andExpect(status().isCreated())
                .andReturn();
        long plantId = objectMapper.readTree(plantResult.getResponse().getContentAsString()).get("id").asLong();

        String machineJson = String.format("""
                {
                    "plantId": %d,
                    "name": "%s",
                    "type": "CNC Mill",
                    "status": "RUNNING"
                }
                """, plantId, machineName);

        MvcResult machineResult = mockMvc.perform(post("/api/machines")
                .contentType(MediaType.APPLICATION_JSON)
                .content(machineJson))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(machineResult.getResponse().getContentAsString()).get("id").asLong();
    }

    private void postTelemetry(long machineId, double temp, double vib, double press, double rpm, LocalDateTime time) throws Exception {
        String telemetryJson = String.format("""
                {
                    "machineId": %d,
                    "temperature": %.1f,
                    "vibration": %.1f,
                    "pressure": %.1f,
                    "rpm": %.1f,
                    "timestamp": "%s"
                }
                """, machineId, temp, vib, press, rpm, time.toString());

        mockMvc.perform(post("/api/telemetry")
                .contentType(MediaType.APPLICATION_JSON)
                .content(telemetryJson))
                .andExpect(status().isCreated());
    }

    // =========================================================================
    // Scenario 1: Sufficient, Stable Telemetry -> NORMAL
    // =========================================================================
    @Test
    @DisplayName("Scenario 1: Machine with sufficient, stable telemetry produces NORMAL risk assessment")
    @WithMockUser(roles = {"ENGINEER"})
    void testPredictiveMaintenance_sufficientStableTelemetry_returnsNormal() throws Exception {
        long machineId = createPlantAndMachine("Stable Plant", "Stable Machine Alpha");
        LocalDateTime now = LocalDateTime.now();

        postTelemetry(machineId, 70.0, 1.0, 45.0, 2000.0, now.minusMinutes(30));
        postTelemetry(machineId, 70.2, 1.1, 45.1, 2002.0, now.minusMinutes(20));
        postTelemetry(machineId, 70.1, 1.0, 45.0, 1998.0, now.minusMinutes(10));
        postTelemetry(machineId, 70.0, 1.0, 45.0, 2000.0, now);

        mockMvc.perform(get("/api/machines/" + machineId + "/maintenance-assessment"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.machineId").value(machineId))
                .andExpect(jsonPath("$.riskCategory").value("NORMAL"))
                .andExpect(jsonPath("$.dataSufficiency").value("SUFFICIENT"))
                .andExpect(jsonPath("$.telemetryStale").value(false))
                .andExpect(jsonPath("$.evaluatedReadingsCount").value(4))
                .andExpect(jsonPath("$.totalUnresolvedAlertCount").value(0))
                .andExpect(jsonPath("$.recommendedAction").exists())
                .andExpect(jsonPath("$.advisoryNotice").exists());
    }

    // =========================================================================
    // Scenario 2: Sustained Abnormal Trend -> MAINTENANCE_RECOMMENDED
    // =========================================================================
    @Test
    @DisplayName("Scenario 2: Sustained thermal and vibration rise produces MAINTENANCE_RECOMMENDED")
    @WithMockUser(roles = {"ENGINEER"})
    void testPredictiveMaintenance_sustainedThermalAndVibrationTrend_returnsMaintenanceRecommended() throws Exception {
        long machineId = createPlantAndMachine("Thermal Plant", "Degrading Spindle Machine");
        LocalDateTime now = LocalDateTime.now();

        postTelemetry(machineId, 70.0, 1.2, 45.0, 2000.0, now.minusMinutes(30));
        postTelemetry(machineId, 76.5, 2.5, 45.2, 2000.0, now.minusMinutes(20));
        postTelemetry(machineId, 82.0, 3.8, 45.8, 2000.0, now.minusMinutes(10));
        postTelemetry(machineId, 89.0, 5.5, 46.0, 2000.0, now);

        mockMvc.perform(get("/api/machines/" + machineId + "/maintenance-assessment"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.machineId").value(machineId))
                .andExpect(jsonPath("$.riskCategory").value("MAINTENANCE_RECOMMENDED"))
                .andExpect(jsonPath("$.dataSufficiency").value("SUFFICIENT"))
                .andExpect(jsonPath("$.trendFindings[0]").exists());
    }

    // =========================================================================
    // Scenario 3: Insufficient Historical Telemetry (< 3 readings)
    // =========================================================================
    @Test
    @DisplayName("Scenario 3: Machine with fewer than 3 readings produces INSUFFICIENT_DATA")
    @WithMockUser(roles = {"ENGINEER"})
    void testPredictiveMaintenance_insufficientTelemetry_returnsInsufficientData() throws Exception {
        long machineId = createPlantAndMachine("Sparse Plant", "Sparse Telemetry Machine");
        LocalDateTime now = LocalDateTime.now();

        postTelemetry(machineId, 70.0, 1.0, 45.0, 2000.0, now.minusMinutes(10));
        postTelemetry(machineId, 70.5, 1.1, 45.0, 2000.0, now);

        mockMvc.perform(get("/api/machines/" + machineId + "/maintenance-assessment"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.machineId").value(machineId))
                .andExpect(jsonPath("$.riskCategory").value("INSUFFICIENT_DATA"))
                .andExpect(jsonPath("$.dataSufficiency").value("INSUFFICIENT_DATA"))
                .andExpect(jsonPath("$.evaluatedReadingsCount").value(2));
    }

    // =========================================================================
    // Scenario 4: Missing Telemetry (0 readings)
    // =========================================================================
    @Test
    @DisplayName("Scenario 4: Machine with no telemetry produces INSUFFICIENT_DATA and NO_DATA sufficiency")
    @WithMockUser(roles = {"ENGINEER"})
    void testPredictiveMaintenance_missingTelemetry_returnsInsufficientData() throws Exception {
        long machineId = createPlantAndMachine("Empty Plant", "Zero Telemetry Machine");

        mockMvc.perform(get("/api/machines/" + machineId + "/maintenance-assessment"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.machineId").value(machineId))
                .andExpect(jsonPath("$.riskCategory").value("INSUFFICIENT_DATA"))
                .andExpect(jsonPath("$.dataSufficiency").value("NO_DATA"))
                .andExpect(jsonPath("$.latestTelemetryTimestamp").doesNotExist());
    }

    // =========================================================================
    // Scenario 5: Stale Telemetry (> 24 hours)
    // =========================================================================
    @Test
    @DisplayName("Scenario 5: Machine with stale telemetry produces INSUFFICIENT_DATA and STALE_DATA sufficiency")
    @WithMockUser(roles = {"ENGINEER"})
    void testPredictiveMaintenance_staleTelemetry_returnsInsufficientDataAndStaleSufficiency() throws Exception {
        long machineId = createPlantAndMachine("Stale Plant", "Stale Telemetry Machine");
        LocalDateTime old = LocalDateTime.now().minusHours(48);

        postTelemetry(machineId, 70.0, 1.0, 45.0, 2000.0, old.minusMinutes(20));
        postTelemetry(machineId, 70.1, 1.0, 45.0, 2000.0, old.minusMinutes(10));
        postTelemetry(machineId, 70.0, 1.0, 45.0, 2000.0, old);

        mockMvc.perform(get("/api/machines/" + machineId + "/maintenance-assessment"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.machineId").value(machineId))
                .andExpect(jsonPath("$.riskCategory").value("INSUFFICIENT_DATA"))
                .andExpect(jsonPath("$.dataSufficiency").value("STALE_DATA"))
                .andExpect(jsonPath("$.telemetryStale").value(true));
    }

    // =========================================================================
    // Scenario 6: Unresolved High Severity Alert
    // =========================================================================
    @Test
    @DisplayName("Scenario 6: Unresolved high alert with stable telemetry produces WATCH")
    @WithMockUser(roles = {"ENGINEER"})
    void testPredictiveMaintenance_unresolvedHighSeverityAlert_returnsWatch() throws Exception {
        long machineId = createPlantAndMachine("Alert Plant", "High Alert Machine");
        LocalDateTime now = LocalDateTime.now();

        postTelemetry(machineId, 70.0, 1.0, 45.0, 2000.0, now.minusMinutes(20));
        postTelemetry(machineId, 70.0, 1.0, 45.0, 2000.0, now.minusMinutes(10));
        postTelemetry(machineId, 70.0, 1.0, 45.0, 2000.0, now);

        Machine m = machineRepository.findById(machineId).orElseThrow();
        Alert alert = new Alert();
        alert.setMachine(m);
        alert.setType("VIBRATION_WARNING");
        alert.setSeverity("HIGH");
        alert.setMessage("Axis-Z vibration approaching warning limit");
        alert.setResolved(false);
        alert.setCreatedAt(now.minusMinutes(5));
        alertRepository.save(alert);

        mockMvc.perform(get("/api/machines/" + machineId + "/maintenance-assessment"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.machineId").value(machineId))
                .andExpect(jsonPath("$.riskCategory").value("WATCH"))
                .andExpect(jsonPath("$.highAlertCount").value(1))
                .andExpect(jsonPath("$.totalUnresolvedAlertCount").value(1));
    }

    // =========================================================================
    // Scenario 7: Healthy Current Status But Insufficient Trend Data
    // =========================================================================
    @Test
    @DisplayName("Scenario 7: Healthy operational status with only 1 reading produces INSUFFICIENT_DATA, not NORMAL")
    @WithMockUser(roles = {"ENGINEER"})
    void testPredictiveMaintenance_healthyStatusButInsufficientTrendData_returnsInsufficientData() throws Exception {
        long machineId = createPlantAndMachine("Healthy Plant", "Single Reading Healthy Machine");
        LocalDateTime now = LocalDateTime.now();

        postTelemetry(machineId, 65.0, 0.9, 45.0, 2000.0, now);

        mockMvc.perform(get("/api/machines/" + machineId + "/maintenance-assessment"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.machineId").value(machineId))
                .andExpect(jsonPath("$.riskCategory").value("INSUFFICIENT_DATA"))
                .andExpect(jsonPath("$.dataSufficiency").value("INSUFFICIENT_DATA"))
                .andExpect(jsonPath("$.evaluatedReadingsCount").value(1));
    }

    // =========================================================================
    // Scenario 8: Correct Latest-Telemetry Selection by Timestamp
    // =========================================================================
    @Test
    @DisplayName("Scenario 8: Correctly selects latest telemetry by timestamp regardless of insertion order")
    @WithMockUser(roles = {"ENGINEER"})
    void testPredictiveMaintenance_selectsGenuinelyLatestTelemetry_whenInsertedOutOfOrder() throws Exception {
        long machineId = createPlantAndMachine("Order Plant", "OutOfOrder Telemetry Machine");

        // 1. Insert timestamp 10:00 (temp 50.0) first
        postTelemetry(machineId, 50.0, 1.0, 10.0, 1000.0, LocalDateTime.of(2026, 10, 11, 10, 0));

        // 2. Insert timestamp 16:00 (temp 95.0) second (GENUINELY LATEST TIMESTAMP)
        postTelemetry(machineId, 95.0, 1.0, 10.0, 1000.0, LocalDateTime.of(2026, 10, 11, 16, 0));

        // 3. Insert timestamp 12:00 (temp 70.0) third (highest ID, but earlier timestamp than 16:00!)
        postTelemetry(machineId, 70.0, 1.0, 10.0, 1000.0, LocalDateTime.of(2026, 10, 11, 12, 0));

        mockMvc.perform(get("/api/machines/" + machineId + "/maintenance-assessment"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.latestTelemetryTimestamp").value("2026-10-11T16:00:00"));
    }

    // =========================================================================
    // Scenario 9: Unknown Machine ID Returns 404
    // =========================================================================
    @Test
    @DisplayName("Scenario 9: Unknown machine ID returns 404 Not Found")
    @WithMockUser(roles = {"ENGINEER"})
    void testPredictiveMaintenance_unknownMachineId_returns404() throws Exception {
        mockMvc.perform(get("/api/machines/999999/maintenance-assessment"))
                .andExpect(status().isNotFound());
    }

    // =========================================================================
    // Scenario 10: Pagination and Filtering
    // =========================================================================
    @Test
    @DisplayName("Scenario 10: Bulk assessments support pagination and risk category filtering")
    @WithMockUser(roles = {"ENGINEER"})
    void testPredictiveMaintenance_bulkAssessments_withPaginationAndFilter() throws Exception {
        long machineId1 = createPlantAndMachine("Bulk Plant 1", "Bulk Machine 1");
        long machineId2 = createPlantAndMachine("Bulk Plant 2", "Bulk Machine 2");

        LocalDateTime now = LocalDateTime.now();
        // machine 1: stable
        postTelemetry(machineId1, 70.0, 1.0, 45.0, 2000.0, now.minusMinutes(20));
        postTelemetry(machineId1, 70.1, 1.0, 45.0, 2000.0, now.minusMinutes(10));
        postTelemetry(machineId1, 70.0, 1.0, 45.0, 2000.0, now);

        // machine 2: 0 readings -> INSUFFICIENT_DATA

        // 1. Bulk all
        mockMvc.perform(get("/api/machines/maintenance-assessments?page=0&size=10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.totalElements").isNumber());

        // 2. Filter by riskCategory=NORMAL
        mockMvc.perform(get("/api/machines/maintenance-assessments?page=0&size=10&riskCategory=NORMAL"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content[?(@.machineId == " + machineId1 + ")].riskCategory").value("NORMAL"));

        // 3. Validation failure: page cannot be negative
        mockMvc.perform(get("/api/machines/maintenance-assessments?page=-1&size=10"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("BUSINESS_VALIDATION_FAILED"));

        // 4. Validation failure: size out of bounds
        mockMvc.perform(get("/api/machines/maintenance-assessments?page=0&size=0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("BUSINESS_VALIDATION_FAILED"));
    }

    // =========================================================================
    // Scenario 11: Security — Authentication & Authorization
    // =========================================================================
    @Test
    @DisplayName("Scenario 11: Security verifies 401 for unauthenticated, 403 for unauthorized role, and 200 for valid JWT")
    void testPredictiveMaintenance_securityTests() throws Exception {
        // Unauthenticated -> 401
        mockMvc.perform(get("/api/machines/1/maintenance-assessment"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("UNAUTHORIZED"));

        mockMvc.perform(get("/api/machines/maintenance-assessments"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("UNAUTHORIZED"));

        // Valid JWT bearer token -> 200
        User user = new User();
        user.setUsername("jwt_maintenance_engineer");
        user.setRole(Role.ENGINEER);
        String token = jwtService.generateToken(user);

        mockMvc.perform(get("/api/machines/maintenance-assessments")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Scenario 11b: Authenticated user with unauthorized role is rejected with 403 Forbidden")
    @WithMockUser(roles = {"UNAUTHORIZED_USER"})
    void testPredictiveMaintenance_unauthorizedRole_returns403() throws Exception {
        mockMvc.perform(get("/api/machines/1/maintenance-assessment"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("FORBIDDEN"));

        mockMvc.perform(get("/api/machines/maintenance-assessments"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("FORBIDDEN"));
    }

    // =========================================================================
    // Scenario 12: Read-Only Verification (DB Records Preserved)
    // =========================================================================
    @Test
    @DisplayName("Scenario 12: Read-only evaluation preserves existing database records without modifications")
    @WithMockUser(roles = {"ENGINEER"})
    void testPredictiveMaintenance_readOnlyPreservesRecords() throws Exception {
        long machineId = createPlantAndMachine("Preserve Plant", "Preserve Machine");
        LocalDateTime now = LocalDateTime.now();
        postTelemetry(machineId, 70.0, 1.0, 45.0, 2000.0, now.minusMinutes(20));
        postTelemetry(machineId, 70.0, 1.0, 45.0, 2000.0, now);

        long machineCountBefore = machineRepository.count();
        long telemetryCountBefore = telemetryRepository.count();
        long alertCountBefore = alertRepository.count();
        long maintenanceCountBefore = maintenanceRepository.count();

        mockMvc.perform(get("/api/machines/" + machineId + "/maintenance-assessment"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/machines/maintenance-assessments"))
                .andExpect(status().isOk());

        assertEquals(machineCountBefore, machineRepository.count());
        assertEquals(telemetryCountBefore, telemetryRepository.count());
        assertEquals(alertCountBefore, alertRepository.count());
        assertEquals(maintenanceCountBefore, maintenanceRepository.count());
    }

    // =========================================================================
    // Scenario 13: No Duplicate or Misleading WebSocket Events
    // =========================================================================
    @Test
    @DisplayName("Scenario 13: Assessments do not emit duplicate or misleading WebSocket events on reads")
    @WithMockUser(roles = {"ENGINEER"})
    void testPredictiveMaintenance_noWebSocketEventsOnRead() throws Exception {
        long machineId = createPlantAndMachine("WS Plant", "WS Test Machine");
        LocalDateTime now = LocalDateTime.now();
        postTelemetry(machineId, 70.0, 1.0, 45.0, 2000.0, now.minusMinutes(20));
        postTelemetry(machineId, 70.0, 1.0, 45.0, 2000.0, now);

        // Reset spy invocation counts from earlier setup operations
        org.mockito.Mockito.clearInvocations(webSocketEventPublisherService);

        // Perform single assessment read
        mockMvc.perform(get("/api/machines/" + machineId + "/maintenance-assessment"))
                .andExpect(status().isOk());

        // Perform bulk assessment read
        mockMvc.perform(get("/api/machines/maintenance-assessments"))
                .andExpect(status().isOk());

        // Verify WebSocketEventPublisherService was NOT invoked during GET assessments
        verify(webSocketEventPublisherService, never()).publishMachineStatus(any());
        verify(webSocketEventPublisherService, never()).publishTelemetry(any());
        verify(webSocketEventPublisherService, never()).publishAlert(any());
        verify(webSocketEventPublisherService, never()).publishMaintenance(any());
    }
}
