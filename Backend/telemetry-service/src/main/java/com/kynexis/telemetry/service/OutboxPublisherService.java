package com.kynexis.telemetry.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kynexis.telemetry.common.dto.event.MachineTelemetryRecorded;
import com.kynexis.telemetry.entity.OutboxEvent;
import com.kynexis.telemetry.entity.OutboxStatus;
import com.kynexis.telemetry.repository.OutboxEventRepository;

import lombok.extern.slf4j.Slf4j;

/**
 * Dispatches transactional outbox events to Kafka.
 * Guarantees at-least-once delivery and eliminates dual-write hazards.
 */
@Slf4j
@Service
public class OutboxPublisherService {

    private final OutboxEventRepository outboxEventRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final ObjectMapper objectMapper;

    public OutboxPublisherService(
            OutboxEventRepository outboxEventRepository,
            @Autowired(required = false) KafkaTemplate<String, Object> kafkaTemplate,
            ObjectMapper objectMapper) {
        this.outboxEventRepository = outboxEventRepository;
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
    }

    /**
     * Publishes a single outbox record immediately after transaction commit.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void publishImmediately(Long outboxId) {
        if (outboxId == null) return;
        outboxEventRepository.findById(outboxId).ifPresent(this::publishEvent);
    }

    /**
     * Background poller to catch any outbox records left pending
     * (e.g. JVM crash before afterCommit executed, or temporary broker outage).
     */
    @Scheduled(fixedDelay = 5000)
    public void pollAndPublishPending() {
        if (kafkaTemplate == null) {
            return;
        }
        try {
            List<OutboxEvent> pending = outboxEventRepository.findTop50ByStatusOrderByCreatedAtAsc(OutboxStatus.PENDING);
            if (pending.isEmpty()) return;

            log.debug("Outbox poller found {} pending telemetry events", pending.size());
            for (OutboxEvent event : pending) {
                publishEvent(event);
            }
        } catch (Exception ex) {
            log.warn("Outbox poller could not query pending events: {}", ex.getMessage());
        }
    }

    @Transactional
    public void publishEvent(OutboxEvent outboxEvent) {
        if (outboxEvent.getStatus() == OutboxStatus.PUBLISHED) {
            return;
        }

        if (kafkaTemplate == null) {
            log.debug("KafkaTemplate not configured; skipping dispatch for outboxId={}", outboxEvent.getId());
            return;
        }

        try {
            MachineTelemetryRecorded eventObj = objectMapper.readValue(
                    outboxEvent.getPayload(), MachineTelemetryRecorded.class);

            kafkaTemplate.send(outboxEvent.getTopic(), outboxEvent.getPartitionKey(), eventObj)
                    .whenComplete((result, ex) -> {
                        if (ex != null) {
                            handlePublishFailure(outboxEvent.getId(), ex.getMessage());
                        } else {
                            handlePublishSuccess(outboxEvent.getId());
                        }
                    });

        } catch (Exception ex) {
            log.error("Failed to serialize or send outbox event id={}: {}", outboxEvent.getId(), ex.getMessage(), ex);
            handlePublishFailure(outboxEvent.getId(), ex.getMessage());
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handlePublishSuccess(Long outboxId) {
        outboxEventRepository.findById(outboxId).ifPresent(event -> {
            event.setStatus(OutboxStatus.PUBLISHED);
            event.setPublishedAt(LocalDateTime.now());
            event.setErrorMessage(null);
            outboxEventRepository.save(event);
            log.debug("Outbox event published successfully id={}", outboxId);
        });
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handlePublishFailure(Long outboxId, String error) {
        outboxEventRepository.findById(outboxId).ifPresent(event -> {
            int retries = event.getRetryCount() + 1;
            event.setRetryCount(retries);
            event.setErrorMessage(error);
            if (retries >= 5) {
                event.setStatus(OutboxStatus.FAILED);
                log.error("Outbox event id={} marked FAILED after {} retries: {}", outboxId, retries, error);
            }
            outboxEventRepository.save(event);
        });
    }
}
