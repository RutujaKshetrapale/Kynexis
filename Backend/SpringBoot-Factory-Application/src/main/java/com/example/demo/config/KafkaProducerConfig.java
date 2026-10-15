package com.example.demo.config;

import java.util.HashMap;
import java.util.Map;

import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;
import org.springframework.kafka.support.serializer.JsonSerializer;

import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Configuration
@EnableConfigurationProperties(KynexisKafkaProperties.class)
@SuppressWarnings({"deprecation", "removal"})
public class KafkaProducerConfig {

    private final KynexisKafkaProperties properties;

    public KafkaProducerConfig(KynexisKafkaProperties properties) {
        this.properties = properties;
    }

    @Bean
    public ProducerFactory<String, Object> producerFactory(
            @org.springframework.beans.factory.annotation.Autowired(required = false) ObjectMapper objectMapper) {
        Map<String, Object> configProps = new HashMap<>();

        configProps.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, properties.getBootstrapServers());
        configProps.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        configProps.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class);
        configProps.put(ProducerConfig.ACKS_CONFIG, properties.getAcks());
        configProps.put(ProducerConfig.RETRIES_CONFIG, properties.getRetries());
        configProps.put(ProducerConfig.DELIVERY_TIMEOUT_MS_CONFIG, properties.getDeliveryTimeoutMs());
        configProps.put(ProducerConfig.REQUEST_TIMEOUT_MS_CONFIG, properties.getRequestTimeoutMs());
        configProps.put(ProducerConfig.RETRY_BACKOFF_MS_CONFIG, properties.getRetryBackoffMs());
        configProps.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, properties.isEnableIdempotence());

        log.info("Configuring Kafka ProducerFactory: bootstrapServers='{}' acks='{}' retries={} idempotence={}",
                properties.getBootstrapServers(), properties.getAcks(), properties.getRetries(), properties.isEnableIdempotence());

        DefaultKafkaProducerFactory<String, Object> factory = new DefaultKafkaProducerFactory<>(configProps);
        ObjectMapper mapper = objectMapper != null
                ? objectMapper
                : new ObjectMapper().registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());
        JsonSerializer<Object> jsonSerializer = new JsonSerializer<>(mapper);
        factory.setValueSerializer(jsonSerializer);

        return factory;
    }

    @Bean
    public KafkaTemplate<String, Object> kafkaTemplate(ProducerFactory<String, Object> producerFactory) {
        return new KafkaTemplate<>(producerFactory);
    }
}
