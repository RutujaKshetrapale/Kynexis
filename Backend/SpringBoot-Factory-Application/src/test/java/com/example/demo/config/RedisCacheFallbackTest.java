package com.example.demo.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.RedisConnectionFailureException;

import com.example.demo.dto.DashboardSummaryResponse;

class RedisCacheFallbackTest {

    static class SampleService {
        private int invocationCount = 0;

        @Cacheable(value = "test-summary", key = "'summary'")
        public DashboardSummaryResponse getSummary() {
            invocationCount++;
            return new DashboardSummaryResponse(1L, 2L, 2L, 4L, 0L, 500L, 10L, 250.0);
        }

        public int getInvocationCount() {
            return invocationCount;
        }
    }

    @Configuration
    @EnableCaching
    static class TestFallbackConfig extends CacheConfig {

        @Bean
        public SampleService sampleService() {
            return new SampleService();
        }

        @Bean
        public CacheManager cacheManager() {
            CacheManager mockManager = mock(CacheManager.class);
            Cache mockCache = mock(Cache.class);

            when(mockManager.getCache("test-summary")).thenReturn(mockCache);
            when(mockCache.getName()).thenReturn("test-summary");

            // Simulate Redis being unavailable
            when(mockCache.get("summary")).thenThrow(
                    new RedisConnectionFailureException("Unable to connect to Redis on localhost:6379")
            );

            return mockManager;
        }
    }

    @Test
    @DisplayName("Redis unavailability does not fail API; falls back to underlying service and returns real data")
    void shouldFallbackGracefullyWhenRedisIsUnavailable() {
        try (AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext(TestFallbackConfig.class)) {
            SampleService service = context.getBean(SampleService.class);

            // Even though cache throws RedisConnectionFailureException, call should succeed via error handler fallback
            DashboardSummaryResponse response = service.getSummary();
            assertNotNull(response);
            assertEquals(1L, response.getTotalPlants());
            assertEquals(2L, response.getTotalMachines());
            assertEquals(500L, response.getTotalProduction());
            assertEquals(1, service.getInvocationCount());

            // Second call still falls through to service because cache GET fails
            DashboardSummaryResponse secondResponse = service.getSummary();
            assertNotNull(secondResponse);
            assertEquals(2, service.getInvocationCount());
        }
    }
}
