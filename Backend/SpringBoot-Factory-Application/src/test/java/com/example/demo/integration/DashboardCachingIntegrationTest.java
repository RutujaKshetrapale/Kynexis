package com.example.demo.integration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.config.CacheConfig;
import com.example.demo.dto.AlertRequest;
import com.example.demo.dto.DashboardMachineStatusResponse;
import com.example.demo.dto.DashboardSummaryResponse;
import com.example.demo.dto.MachineRequest;
import com.example.demo.dto.PlantRequest;
import com.example.demo.entity.Alert;
import com.example.demo.entity.Machine;
import com.example.demo.entity.Plant;
import com.example.demo.service.AlertService;
import com.example.demo.service.DashboardService;
import com.example.demo.service.MachineService;
import com.example.demo.service.PlantService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class DashboardCachingIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private DashboardService dashboardService;

    @Autowired
    private MachineService machineService;

    @Autowired
    private AlertService alertService;

    @Autowired
    private PlantService plantService;

    @Autowired
    private CacheManager cacheManager;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private String jwtToken;

    @BeforeEach
    void setUp() throws Exception {
        // Evict any previous cache state
        Cache summaryCache = cacheManager.getCache(CacheConfig.CACHE_DASHBOARD_SUMMARY);
        if (summaryCache != null) {
            summaryCache.clear();
        }
        Cache statusCache = cacheManager.getCache(CacheConfig.CACHE_DASHBOARD_MACHINE_STATUS);
        if (statusCache != null) {
            statusCache.clear();
        }

        // Obtain JWT for authenticated endpoints
        String uniqueUser = "cache_test_user_" + System.currentTimeMillis();
        String registerJson = String.format("""
                {
                    "username": "%s",
                    "email": "%s@example.com",
                    "password": "SecurePassword123"
                }
                """, uniqueUser, uniqueUser);

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(registerJson))
                .andExpect(status().isCreated());

        String loginJson = String.format("""
                {
                    "username": "%s",
                    "password": "SecurePassword123"
                }
                """, uniqueUser);

        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginJson))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode root = objectMapper.readTree(loginResult.getResponse().getContentAsString());
        jwtToken = root.get("token").asText();
    }

    @Test
    @DisplayName("Dashboard Summary: Repeated requests use cache and return identical result")
    void shouldCacheDashboardSummaryOnRepeatedRequests() {
        Cache summaryCache = cacheManager.getCache(CacheConfig.CACHE_DASHBOARD_SUMMARY);
        assertNotNull(summaryCache);
        assertNull(summaryCache.get("summary"), "Cache should initially be empty");

        DashboardSummaryResponse firstCall = dashboardService.getSummary();
        assertNotNull(firstCall);

        // Verify cache is now populated with the response
        Cache.ValueWrapper cachedWrapper = summaryCache.get("summary");
        assertNotNull(cachedWrapper, "Summary must be cached under key 'summary'");
        DashboardSummaryResponse cachedValue = (DashboardSummaryResponse) cachedWrapper.get();
        assertEquals(firstCall.getTotalMachines(), cachedValue.getTotalMachines());
        assertEquals(firstCall.getActiveMachines(), cachedValue.getActiveMachines());

        // Second call should return the cached response
        DashboardSummaryResponse secondCall = dashboardService.getSummary();
        assertEquals(firstCall.getTotalMachines(), secondCall.getTotalMachines());
        assertEquals(firstCall.getActiveMachines(), secondCall.getActiveMachines());
        assertEquals(firstCall.getTotalPlants(), secondCall.getTotalPlants());
    }

    @Test
    @DisplayName("Dashboard Machine Status: Repeated requests use cache")
    void shouldCacheMachineStatusOnRepeatedRequests() {
        Cache statusCache = cacheManager.getCache(CacheConfig.CACHE_DASHBOARD_MACHINE_STATUS);
        assertNotNull(statusCache);
        assertNull(statusCache.get("machine-status"), "Status cache should initially be empty");

        DashboardMachineStatusResponse firstCall = dashboardService.getMachineStatus();
        assertNotNull(firstCall);

        Cache.ValueWrapper cachedWrapper = statusCache.get("machine-status");
        assertNotNull(cachedWrapper, "Machine status must be cached under key 'machine-status'");

        DashboardMachineStatusResponse secondCall = dashboardService.getMachineStatus();
        assertEquals(firstCall.getActive(), secondCall.getActive());
        assertEquals(firstCall.getInactive(), secondCall.getInactive());
        assertEquals(firstCall.getMaintenance(), secondCall.getMaintenance());
    }

    @Test
    @DisplayName("Cache separation: Dashboard Summary and Machine Status do not collide")
    void shouldKeepSummaryAndMachineStatusCachesSeparated() {
        dashboardService.getSummary();
        dashboardService.getMachineStatus();

        Cache summaryCache = cacheManager.getCache(CacheConfig.CACHE_DASHBOARD_SUMMARY);
        Cache statusCache = cacheManager.getCache(CacheConfig.CACHE_DASHBOARD_MACHINE_STATUS);

        assertNotNull(summaryCache.get("summary"));
        assertNull(summaryCache.get("machine-status"));

        assertNotNull(statusCache.get("machine-status"));
        assertNull(statusCache.get("summary"));
    }

    @Test
    @DisplayName("Invalidation: Creating machine invalidates both summary and machine-status caches")
    void shouldInvalidateCachesOnMachineCreation() {
        dashboardService.getSummary();
        dashboardService.getMachineStatus();

        Cache summaryCache = cacheManager.getCache(CacheConfig.CACHE_DASHBOARD_SUMMARY);
        Cache statusCache = cacheManager.getCache(CacheConfig.CACHE_DASHBOARD_MACHINE_STATUS);
        assertNotNull(summaryCache.get("summary"));
        assertNotNull(statusCache.get("machine-status"));

        // Create a new machine
        PlantRequest plantRequest = new PlantRequest();
        plantRequest.setName("Plant For Machine Eviction " + System.currentTimeMillis());
        plantRequest.setLocation("Mumbai");
        Plant plant = plantService.create(plantRequest);

        MachineRequest machineRequest = new MachineRequest();
        machineRequest.setName("Cache Eviction Machine " + System.currentTimeMillis());
        machineRequest.setType("CNC");
        machineRequest.setStatus("RUNNING");
        machineRequest.setPlantId(plant.getId());

        machineService.create(machineRequest);

        // After create, both caches should be evicted
        assertNull(summaryCache.get("summary"), "Summary cache must be evicted on machine create");
        assertNull(statusCache.get("machine-status"), "Machine status cache must be evicted on machine create");
    }

    @Test
    @DisplayName("Invalidation: Alert creation invalidates summary cache but NOT machine status cache")
    void shouldInvalidateOnlySummaryCacheOnAlertCreation() {
        dashboardService.getSummary();
        dashboardService.getMachineStatus();

        Cache summaryCache = cacheManager.getCache(CacheConfig.CACHE_DASHBOARD_SUMMARY);
        Cache statusCache = cacheManager.getCache(CacheConfig.CACHE_DASHBOARD_MACHINE_STATUS);
        assertNotNull(summaryCache.get("summary"));
        assertNotNull(statusCache.get("machine-status"));

        // Setup a machine for the alert
        PlantRequest plantRequest = new PlantRequest();
        plantRequest.setName("Plant For Alert Eviction " + System.currentTimeMillis());
        plantRequest.setLocation("Pune");
        Plant plant = plantService.create(plantRequest);

        MachineRequest machineRequest = new MachineRequest();
        machineRequest.setName("Alert Eviction Machine " + System.currentTimeMillis());
        machineRequest.setType("Press");
        machineRequest.setStatus("RUNNING");
        machineRequest.setPlantId(plant.getId());
        Machine machine = machineService.create(machineRequest);

        // Populate caches again
        dashboardService.getSummary();
        dashboardService.getMachineStatus();
        assertNotNull(summaryCache.get("summary"));
        assertNotNull(statusCache.get("machine-status"));

        // Create an alert
        AlertRequest alertRequest = new AlertRequest();
        alertRequest.setMachineId(machine.getId());
        alertRequest.setType("TEMPERATURE");
        alertRequest.setMessage("Temperature exceeded limit");
        alertRequest.setSeverity("HIGH");
        alertRequest.setResolved(false);

        Alert alert = alertService.create(alertRequest);

        // Summary cache MUST be evicted, but Machine status cache must NOT be evicted
        assertNull(summaryCache.get("summary"), "Summary cache must be evicted on alert create");
        assertNotNull(statusCache.get("machine-status"), "Machine status cache should NOT be affected by alerts");

        // Now populate summary cache again and update/resolve alert
        dashboardService.getSummary();
        assertNotNull(summaryCache.get("summary"));

        alertRequest.setResolved(true);
        alertService.update(alert.getId(), alertRequest);

        assertNull(summaryCache.get("summary"), "Summary cache must be evicted on alert update/resolve");
    }

    @Test
    @DisplayName("Security & Contract: Protected dashboard endpoints require JWT and preserve contract")
    void shouldEnforceSecurityAndPreserveContract() throws Exception {
        // Without JWT -> 401 Unauthorized
        mockMvc.perform(get("/api/dashboard/summary"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/dashboard/machine-status"))
                .andExpect(status().isUnauthorized());

        // With JWT -> 200 OK and expected structure
        mockMvc.perform(get("/api/dashboard/summary")
                .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalPlants").isNumber())
                .andExpect(jsonPath("$.totalMachines").isNumber())
                .andExpect(jsonPath("$.activeMachines").isNumber())
                .andExpect(jsonPath("$.totalSensors").isNumber())
                .andExpect(jsonPath("$.unresolvedAlerts").isNumber())
                .andExpect(jsonPath("$.totalProduction").isNumber())
                .andExpect(jsonPath("$.rejectedProduction").isNumber())
                .andExpect(jsonPath("$.totalEnergyConsumption").isNumber());

        mockMvc.perform(get("/api/dashboard/machine-status")
                .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").isNumber())
                .andExpect(jsonPath("$.inactive").isNumber())
                .andExpect(jsonPath("$.maintenance").isNumber());
    }
}
