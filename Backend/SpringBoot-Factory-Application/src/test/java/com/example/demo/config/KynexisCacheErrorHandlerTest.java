package com.example.demo.config;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.cache.Cache;
import org.springframework.data.redis.RedisConnectionFailureException;

class KynexisCacheErrorHandlerTest {

    private final KynexisCacheErrorHandler errorHandler = new KynexisCacheErrorHandler();

    @Test
    @DisplayName("Should handle cache GET error without throwing, allowing database fallback")
    void shouldHandleCacheGetErrorGracefully() {
        Cache mockCache = mock(Cache.class);
        RedisConnectionFailureException exception = new RedisConnectionFailureException("Connection refused: /127.0.0.1:6379");

        assertDoesNotThrow(() ->
                errorHandler.handleCacheGetError(exception, mockCache, "summary")
        );
    }

    @Test
    @DisplayName("Should handle cache PUT error without throwing, allowing request to complete")
    void shouldHandleCachePutErrorGracefully() {
        Cache mockCache = mock(Cache.class);
        RedisConnectionFailureException exception = new RedisConnectionFailureException("Unable to connect to Redis");

        assertDoesNotThrow(() ->
                errorHandler.handleCachePutError(exception, mockCache, "summary", "test-value")
        );
    }

    @Test
    @DisplayName("Should handle cache EVICT error without throwing")
    void shouldHandleCacheEvictErrorGracefully() {
        Cache mockCache = mock(Cache.class);
        RuntimeException exception = new RuntimeException("Redis timeout");

        assertDoesNotThrow(() ->
                errorHandler.handleCacheEvictError(exception, mockCache, "summary")
        );
    }

    @Test
    @DisplayName("Should handle cache CLEAR error without throwing")
    void shouldHandleCacheClearErrorGracefully() {
        Cache mockCache = mock(Cache.class);
        RuntimeException exception = new RuntimeException("Redis down");

        assertDoesNotThrow(() ->
                errorHandler.handleCacheClearError(exception, mockCache)
        );
    }
}
