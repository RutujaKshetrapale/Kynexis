package com.example.demo.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Map;

import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringSerializer;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;
import org.springframework.kafka.support.serializer.JsonSerializer;

import com.fasterxml.jackson.databind.ObjectMapper;

class KafkaProducerConfigurationTest {

    @Test
    @DisplayName("Verify KynexisKafkaProperties default settings and overrides")
    void testKafkaPropertiesDefaultsAndOverrides() {
        KynexisKafkaProperties props = new KynexisKafkaProperties();

        assertTrue(props.isEnabled());
        assertEquals("localhost:9092", props.getBootstrapServers());
        assertEquals("all", props.getAcks());
        assertEquals(3, props.getRetries());
        assertEquals(120000, props.getDeliveryTimeoutMs());
        assertEquals(30000, props.getRequestTimeoutMs());
        assertEquals(1000, props.getRetryBackoffMs());
        assertTrue(props.isEnableIdempotence());
        assertEquals("kynexis.machine-telemetry", props.getTopics().getMachineTelemetry());
        assertEquals("kynexis.machine-alerts", props.getTopics().getMachineAlerts());

        // Test custom overrides
        props.setEnabled(false);
        props.setBootstrapServers("kafka-broker.prod:9092");
        props.setAcks("-1");
        props.setRetries(5);
        props.setDeliveryTimeoutMs(60000);
        props.setRequestTimeoutMs(15000);
        props.setRetryBackoffMs(500);
        props.setEnableIdempotence(false);
        props.getTopics().setMachineTelemetry("custom.telemetry");
        props.getTopics().setMachineAlerts("custom.alerts");

        assertEquals("kafka-broker.prod:9092", props.getBootstrapServers());
        assertEquals("-1", props.getAcks());
        assertEquals(5, props.getRetries());
        assertEquals(60000, props.getDeliveryTimeoutMs());
        assertEquals(15000, props.getRequestTimeoutMs());
        assertEquals(500, props.getRetryBackoffMs());
        assertEquals("custom.telemetry", props.getTopics().getMachineTelemetry());
        assertEquals("custom.alerts", props.getTopics().getMachineAlerts());
    }

    @Test
    @DisplayName("Verify KafkaProducerConfig constructs ProducerFactory with required producer properties")
    @SuppressWarnings({"deprecation", "removal"})
    void testKafkaProducerConfigFactory() {
        KynexisKafkaProperties props = new KynexisKafkaProperties();
        props.setBootstrapServers("localhost:9092");
        props.setAcks("all");
        props.setRetries(3);
        props.setDeliveryTimeoutMs(120000);
        props.setRequestTimeoutMs(30000);
        props.setRetryBackoffMs(1000);
        props.setEnableIdempotence(true);

        KafkaProducerConfig config = new KafkaProducerConfig(props);
        ObjectMapper mapper = new ObjectMapper();

        ProducerFactory<String, Object> factory = config.producerFactory(mapper);
        assertNotNull(factory);
        assertTrue(factory instanceof DefaultKafkaProducerFactory);

        Map<String, Object> configurationProperties = factory.getConfigurationProperties();
        assertEquals("localhost:9092", configurationProperties.get(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG));
        assertEquals("all", configurationProperties.get(ProducerConfig.ACKS_CONFIG));
        assertEquals(3, configurationProperties.get(ProducerConfig.RETRIES_CONFIG));
        assertEquals(120000, configurationProperties.get(ProducerConfig.DELIVERY_TIMEOUT_MS_CONFIG));
        assertEquals(30000, configurationProperties.get(ProducerConfig.REQUEST_TIMEOUT_MS_CONFIG));
        assertEquals(1000, configurationProperties.get(ProducerConfig.RETRY_BACKOFF_MS_CONFIG));
        assertEquals(true, configurationProperties.get(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG));
        assertEquals(StringSerializer.class, configurationProperties.get(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG));
        assertEquals(JsonSerializer.class, configurationProperties.get(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG));

        KafkaTemplate<String, Object> template = config.kafkaTemplate(factory);
        assertNotNull(template);
        assertEquals(factory, template.getProducerFactory());
    }
}
