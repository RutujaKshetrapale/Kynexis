package com.example.demo.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

import java.time.Duration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.cache.interceptor.CacheErrorHandler;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.RedisSerializer;

class RedisCacheConfigurationTest {

    @Test
    @DisplayName("Should configure RedisCacheManager with expected TTL, null-handling, serializers and prefix")
    void shouldConfigureRedisCacheManagerWithExpectedSettings() {
        CacheConfig config = new CacheConfig();
        RedisConnectionFactory mockConnectionFactory = mock(RedisConnectionFactory.class);

        KynexisCacheProperties properties = new KynexisCacheProperties();
        properties.setEnabled(true);
        properties.setEnvironment("test");
        properties.setPrefix("kynexis");
        properties.setDefaultTtlSeconds(15);
        properties.setDashboardSummaryTtlSeconds(15);
        properties.setDashboardMachineStatusTtlSeconds(15);

        RedisCacheManager manager = config.cacheManager(mockConnectionFactory, properties);
        assertNotNull(manager);
        assertTrue(manager.isTransactionAware(), "CacheManager must be transaction aware to defer eviction until commit");

        // Verify custom error handler
        CacheErrorHandler errorHandler = config.errorHandler();
        assertNotNull(errorHandler);
        assertTrue(errorHandler instanceof KynexisCacheErrorHandler);

        // Verify cache configurations for explicit cache names
        var configurations = config.buildInitialConfigurations(properties);
        assertTrue(configurations.containsKey(CacheConfig.CACHE_DASHBOARD_SUMMARY));
        assertTrue(configurations.containsKey(CacheConfig.CACHE_DASHBOARD_MACHINE_STATUS));

        RedisCacheConfiguration summaryConfig = configurations.get(CacheConfig.CACHE_DASHBOARD_SUMMARY);
        assertFalse(summaryConfig.getAllowCacheNullValues(), "Null values must be disabled");
        assertEquals(Duration.ofSeconds(15), summaryConfig.getTtlFunction().getTimeToLive(null, null));
        assertEquals("kynexis:test:dashboard-summary::", summaryConfig.getKeyPrefixFor(CacheConfig.CACHE_DASHBOARD_SUMMARY));

        RedisCacheConfiguration machineStatusConfig = configurations.get(CacheConfig.CACHE_DASHBOARD_MACHINE_STATUS);
        assertFalse(machineStatusConfig.getAllowCacheNullValues(), "Null values must be disabled");
        assertEquals(Duration.ofSeconds(15), machineStatusConfig.getTtlFunction().getTimeToLive(null, null));
        assertEquals("kynexis:test:dashboard-machine-status::", machineStatusConfig.getKeyPrefixFor(CacheConfig.CACHE_DASHBOARD_MACHINE_STATUS));
    }

    @Test
    @DisplayName("Should verify KynexisCacheProperties defaults")
    void shouldVerifyPropertiesDefaults() {
        KynexisCacheProperties props = new KynexisCacheProperties();
        assertTrue(props.isEnabled());
        assertEquals("kynexis", props.getPrefix());
        assertEquals("dev", props.getEnvironment());
        assertEquals(15, props.getDefaultTtlSeconds());
        assertEquals(15, props.getDashboardSummaryTtlSeconds());
        assertEquals(15, props.getDashboardMachineStatusTtlSeconds());
    }
}
