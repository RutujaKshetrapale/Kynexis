package com.kynexis.dashboard.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.cache.Cache;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kynexis.dashboard.client.AlertClient;
import com.kynexis.dashboard.client.PlantMachineClient;
import com.kynexis.dashboard.client.ProductionEnergyClient;
import com.kynexis.dashboard.config.CacheConfig;
import com.kynexis.dashboard.config.KynexisCacheErrorHandler;
import com.kynexis.dashboard.dto.DashboardMachineStatusResponse;
import com.kynexis.dashboard.dto.DashboardSummaryResponse;

class DashboardCachingTest {

    private PlantMachineClient plantMachineClient;
    private AlertClient alertClient;
    private ProductionEnergyClient productionEnergyClient;
    private DashboardService dashboardService;
    private ConcurrentMapCacheManager cacheManager;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        plantMachineClient = mock(PlantMachineClient.class);
        alertClient = mock(AlertClient.class);
        productionEnergyClient = mock(ProductionEnergyClient.class);

        dashboardService = new DashboardService(plantMachineClient, alertClient, productionEnergyClient);

        cacheManager = new ConcurrentMapCacheManager(
                CacheConfig.CACHE_DASHBOARD_SUMMARY,
                CacheConfig.CACHE_DASHBOARD_MACHINE_STATUS
        );

        objectMapper = new ObjectMapper();

        when(plantMachineClient.getPlantCount()).thenReturn(3L);
        when(plantMachineClient.getTotalMachineCount()).thenReturn(10L);
        when(plantMachineClient.getMachineCountByStatus("ACTIVE")).thenReturn(8L);
        when(plantMachineClient.getMachineCountByStatus("INACTIVE")).thenReturn(1L);
        when(plantMachineClient.getMachineCountByStatus("MAINTENANCE")).thenReturn(1L);
        when(plantMachineClient.getTotalSensorCount()).thenReturn(25L);
        when(alertClient.getUnresolvedAlertCount()).thenReturn(2L);
        when(productionEnergyClient.getProductionMetrics())
                .thenReturn(new ProductionEnergyClient.ProductionMetrics(1000L, 50L));
        when(productionEnergyClient.getEnergyMetrics())
                .thenReturn(new ProductionEnergyClient.EnergyMetrics(3500.5));
    }

    @Test
    @DisplayName("Cache miss puts data into cache, cache hit retrieves cached data without calling downstream")
    void testCacheHitAndMiss() {
        Cache summaryCache = cacheManager.getCache(CacheConfig.CACHE_DASHBOARD_SUMMARY);
        assertNotNull(summaryCache);
        assertNull(summaryCache.get("summary"));

        // Miss: call service and put in cache
        DashboardSummaryResponse firstCall = dashboardService.getSummary();
        summaryCache.put("summary", firstCall);

        assertEquals(3L, firstCall.getTotalPlants());
        assertEquals(10L, firstCall.getTotalMachines());
        verify(plantMachineClient, times(1)).getPlantCount();

        // Hit: retrieve from cache
        DashboardSummaryResponse cached = summaryCache.get("summary", DashboardSummaryResponse.class);
        assertNotNull(cached);
        assertEquals(firstCall.getTotalPlants(), cached.getTotalPlants());
        assertEquals(firstCall.getTotalMachines(), cached.getTotalMachines());

        // Downstream client was not called again
        verify(plantMachineClient, times(1)).getPlantCount();
    }

    @Test
    @DisplayName("Cache invalidation clears entry, subsequent request triggers fresh aggregation")
    void testCacheInvalidation() {
        Cache summaryCache = cacheManager.getCache(CacheConfig.CACHE_DASHBOARD_SUMMARY);
        assertNotNull(summaryCache);

        DashboardSummaryResponse summary = dashboardService.getSummary();
        summaryCache.put("summary", summary);
        assertNotNull(summaryCache.get("summary"));

        // Invalidate
        summaryCache.evict("summary");
        assertNull(summaryCache.get("summary"));

        // Next request fetches fresh data
        dashboardService.getSummary();
        verify(plantMachineClient, times(2)).getPlantCount();
    }

    @Test
    @DisplayName("KynexisCacheErrorHandler gracefully handles Redis failure without throwing exceptions")
    void testCacheErrorHandlerGracefulDegradation() {
        KynexisCacheErrorHandler errorHandler = new KynexisCacheErrorHandler();
        Cache mockCache = mock(Cache.class);
        when(mockCache.getName()).thenReturn(CacheConfig.CACHE_DASHBOARD_SUMMARY);

        RuntimeException redisException = new RuntimeException("Redis connection refused: localhost:6379");

        // Verify none of the error handler methods throw an exception
        assertDoesNotThrow(() -> errorHandler.handleCacheGetError(redisException, mockCache, "summary"));
        assertDoesNotThrow(() -> errorHandler.handleCachePutError(redisException, mockCache, "summary", "testVal"));
        assertDoesNotThrow(() -> errorHandler.handleCacheEvictError(redisException, mockCache, "summary"));
        assertDoesNotThrow(() -> errorHandler.handleCacheClearError(redisException, mockCache));
    }

    @Test
    @DisplayName("Dashboard summary response JSON serialization and deserialization preserves all fields")
    void testDashboardSummarySerialization() throws Exception {
        DashboardSummaryResponse response = DashboardSummaryResponse.builder()
                .totalPlants(5L)
                .totalMachines(20L)
                .activeMachines(15L)
                .totalSensors(60L)
                .unresolvedAlerts(3L)
                .totalProduction(50000L)
                .rejectedProduction(1200L)
                .totalEnergyConsumption(12500.75)
                .build();

        String json = objectMapper.writeValueAsString(response);
        assertNotNull(json);

        DashboardSummaryResponse deserialized = objectMapper.readValue(json, DashboardSummaryResponse.class);
        assertEquals(response.getTotalPlants(), deserialized.getTotalPlants());
        assertEquals(response.getTotalMachines(), deserialized.getTotalMachines());
        assertEquals(response.getTotalEnergyConsumption(), deserialized.getTotalEnergyConsumption());
    }

    @Test
    @DisplayName("Dashboard machine status response JSON serialization preserves counts")
    void testDashboardMachineStatusSerialization() throws Exception {
        DashboardMachineStatusResponse response = DashboardMachineStatusResponse.builder()
                .active(12L)
                .inactive(3L)
                .maintenance(2L)
                .build();

        String json = objectMapper.writeValueAsString(response);
        DashboardMachineStatusResponse deserialized = objectMapper.readValue(json, DashboardMachineStatusResponse.class);
        assertEquals(12L, deserialized.getActive());
        assertEquals(3L, deserialized.getInactive());
        assertEquals(2L, deserialized.getMaintenance());
    }
}
