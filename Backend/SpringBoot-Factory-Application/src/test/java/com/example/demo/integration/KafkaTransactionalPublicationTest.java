package com.example.demo.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.example.demo.entity.Machine;
import com.example.demo.entity.Plant;
import com.example.demo.entity.Telemetry;
import com.example.demo.repository.MachineRepository;
import com.example.demo.repository.PlantRepository;
import com.example.demo.repository.TelemetryRepository;
import com.example.demo.service.KafkaEventPublisherService;

@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "kynexis.kafka.enabled=true",
        "spring.cache.type=simple"
})
class KafkaTransactionalPublicationTest {

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Autowired
    private KafkaEventPublisherService kafkaEventPublisherService;

    @Autowired
    private TelemetryRepository telemetryRepository;

    @Autowired
    private MachineRepository machineRepository;

    @Autowired
    private PlantRepository plantRepository;

    @MockitoBean
    private KafkaTemplate<String, Object> kafkaTemplate;

    private Telemetry testTelemetry;

    @BeforeEach
    void setUp() {
        when(kafkaTemplate.send(any(), any(), any()))
                .thenReturn(CompletableFuture.completedFuture(new SendResult<>(null, null)));

        Plant plant = new Plant();
        plant.setName("Tx Plant");
        plant.setLocation("Pune");
        plant.setActive(true);
        plant = plantRepository.save(plant);

        Machine machine = new Machine();
        machine.setName("Tx Machine");
        machine.setType("PRESS");
        machine.setStatus("RUNNING");
        machine.setPlant(plant);
        machine = machineRepository.save(machine);

        Telemetry telemetry = new Telemetry();
        telemetry.setMachine(machine);
        telemetry.setTemperature(77.0);
        telemetry.setVibration(1.0);
        telemetry.setPressure(30.0);
        telemetry.setRpm(2000.0);
        telemetry.setTimestamp(LocalDateTime.now());
        testTelemetry = telemetryRepository.save(telemetry);
    }

    @org.junit.jupiter.api.AfterEach
    void tearDown() {
        telemetryRepository.deleteAll();
        machineRepository.deleteAll();
        plantRepository.deleteAll();
    }

    @Test
    @DisplayName("Kafka publication succeeds after database transaction commits")
    void shouldPublishKafkaEventAfterCommit() {
        TransactionTemplate transactionTemplate = new TransactionTemplate(transactionManager);
        AtomicReference<CompletableFuture<SendResult<String, Object>>> futureRef = new AtomicReference<>();

        transactionTemplate.execute(status -> {
            futureRef.set(kafkaEventPublisherService.publishTelemetryRecorded(testTelemetry));
            // Verify event is NOT yet sent before commit
            verify(kafkaTemplate, never()).send(any(), any(), any());
            return null;
        });

        // After successful commit, verify event IS sent
        verify(kafkaTemplate, times(1)).send(
                eq("kynexis.machine-telemetry"),
                eq(String.valueOf(testTelemetry.getMachine().getId())),
                any()
        );

        CompletableFuture<SendResult<String, Object>> future = futureRef.get();
        assertThat(future).isNotNull();
        assertThat(future.isDone()).isTrue();
        assertThat(future.isCompletedExceptionally()).isFalse();
    }

    @Test
    @DisplayName("Kafka event is NOT published when database transaction rolls back")
    void shouldNotPublishKafkaEventWhenTransactionRollsBack() {
        TransactionTemplate transactionTemplate = new TransactionTemplate(transactionManager);
        AtomicReference<CompletableFuture<SendResult<String, Object>>> futureRef = new AtomicReference<>();

        try {
            transactionTemplate.execute(status -> {
                futureRef.set(kafkaEventPublisherService.publishTelemetryRecorded(testTelemetry));
                throw new RuntimeException("Simulated database failure to force transaction rollback");
            });
        } catch (RuntimeException expected) {
            assertThat(expected.getMessage()).contains("Simulated database failure");
        }

        // Verify Kafka event was NEVER sent because the transaction rolled back
        verify(kafkaTemplate, never()).send(any(), any(), any());

        // Verify future completes exceptionally and does not hang indefinitely
        CompletableFuture<SendResult<String, Object>> future = futureRef.get();
        assertThat(future).isNotNull();
        assertThat(future.isDone()).isTrue();
        assertThat(future.isCompletedExceptionally()).isTrue();
        assertThatThrownBy(future::get)
                .isInstanceOf(ExecutionException.class)
                .hasCauseInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Transaction rolled back or uncommitted");
    }

    @Test
    @DisplayName("Kafka event future completes exceptionally when transaction is marked rollback-only")
    void shouldCompleteFutureExceptionallyOnRollbackOnly() {
        TransactionTemplate transactionTemplate = new TransactionTemplate(transactionManager);
        AtomicReference<CompletableFuture<SendResult<String, Object>>> futureRef = new AtomicReference<>();

        transactionTemplate.execute(status -> {
            futureRef.set(kafkaEventPublisherService.publishTelemetryRecorded(testTelemetry));
            status.setRollbackOnly();
            return null;
        });

        verify(kafkaTemplate, never()).send(any(), any(), any());

        CompletableFuture<SendResult<String, Object>> future = futureRef.get();
        assertThat(future).isNotNull();
        assertThat(future.isDone()).isTrue();
        assertThat(future.isCompletedExceptionally()).isTrue();
        assertThatThrownBy(future::get)
                .isInstanceOf(ExecutionException.class)
                .hasCauseInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Transaction rolled back or uncommitted");
    }

    @Test
    @DisplayName("Kafka event publishes immediately when no transaction is active")
    void shouldPublishImmediatelyWhenNoTransactionActive() {
        CompletableFuture<SendResult<String, Object>> future =
                kafkaEventPublisherService.publishTelemetryRecorded(testTelemetry);

        verify(kafkaTemplate, times(1)).send(
                eq("kynexis.machine-telemetry"),
                eq(String.valueOf(testTelemetry.getMachine().getId())),
                any()
        );

        assertThat(future).isNotNull();
        assertThat(future.isDone()).isTrue();
        assertThat(future.isCompletedExceptionally()).isFalse();
    }
}
