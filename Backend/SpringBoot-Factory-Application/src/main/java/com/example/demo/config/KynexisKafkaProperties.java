package com.example.demo.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import lombok.Data;

@Data
@ConfigurationProperties(prefix = "kynexis.kafka")
public class KynexisKafkaProperties {

    /**
     * Master switch for Kafka event streaming.
     */
    private boolean enabled = true;

    /**
     * Kafka bootstrap servers (comma-separated host:port).
     */
    private String bootstrapServers = "localhost:9092";

    /**
     * Producer acknowledgements ('all', '-1', '1', '0').
     */
    private String acks = "all";

    /**
     * Number of producer retries on transient errors.
     */
    private int retries = 3;

    /**
     * Overall delivery timeout in milliseconds for batch sending.
     */
    private int deliveryTimeoutMs = 120000;

    /**
     * Request timeout in milliseconds for broker response.
     */
    private int requestTimeoutMs = 30000;

    /**
     * Backoff duration in milliseconds between retries.
     */
    private int retryBackoffMs = 1000;

    /**
     * Enable idempotent producer to prevent duplicate records on retry.
     */
    private boolean enableIdempotence = true;

    /**
     * Configurable topic destinations.
     */
    private Topics topics = new Topics();

    @Data
    public static class Topics {
        /**
         * Kafka topic for machine telemetry events.
         */
        private String machineTelemetry = "kynexis.machine-telemetry";

        /**
         * Kafka topic for machine alert lifecycle events.
         */
        private String machineAlerts = "kynexis.machine-alerts";
    }
}
