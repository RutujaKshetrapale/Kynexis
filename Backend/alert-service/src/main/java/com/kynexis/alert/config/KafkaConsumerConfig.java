package com.kynexis.alert.config;

import org.apache.kafka.common.TopicPartition;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.listener.CommonErrorHandler;
import org.springframework.kafka.listener.DeadLetterPublishingRecoverer;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.FixedBackOff;

import lombok.extern.slf4j.Slf4j;

/**
 * Configures Kafka consumer error handling with bounded retries
 * and dead-letter queue routing to prevent message loss and poisoning.
 */
@Slf4j
@Configuration
public class KafkaConsumerConfig {

    @Bean
    public CommonErrorHandler kafkaErrorHandler(@Autowired(required = false) KafkaTemplate<String, Object> kafkaTemplate) {
        if (kafkaTemplate != null) {
            DeadLetterPublishingRecoverer recoverer = new DeadLetterPublishingRecoverer(
                    kafkaTemplate,
                    (record, ex) -> {
                        String dlqTopic = record.topic() + ".DLT";
                        log.warn("Exhausted retries for topic={} partition={} offset={}. Routing to DLQ topic={}",
                                record.topic(), record.partition(), record.offset(), dlqTopic);
                        return new TopicPartition(dlqTopic, record.partition());
                    });

            // Retry 2 times with 1 second backoff (3 attempts total)
            FixedBackOff backOff = new FixedBackOff(1000L, 2L);
            DefaultErrorHandler errorHandler = new DefaultErrorHandler(recoverer, backOff);
            log.info("Kafka consumer error handler initialized with DeadLetterPublishingRecoverer and 3-attempt backoff");
            return errorHandler;
        } else {
            // Local test fallback when KafkaTemplate is not present
            DefaultErrorHandler errorHandler = new DefaultErrorHandler(new FixedBackOff(500L, 1L));
            return errorHandler;
        }
    }
}
