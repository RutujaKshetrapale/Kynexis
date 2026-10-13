package com.example.demo.config;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.cache.annotation.CachingConfigurer;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.interceptor.CacheErrorHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.CacheKeyPrefix;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.RedisSerializer;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Configuration
@EnableCaching
@EnableConfigurationProperties(KynexisCacheProperties.class)
public class CacheConfig implements CachingConfigurer {

    public static final String CACHE_DASHBOARD_SUMMARY = "dashboard-summary";
    public static final String CACHE_DASHBOARD_MACHINE_STATUS = "dashboard-machine-status";

    @Bean
    @ConditionalOnProperty(name = "spring.cache.type", havingValue = "redis", matchIfMissing = true)
    public RedisCacheManager cacheManager(
            RedisConnectionFactory connectionFactory,
            KynexisCacheProperties properties) {

        log.info("Configuring RedisCacheManager with prefix='{}:{}' defaultTtl={}s",
                properties.getPrefix(), properties.getEnvironment(), properties.getDefaultTtlSeconds());

        RedisCacheConfiguration baseConfig = buildBaseCacheConfiguration(properties);
        Map<String, RedisCacheConfiguration> initialConfigs = buildInitialConfigurations(properties);

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(baseConfig)
                .withInitialCacheConfigurations(initialConfigs)
                .transactionAware()
                .build();
    }

    public RedisCacheConfiguration buildBaseCacheConfiguration(KynexisCacheProperties properties) {
        CacheKeyPrefix keyPrefix = cacheName ->
                properties.getPrefix() + ":" + properties.getEnvironment() + ":" + cacheName + "::";

        return RedisCacheConfiguration.defaultCacheConfig()
                .computePrefixWith(keyPrefix)
                .entryTtl(Duration.ofSeconds(properties.getDefaultTtlSeconds()))
                .disableCachingNullValues()
                .serializeKeysWith(RedisSerializationContext.SerializationPair.fromSerializer(RedisSerializer.string()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(RedisSerializer.json()));
    }

    public Map<String, RedisCacheConfiguration> buildInitialConfigurations(KynexisCacheProperties properties) {
        RedisCacheConfiguration baseConfig = buildBaseCacheConfiguration(properties);
        Map<String, RedisCacheConfiguration> initialConfigs = new HashMap<>();
        initialConfigs.put(
                CACHE_DASHBOARD_SUMMARY,
                baseConfig.entryTtl(Duration.ofSeconds(properties.getDashboardSummaryTtlSeconds()))
        );
        initialConfigs.put(
                CACHE_DASHBOARD_MACHINE_STATUS,
                baseConfig.entryTtl(Duration.ofSeconds(properties.getDashboardMachineStatusTtlSeconds()))
        );
        return initialConfigs;
    }

    @Bean
    @Override
    public CacheErrorHandler errorHandler() {
        return new KynexisCacheErrorHandler();
    }
}
